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
    body: "Signs you up, then POSTs the video as multipart form data with your email, target format and sampling rate.",
    meta: ["POST /signup", "POST /upload", "POST /getfiles"],
  },
  {
    name: "Gateway",
    tech: "Go · Gin · :8000",
    body: "The only public entry point. Stores the upload in MongoDB GridFS and publishes a message to the file_uploaded queue.",
    meta: ["sudeepgowda55/gateway-service", "/validatejwt", "/updatefileurl"],
  },
  {
    name: "Auth",
    tech: "Go · PostgreSQL · :8001",
    body: "Handles signup, issues and validates JWTs, and keeps each user's file records.",
    meta: ["sudeepgowda55/auth-service", "/getfiles"],
  },
  {
    name: "RabbitMQ",
    tech: "message broker",
    body: "Decouples the slow work. Uploads return immediately; conversions and emails happen when consumers are ready.",
    meta: ["file_uploaded", "file_converted_notification"],
  },
  {
    name: "Converter",
    tech: "Python · pydub",
    body: "Consumes file_uploaded, pulls the video from GridFS, exports MP3 or WAV, re-samples if asked, uploads to Cloudinary and reports the URL back to the gateway.",
    meta: ["sudeepgowda55/converter-service", "Cloudinary"],
  },
  {
    name: "Notification",
    tech: "Node.js · amqplib · Mailgun",
    body: "Consumes file_converted_notification and emails you the download link.",
    meta: ["sudeepgowda55/notification-service", "Mailgun"],
  },
];

const ORDER = ["Authentication service", "Gateway service", "Converter service", "Notification service"];

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
        <Amp text="Six hops. One email." className="title text-[clamp(3.6rem,11vw,11rem)]" />
        <p className="mt-6 max-w-xl text-lg text-cream/85" data-reveal>
          WaveForge runs as four microservices across two Kubernetes clusters, talking over HTTP and RabbitMQ. Scroll to run one file through the deck.
        </p>
      </div>

      <div>
        {/* React-owned wrapper so GSAP's pin-spacer never touches a React parent */}
        <div ref={pin} className="relative overflow-hidden py-16 lg:flex lg:h-[100svh] lg:flex-col lg:justify-center lg:py-0">
          <div className="pointer-events-none absolute inset-y-[14%] left-1/2 z-10 hidden w-0.5 bg-rec lg:block" aria-hidden="true">
            <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap bg-rec px-2 py-1 font-read text-[10px] uppercase text-cream">Playback head</span>
          </div>
          <ol ref={track} className="flex flex-col gap-10 px-4 sm:px-8 lg:w-max lg:flex-row lg:gap-0 lg:pl-[calc(50vw-14rem)]">
            {NODES.map((n, i) => (
              <li key={n.name} className="frame lg:h-[27rem] lg:w-[28rem] lg:shrink-0">
                <div className={`flex h-full flex-col border-y-2 border-ink transition-colors duration-300 ${i === active ? "bg-cream text-ink" : "bg-ink text-cream"}`}>
                  <div className="sprockets h-4 bg-ink" aria-hidden="true" />
                  <div className="flex min-h-[19rem] flex-1 flex-col p-6 lg:border-x lg:border-ink">
                    <div className="flex items-center justify-between">
                      <span className="font-read text-xs opacity-70">FRAME {String(i + 1).padStart(2, "0")}</span>
                      <span className={`led ${i === active ? "led-on" : ""}`} aria-hidden="true" />
                    </div>
                    <h2 className="title mt-4 text-6xl">{n.name}</h2>
                    <p className="mt-1 font-read text-xs text-rec">{n.tech}</p>
                    <p className="mt-4 flex-1 leading-relaxed opacity-85">{n.body}</p>
                    <ul className="mt-5 flex flex-wrap gap-2">
                      {n.meta.map((m) => (
                        <li key={m} className="border border-current px-2 py-0.5 font-read text-[11px] opacity-70">{m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="sprockets h-4 bg-ink" aria-hidden="true" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <section className="mx-auto max-w-[90rem] px-4 pb-28 pt-8 sm:px-8">
        <Amp as="h2" text="Cue them in this order." className="title text-[clamp(3rem,7vw,6rem)]" />
        <p className="mt-4 max-w-xl text-cream/85" data-reveal>
          After the auth service starts, put its IP in the gateway config. Changing the order changes the IP addressing and the services stop finding each other.
        </p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((o, i) => (
            <li key={o} className="plate flex items-center gap-4 p-5" data-reveal>
              <span className="title text-6xl text-rec">{i + 1}</span>
              <span className="font-bold leading-tight">{o}</span>
            </li>
          ))}
        </ol>
        <div className="mt-14 flex flex-wrap gap-3" data-reveal>
          <Link href="/upload" className="key-rec" data-magnetic>Try it with a video</Link>
          <Link href="/" className="key-cream" data-magnetic>Back to the story</Link>
        </div>
      </section>
    </div>
  );
}
