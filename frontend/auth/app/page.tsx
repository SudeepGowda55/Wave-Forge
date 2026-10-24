"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Marquee, ScrubCount, Split } from "@/components/Motion";
import { forge } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger);

// start fetching the 3D chunk as soon as this module evaluates, in parallel with hydration
const loadForge = () => import("@/components/Forge");
if (typeof window !== "undefined") loadForge();
const Forge = dynamic(loadForge, { ssr: false });

const CHAPTERS = [
  {
    tag: "01 · Intake",
    title: "Your video lands in GridFS.",
    body: "The Go + Gin gateway streams the upload straight into MongoDB GridFS, along with the format and sampling rate you picked.",
  },
  {
    tag: "02 · Queue",
    title: "A message joins file_uploaded.",
    body: "The gateway publishes to RabbitMQ and answers you at once. The converter consumes at its own pace, so uploads never wait on encoding.",
  },
  {
    tag: "03 · Forge",
    title: "pydub pulls the sound out.",
    body: "The Python converter fetches the file from GridFS and exports its audio track as MP3 or WAV.",
  },
  {
    tag: "04 · Resample & deliver",
    title: "Re-sampled, stored, mailed.",
    body: "Pick 22,400 Hz, 48,000 Hz or a custom rate and it is re-sampled. The result goes to Cloudinary, and file_converted_notification triggers a Mailgun email with the link.",
  },
];

const STACK = ["Go", "Gin", "MongoDB GridFS", "RabbitMQ", "Python", "pydub", "Cloudinary", "Node.js", "Mailgun", "PostgreSQL", "Kubernetes", "Next.js"];

const SPECS = [
  { n: 4, label: "microservices", note: "gateway, auth, converter, notification" },
  { n: 2, label: "RabbitMQ queues", note: "file_uploaded, file_converted_notification" },
  { n: 2, label: "output formats", note: "MP3 and WAV" },
  { n: 48000, label: "Hz top preset", note: "22,400 Hz preset, or any custom rate" },
];

export default function Home() {
  const story = useRef<HTMLElement>(null);
  const canvasWrap = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);

  useEffect(() => {
    forge.state = 0;
    const ctx = gsap.context(() => {
      // one scrubbed timeline tweening the plain store; the render loop eases toward it
      gsap.timeline({
        scrollTrigger: {
          trigger: story.current,
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: 0.8,
          onUpdate: (st) => setChapter(Math.min(3, Math.floor(st.progress * 4))),
        },
      })
        .to(forge, { state: 1, ease: "none", duration: 1 })
        .to(forge, { state: 2, ease: "none", duration: 1 })
        .to(forge, { state: 3, ease: "none", duration: 1 })
        .to({}, { duration: 0.3 });

      // once the story is over the particles sink back behind the content
      gsap.to(canvasWrap.current, {
        opacity: 0.12,
        ease: "none",
        scrollTrigger: { trigger: "#after-story", start: "top bottom", end: "top 30%", scrub: true },
      });
    });
    return () => {
      ctx.revert();
      forge.state = 0;
    };
  }, []);

  return (
    <>
      <div ref={canvasWrap} className="pointer-events-none fixed inset-0 z-0">
        <Forge offset={0.2} className="h-full w-full" />
      </div>

      {/* hero */}
      <section className="relative z-10 flex min-h-[100svh] flex-col justify-end pb-16 pt-28 lg:justify-center lg:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <p className="eyebrow mb-6" data-reveal>
            Video → audio, as a service
          </p>
          <Split
            text="Forge any video into clean audio."
            className="max-w-[11ch] font-display text-[clamp(3rem,8.5vw,7.5rem)] font-extrabold leading-[0.92] tracking-[-0.035em]"
          />
          <p className="mt-6 max-w-md text-lg text-bone/75" data-reveal>
            Upload an MP4, choose MP3 or WAV and a sampling rate. Four microservices on Kubernetes do the rest and email you the link.
          </p>
          <div className="mt-9 flex flex-wrap gap-3" data-reveal>
            <Link href="/signup" className="btn-hot" data-magnetic>
              Start forging →
            </Link>
            <Link href="/pipeline" className="btn-cold" data-magnetic>
              See the pipeline
            </Link>
          </div>
        </div>
        <p className="eyebrow absolute bottom-5 right-4 hidden text-[10px] sm:right-8 lg:block">Live render · simulated signal, not your file</p>
      </section>

      {/* scroll-scrubbed story: the frame is queued, forged, then resampled */}
      {/* React-owned wrapper: GSAP's pin-spacer is inserted inside it, so unmounting stays clean */}
      <div>
      <section ref={story} className="relative z-10 h-[100svh] overflow-hidden" aria-label="How a video becomes audio">
        <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-t from-soot via-soot/80 to-transparent lg:w-[55%] lg:bg-gradient-to-r" aria-hidden="true" />
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-14 sm:px-8 lg:justify-center lg:pb-0">
          <div className="mb-8 flex gap-2" aria-hidden="true">
            {CHAPTERS.map((_, i) => (
              <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i === chapter ? "w-10 bg-ember" : i < chapter ? "w-4 bg-amber/60" : "w-4 bg-line"}`} />
            ))}
          </div>
          <div className="relative min-h-[16rem] max-w-md sm:min-h-[18rem]">
            {CHAPTERS.map((c, i) => (
              <article
                key={c.tag}
                className={`absolute inset-x-0 top-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${i === chapter ? "translate-y-0 opacity-100" : i < chapter ? "-translate-y-8 opacity-0" : "translate-y-8 opacity-0"}`}
                aria-hidden={i !== chapter}
              >
                <p className="eyebrow mb-4 text-amber">{c.tag}</p>
                <h2 className="font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">{c.title}</h2>
                <p className="mt-5 text-base text-bone/75 sm:text-lg">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      </div>

      <div id="after-story" className="relative z-10 bg-gradient-to-b from-transparent via-soot/90 to-soot">
        <Marquee items={STACK} />

        <section className="mx-auto max-w-7xl px-4 py-28 sm:px-8">
          <p className="eyebrow mb-4">Spec sheet</p>
          <Split as="h2" text="Small surface, real plumbing." className="max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-6xl" />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {SPECS.map((s) => (
              <div key={s.label} className="bg-soot p-7">
                <div data-reveal>
                  <ScrubCount to={s.n} className="font-display text-6xl font-extrabold tracking-tight text-amber" />
                  <p className="mt-3 font-display text-lg font-semibold">{s.label}</p>
                  <p className="mt-1 font-mono text-xs text-ash">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-32 sm:px-8">
          <div className="panel relative overflow-hidden p-8 sm:p-14" data-reveal>
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(255,91,31,0.25),transparent_65%)]" aria-hidden="true" />
            <Split as="h2" text="Bring a video. Leave with a waveform." className="max-w-xl font-display text-4xl font-bold tracking-tight sm:text-5xl" />
            <p className="mt-5 max-w-md text-bone/70">Create an account, drop an MP4 and you&apos;ll get an email when the audio is ready.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-hot" data-magnetic>
                Create account
              </Link>
              <Link href="/upload" className="btn-cold" data-magnetic>
                I have one, upload
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
