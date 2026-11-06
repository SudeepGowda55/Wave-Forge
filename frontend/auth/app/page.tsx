"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Amp, SpectrumBand, TapeCounter } from "@/components/Motion";
import type { Job } from "@/components/Field";
import { forge } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger);

// start fetching the 3D chunk as soon as this module evaluates, in parallel with hydration
const loadField = () => import("@/components/Field");
if (typeof window !== "undefined") loadField();
const Field = dynamic(loadField, { ssr: false });

const CHAPTERS = [
  {
    word: "Listen",
    color: "text-cyan",
    line: "Your video lands in MongoDB GridFS through the Go gateway, and a message joins RabbitMQ's file_uploaded queue. The upload answers at once; nobody waits on encoding.",
  },
  {
    word: "Extract",
    color: "text-cyan",
    line: "The Python converter pulls the file and ffmpeg lifts the sound off the picture as MP3 or WAV, re-sampled to the rate you picked, then stored on Cloudinary.",
  },
  {
    word: "Understand",
    color: "text-violet",
    line: "A fanout exchange hands the audio to the AI service. Groq Whisper writes a timestamped transcript, then an LLM adds a summary and chapters you can search and question.",
  },
  {
    word: "Speak",
    color: "text-amber",
    line: "With your consent, Fish Audio clones the speaker from twenty seconds of their own words: say new lines in their voice, or dub the video into another language.",
  },
];

const SPECS = [
  { n: 5, label: "microservices", note: "gateway · auth · converter · AI · notifier" },
  { n: 4, label: "RabbitMQ queues", note: "uploads · AI · email · dubbing" },
  { n: 8, label: "dub languages", note: "Spanish to Japanese; Hindi and Kannada in beta" },
  { n: 600, label: "seconds transcribed", note: "the first ten minutes of every upload" },
];

const FEATURES = [
  { title: "Convert", body: "Video to MP3 or WAV at 22,400 Hz, 48,000 Hz or any rate you type, with the link emailed to you.", href: "/upload", cta: "Upload a video", accent: "#6bf6ff" },
  { title: "Ask", body: "Every upload is transcribed with timestamps. Ask a question and get the answer with the moment it was said.", href: "/demo", cta: "See it answer", accent: "#b18cff" },
  { title: "Clone", body: "Type a line and hear it in the voice of the person in your video. Consent first, clips labelled as AI.", href: "/demo", cta: "Hear a clone", accent: "#ffb547" },
  { title: "Dub", body: "The first three minutes translated and spoken in the speaker's own voice, laid back onto the original video.", href: "/demo", cta: "Watch a dub", accent: "#6bf6ff" },
];

