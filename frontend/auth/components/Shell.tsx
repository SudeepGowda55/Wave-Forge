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
// leader countdown number per destination reel
const REEL: Record<string, number> = { "/": 1, "/pipeline": 2, "/upload": 3, "/dashboard": 4, "/signup": 5 };

const timecode = (sec: number) => {
  const f = Math.floor((sec % 1) * 24);
  const s = Math.floor(sec);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60, f].map((n) => String(n).padStart(2, "0")).join(":");
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const leader = useRef<HTMLDivElement>(null);
  const covered = useRef(false);
  const lenis = useRef<Lenis | null>(null);
  const [reel, setReel] = useState(1);

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

  // film leader: a frame pulls down into the gate, the countdown hand sweeps, then we cut to the new route
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      const href = a?.getAttribute("href");
      if (!a || !href?.startsWith("/") || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      if (href === pathname) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(href);
      covered.current = true;
      setReel(REEL[href] ?? 1);
      const el = leader.current!;
      gsap.timeline({ onComplete: () => router.push(href) })
        .set(el, { visibility: "visible", yPercent: -100, "--a": "0deg" })
        .to(el, { yPercent: 0, duration: 0.32, ease: "power4.in" })
        .to(el, { yPercent: 1.2, duration: 0.05, yoyo: true, repeat: 1, ease: "none" }) // gate registration jitter
        .to(el, { "--a": "360deg", duration: 0.42, ease: "none" }, "<");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  // on route change: reset scroll, advance the leader out of the gate, wire reveals
  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    if (covered.current) {
      covered.current = false;
      gsap.timeline()
        .to(leader.current, { yPercent: 100, duration: 0.5, ease: "power3.inOut", delay: 0.05 })
        .set(leader.current, { visibility: "hidden" });
    }
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          x: -18,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });
    });
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [pathname]);

  // pointer life: DAW playhead + timecode, magnetic keys, meter-bar bursts on press
  useEffect(() => {
    const fine = matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const head = document.getElementById("playhead")!;
    const code = document.getElementById("playhead-code")!;
    const hx = gsap.quickTo(head, "x", { duration: 0.18, ease: "power3.out" });
    const cy = gsap.quickTo(code, "y", { duration: 0.25, ease: "power3.out" });
    let mag: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      if (!fine) return;
      document.documentElement.classList.add("has-playhead");
      hx(e.clientX);
      cy(e.clientY - 10);
      const target = e.target as HTMLElement;
      const hot = !!target.closest("a, button, label, input, select, [data-magnetic]");
      head.classList.toggle("is-cue", hot);
      code.textContent = hot ? "CUE" : timecode((scrollY / innerHeight) * 4 + (e.clientX / innerWidth) * 4);
      const m = target.closest<HTMLElement>("[data-magnetic]");
      if (mag && mag !== m) gsap.to(mag, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
      mag = m;
      if (m) {
        const r = m.getBoundingClientRect();
        gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.25, duration: 0.25 });
      }
    };
    const onDown = (e: PointerEvent) => {
      const key = (e.target as HTMLElement).closest<HTMLElement>(".key");
      if (!key) return;
      const r = key.getBoundingClientRect();
      for (let i = 0; i < 9; i++) {
        const b = document.createElement("span");
        b.className = "burst";
        b.style.left = `${e.clientX - r.left}px`;
        b.style.top = `${e.clientY - r.top}px`;
        b.style.setProperty("--r", `${i * 40 + Math.random() * 14}deg`);
        b.style.height = `${8 + Math.random() * 12}px`;
        b.onanimationend = () => b.remove();
        key.appendChild(b);
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
      <header className="fixed inset-x-0 top-0 z-40 bg-ink text-cream">
        <nav className="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-4 sm:gap-7 sm:px-8">
          <Link href="/" className="mr-auto flex items-center gap-2.5" aria-label="WaveForge home">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <rect x="1" y="1" width="20" height="20" fill="none" stroke="#f4eedc" strokeWidth="2" />
              <path d="M7 4v14M11 7v8M15 3v16" stroke="#ff3d2e" strokeWidth="2.4" />
            </svg>
            <span className="hidden font-title text-2xl font-black uppercase tracking-tight min-[420px]:inline">WaveForge</span>
          </Link>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cream/70 transition-colors hover:text-cream">
              <span className={`led ${pathname === n.href ? "led-on" : ""}`} aria-hidden="true" />
              {n.label}
            </Link>
          ))}
          <Link href="/signup" className="key-rec hidden !px-4 !py-1.5 !text-xs sm:inline-flex" style={{ boxShadow: "0 3px 0 0 #000" }} data-magnetic>
            <span className="h-2 w-2 rounded-full bg-cream" aria-hidden="true" /> Rec
          </Link>
          <a
            href={SITE.repo}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cream/25 text-cream/60 transition-colors hover:border-cream/60 hover:text-cream"
            data-magnetic
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </nav>
        <div className="sprockets h-3 bg-ink" aria-hidden="true" />
      </header>

      <main>{children}</main>

      <footer className="relative z-10 bg-ink text-cream">
        <div className="sprockets h-3" aria-hidden="true" />
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-end justify-between gap-6 px-4 py-10 sm:px-8">
          <p className="title text-[clamp(3rem,10vw,8rem)]">End of reel.</p>
          <div className="space-y-2 pb-2 text-right font-read text-xs text-cream/60">
            <p>Video in, audio out. Four services on Kubernetes.</p>
            <a href={SITE.repo} target="_blank" rel="noreferrer" className="text-cream underline-offset-4 hover:underline">
              Source on GitHub ↗
            </a>
          </div>
        </div>
      </footer>

      {/* film leader transition */}
      <div
        ref={leader}
        className="pointer-events-none fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-cream text-ink"
        style={{ visibility: "hidden" }}
        aria-hidden="true"
      >
        <div className="sprockets absolute inset-y-0 left-0 w-6 bg-ink [background-size:12px_16px]" />
        <div className="sprockets absolute inset-y-0 right-0 w-6 bg-ink [background-size:12px_16px]" />
        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-ink/70" />
        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-ink/70" />
        <div
          className="relative grid aspect-square w-[min(62vh,80vw)] place-items-center rounded-full border-[6px] border-ink"
          style={{ background: "conic-gradient(rgba(12,15,42,0.22) var(--a, 0deg), transparent 0)" }}
        >
          <div className="absolute inset-[9%] rounded-full border-2 border-ink" />
          <span className="title relative text-[min(40vh,52vw)] leading-none">{reel}</span>
        </div>
      </div>

      <div id="playhead" className="pointer-events-none fixed inset-y-0 left-0 z-[70]" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 w-px -translate-x-1/2 bg-rec [.is-cue>&]:bg-cream" />
        <div className="absolute left-0 top-[68px] h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-rec" />
        <span id="playhead-code" className="absolute left-2 top-0 whitespace-nowrap bg-rec px-1.5 py-0.5 font-read text-[10px] text-cream" />
      </div>
    </>
  );
}
