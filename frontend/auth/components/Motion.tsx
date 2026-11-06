"use client";

import { createElement, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Headline that locks in like a tuned signal: letters arrive split into cyan and violet ghosts, then snap together. */
export function Amp({ text, as = "h1", className = "", delay = 0.15 }: { text: string; as?: "h1" | "h2" | "h3" | "p"; className?: string; delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reduced()) return;
    const letters = ref.current!.querySelectorAll<HTMLElement>(".amp > span > span > span");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        letters,
        {
          opacity: 0,
          y: () => gsap.utils.random(-14, 14),
          textShadow: () => `${gsap.utils.random(-18, -6)}px 0 0 rgba(107,246,255,0.9), ${gsap.utils.random(6, 18)}px 0 0 rgba(177,140,255,0.9)`,
        },
        {
          opacity: 1,
          y: 0,
          textShadow: "0px 0 0 rgba(107,246,255,0), 0px 0 0 rgba(177,140,255,0)",
          duration: 0.9,
          ease: "expo.out",
          stagger: { each: 0.018, from: "random" },
          delay,
          clearProps: "textShadow",
          scrollTrigger: { trigger: ref.current, start: "top 92%", once: true },
        },
      );
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

/** Digital readout whose digits roll up to the value as it scrolls into view, scrubbed by scroll. */
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

/** A spectrum analyser driven by how fast you scroll: idle it murmurs, a fast flick lights every band. */
export function SpectrumBand({ bars = 64, className = "" }: { bars?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = Array.from(ref.current!.children) as HTMLElement[];
    if (reduced()) {
      els.forEach((b, i) => (b.style.transform = `scaleY(${0.15 + 0.25 * Math.abs(Math.sin(i * 0.4))})`));
      return;
    }
    let lastY = scrollY, energy = 0, raf = 0;
    const lv = els.map(() => 0.1);
    const loop = (now: number) => {
      const v = Math.abs(scrollY - lastY);
      lastY = scrollY;
      // fast attack, slow release, like a real analyser's ballistics
      const target = Math.min(1, v / 40);
      energy += (target - energy) * (target > energy ? 0.3 : 0.04);
      const t = now / 1000;
      els.forEach((b, i) => {
        const x = i / els.length;
        const shape = 0.55 + 0.45 * Math.sin(x * 9 + t * 1.3) * Math.sin(x * 23 - t * 2.1);
        const want = 0.08 + 0.12 * Math.abs(Math.sin(x * 17 + t * 0.8)) + energy * shape * (1 - x * 0.35);
        lv[i] += (want - lv[i]) * 0.25;
        b.style.transform = `scaleY(${Math.min(1, lv[i]).toFixed(3)})`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [bars]);
  return (
    <div ref={ref} className={`flex items-end gap-[3px] ${className}`} role="img" aria-label="Spectrum analyser driven by scroll speed">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="h-full flex-1 origin-bottom"
          style={{ background: `linear-gradient(to top, #6bf6ff, ${i / bars > 0.66 ? "#ffb547" : "#b18cff"})`, transform: "scaleY(0.1)" }}
        />
      ))}
    </div>
  );
}
