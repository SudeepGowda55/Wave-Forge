"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { forge } from "@/lib/site";

export type Job = { n: number; format: "mp3" | "wav"; rate: string };

// sampling rate -> visible sample stems per film unit (rate / 10 000)
const DENSITY: Record<string, number> = { "22400": 2.24, "48000": 4.8, "n/a": 3.6 };
const RATES = Object.keys(DENSITY);
const JOB_EVERY = 3.2; // seconds between simulated uploads

const COMMON = /* glsl */ `
const vec3 INK = vec3(0.047, 0.059, 0.165);
const vec3 CREAM = vec3(0.957, 0.933, 0.863);
const vec3 REC = vec3(1.0, 0.24, 0.18);
const vec3 KLEIN = vec3(0.106, 0.184, 0.878);
const vec3 DEEP = vec3(0.07, 0.133, 0.66);
uniform float uTime, uState;
float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float kState(float i) { return smoothstep(0.0, 1.0, clamp(uState - i, 0.0, 1.0)); }
float wave(float s, float t) {
  return 0.55 * sin(s * 2.1 + t * 0.9) + 0.3 * sin(s * 5.3 - t * 1.7) + 0.15 * sin(s * 11.7 + t * 2.3);
}
`;

// full-screen environment: klein field, projector beam, flicker, grain
const envVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
const envFrag = /* glsl */ `
${COMMON}
uniform vec2 uRes;
uniform float uFlicker;
varying vec2 vUv;
void main() {
  vec2 p = vUv;
  vec3 col = mix(DEEP, KLEIN, smoothstep(-0.1, 0.7, p.y));
  float r = 0.05 + p.x * 0.34;
  float beam = smoothstep(r, 0.0, abs(p.y - 0.53)) * (0.3 + 0.7 * p.x);
  float flicker = 1.0 - uFlicker * (0.5 + 0.5 * sin(uTime * 47.0)) * 0.25;
  col += CREAM * beam * 0.11 * flicker;
  col = mix(col, mix(col, REC, 0.25), kState(2.0) * beam);
  col += (hash2(floor(p * uRes) + fract(uTime) * 91.0) - 0.5) * 0.04;
  gl_FragColor = vec4(col, 1.0);
}
`;

// the film strip: picture frames, sprockets and an optical soundtrack that takes over
const filmVert = /* glsl */ `
${COMMON}
varying vec2 vUv;
varying float vS;
void main() {
  float t = uTime;
  float k1 = kState(0.0), k2 = kState(1.0);
  float x = (uv.x - 0.5) * 26.0;
  float y = mix(0.9 * sin(uv.x * 3.2 + t * 0.15), 0.25 * sin(uv.x * 2.0 + t * 0.1), k2);
  float z = mix(-3.5 + 4.0 * sin(uv.x * 3.14159), -1.0 + 1.5 * sin(uv.x * 3.14159), k2);
  float tw = mix(sin(uv.x * 4.0 + t * 0.3) * 0.55, 0.0, k2);
  float H = mix(2.6, 3.4, k2);
  float s = uv.x * 13.0 - t * 0.35;
  // queue: each frame hops off the strip like a separate message
  float fi = floor(s);
  float q = k1 * (1.0 - k2);
  y += (hash(fi) - 0.5) * 1.3 * q;
  z += (hash(fi + 7.0) - 0.5) * 1.2 * q;
  vec3 p = vec3(x, y, z) + vec3(0.0, cos(tw), sin(tw)) * (uv.y - 0.5) * H;
  vUv = uv;
  vS = s;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;
const filmFrag = /* glsl */ `
${COMMON}
uniform float uDensity, uPulse;
varying vec2 vUv;
varying float vS;

// duotone landscape, a different shot per frame
vec2 picture(vec2 p, float fi) {
  float h = hash(fi * 3.1);
  vec2 sp = vec2(0.25 + 0.5 * h, 0.6 + 0.2 * hash(fi + 2.0));
  float sun = smoothstep(0.17, 0.15, length((p - sp) * vec2(1.4, 1.0)));
  float hor = 0.32 + 0.12 * sin(p.x * (5.0 + h * 6.0) + fi) + 0.05 * sin(p.x * 21.0 + fi * 3.0);
  float land = step(p.y, hor);
  float L = land > 0.5 ? 0.1 + 0.05 * sin(p.x * 80.0) : max(mix(0.45, 0.9, p.y) * 0.85, sun);
  return vec2(L, sun * (1.0 - land) * step(0.45, h));
}

