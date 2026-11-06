"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { forge } from "@/lib/site";

export type Job = { n: number; format: "mp3" | "wav"; rate: string };

const RATES = ["22400", "48000", "n/a"];
const JOB_EVERY = 3.6; // seconds between simulated uploads
const COLS = 120, ROWS = 120; // 14,400 particles
const CORE = new THREE.Vector3(0, 1.5, -10);

const COMMON = /* glsl */ `
const vec3 CYAN = vec3(0.42, 0.965, 1.0);
const vec3 VIOLET = vec3(0.694, 0.549, 1.0);
const vec3 AMBER = vec3(1.0, 0.71, 0.278);
const vec3 FG = vec3(0.902, 0.945, 1.0);
uniform float uTime, uState, uPulseZ, uPulseAmp, uFlash;
float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float kState(float i) { return smoothstep(0.0, 1.0, clamp(uState - i, 0.0, 1.0)); }
float wave(float s, float t) {
  return 0.55 * sin(s * 0.9 + t * 1.3) + 0.3 * sin(s * 2.3 - t * 2.1) + 0.15 * sin(s * 5.1 + t * 3.0);
}
`;

// sky: void gradient with a cyan horizon haze and a few slow stars
const skyVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
`;
const skyFrag = /* glsl */ `
${COMMON}
uniform vec2 uRes;
varying vec2 vUv;
void main() {
  vec2 p = vUv;
  vec3 col = mix(vec3(0.02, 0.024, 0.043), vec3(0.035, 0.05, 0.09), smoothstep(0.1, 0.55, p.y));
  col += CYAN * 0.06 * exp(-pow((p.y - 0.47) * 7.0, 2.0));
  col += VIOLET * 0.035 * smoothstep(0.6, 1.0, p.y) * (0.6 + 0.4 * sin(p.x * 3.0 + uTime * 0.1));
  vec2 g = floor(p * uRes / 3.0);
  float star = step(0.9985, fract(sin(dot(g, vec2(12.9898, 78.233))) * 43758.5453));
  col += FG * star * 0.5 * smoothstep(0.45, 0.9, p.y) * (0.6 + 0.4 * sin(uTime * 2.0 + g.x));
  gl_FragColor = vec4(col, 1.0);
}
`;

// perspective floor grid in world space, with the upload pulse running along it
const gridVert = /* glsl */ `
varying vec3 vW;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`;
const gridFrag = /* glsl */ `
${COMMON}
varying vec3 vW;
void main() {
  vec2 c = vW.xz / 2.0;
  vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float fade = exp(-length(vW.xz - vec2(0.0, -6.0)) * 0.07);
  float pulse = exp(-pow((4.0 - vW.z) - uPulseZ, 2.0) * 0.5) * uPulseAmp;
  vec3 col = mix(CYAN, VIOLET, smoothstep(-2.0, -14.0, vW.z));
  float a = line * fade * (0.16 + pulse * 0.8) * (1.0 - kState(1.0) * 0.6);
  gl_FragColor = vec4(col * a, a);
}
`;

// the particles: terrain -> waveform ribbon -> transcript rows -> three voice streams
const fieldVert = /* glsl */ `
${COMMON}
attribute vec2 aGrid;
attribute float aRand;
uniform float uPixel, uScale;
varying vec3 vCol;
varying float vAlpha;
void main() {
  float u = aGrid.x, v = aGrid.y, t = uTime;

  // listen: a spectral terrain flowing away from you into the core
  float zf = mod(v * 26.0 + t * 2.2, 26.0);
  float z0 = 4.0 - zf;
  float toCore = smoothstep(-3.0, -10.0, z0);
  float x0 = (u - 0.5) * 30.0 * mix(1.0, 0.12, toCore);
  float band = exp(-pow(x0 / 8.0, 2.0));
  float spec = (0.5 + 0.5 * sin(x0 * 0.55 + z0 * 0.35 - t * 1.6)) * (0.6 + 0.4 * sin(x0 * 1.7 - z0 * 0.9 + t * 0.7));
  float pulse = exp(-pow((zf - uPulseZ) * 0.6, 2.0)) * uPulseAmp;
  float h0 = (0.12 + 2.1 * band * spec) * (1.0 + pulse * 1.6);
  vec3 p0 = vec3(x0, mix(h0 - 0.9, 1.5, toCore), z0);
  vec3 c0 = mix(CYAN, VIOLET, toCore) + FG * pulse * 0.6;
  float a0 = smoothstep(4.0, 1.0, z0) * (1.0 - smoothstep(-9.0, -11.0, z0)) * (0.35 + 0.65 * band) + pulse * 0.4;

  // extract: one waveform ribbon across the core
  float x1 = (u - 0.5) * 16.0;
  float env = exp(-pow(x1 / 6.5, 2.0));
  vec3 p1 = vec3(x1, CORE_Y + wave(x1, t) * 1.2 * env + (v - 0.5) * 0.3 * (0.3 + env), CORE_Z + (v - 0.5) * 0.5);
  vec3 c1 = mix(CYAN, FG, env * 0.3);
  float a1 = 0.25 + 0.75 * env;

  // understand: rows of dot-matrix "words" being written, like a transcript
  float row = floor(v * 8.0);
  float col = floor(u * float(${COLS}));
  float ch = floor(col / 6.0), inCh = mod(col, 6.0);
  float lvl = floor(fract(v * 8.0) * 5.0);
  float lineLen = 8.0 + floor(hash(row * 3.7) * 11.0);
  float on = step(inCh, 4.5) * step(ch, lineLen) * step(0.16, hash(row * 37.0 + ch)) * step(0.42, hash(row * 91.0 + ch * 7.0 + inCh * 13.0 + lvl * 3.0));
  float writing = floor(mod(t * 0.9, 9.0));
  vec3 p2 = on > 0.5
    ? vec3(-8.6 + col * 0.143, CORE_Y + 1.9 - row * 0.5 - lvl * 0.075, CORE_Z + 0.5)
    : CORE;
  vec3 c2 = mix(VIOLET, FG, step(row, writing - 0.5) * 0.5 + step(abs(row - writing), 0.5) * 0.5);
  float a2 = on * (0.45 + 0.55 * step(row, writing + 0.5));

  // speak: three voices spiral out of the core towards you, one per colour
  float s = mod(col, 3.0);
  float q = fract(v + t * 0.06 + aRand * 0.03);
  float ang = q * 14.0 + t * 1.2 + s * 2.094;
  float r = 0.35 + q * 2.1;
  vec3 p3 = vec3(cos(ang) * r + (s - 1.0) * q * 3.0, CORE_Y + sin(ang) * r * 0.7, CORE_Z + q * 8.5);
  vec3 c3 = s < 0.5 ? CYAN : s < 1.5 ? VIOLET : AMBER;
  float a3 = smoothstep(0.0, 0.08, q) * (1.0 - smoothstep(0.55, 0.9, q));

  float k1 = kState(0.0), k2 = kState(1.0), k3 = kState(2.0);
  vec3 pos = mix(mix(mix(p0, p1, k1), p2, k2), p3, k3);
  vCol = mix(mix(mix(c0, c1, k1), c2, k2), c3, k3);
  vAlpha = mix(mix(mix(a0, a1, k1), a2, k2), a3, k3);

  // mid-morph scatter, so a change of stage looks like the signal re-forming
  float morph = sin(fract(uState) * 3.14159) * step(uState, 2.999);
  pos += (vec3(hash(aRand * 11.0), hash(aRand * 23.0), hash(aRand * 37.0)) - 0.5) * morph * 1.6;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uScale * uPixel * (0.8 + aRand * 0.9) / -mv.z;
  vAlpha *= 1.0 + uFlash * 0.6;
}
`;
const fieldFrag = /* glsl */ `
varying vec3 vCol;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(vCol * a, a);
}
`;

// the core: an iridescent ring whose colour shifts with the viewing angle, like thin film
const ringVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;
const ringFrag = /* glsl */ `
${COMMON}
uniform float uGain;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - abs(dot(vN, vV)), 1.5);
  vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + f * 1.3 + uTime * 0.08));
  vec3 col = mix(CYAN, film, 0.55) * (0.5 + f * 1.4) * uGain * (1.0 + uFlash * 1.5);
  gl_FragColor = vec4(col, 1.0);
}
`;
const glowFrag = /* glsl */ `
${COMMON}
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = (exp(-d * d * 6.0) * 0.55 + exp(-d * d * 40.0) * 0.4) * (0.6 + uFlash * 1.2);
  vec3 col = mix(CYAN, VIOLET, d);
  gl_FragColor = vec4(col * a, a);
}
`;
const glowVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

// camera per stage: wide over the terrain, then close on the core
const CAM = [
  { p: [0, 3.4, 9], l: [0, 0.6, -8] },
  { p: [0, 1.9, -1], l: [0, 1.5, -10] },
  { p: [0, 2.0, -2.2], l: [0, 1.8, -10] },
  { p: [3.2, 2.3, 1.2], l: [0, 1.5, -10] },
].map((c) => ({ p: new THREE.Vector3(...c.p), l: new THREE.Vector3(...c.l) }));

export default function Field({ mode = "scroll", lift = 0, shift = 0, onJob, className = "" }: { mode?: "scroll" | "auto"; lift?: number; shift?: number; onJob?: (j: Job) => void; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const jobCb = useRef(onJob);
  jobCb.current = onJob;

  useEffect(() => {
    const el = host.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = Math.min(devicePixelRatio, 1.5);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x05060b, 1);
    renderer.domElement.style.opacity = "0";
    renderer.domElement.style.transition = "opacity 0.8s";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    const shared = {
      uTime: { value: 0 }, uState: { value: 0 }, uPulseZ: { value: -10 }, uPulseAmp: { value: 0 }, uFlash: { value: 0 },
    };
    const defines = { CORE_Y: CORE.y.toFixed(2), CORE_Z: CORE.z.toFixed(2), CORE: `vec3(${CORE.x.toFixed(1)}, ${CORE.y.toFixed(2)}, ${CORE.z.toFixed(2)})` };

    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, depthWrite: false, depthTest: false, uniforms: { ...shared, uRes: { value: new THREE.Vector2(1, 1) } } }),
    );
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    scene.add(sky);

    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.ShaderMaterial({ vertexShader: gridVert, fragmentShader: gridFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: shared }),
    );
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -1.05;
    scene.add(grid);

    const geo = new THREE.BufferGeometry();
    const n = COLS * ROWS;
    const pos = new Float32Array(n * 3), gridA = new Float32Array(n * 2), rand = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      gridA[i * 2] = (i % COLS) / COLS;
      gridA[i * 2 + 1] = Math.floor(i / COLS) / ROWS;
      rand[i] = Math.random();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aGrid", new THREE.BufferAttribute(gridA, 2));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    const fieldU = { ...shared, uPixel: { value: dpr }, uScale: { value: 46 } };
    const points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({ vertexShader: fieldVert, fragmentShader: fieldFrag, defines, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: fieldU }),
    );
    points.frustumCulled = false;
    scene.add(points);

    const core = new THREE.Group();
    core.position.copy(CORE);
    const ringU = { ...shared, uGain: { value: 1 } };
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.045, 24, 220), new THREE.ShaderMaterial({ vertexShader: ringVert, fragmentShader: ringFrag, uniforms: ringU, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    const ring2U = { ...shared, uGain: { value: 0.55 } };
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.02, 16, 220), new THREE.ShaderMaterial({ vertexShader: ringVert, fragmentShader: ringFrag, uniforms: ring2U, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShaderMaterial({ vertexShader: glowVert, fragmentShader: glowFrag, uniforms: shared, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.add(ring, ring2, glow);
    scene.add(core);

    let w = 1, h = 1, pull = 1;
    const resize = () => {
      w = el.clientWidth || 1;
      h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      (sky.material as THREE.ShaderMaterial).uniforms.uRes.value.set(w, h);
      const aspect = w / h;
      camera.aspect = aspect;
      pull = aspect < 1 ? Math.min(2.1, 1 / aspect) : 1; // portrait: pull back so the field still reads
      if (lift && aspect < 1) camera.setViewOffset(w, h, 0, h * lift, w, h);
      else if (shift && aspect >= 1.2) camera.setViewOffset(w, h, -w * shift, 0, w, h);
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

    const camP = new THREE.Vector3(), camL = new THREE.Vector3(), tmp = new THREE.Vector3();
    let raf = 0, last = performance.now(), avg = 16, first = true, state = forge.state, nextJob = 0.8, jobN = 0, jobAt = -99;
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
        fieldU.uPixel.value = 1;
        resize();
      }
      const t = reduced ? 6 : clock.getElapsedTime();

      // autonomous simulation: a fake upload every few seconds (the UI labels it as simulated)
      if (!reduced && t > nextJob) {
        nextJob = t + JOB_EVERY;
        jobAt = t;
        jobCb.current?.({ n: ++jobN, format: Math.random() < 0.6 ? "mp3" : "wav", rate: RATES[Math.floor(Math.random() * RATES.length)] });
      }
      const age = t - jobAt;
      shared.uPulseZ.value = age * 7.5; // runs the terrain from your feet to the core
      shared.uPulseAmp.value = age < 2.6 ? 1 : Math.max(0, 1 - (age - 2.6) * 2);
      shared.uFlash.value = Math.max(0, 1 - Math.abs(age - 1.95) * 2.2); // the core lights up as the pulse arrives

      if (mode === "auto") {
        const c = (t / 3.6) % 4, seg = Math.floor(c), ramp = Math.max(0, (c % 1) - 0.62) / 0.38;
        state = seg < 3 ? seg + ramp : 3 * (1 - ramp);
      } else {
        state += (forge.state - state) * (reduced ? 1 : 0.07);
      }
      shared.uTime.value = t;
      shared.uState.value = state;

      // camera eases between the stage keyframes, with a little pointer parallax
      const i = Math.min(2, Math.floor(state)), f = THREE.MathUtils.smoothstep(state - i, 0, 1);
      camP.lerpVectors(CAM[i].p, CAM[i + 1].p, f);
      camL.lerpVectors(CAM[i].l, CAM[i + 1].l, f);
      tmp.copy(camP).sub(camL).multiplyScalar(pull);
      camera.position.copy(camL).add(tmp);
      camera.position.x += pointer.x * 1.2;
      camera.position.y -= pointer.y * 0.6;
      camera.lookAt(camL);

      ring.rotation.set(0.25 + Math.sin(t * 0.3) * 0.08, t * 0.25, 0);
      ring2.rotation.set(-0.35, -t * 0.18, 0.4);
      glow.quaternion.copy(camera.quaternion);
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
  }, [mode, lift, shift]);

  return <div ref={host} className={className} role="img" aria-label="Simulation: a sound field flows into an AI core, becomes a waveform, then lines of transcript, then three voices" />;
}
