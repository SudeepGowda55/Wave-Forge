"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Split } from "@/components/Motion";

gsap.registerPlugin(ScrollTrigger);

const NODES = [
  {
    name: "You",
    tech: "Next.js frontend",
    body: "Signs you up, then POSTs the video as multipart form data with your email, target format and sampling rate.",
    meta: ["POST /signup", "POST /upload", "POST /getfiles"],
  },
  {
    name: "Gateway service",
    tech: "Go · Gin · :8000",
    body: "The only public entry point. Stores the upload in MongoDB GridFS and publishes a message to the file_uploaded queue.",
    meta: ["sudeepgowda55/gateway-service", "/validatejwt", "/updatefileurl"],
  },
  {
    name: "Authentication service",
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
    name: "Converter service",
    tech: "Python · pydub",
    body: "Consumes file_uploaded, pulls the video from GridFS, exports MP3 or WAV, re-samples if asked, uploads to Cloudinary and reports the URL back to the gateway.",
    meta: ["sudeepgowda55/converter-service", "Cloudinary"],
  },
  {
    name: "Notification service",
    tech: "Node.js · amqplib · Mailgun",
    body: "Consumes file_converted_notification and emails you the download link.",
    meta: ["sudeepgowda55/notification-service", "Mailgun"],
  },
];

const ORDER = ["Authentication service", "Gateway service", "Converter service", "Notification service"];

export default function Pipeline() {
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // spine fills with scroll; the packet rides its tip and each node ignites as it's reached
      gsap.fromTo(
        ".spine-fill",
        { scaleY: 0 },
        { scaleY: 1, ease: "none", scrollTrigger: { trigger: list.current, start: "top 60%", end: "bottom 60%", scrub: 0.5 } },
      );
      gsap.fromTo(
        ".packet",
        { top: "0%" },
        { top: "100%", ease: "none", scrollTrigger: { trigger: list.current, start: "top 60%", end: "bottom 60%", scrub: 0.5 } },
      );
      gsap.utils.toArray<HTMLElement>(".node").forEach((el) => {
        ScrollTrigger.create({ trigger: el, start: "top 60%", onEnter: () => el.classList.add("is-lit"), onLeaveBack: () => el.classList.remove("is-lit") });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-32 sm:px-8">
      <p className="eyebrow mb-5" data-reveal>How it works</p>
      <Split text="One upload, six hops, one email." className="max-w-3xl font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.03em] sm:text-7xl" />
      <p className="mt-6 max-w-xl text-lg text-bone/70" data-reveal>
        WaveForge runs as four microservices across two Kubernetes clusters, talking over HTTP and RabbitMQ. Scroll to follow a file through.
      </p>

      <div className="relative mt-20 pl-10 sm:pl-16">
        <div className="absolute bottom-0 left-[11px] top-0 w-[2px] bg-line sm:left-[19px]" aria-hidden="true">
          <div className="spine-fill h-full w-full origin-top bg-gradient-to-b from-amber to-ember" />
          <div className="packet absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-molten shadow-[0_0_18px_6px_rgba(255,91,31,0.6)]" />
        </div>
        <ol ref={list} className="space-y-14">
        {NODES.map((n, i) => (
          <li key={n.name} className="node group relative" data-reveal>
            <span className="absolute -left-10 top-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-soot font-mono text-[10px] text-ash transition-colors duration-500 group-[.is-lit]:border-ember group-[.is-lit]:bg-ember group-[.is-lit]:text-soot sm:-left-16 sm:h-10 sm:w-10 sm:text-xs">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="panel p-6 transition-colors duration-500 group-[.is-lit]:border-ember/40 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{n.name}</h2>
                <p className="font-mono text-xs text-amber">{n.tech}</p>
              </div>
              <p className="mt-3 text-bone/75">{n.body}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {n.meta.map((m) => (
                  <li key={m} className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-ash">{m}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
        </ol>
      </div>

      <section className="mt-28">
        <p className="eyebrow mb-4">Deploy order</p>
        <Split as="h2" text="Start them in this order." className="font-display text-4xl font-bold tracking-tight sm:text-5xl" />
        <p className="mt-4 max-w-xl text-bone/70" data-reveal>
          After the auth service starts, put its IP in the gateway config. Changing the order changes the IP addressing and the services stop finding each other.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((o, i) => (
            <div key={o} className="panel p-5" data-reveal>
              <p className="font-display text-5xl font-extrabold text-amber">{i + 1}</p>
              <p className="mt-2 font-semibold">{o}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-wrap gap-3" data-reveal>
          <Link href="/upload" className="btn-hot" data-magnetic>Try it with a video</Link>
          <Link href="/" className="btn-cold" data-magnetic>Back to the story</Link>
        </div>
      </section>
    </div>
  );
}