void main() {
  float t = uTime;
  vec2 uv = vUv;
  float s = vS;
  float k1 = kState(0.0), k2 = kState(1.0), k3 = kState(2.0);
  float fs = fract(s), fi = floor(s);

  if (fs > 1.0 - k1 * 0.3 * (1.0 - k2)) discard; // queue gaps

  // optical soundtrack: variable-area band that grows to fill the strip
  float c = mix(0.19, 0.5, k2);
  float hmax = mix(0.065, 0.46, k2);
  float sq = s * uDensity;
  float sh = mix(s, (floor(sq) + 0.5) / uDensity, k3); // sample-and-hold when resampled
  float a = (0.12 + 0.88 * abs(wave(sh, t))) * hmax;
  float stem = mix(1.0, step(fract(sq), 0.45), k3);
  float track = step(abs(uv.y - c), a) * stem;

  // sprocket holes show the world through the film
  float edge = step(uv.y, 0.1) + step(0.9, uv.y);
  float vc = uv.y < 0.5 ? 0.05 : 0.95;
  if (edge > 0.0 && abs(fract(s * 4.0) - 0.5) < 0.16 && abs(uv.y - vc) < 0.026 && k2 < 0.5) discard;

  vec3 col = INK;
  float inPic = step(0.3, uv.y) * step(uv.y, 0.88) * step(0.04, fs);
  vec2 pic = picture(vec2(fs, (uv.y - 0.3) / 0.58), fi);
  col = mix(col, mix(mix(INK, CREAM, pic.x), REC, pic.y), inPic);

  float core = smoothstep(a, 0.0, abs(uv.y - c));
  vec3 trackCol = mix(CREAM, mix(REC, CREAM, core * 0.55), k2);
  col = mix(col, trackCol, track);

  // extraction: everything that isn't sound dissolves
  if (track < 0.5 && hash2(floor(uv * vec2(1600.0, 240.0))) < k2 * 1.02) discard;

  // a scan line runs down the strip on each simulated upload
  col = mix(col, CREAM, exp(-pow((uv.x - uPulse) * 60.0, 2.0)) * 0.85);
  gl_FragColor = vec4(col, 1.0);
}
`;

// projector dust: drifts through the beam, kicked by each upload pulse
const dustVert = /* glsl */ `
${COMMON}
attribute vec3 aSeed;
uniform float uPulseX, uPulseAge, uPixel;
varying float vBright;
void main() {
  float t = uTime;
  vec3 p = aSeed * vec3(30.0, 12.0, 14.0) - vec3(15.0, 6.0, 10.0);
  p.x = mod(p.x + t * 0.25 * (0.4 + aSeed.y) + 15.0, 30.0) - 15.0;
  p.y += sin(t * 0.4 + aSeed.x * 30.0) * 0.4;
  p.z += cos(t * 0.3 + aSeed.z * 20.0) * 0.4;
  float kick = exp(-pow(p.x - uPulseX, 2.0) * 0.4) * exp(-uPulseAge * 1.6);
  p.y += kick * 1.8 * (aSeed.z - 0.5) * 2.0;
  float beam = smoothstep(0.8 + (p.x + 15.0) * 0.14, 0.0, abs(p.y - 0.3));
  vBright = 0.12 + 0.75 * beam + kick;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (18.0 + 30.0 * aSeed.x) * uPixel / -mv.z;
}
`;
const dustFrag = /* glsl */ `
${COMMON}
varying float vBright;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * vBright * 0.7;
  if (a < 0.01) discard;
  gl_FragColor = vec4(CREAM * a, a);
}
`;

type Props = {
  /** "scroll" eases toward the shared store; "auto" cycles the states on its own */
  mode?: "scroll" | "auto";
  /** portrait screens: lift the subject by this fraction of the height */
  lift?: number;
  /** at state 0, aim the camera this far up so the strip sits lower on screen (clears a title band) */
  drop?: number;
  onJob?: (job: Job) => void;
  className?: string;
};

export default function Film({ mode = "scroll", lift = 0, drop = 0, onJob, className = "" }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const jobCb = useRef(onJob);
  jobCb.current = onJob;

  useEffect(() => {
    const el = host.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    let dpr = Math.min(devicePixelRatio, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor("#1b2fe0");
    renderer.domElement.style.cssText = "width:100%;height:100%;opacity:0;transition:opacity 900ms ease";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const shared = { uTime: { value: 0 }, uState: { value: 0 } };

    const env = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: envVert,
        fragmentShader: envFrag,
        uniforms: { ...shared, uRes: { value: new THREE.Vector2(1, 1) }, uFlicker: { value: reduced ? 0 : 1 } },
        depthTest: false,
        depthWrite: false,
      }),
    );
    env.renderOrder = -1;
    env.frustumCulled = false;
    scene.add(env);

    const filmU = { ...shared, uDensity: { value: DENSITY["48000"] }, uPulse: { value: -1 } };
    const film = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 640, 1),
      new THREE.ShaderMaterial({ vertexShader: filmVert, fragmentShader: filmFrag, uniforms: filmU, side: THREE.DoubleSide }),
    );
    film.frustumCulled = false;
    scene.add(film);

    const N = 5000;
    const seeds = new Float32Array(N * 3).map(() => Math.random());
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    const dustU = { ...shared, uPulseX: { value: -99 }, uPulseAge: { value: 9 }, uPixel: { value: dpr } };
    const dust = new THREE.Points(
      dustGeo,
      new THREE.ShaderMaterial({ vertexShader: dustVert, fragmentShader: dustFrag, uniforms: dustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    dust.frustumCulled = false;
    scene.add(dust);

    let w = 1, h = 1, R = 13;
    const resize = () => {
      w = el.clientWidth || 1;
      h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      (env.material as THREE.ShaderMaterial).uniforms.uRes.value.set(w / 3, h / 3);
      const aspect = w / h;
      camera.aspect = aspect;
      R = (aspect < 1 ? 7.5 / aspect : 13) * (mode === "auto" ? 1.4 : 1); // portrait: pull back so the strip still reads
      if (lift && aspect < 1) camera.setViewOffset(w, h, 0, h * lift, w, h);
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

    let raf = 0, last = performance.now(), avg = 16, first = true, state = forge.state, nextJob = 0.6, jobN = 0, jobAt = -9, density = DENSITY["48000"];
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      const now = performance.now();
      avg = avg * 0.95 + (now - last) * 0.05;
      last = now;
      if (avg > 22 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(1);
        dustU.uPixel.value = 1;
        resize();
      }
      const t = reduced ? 4 : clock.getElapsedTime();

      // autonomous simulation: a fake upload every few seconds (labelled as simulated in the UI)
      if (!reduced && t > nextJob) {
        nextJob = t + JOB_EVERY;
        jobAt = t;
        const job: Job = { n: ++jobN, format: Math.random() < 0.6 ? "mp3" : "wav", rate: RATES[Math.floor(Math.random() * RATES.length)] };
        density = DENSITY[job.rate];
        jobCb.current?.(job);
      }
      const age = t - jobAt;
      filmU.uPulse.value = -0.1 + age / 1.3;
      dustU.uPulseX.value = (filmU.uPulse.value - 0.5) * 26;
      dustU.uPulseAge.value = age;
      filmU.uDensity.value += (density - filmU.uDensity.value) * 0.05;

      if (mode === "auto") {
        const c = (t / 3.4) % 4, seg = Math.floor(c), ramp = Math.max(0, (c % 1) - 0.65) / 0.35;
        state = seg < 3 ? seg + ramp : 3 * (1 - ramp);
      } else {
        state += (forge.state - state) * (reduced ? 1 : 0.07);
      }
      shared.uTime.value = t;
      shared.uState.value = state;

      // scroll orbits the camera around the strip
      const ang = -0.28 + state * 0.13 + pointer.x * 0.12;
      camera.position.set(Math.sin(ang) * R, 1.1 - state * 0.2 - pointer.y * 0.6, Math.cos(ang) * R);
      camera.lookAt(0, drop * (1 - Math.min(state, 1)), -1);
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
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode, lift, drop]);

  return <div ref={host} className={className} role="img" aria-label="Simulation: a film strip whose optical soundtrack peels off, becomes a waveform and is resampled" />;
}
