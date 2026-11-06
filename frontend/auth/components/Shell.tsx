"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { SITE } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger);

const NAV = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/dashboard", label: "Files" },
  { href: "/upload", label: "Upload" },
];
const SWEEP_BARS = 28;
// each bar's rise order follows a spectrum: the low-mid bands light first, like a voice
const SWEEP_ORDER = Array.from({ length: SWEEP_BARS }, (_, i) => 1 - Math.exp(-(((i / SWEEP_BARS) - 0.3) ** 2) / 0.05));

// pointer x as an audio frequency on a log scale, 20 Hz at the left edge to 20 kHz at the right
const hz = (x: number) => {
  const f = 20 * 1000 ** (x / innerWidth);
  return f >= 1000 ? `${(f / 1000).toFixed(1)} kHz` : `${Math.round(f)} Hz`;
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sweep = useRef<HTMLDivElement>(null);
  const [signedIn, setSignedIn] = useState(false);
  // localStorage is only available in the browser; re-check on every navigation
  useEffect(() => { setSignedIn(!!localStorage.getItem('token')); }, [pathname]);
  const signOut = () => { localStorage.clear(); setSignedIn(false); router.push('/'); };
  const covered = useRef(false);
  const lenis = useRef<Lenis | null>(null);
  const [dest, setDest] = useState("/");

  // smooth scroll on gsap's ticker, wired to ScrollTrigger
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ lerp: 0.1 });
    lenis.current = l;
    (window as unknown as { __lenis: Lenis }).__lenis = l; // lets scripted screenshots scroll
    l.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
    };
  }, []);

  // spectrum sweep: analyser bars surge up to cover the screen while the destination tunes in, then the route cuts
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      const href = a?.getAttribute("href");
      if (!a || !href?.startsWith("/") || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      if (href === pathname) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(href);
      covered.current = true;
      setDest(href);
      const bars = sweep.current!.querySelectorAll("[data-bar]");
      gsap.timeline({ onComplete: () => router.push(href) })
        .set(sweep.current, { visibility: "visible" })
        .set(bars, { transformOrigin: "50% 100%", scaleY: 0 })
        .to(bars, { scaleY: 1, duration: 0.42, ease: "expo.out", stagger: (i) => SWEEP_ORDER[i] * 0.22 })
        .fromTo(".sweep-label", { opacity: 0, letterSpacing: "0.6em" }, { opacity: 1, letterSpacing: "0.18em", duration: 0.3 }, 0.12);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  // on route change: reset scroll, drop the bars away upwards, wire reveals
  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    if (covered.current) {
      covered.current = false;
      const bars = sweep.current!.querySelectorAll("[data-bar]");
      gsap.timeline({ delay: 0.06 })
        .to(".sweep-label", { opacity: 0, duration: 0.15 })
        .set(bars, { transformOrigin: "50% 0%" })
        .to(bars, { scaleY: 0, duration: 0.5, ease: "expo.inOut", stagger: (i) => (1 - SWEEP_ORDER[i]) * 0.2 })
        .set(sweep.current, { visibility: "hidden" });
    }
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 18,
          duration: 0.7,
          ease: "expo.out",
          // 97%: anything already on the first screen must still reveal, even near its bottom edge
          scrollTrigger: { trigger: el, start: "top 97%", once: true },
        });
      });
    });
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [pathname]);

  // pointer life: a HUD reticle that reads frequency and locks its brackets onto controls; magnetic keys; sonar pings
  useEffect(() => {
    const fine = matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ret = document.getElementById("reticle")!;
    const box = document.getElementById("reticle-box")!;
    const read = document.getElementById("reticle-read")!;
    let mag: HTMLElement | null = null, locked: Element | null = null;

    const onMove = (e: PointerEvent) => {
      if (!fine) return;
      document.documentElement.classList.add("has-reticle");
      const target = e.target as HTMLElement;
      const hot = target.closest<HTMLElement>("a, button, label, input, select, textarea, [data-magnetic]");
      if (hot) {
        const r = hot.getBoundingClientRect();
        if (locked !== hot) gsap.to(box, { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12, duration: 0.28, ease: "expo.out" });
        else gsap.set(box, { x: r.left - 6, y: r.top - 6 });
        read.textContent = "LOCK";
        gsap.to(read, { x: r.left - 6, y: r.top - 22, duration: 0.28, ease: "expo.out" });
      } else {
        gsap.to(box, { x: e.clientX - 14, y: e.clientY - 14, width: 28, height: 28, duration: locked ? 0.28 : 0.12, ease: "expo.out" });
        read.textContent = hz(e.clientX);
        gsap.to(read, { x: e.clientX + 18, y: e.clientY + 14, duration: 0.15, ease: "power3.out" });
      }
      ret.classList.toggle("is-locked", !!hot);
      locked = hot;
      const m = target.closest<HTMLElement>("[data-magnetic]");
      if (mag && mag !== m) gsap.to(mag, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
      mag = m;
      if (m) {
        const r = m.getBoundingClientRect();
        gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.22, duration: 0.25 });
      }
    };
    const onDown = (e: PointerEvent) => {
      const key = (e.target as HTMLElement).closest<HTMLElement>(".key");
      if (!key) return;
      const r = key.getBoundingClientRect();
      for (let i = 0; i < 2; i++) {
        const p = document.createElement("span");
        p.className = "ping";
        p.style.left = `${e.clientX - r.left}px`;
        p.style.top = `${e.clientY - r.top}px`;
        p.style.animationDelay = `${i * 120}ms`;
        p.onanimationend = () => p.remove();
        key.appendChild(p);
      }
    };
    addEventListener("pointermove", onMove);
    addEventListener("pointerdown", onDown);
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-cyan/10 bg-void/85">
        <nav className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-4 sm:gap-8 sm:px-8">
          <Link href="/" className="mr-auto flex items-center gap-3" aria-label="WaveForge home">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="12" fill="none" stroke="url(#lg)" strokeWidth="1.5" />
              <path d="M5 14h3l2-6 3 12 3-9 2 5 2-2h3" fill="none" stroke="#6bf6ff" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6bf6ff" />
                  <stop offset="0.6" stopColor="#b18cff" />
                  <stop offset="1" stopColor="#ffb547" />
                </linearGradient>
              </defs>
            </svg>
            <span className="hidden font-title text-[13px] tracking-[0.28em] min-[420px]:inline">WAVEFORGE</span>
          </Link>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`relative py-2 font-read text-[11px] uppercase tracking-[0.16em] transition-colors ${pathname === n.href ? "text-cyan" : "text-fg/60 hover:text-fg"}`}
            >
              {n.label}
              <span className={`absolute inset-x-0 -bottom-0.5 h-px bg-cyan transition-transform duration-300 ${pathname === n.href ? "scale-x-100 shadow-[0_0_8px_#6bf6ff]" : "scale-x-0"}`} />
            </Link>
          ))}
          {signedIn ? (
            <button type="button" onClick={signOut} className="key-cream hidden !px-4 !py-2 !text-[11px] sm:inline-flex" data-magnetic>
              Sign out
            </button>
          ) : (
            <Link href="/signin" className="key-rec hidden !px-4 !py-2 !text-[11px] sm:inline-flex" data-magnetic>
              Sign in
            </Link>
          )}
          <a
            href={SITE.repo}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-fg/20 text-fg/60 transition-colors hover:border-cyan/60 hover:text-cyan"
            data-magnetic
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="relative z-10 border-t border-cyan/10 bg-void">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-end justify-between gap-6 px-4 py-12 sm:px-8">
          <p className="title bg-gradient-to-r from-cyan via-violet to-amber bg-clip-text text-[clamp(2rem,6.5vw,5.5rem)] text-transparent">End of signal.</p>
          <div className="space-y-2 pb-2 text-right font-read text-xs text-fg/50">
            <p>Video in. Audio, words and voices out. Five services in Docker.</p>
            <a href={SITE.repo} target="_blank" rel="noreferrer" className="text-cyan underline-offset-4 hover:underline">
              Source on GitHub ↗
            </a>
          </div>
        </div>
      </footer>

      {/* spectrum-sweep transition */}
      <div ref={sweep} className="pointer-events-none fixed inset-0 z-[60] flex gap-px bg-transparent" style={{ visibility: "hidden" }} aria-hidden="true">
        {Array.from({ length: SWEEP_BARS }, (_, i) => (
          <div
            key={i}
            data-bar
            className="h-full flex-1"
            style={{ background: `linear-gradient(to top, #05060b 0%, #0b0f1a 55%, ${i % 7 === 3 ? "#b18cff" : "#6bf6ff"} 100%)` }}
          />
        ))}
        <p className="sweep-label absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-read text-sm uppercase text-cyan">
          tuning <span className="text-fg">{dest === "/" ? "home" : dest.slice(1)}</span>
        </p>
      </div>

      <div id="reticle" className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true">
        <div id="reticle-box" className="absolute left-0 top-0 h-7 w-7">
          {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
            <span key={c} className={`absolute h-2 w-2 border-cyan [.is-locked_&]:border-amber ${c}`} />
          ))}
          <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 bg-cyan [.is-locked_&]:opacity-0" />
        </div>
        <span id="reticle-read" className="absolute left-0 top-0 whitespace-nowrap font-read text-[10px] tracking-[0.12em] text-cyan/80 [.is-locked_&]:text-amber" />
      </div>
    </>
  );
}
