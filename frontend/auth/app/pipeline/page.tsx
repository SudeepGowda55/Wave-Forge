"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Amp } from "@/components/Motion";

gsap.registerPlugin(ScrollTrigger);

const NODES = [
  {
    name: "You",
    tech: "Next.js frontend",
    body: "Sign in with a password, then POST the video with your JWT, the target format and the sampling rate.",
    meta: ["POST /login", "POST /upload", "POST /ai/ask"],
  },
  {
    name: "Gateway",
    tech: "Go · Gin · :8000",
    body: "The only public entry point. Checks your JWT with the auth service, stores the upload in MongoDB GridFS and publishes a message to the file_uploaded queue.",
    meta: ["JWT check", "GridFS", "/ai/* proxy"],
  },
  {
    name: "Auth",
    tech: "Go · PostgreSQL · :8001",
    body: "Hashes passwords with bcrypt, issues and validates JWTs, and keeps each file's record and live status.",
    meta: ["bcrypt", "/login", "/updatestatus"],
  },
  {
    name: "RabbitMQ",
    tech: "message broker",
    body: "Decouples the slow work. Uploads return immediately, and a fanout exchange hands every converted file to both the AI service and the notifier.",
    meta: ["file_uploaded", "file_converted (fanout)"],
  },
  {
    name: "Converter",
    tech: "Python · pydub · ffmpeg",
    body: "Consumes file_uploaded, pulls the video from GridFS, exports MP3 or WAV, re-samples if asked, uploads to Cloudinary and reports the URL and status to the auth service.",
    meta: ["file_uploaded", "Cloudinary"],
  },
  {
    name: "AI",
    tech: "Python · Groq Whisper · gpt-oss",
    body: "Takes its copy of each converted file, transcribes the first ten minutes into Postgres full-text search, and answers your questions with timestamped sources.",
    meta: ["file_converted_ai", "/ai/ask", "/ai/transcript"],
  },
  {
    name: "Notification",
    tech: "Node.js · amqplib · Mailgun",
    body: "Takes its copy of each converted file and emails you the download link.",
    meta: ["file_converted_notification", "Mailgun"],
  },
];

export default function Pipeline() {
  const pin = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const mm = gsap.matchMedia();
    // desktop: the strip slides sideways past the playback head as you scroll
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const dist = () => track.current!.scrollWidth - innerWidth + 64;
      gsap.to(track.current, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: pin.current,
          start: "top top",
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (st) => setActive(Math.round(st.progress * (NODES.length - 1))),
        },
      });
    });
    // mobile: frames stack, each lights as it reaches the middle of the screen
    mm.add("(max-width: 1023px)", () => {
      gsap.utils.toArray<HTMLElement>(".frame").forEach((el, i) => {
        ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: (st) => st.isActive && setActive(i) });
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <div className="relative z-10 pt-28">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-8">
        <Amp text="Seven hops." className="title text-[clamp(2.2rem,7vw,6.5rem)]" />
        <p className="mt-6 max-w-xl text-lg text-fg/75" data-reveal>
          WaveForge runs as five microservices in Docker containers, talking over HTTP and RabbitMQ. Scroll to run one file through the deck.
        </p>
      </div>

      <div>
        {/* React-owned wrapper so GSAP's pin-spacer never touches a React parent */}
        <div ref={pin} className="relative overflow-hidden py-16 lg:flex lg:h-[100svh] lg:flex-col lg:justify-center lg:py-0">
          {/* the signal line every node sits on; the head marks the node being explained */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-0 hidden h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent lg:block" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-[16%] left-1/2 z-0 hidden w-px bg-gradient-to-b from-transparent via-amber to-transparent lg:block" aria-hidden="true">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap font-read text-[10px] uppercase tracking-[0.14em] text-amber">Signal</span>
          </div>
          <ol ref={track} className="relative z-10 flex flex-col gap-6 px-4 sm:px-8 lg:w-max lg:flex-row lg:items-center lg:gap-10 lg:pl-[calc(50vw-14rem)]">
            {NODES.map((n, i) => (
              <li key={n.name} className="frame lg:w-[26rem] lg:shrink-0">
                <div
                  className={`plate flex min-h-[19rem] flex-col p-6 transition-[box-shadow,transform] duration-500 ${i === active ? "lg:-translate-y-2" : "opacity-90"}`}
                  style={i === active ? { boxShadow: "inset 0 0 0 1px rgba(107,246,255,0.6), 0 0 60px -20px rgba(107,246,255,0.7)" } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-read text-[11px] uppercase tracking-[0.14em] text-fg/50">{n.tech}</span>
                    <span className={`led ${i === active ? "led-on" : ""}`} aria-hidden="true" />
                  </div>
                  <h2 className={`title mt-5 text-4xl transition-colors ${i === active ? "text-cyan" : ""}`}>{n.name}</h2>
                  <p className="mt-4 flex-1 leading-relaxed text-fg/75">{n.body}</p>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {n.meta.map((m) => (
                      <li key={m} className="border border-cyan/25 px-2 py-0.5 font-read text-[11px] text-fg/70">{m}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <section className="mx-auto max-w-[90rem] px-4 pb-28 pt-8 sm:px-8">
        <div className="flex flex-wrap gap-3" data-reveal>
          <Link href="/upload" className="key-rec" data-magnetic>Try it with a video</Link>
          <Link href="/" className="key-cream" data-magnetic>Back to the story</Link>
        </div>
      </section>
    </div>
  );
}
