"use client";

import { createElement, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Headline that rises word by word out of clipped masks. */
export function Split({ text, as = "h1", className = "", delay = 0.2 }: { text: string; as?: "h1" | "h2" | "h3" | "p"; className?: string; delay?: number }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      gsap.from(ref.current!.querySelectorAll(".mask > span"), {
        yPercent: 115,
        rotate: 4,
        duration: 1,
        ease: "expo.out",
        stagger: 0.06,
        delay,
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
      });
    });
    return () => ctx.revert();
  }, [delay]);
  const words = text.split(" ");
  return createElement(
    as,
    { ref, className, "aria-label": text },
    words.map((w, i) => (
      <span key={i} aria-hidden="true">
        <span className="mask">
          <span>{w}</span>
        </span>
        {i < words.length - 1 ? " " : ""}
      </span>
    )),
  );
}

/** Number that counts up as it scrolls through the viewport (scrubbed, so it runs backwards too). */
export function ScrubCount({ to, className = "" }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (reduced()) return;
    const o = { v: 0 };
    el.textContent = "0";
    const ctx = gsap.context(() => {
      gsap.to(o, {
        v: to,
        ease: "none",
        onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("en-US"); },
        scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: 0.6 },
      });
    });
    return () => ctx.revert();
  }, [to]);
  return (
    <span ref={ref} className={className}>
      {to.toLocaleString("en-US")}
    </span>
  );
}

/** Ticker that speeds up and skews with scroll velocity. */
export function Marquee({ items }: { items: string[] }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced()) return;
    const el = track.current!;
    let x = 0, lastY = scrollY, skew = 0, raf = 0;
    const loop = () => {
      const v = scrollY - lastY;
      lastY = scrollY;
      x -= 0.6 + Math.abs(v) * 0.35;
      skew += (Math.max(-12, Math.min(12, v * 0.4)) - skew) * 0.15;
      const half = el.scrollWidth / 2;
      if (-x > half) x += half;
      el.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="overflow-hidden border-y border-line py-6" aria-label={`Built with ${items.join(", ")}`}>
      <div ref={track} className="flex w-max gap-10 whitespace-nowrap will-change-transform" aria-hidden="true">
        {[...items, ...items].map((it, i) => (
          <span key={i} className="flex items-center gap-10 font-display text-4xl font-bold tracking-tight text-bone/90 sm:text-6xl">
            {it}
            <span className="text-ember">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
