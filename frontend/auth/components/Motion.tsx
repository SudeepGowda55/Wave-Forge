"use client";

import { createElement, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Headline whose letters swell from a flat line to full amplitude, centre first, like a signal coming in. */
export function Amp({ text, as = "h1", className = "", delay = 0.15 }: { text: string; as?: "h1" | "h2" | "h3" | "p"; className?: string; delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      gsap.from(ref.current!.querySelectorAll(".amp > span > span > span"), {
        scaleY: 0.04,
        color: "#ff3d2e",
        duration: 1.1,
        ease: "elastic.out(1, 0.45)",
        stagger: { each: 0.022, from: "center" },
        delay,
        scrollTrigger: { trigger: ref.current, start: "top 92%", once: true },
      });
    });
    return () => ctx.revert();
  }, [delay]);
  const words = text.split(" ");
  return createElement(
    as,
    { ref, className: `amp ${className}`, "aria-label": text },
    // the space sits outside the inline-block word, or it collapses and words glue together
    words.map((w, i) => (
      <span key={i} aria-hidden="true">
        <span className="inline-block whitespace-nowrap">
          {Array.from(w).map((ch, j) => (
            <span key={j} className="inline-block">{ch}</span>
          ))}
        </span>
        {i < words.length - 1 ? " " : ""}
      </span>
    )),
  );
}

/** Mechanical tape counter: digits roll like a deck's reel counter, scrubbed by scroll. */
export function TapeCounter({ to, className = "" }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const cols = String(to).length;
  useEffect(() => {
    const strips = Array.from(ref.current!.querySelectorAll<HTMLElement>("[data-strip]")).reverse(); // ones column first
    const draw = (v: number) =>
      strips.forEach((s, i) => {
        const p = 10 ** i;
        const base = Math.floor(v / p) % 10;
        // a column rolls only while every column below it passes 9 -> 0
        const roll = i === 0 ? v % 1 : Math.min(1, Math.max(0, (v % p) - (p - 1)));
        s.style.transform = `translateY(${-(base + roll)}em)`;
      });
    if (reduced()) return draw(to);
    const o = { v: 0 };
    draw(0);
    const ctx = gsap.context(() => {
      gsap.to(o, {
        v: to,
        ease: "none",
        onUpdate: () => draw(o.v),
        scrollTrigger: { trigger: ref.current, start: "top 95%", end: "top 40%", scrub: 0.5 },
      });
    });
    return () => ctx.revert();
  }, [to]);
  return (
    <span ref={ref} className={`inline-flex leading-none ${className}`} aria-label={String(to)} role="img">
      {Array.from({ length: cols }, (_, c) => (
        <span key={c} className="relative h-[1em] overflow-hidden" aria-hidden="true">
          <span data-strip className="flex flex-col" style={{ transform: `translateY(-${String(to)[c]}em)` }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
              <span key={i} className="h-[1em]">{d}</span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Analogue VU meter whose needle is driven by how fast you scroll. */
export function VuMeter({ className = "" }: { className?: string }) {
  const needle = useRef<SVGGElement>(null);
  const peak = useRef<SVGCircleElement>(null);
  useEffect(() => {
    if (reduced()) return;
    let lastY = scrollY, level = 0, raf = 0;
    const loop = () => {
      const v = Math.abs(scrollY - lastY);
      lastY = scrollY;
      // needle ballistics: fast attack, slow fall
      const target = Math.min(1.08, v / 45);
      level += (target - level) * (target > level ? 0.25 : 0.04);
      needle.current!.style.transform = `rotate(${-48 + level * 96}deg)`;
      peak.current!.style.opacity = level > 0.82 ? "1" : "0.15";
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  const ticks = Array.from({ length: 13 }, (_, i) => -48 + i * 8);
  return (
    <svg viewBox="0 0 200 120" className={className} role="img" aria-label="VU meter driven by scroll speed">
      <rect x="2" y="2" width="196" height="116" fill="#f4eedc" stroke="#0c0f2a" strokeWidth="3" />
      {ticks.map((a, i) => (
        <line
          key={a}
          x1="100" y1="22" x2="100" y2={i % 2 ? 30 : 34}
          stroke={i > 9 ? "#ff3d2e" : "#0c0f2a"}
          strokeWidth={i % 2 ? 1.5 : 2.5}
          transform={`rotate(${a} 100 112)`}
        />
      ))}
      <text x="20" y="104" fontSize="11" fontFamily="var(--font-read)" fill="#0c0f2a">-20</text>
      <text x="166" y="104" fontSize="11" fontFamily="var(--font-read)" fill="#ff3d2e">+3</text>
      <text x="100" y="80" fontSize="13" fontFamily="var(--font-title)" fontWeight="800" textAnchor="middle" fill="#0c0f2a">VU</text>
      <circle ref={peak} cx="176" cy="20" r="5" fill="#ff3d2e" opacity="0.15" />
      <g ref={needle} style={{ transformOrigin: "100px 112px", transform: "rotate(-48deg)" }}>
        <line x1="100" y1="112" x2="100" y2="20" stroke="#0c0f2a" strokeWidth="2" />
      </g>
      <circle cx="100" cy="112" r="7" fill="#0c0f2a" />
    </svg>
  );
}
