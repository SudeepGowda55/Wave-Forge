"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { forge } from "@/lib/site";

const COLS = 160;
const ROWS = 90;

const vertex = /* glsl */ `
uniform float uTime, uState, uSize, uPixel;
attribute vec2 aGrid;
attribute float aRand;
varying vec3 vColor;
varying float vAlpha;

const float PI = 3.14159265;
const vec3 EMBER = vec3(1.0, 0.36, 0.12);
const vec3 AMBER = vec3(1.0, 0.71, 0.28);
const vec3 MOLTEN = vec3(1.0, 0.95, 0.86);
const vec3 STEEL = vec3(0.5, 0.58, 0.65);

float signal(float x, float t) {
  float env = exp(-pow(x / 5.5, 2.0)) * 0.9 + 0.1;
  return env * (sin(x * 1.7 + t * 1.3) * 0.55 + sin(x * 4.3 - t * 2.1) * 0.3 + sin(x * 9.1 + t * 0.7) * 0.15);
}

// staggered per-point progress for transition i, so particles leave like sparks
float step01(float s, float i) {
  return smoothstep(0.0, 1.0, clamp((s - i) * 1.5 - aRand * 0.5, 0.0, 1.0));
}

void main() {
  vec2 g = aGrid;
  float t = uTime;

  // 0 · intake: a video frame (procedural sunset, scanlines)
  vec3 p0 = vec3((g.x - 0.5) * 12.0, (g.y - 0.5) * 6.75, sin(g.x * 10.0 + t) * 0.06);
  vec3 sky = mix(AMBER * 0.9, STEEL * 0.45, smoothstep(0.3, 1.0, g.y));
  float sun = smoothstep(0.17, 0.15, distance(g * vec2(1.78, 1.0), vec2(1.2, 0.6)));
  float hill = step(g.y, 0.3 + 0.07 * sin(g.x * 9.0) + 0.04 * sin(g.x * 23.0 + 1.0));
  vec3 c0 = mix(mix(sky, MOLTEN, sun), EMBER * 0.3, hill) * (0.85 + 0.15 * sin(g.y * 280.0)) * 1.7;

  // 1 · queue: packets streaming down a pipe
  float lane = fract(g.x + t * 0.05);
  float centre = (floor(lane * 7.0) + 0.5) / 7.0;
  float x1 = mix((lane - 0.5) * 18.0, (centre - 0.5) * 18.0, 0.55);
  float a1 = g.y * PI * 6.0 + aRand * 6.28;
  float r1 = 0.25 + 0.35 * aRand;
  vec3 p1 = vec3(x1, sin(a1) * r1, cos(a1) * r1);
  vec3 c1 = mix(STEEL, AMBER, 0.5 + 0.5 * sin(centre * 21.0));

  // 2 · forge: waveform terrain, each row a moment later in time
  float x2 = (g.x - 0.5) * 16.0;
  float z2 = (g.y - 0.5) * 5.0;
  float y2 = signal(x2, t - z2 * 0.6) * 1.7 * (1.0 - abs(g.y - 0.5) * 1.2);
  vec3 p2 = vec3(x2, y2, z2);
  vec3 c2 = mix(EMBER, MOLTEN, clamp(abs(y2) * 0.7, 0.0, 1.0));

  // 3 · resample: discrete sample bars, mirrored like a player waveform
  float xs = (floor(g.x * 64.0) + 0.5) / 64.0;
  float x3 = (xs - 0.5) * 16.0;
  float amp = abs(signal(x3, t)) * 2.4 + 0.08;
  vec3 p3 = vec3(x3, (g.y - 0.5) * 2.0 * amp, 0.0);
  vec3 c3 = mix(AMBER, EMBER, abs(g.y - 0.5) * 2.0);

  float k1 = step01(uState, 0.0), k2 = step01(uState, 1.0), k3 = step01(uState, 2.0);
  vec3 p = mix(mix(mix(p0, p1, k1), p2, k2), p3, k3);
  vec3 c = mix(mix(mix(c0, c1, k1), c2, k2), c3, k3);

  // heat: mid-transition particles scatter and glow white-hot
  float heat = sin(PI * k1) + sin(PI * k2) + sin(PI * k3);
  p += vec3(sin(aRand * 91.0), cos(aRand * 57.0), sin(aRand * 33.0)) * heat * 0.9;
  c = mix(c, MOLTEN, heat * 0.5);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixel * (0.7 + aRand * 0.6) / -mv.z;
  vColor = c;
  vAlpha = 0.75 + heat * 0.25;
}
`;

const fragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;

type Props = {
  /** "scroll" eases toward the shared store; "auto" cycles through the states on its own */
  mode?: "scroll" | "auto";
  /** shift the subject right by this fraction of the width (desktop only) */
  offset?: number;
  className?: string;
};

export default function Forge({ mode = "scroll", offset = 0, className = "" }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    let dpr = Math.min(devicePixelRatio, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.domElement.style.opacity = "0";
    renderer.domElement.style.transition = "opacity 900ms ease";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

    const n = COLS * ROWS;
    const grid = new Float32Array(n * 2);
    const rand = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      grid[i * 2] = (i % COLS) / (COLS - 1);
      grid[i * 2 + 1] = Math.floor(i / COLS) / (ROWS - 1);
      rand[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute("aGrid", new THREE.BufferAttribute(grid, 2));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    const uniforms = { uTime: { value: 0 }, uState: { value: 0 }, uSize: { value: 60 }, uPixel: { value: dpr } };
    const mat = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    let w = 1, h = 1;
    const resize = () => {
      w = el.clientWidth || 1;
      h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      const aspect = w / h;
      camera.aspect = aspect;
      // portrait screens: pull back so the 16-unit-wide subject still fits
      camera.position.set(0, 1.6, aspect < 1 ? 8.5 / aspect : aspect < 1.4 ? 17 : 15);
      camera.lookAt(0, 0, 0);
      if (offset && aspect > 1.1) camera.setViewOffset(w, h, -w * offset, 0, w, h);
      else if (offset && aspect < 1) camera.setViewOffset(w, h, 0, h * 0.2, w, h); // portrait: lift subject above the copy
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX / innerWidth - 0.5;
      pointer.y = e.clientY / innerHeight - 0.5;
    };
    addEventListener("pointermove", onMove);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    let raf = 0, last = performance.now(), avg = 16, first = true, state = forge.state;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const now = performance.now();
      avg = avg * 0.95 + (now - last) * 0.05;
      last = now;
      // adaptive step-down when frames stay slow
      if (avg > 22 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(1);
        uniforms.uPixel.value = 1;
        resize();
      }
      const t = reduced ? 2 : clock.getElapsedTime();
      if (mode === "auto") {
        // hold each state ~2.2s, then forge into the next
        const c = (t / 3) % 4;
        const seg = Math.floor(c), ramp = Math.max(0, (c % 1) - 0.7) / 0.3;
        state = seg < 3 ? seg + ramp : 3 * (1 - ramp); // last segment melts back to the frame
      } else {
        state += (forge.state - state) * (reduced ? 1 : 0.08);
      }
      uniforms.uTime.value = t;
      uniforms.uState.value = state;
      points.rotation.y += (pointer.x * 0.35 - 0.12 * (1 - Math.min(state, 1)) - points.rotation.y) * 0.05;
      points.rotation.x += (pointer.y * 0.2 + (state > 1.5 ? 0.12 : 0) - points.rotation.x) * 0.05;
      renderer.render(scene, camera);
      if (first) {
        first = false;
        renderer.domElement.style.opacity = "1";
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointermove", onMove);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode, offset]);

  return <div ref={host} className={className} role="img" aria-label="Particle animation: a video frame is melted into an audio waveform" />;
}