export default function Home() {
  const story = useRef<HTMLElement>(null);
  const fieldWrap = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    forge.state = 0;
    const ctx = gsap.context(() => {
      // one scrubbed timeline tweening the plain store; the render loop eases toward it
      gsap.timeline({
        scrollTrigger: {
          trigger: story.current,
          start: "top top",
          end: "+=420%",
          pin: true,
          scrub: 0.8,
          onUpdate: (st) => gsap.set(".story-progress", { scaleX: st.progress }),
        },
        // the scrubbed timeline keeps easing after the last scroll event, so the caption follows it, not the scroll
        onUpdate: () => setChapter(Math.min(3, Math.round(forge.state))),
      })
        .to({}, { duration: 0.5 })
        .to(forge, { state: 1, ease: "power1.inOut", duration: 1 })
        .to({}, { duration: 0.7 })
        .to(forge, { state: 2, ease: "power1.inOut", duration: 1 })
        .to({}, { duration: 0.7 })
        .to(forge, { state: 3, ease: "power1.inOut", duration: 1 })
        .to({}, { duration: 0.6 });

      gsap.to(fieldWrap.current, {
        opacity: 0.18,
        ease: "none",
        scrollTrigger: { trigger: "#after-story", start: "top bottom", end: "top 20%", scrub: true },
      });
    });
    return () => {
      ctx.revert();
      forge.state = 0;
    };
  }, []);

  return (
    <>
      <div ref={fieldWrap} className="pointer-events-none fixed inset-0 z-0">
        <Field lift={0.08} shift={0.17} onJob={setJob} className="h-full w-full" />
      </div>

      {/* hero: the field fills the screen; the headline sits low-left, the live sim readout low-right */}
      <section className="relative z-10 flex min-h-[100svh] flex-col justify-end pb-10 pt-28">
        {/* scrim so the copy reads over the brightest particles */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,6,11,0.88)_0%,rgba(5,6,11,0.55)_38%,transparent_62%),linear-gradient(0deg,rgba(5,6,11,0.8)_0%,transparent_45%)]" aria-hidden="true" />
        <div className="mx-auto grid w-full max-w-[90rem] gap-8 px-4 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="tag mb-5" data-reveal>Video in · words and voices out</p>
            <Amp text="The machine" className="title text-[clamp(1.9rem,5vw,5rem)]" />
            <Amp text="that listens." className="title text-[clamp(1.9rem,5vw,5rem)] text-cyan [text-shadow:0_0_40px_rgba(107,246,255,0.45)]" delay={0.3} />
            <p className="mt-6 max-w-xl text-base leading-relaxed text-fg/75 sm:text-lg" data-reveal>
              Upload a video. WaveForge pulls the audio out, transcribes and summarises it, answers questions about it, and can speak new lines or a whole dub in the speaker&apos;s own voice.
            </p>
            <div className="mt-8 flex flex-wrap gap-3" data-reveal>
              <Link href="/signup" className="key-rec" data-magnetic>Start listening</Link>
              <Link href="/demo" className="key-cream" data-magnetic>See the demo</Link>
            </div>
          </div>

          <div className="plate w-full p-5 lg:w-80" data-reveal aria-live="polite">
            <p className="tag">Simulation · not your file</p>
            <p className="mt-3 flex items-center gap-2 font-read text-sm">
              <span className={`led ${job ? "led-on" : ""}`} aria-hidden="true" />
              {job ? `Upload · ${job.format.toUpperCase()} · ${job.rate === "n/a" ? "original rate" : `${job.rate} Hz`}` : "Waiting for the first upload…"}
            </p>
            <p className="mt-2 font-read text-[11px] text-fg/45">{job ? `${job.n} simulated since you arrived` : " "}</p>
          </div>
        </div>
      </section>

      {/* scroll-scrubbed story: the field becomes a waveform, then words, then voices */}
      <div>
        {/* React-owned wrapper: GSAP's pin-spacer is inserted inside it, so unmounting stays clean */}
        <section ref={story} className="relative z-10 h-[100svh] overflow-hidden" aria-label="How a video becomes words and voices">
          <div className="mx-auto flex h-full max-w-[90rem] flex-col justify-between px-4 pb-10 pt-28 sm:px-8">
            <div className="relative h-[clamp(3rem,8vw,7rem)]">
              {CHAPTERS.map((c, i) => (
                <p
                  key={c.word}
                  className={`title absolute left-0 top-0 text-[clamp(2.6rem,8vw,7rem)] transition-[opacity,transform,letter-spacing] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${c.color} ${i === chapter ? "translate-y-0 tracking-[-0.02em] opacity-100" : "translate-y-4 tracking-[0.2em] opacity-0"}`}
                  aria-hidden={i !== chapter}
                >
                  {c.word}
                </p>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_1fr] lg:items-end">
              <div className="plate relative min-h-[9.5rem] p-6 sm:min-h-[8rem]">
                {CHAPTERS.map((c, i) => (
                  <p
                    key={c.word}
                    className={`absolute inset-6 text-base leading-relaxed transition-opacity duration-300 sm:text-lg ${i === chapter ? "opacity-100" : "opacity-0"}`}
                    aria-hidden={i !== chapter}
                  >
                    {c.line}
                  </p>
                ))}
              </div>
              <div className="font-read text-[11px] uppercase tracking-[0.14em] text-fg/50">
                <div className="flex justify-between">
                  {CHAPTERS.map((c, i) => (
                    <span key={c.word} className={`transition-colors ${i <= chapter ? "text-cyan" : ""}`}>{c.word}</span>
                  ))}
                </div>
                <div className="relative mt-3 h-px bg-fg/15">
                  <div className="story-progress absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-cyan via-violet to-amber shadow-[0_0_10px_#6bf6ff]" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div id="after-story" className="relative z-10">
        <section className="mx-auto max-w-[90rem] px-4 py-24 sm:px-8">
          <Amp as="h2" text="The stack, by the numbers." className="title mb-12 text-[clamp(1.8rem,4.6vw,4rem)]" />
          <div className="grid gap-px bg-cyan/10 sm:grid-cols-2 lg:grid-cols-4">
            {SPECS.map((s) => (
              <div key={s.label} className="bg-void p-6" data-reveal>
                <TapeCounter to={s.n} className="font-title text-6xl text-cyan" />
                <p className="mt-4 font-bold">{s.label}</p>
                <p className="mt-1 font-read text-xs text-fg/50">{s.note}</p>
              </div>
            ))}
          </div>
          <div className="plate mt-10 p-6" data-reveal>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="tag">Spectrum · driven by your scroll speed</p>
              <p className="font-read text-[11px] text-fg/45">Flick the page to light every band</p>
            </div>
            <SpectrumBand className="mt-5 h-28" />
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-4 pb-24 sm:px-8">
          <Amp as="h2" text="Four things it does." className="title mb-12 text-[clamp(1.8rem,4.6vw,4rem)]" />
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((f) => (
              <Link key={f.title} href={f.href} className="plate group block p-7 transition-[box-shadow] hover:shadow-[inset_0_0_0_1px_rgba(107,246,255,0.5)]" data-reveal>
                <p className="title text-3xl" style={{ color: f.accent }}>{f.title}</p>
                <p className="mt-4 max-w-md leading-relaxed text-fg/75">{f.body}</p>
                <p className="mt-6 font-read text-xs uppercase tracking-[0.14em] text-fg/60 transition-colors group-hover:text-cyan">{f.cta} →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-4 pb-28 sm:px-8">
          <div className="flex flex-col gap-8 border-t border-cyan/15 pt-12 lg:flex-row lg:items-end lg:justify-between">
            <Amp as="h2" text="Let it listen." className="title text-[clamp(2.4rem,8vw,7rem)]" />
            <div className="max-w-md pb-2" data-reveal>
              <p className="text-lg text-fg/75">Make an account, drop in a video, and watch it move through the pipeline live on your dashboard.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/signup" className="key-rec" data-magnetic>Create account</Link>
                <Link href="/upload" className="key-cream" data-magnetic>Upload a video</Link>
                <Link href="/pipeline" className="key-cream" data-magnetic>How it works</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
