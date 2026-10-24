"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
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

const BARS = ["#ff5b1f", "#ffb648", "#ff5b1f", "#17130f", "#ffb648", "#ff5b1f"];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const curtain = useRef<HTMLDivElement>(null);
  const covered = useRef(false);
  const lenis = useRef<Lenis | null>(null);

  // smooth scroll on gsap's ticker, wired to ScrollTrigger
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const l = new Lenis({ lerp: 0.12 });
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

  // curtain in on internal link click, then navigate
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      const href = a?.getAttribute("href");
      if (!a || !href?.startsWith("/") || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      if (href === pathname) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(href);
      covered.current = true;
      const bars = curtain.current!.querySelectorAll(".bar");
      gsap.timeline({ onComplete: () => router.push(href) })
        .set(curtain.current, { visibility: "visible" })
        .fromTo(bars, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: "power3.inOut", stagger: 0.04 })
        .fromTo(".curtain-label", { opacity: 0 }, { opacity: 1, duration: 0.2 }, "-=0.15");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, router]);

  // on route change: reset scroll, lift the curtain, wire reveals for the new page
  useEffect(() => {
    lenis.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    if (covered.current) {
      covered.current = false;
      gsap.timeline()
        .to(".curtain-label", { opacity: 0, duration: 0.15 })
        .to(curtain.current!.querySelectorAll(".bar"), { yPercent: -100, duration: 0.6, ease: "expo.out", stagger: 0.04 })
        .set(curtain.current, { visibility: "hidden" });
    }
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: 0.8,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });
    });
    requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => ctx.revert();
  }, [pathname]);

  // pointer life: follower cursor, magnetic elements, press sparks
  useEffect(() => {
    const fine = matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dot = document.getElementById("cursor-dot")!;
    const ring = document.getElementById("cursor-ring")!;
    let mag: HTMLElement | null = null;

    const dx = gsap.quickTo(dot, "x", { duration: 0.08 }), dy = gsap.quickTo(dot, "y", { duration: 0.08 });
    const rx = gsap.quickTo(ring, "x", { duration: 0.45, ease: "expo.out" }), ry = gsap.quickTo(ring, "y", { duration: 0.45, ease: "expo.out" });

    const onMove = (e: PointerEvent) => {
      if (!fine) return;
      document.documentElement.classList.add("has-cursor");
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      const target = e.target as HTMLElement;
      ring.classList.toggle("is-hot", !!target.closest("a, button, label, input, select, [data-magnetic]"));
      const m = target.closest<HTMLElement>("[data-magnetic]");
      if (mag && mag !== m) gsap.to(mag, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      mag = m;
      if (m) {
        const r = m.getBoundingClientRect();
        gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.3 });
      }
    };
    const onDown = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>(".btn");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const s = document.createElement("span");
      s.className = "spark";
      s.style.left = `${e.clientX - r.left}px`;
      s.style.top = `${e.clientY - r.top}px`;
      s.onanimationend = () => s.remove();
      btn.appendChild(s);
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
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-soot/90">
        <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:gap-6 sm:px-8">
          <Link href="/" className="mr-auto flex items-center gap-2 font-display text-lg font-bold tracking-tight" aria-label="WaveForge home">
            <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
              {[3, 8, 15, 6, 12, 4].map((hgt, i) => (
                <rect key={i} x={i * 4.4} y={9 - hgt / 2} width="2.4" height={hgt} rx="1.2" fill={i % 2 ? "#ffb648" : "#ff5b1f"} />
              ))}
            </svg>
            <span className="hidden min-[400px]:inline">WaveForge</span>
          </Link>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`font-mono text-[11px] uppercase tracking-[0.16em] transition-colors hover:text-bone ${pathname === n.href ? "text-amber" : "text-ash"}`}
            >
              {n.label}
            </Link>
          ))}
          <Link href="/signup" className="btn-hot hidden !px-4 !py-2 sm:inline-flex" data-magnetic>
            Start
          </Link>
          <a
            href={SITE.repo}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-ash transition-colors hover:border-bone/40 hover:text-bone"
            data-magnetic
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="relative z-10 border-t border-line py-10">
        <div className="mx-auto flex max-w-7xl px-4 sm:px-8 flex-wrap items-center justify-between gap-4">
          <p className="eyebrow">WaveForge · video in, audio out · four services on Kubernetes</p>
          <a href={SITE.repo} target="_blank" rel="noreferrer" className="eyebrow transition-colors hover:text-bone">
            Source on GitHub ↗
          </a>
        </div>
      </footer>

      <div ref={curtain} className="pointer-events-none fixed inset-0 z-[60] flex" style={{ visibility: "hidden" }} aria-hidden="true">
        {BARS.map((c, i) => (
          <div key={i} className="bar h-full flex-1" style={{ background: c }} />
        ))}
        <p className="curtain-label absolute inset-0 grid place-items-center font-mono text-xs uppercase tracking-[0.3em] text-soot opacity-0">
          forging…
        </p>
      </div>

      <div id="cursor-ring" className="pointer-events-none fixed left-0 top-0 z-[70] hidden" aria-hidden="true" />
      <div id="cursor-dot" className="pointer-events-none fixed left-0 top-0 z-[70] hidden" aria-hidden="true" />
    </>
  );
}
