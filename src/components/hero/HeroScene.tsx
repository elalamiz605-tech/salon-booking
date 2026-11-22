"use client";

import { useEffect, useRef } from "react";
import { FRAGMENT, VERTEX } from "./shader";
import "./hero.css";

type Props = { photo: string; depth: string; video: { mp4: string; webm: string } | null };

const IMG_ASPECT = 16 / 9;
const focusX = (w: number) => (w < 720 ? 0.74 : w < 1100 ? 0.62 : 0.5);

/**
 * The homepage background: the photo first (also the fallback), then a WebGL scene that
 * moves the camera through the photo's depth, with the hero video as its texture when available.
 */
export function HeroScene({ photo, depth, video }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const glCanvas = useRef<HTMLCanvasElement>(null);
  const dustCanvas = useRef<HTMLCanvasElement>(null);
  const grain = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!, canvas = glCanvas.current!, dust = dustCanvas.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;
    let raf = 0, running = true, disposed = false;
    let videoEl: HTMLVideoElement | null = null, videoUrl: string | null = null;
    const cleanups: (() => void)[] = [];

    // Film grain: one noise tile, jittered by CSS.
    {
      const c = document.createElement("canvas"); c.width = c.height = 180;
      const g = c.getContext("2d")!, img = g.createImageData(180, 180);
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      g.putImageData(img, 0, 0);
      grain.current!.style.backgroundImage = `url(${c.toDataURL()})`;
    }

    const size = () => ({ w: el.clientWidth, h: el.clientHeight });
    const view = () => {
      const { w, h } = size(), sa = w / h;
      const sx = sa > IMG_ASPECT ? 1 : sa / IMG_ASPECT, sy = sa > IMG_ASPECT ? IMG_ASPECT / sa : 1;
      return { w, h, sx, sy, x0: Math.min(Math.max(focusX(w) - sx / 2, 0), 1 - sx), y0: (1 - sy) / 2 };
    };

    // Sparse dust drifting through the light, in image coordinates so it stays in place.
    const dctx = dust.getContext("2d")!;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const motes = Array.from({ length: window.innerWidth < 720 ? 30 : 60 }, () => ({
      u: 0.45 + Math.random() * 0.5, v: 0.05 + Math.random() * 0.7, r: 0.4 + Math.random(), a: 0.12 + Math.random() * 0.25,
      z: Math.random(), ph: Math.random() * 6.283, vv: -0.002 - Math.random() * 0.004, life: 6 + Math.random() * 8, age: Math.random() * 6,
    }));
    let last = 0;
    const drawDust = (now: number, cam: number[]) => {
      const t = now / 1000, dt = Math.min(0.05, Math.max(0, t - last)); last = t;
      const v = view();
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dctx.clearRect(0, 0, v.w, v.h);
      dctx.fillStyle = "#e8e4dc";
      for (const m of motes) {
        m.age += dt; m.v += m.vv * dt; m.u += Math.sin(t * 0.4 + m.ph) * 0.0004 * dt * 60;
        if (m.age > m.life) { m.age = 0; m.u = 0.45 + Math.random() * 0.5; m.v = 0.05 + Math.random() * 0.7; }
        const k = m.age / m.life, par = m.z - 0.55;
        const x = (m.u - cam[0] * par - v.x0) / v.sx * v.w, y = (m.v - cam[1] * par - v.y0) / v.sy * v.h;
        dctx.globalAlpha = m.a * Math.min(1, k * 6) * (1 - k);
        dctx.beginPath(); dctx.arc(x, y, m.r * (v.w / 1440 + 0.35), 0, 6.283); dctx.fill();
      }
    };

    const resize = () => {
      const { w, h } = size();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      dust.width = Math.round(w * dpr); dust.height = Math.round(h * dpr);
      const gdpr = Math.min(window.devicePixelRatio || 1, w < 720 ? 2 : 1.6);
      canvas.width = Math.round(w * gdpr); canvas.height = Math.round(h * gdpr);
      el.style.setProperty("--focus-x", `${focusX(w) * 100}%`);
    };
    resize();
    window.addEventListener("resize", resize);
    cleanups.push(() => window.removeEventListener("resize", resize));

    if (reduce) return () => cleanups.forEach((f) => f());

    const mouse = [0, 0], mouseT = [0, 0], cam = [0, 0];
    const onMove = (e: PointerEvent) => { mouseT[0] = e.clientX / window.innerWidth * 2 - 1; mouseT[1] = e.clientY / window.innerHeight * 2 - 1; };
    window.addEventListener("pointermove", onMove, { passive: true });
    cleanups.push(() => window.removeEventListener("pointermove", onMove));

    const loopDustOnly = (now: number) => { if (disposed) return; drawDust(now, [0, 0]); raf = requestAnimationFrame(loopDustOnly); };

    let gl: WebGLRenderingContext | null = null;
    try { gl = canvas.getContext("webgl", { antialias: false, alpha: false }); } catch { gl = null; }
    if (!gl) { raf = requestAnimationFrame(loopDustOnly); return () => { disposed = true; cancelAnimationFrame(raf); cleanups.forEach((f) => f()); }; }

    const compile = (type: number, src: string) => {
      const s = gl!.createShader(type)!; gl!.shaderSource(s, src); gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      raf = requestAnimationFrame(loopDustOnly);
      return () => { disposed = true; cancelAnimationFrame(raf); cleanups.forEach((f) => f()); };
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = Object.fromEntries(["uImg", "uDepth", "uRes", "uAspect", "uFocusX", "uCam", "uDolly", "uTime", "uIntro"].map((n) => [n, gl!.getUniformLocation(prog, n)]));

    let photoTex: WebGLTexture | null = null;
    const texture = (unit: number, source: TexImageSource) => {
      const t = gl!.createTexture(); gl!.activeTexture(gl!.TEXTURE0 + unit); gl!.bindTexture(gl!.TEXTURE_2D, t);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source);
      return t;
    };
    const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

    const startVideo = () => {
      if (!video) return;
      const probe = document.createElement("video");
      const src = probe.canPlayType('video/webm; codecs="vp9"') ? video.webm : video.mp4;
      fetch(src).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); }).then((blob) => {
        if (disposed) return;
        const v = document.createElement("video");
        v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", "");
        videoUrl = URL.createObjectURL(blob); v.src = videoUrl;
        v.addEventListener("playing", () => { videoEl = v; }, { once: true });
        v.play().catch(() => {});
      }).catch(() => {});
    };

    Promise.all([load(photo), load(depth)]).then(([img, dep]) => {
      if (disposed) return;
      photoTex = texture(0, img); texture(1, dep);
      gl!.uniform1i(U.uImg, 0); gl!.uniform1i(U.uDepth, 1); gl!.uniform1f(U.uAspect, IMG_ASPECT);
      const t0 = performance.now();
      const render = (now: number) => {
        if (disposed || !running) return;
        const t = (now - t0) / 1000;
        const intro = 1 - Math.pow(1 - Math.min(1, t / 2.6), 3);
        mouse[0] += (mouseT[0] - mouse[0]) * 0.045; mouse[1] += (mouseT[1] - mouse[1]) * 0.045;
        const amp = (window.innerWidth < 720 ? 0.75 : 1) * (videoEl ? 0.65 : 1);
        cam[0] = (Math.sin(t * 0.21) * 0.012 + mouse[0] * 0.013) * amp;
        cam[1] = (Math.sin(t * 0.13 + 1.0) * 0.006 + mouse[1] * 0.008) * amp;
        if (videoEl && videoEl.readyState >= 2) {
          gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, photoTex);
          gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, videoEl);
        }
        gl!.viewport(0, 0, canvas.width, canvas.height);
        gl!.uniform2f(U.uRes, canvas.width, canvas.height);
        gl!.uniform1f(U.uFocusX, focusX(el.clientWidth));
        gl!.uniform2f(U.uCam, cam[0], cam[1]);
        gl!.uniform1f(U.uDolly, 0.07 + 0.05 * Math.sin(t * 0.09 - 1.2));
        gl!.uniform1f(U.uTime, t);
        gl!.uniform1f(U.uIntro, intro);
        gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
        drawDust(now, cam);
        raf = requestAnimationFrame(render);
      };
      html.classList.add("gl-ready");
      raf = requestAnimationFrame(render);
      startVideo();
      const onVis = () => { const was = running; running = !document.hidden; if (running && !was) raf = requestAnimationFrame(render); };
      document.addEventListener("visibilitychange", onVis);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVis));
    }).catch(() => { raf = requestAnimationFrame(loopDustOnly); });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      html.classList.remove("gl-ready");
      videoEl?.pause();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      cleanups.forEach((f) => f());
    };
  }, [photo, depth, video]);

  return (
    <>
      <div ref={root} className="hero-viewport" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- first paint and fallback must be the exact file, not an optimised variant */}
        <img className="hero-photo" src={photo} alt="" width={1536} height={864} fetchPriority="high" />
        <canvas ref={glCanvas} className="hero-gl" />
        <canvas ref={dustCanvas} className="hero-dust" />
      </div>
      <div className="hero-vignette" aria-hidden="true" />
      <div ref={grain} className="hero-grain" aria-hidden="true" />
    </>
  );
}
