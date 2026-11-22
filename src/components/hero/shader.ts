/**
 * Depth-based "3D photo" renderer. The camera offset (uCam) and dolly move pixels in
 * proportion to their depth, so near objects slide past far ones. Works the same with
 * a still photo or a playing video as the colour texture.
 */
export const VERTEX = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

export const FRAGMENT = `
precision highp float;
uniform sampler2D uImg;
uniform sampler2D uDepth;
uniform vec2 uRes;
uniform float uAspect;
uniform float uFocusX;
uniform vec2 uCam;
uniform float uDolly;
uniform float uTime;
uniform float uIntro;

float depthAt(vec2 p) { return texture2D(uDepth, clamp(p, 0.001, 0.999)).r; }

void main() {
  vec2 s = gl_FragCoord.xy / uRes; s.y = 1.0 - s.y;
  float sa = uRes.x / uRes.y;
  vec2 sc = sa > uAspect ? vec2(1.0, uAspect / sa) : vec2(sa / uAspect, 1.0);
  vec2 st = vec2(clamp(uFocusX - sc.x * 0.5, 0.0, 1.0 - sc.x), (1.0 - sc.y) * 0.5);
  vec2 c = st + sc * 0.5;
  vec2 q = st + s * sc;
  q = c + (q - c) / (1.07 + uIntro * 0.05);

  // Solve p + parallax(p) = q by fixed-point iteration.
  float focus = 0.55;
  vec2 p = q;
  for (int i = 0; i < 8; i++) {
    float d = depthAt(p) - focus;
    p = c + (q - uCam * d - c) / (1.0 + uDolly * d);
  }
  vec3 col = texture2D(uImg, clamp(p, 0.0, 1.0)).rgb;

  // Soft bloom around the brightest parts of the picture (lamps, LEDs), breathing slowly.
  float pulse = 0.5 + 0.5 * sin(uTime * 0.9);
  vec3 bloom = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float ang = float(i) * 0.5236;
    vec2 dir = vec2(cos(ang), sin(ang) * uAspect);
    vec3 c1 = texture2D(uImg, clamp(p + dir * 0.010, 0.0, 1.0)).rgb;
    vec3 c2 = texture2D(uImg, clamp(p + dir * 0.028, 0.0, 1.0)).rgb;
    bloom += c1 * smoothstep(0.55, 0.95, dot(c1, vec3(0.299, 0.587, 0.114)));
    bloom += c2 * smoothstep(0.55, 0.95, dot(c2, vec3(0.299, 0.587, 0.114))) * 0.6;
  }
  col += bloom / 19.2 * (0.55 + 0.25 * pulse);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col += col * smoothstep(0.75, 1.0, l) * 0.06 * pulse;

  // A slow light sweep across the brightest surfaces.
  float bright = smoothstep(0.72, 0.95, dot(texture2D(uImg, clamp(p, 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114)));
  col += vec3(1.0) * bright * 0.22 * pow(0.5 + 0.5 * sin(p.x * 22.0 + p.y * 30.0 - uTime * 1.4), 10.0);

  vec2 vg = (s - 0.5) * vec2(1.0, 0.8);
  col *= 1.0 - dot(vg, vg) * 0.35;
  col *= mix(0.45, 1.0, uIntro);
  gl_FragColor = vec4(col, 1.0);
}
`;
