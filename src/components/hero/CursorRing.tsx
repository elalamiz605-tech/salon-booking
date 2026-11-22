"use client";

import { useEffect, useRef } from "react";

/** Desktop only: a gold ring that follows the pointer, and buttons that lean towards it. */
export function CursorRing() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches) return;
    const r = ring.current!, d = dot.current!;
    let x = -100, y = -100, rx = -100, ry = -100, raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      r.classList.add("on"); d.classList.add("on");
      d.style.transform = `translate(${x}px,${y}px)`;
      const target = (e.target as Element | null)?.closest?.("a, button");
      r.classList.toggle("hover", !!target);
      const btn = (e.target as Element | null)?.closest?.(".btn") as HTMLElement | null;
      document.querySelectorAll<HTMLElement>(".btn[data-magnet]").forEach((b) => { if (b !== btn) b.style.transform = ""; });
      if (btn) {
        btn.dataset.magnet = "1";
        const b = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(x - b.left - b.width / 2) * 0.18}px,${(y - b.top - b.height / 2) * 0.28}px)`;
      }
    };
    const leave = () => { r.classList.remove("on"); d.classList.remove("on"); };
    const follow = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      r.style.transform = `translate(${rx}px,${ry}px)`;
      raf = requestAnimationFrame(follow);
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(follow);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
