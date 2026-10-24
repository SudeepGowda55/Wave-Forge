"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Amp, TapeCounter, VuMeter } from "@/components/Motion";
import type { Job } from "@/components/Film";
import { forge } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger);

// start fetching the 3D chunk as soon as this module evaluates, in parallel with hydration
const loadFilm = () => import("@/components/Film");
if (typeof window !== "undefined") loadFilm();
const Film = dynamic(loadFilm, { ssr: false });

const CHAPTERS = [
  {
    word: "Intake",
    line: "Your video lands in MongoDB GridFS. The Go + Gin gateway stores it with the format and sampling rate you picked.",
  },
  {
    word: "Queue",
    line: "The gateway drops a message on RabbitMQ's file_uploaded queue and answers at once. Nobody waits on encoding.",
  },
  {
    word: "Extract",
    line: "The Python converter pulls the file from GridFS and pydub lifts the audio track off the picture, as MP3 or WAV.",
  },
  {
    word: "Resample",
    line: "Picked 22,400 Hz, 48,000 Hz or a custom rate? It is re-sampled, stored on Cloudinary, and Mailgun emails you the link.",
  },
];

const SPECS = [
  { n: 4, label: "microservices", note: "gateway · auth · converter · notification" },
  { n: 2, label: "RabbitMQ queues", note: "file_uploaded · file_converted_notification" },
  { n: 2, label: "output formats", note: "MP3 · WAV" },
  { n: 48000, label: "Hz, top preset", note: "or 22,400 Hz, or any custom rate" },
];

export default function Home() {
  const story = useRef<HTMLElement>(null);
  const filmWrap = useRef<HTMLDivElement>(null);
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
          end: "+=300%",
          pin: true,
          scrub: 0.8,
          onUpdate: (st) => {
            setChapter(Math.min(3, Math.floor(st.progress * 4)));
            gsap.set(".reel-progress", { scaleX: st.progress });
          },
        },
      })
        .to(forge, { state: 1, ease: "none", duration: 1 })
        .to(forge, { state: 2, ease: "none", duration: 1 })
        .to(forge, { state: 3, ease: "none", duration: 1 })
        .to({}, { duration: 0.3 });

      gsap.to(filmWrap.current, {
        opacity: 0,
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
      <div ref={filmWrap} className="pointer-events-none fixed inset-0 z-0">
        <Film lift={0.12} drop={2.2} onJob={setJob} className="h-full w-full" />
      </div>

      {/* hero: title band on top, the film world in the middle, a faceplate along the bottom */}
      <section className="relative z-10 flex min-h-[100svh] flex-col justify-between pt-24">
        <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-8">
          <Amp text="Lift the sound" className="title text-[clamp(3.6rem,min(13vw,20vh),13.5rem)]" />
          <Amp text="off the picture." className="title text-right text-[clamp(3.6rem,min(13vw,20vh),13.5rem)] text-cream/95" delay={0.35} />
        </div>

        <div className="mx-auto w-full max-w-[90rem] px-4 pb-6 sm:px-8">
          <div className="plate grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center" data-reveal>
            <p className="max-w-xl text-base leading-relaxed sm:text-lg">
              Upload a video, pick <b>MP3</b> or <b>WAV</b> and a sampling rate. Four microservices on Kubernetes cut the audio out and email you the link.
            </p>
            <div className="border-ink/20 font-read text-xs lg:border-l-2 lg:pl-5" aria-live="polite">
              <p className="tag mb-1">Simulation · not your file</p>
              <p className="flex items-center gap-2">
                <span className={`led ${job ? "led-on" : ""}`} aria-hidden="true" />
                {job ? `Upload #${String(job.n).padStart(3, "0")} · ${job.format.toUpperCase()} · ${job.rate === "n/a" ? "original rate" : `${job.rate} Hz`}` : "Waiting for the first upload…"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="key-rec" data-magnetic>
                <span className="h-2.5 w-2.5 rounded-full bg-cream" aria-hidden="true" /> Start
              </Link>
              <Link href="/pipeline" className="key-cream" data-magnetic>
                Pipeline
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* scroll-scrubbed story: the strip queues, the soundtrack peels off, then gets resampled */}
      <div>
        {/* React-owned wrapper: GSAP's pin-spacer is inserted inside it, so unmounting stays clean */}
        <section ref={story} className="relative z-10 h-[100svh] overflow-hidden" aria-label="How a video becomes audio">
          <div className="mx-auto flex h-full max-w-[90rem] flex-col justify-between px-4 pb-8 pt-24 sm:px-8">
            <div className="flex items-start justify-between gap-6">
              <div className="relative h-[clamp(5rem,15vw,13rem)] flex-1">
                {CHAPTERS.map((c, i) => (
                  <p
                    key={c.word}
                    className={`title absolute left-0 top-0 origin-[50%_55%] text-[clamp(5rem,15vw,13rem)] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.3,1.6,0.5,1)] ${i === chapter ? "scale-y-100 opacity-100" : "scale-y-[0.04] opacity-0"}`}
                    aria-hidden={i !== chapter}
                  >
                    {c.word}
                  </p>
                ))}
              </div>
              <p className="title pt-3 text-4xl text-cream/70 sm:text-6xl" aria-hidden="true">
                0{chapter + 1}<span className="text-cream/30">/04</span>
              </p>
            </div>

            <div>
              {/* film-style subtitle */}
              <div className="relative mx-auto min-h-[6.5rem] max-w-3xl text-center sm:min-h-[5rem]">
                {CHAPTERS.map((c, i) => (
                  <p
                    key={c.word}
                    className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${i === chapter ? "opacity-100" : "opacity-0"}`}
                    aria-hidden={i !== chapter}
                  >
                    <span className="inline bg-ink box-decoration-clone px-3 py-1 text-lg leading-[1.9] text-cream sm:text-2xl sm:leading-[1.75]">{c.line}</span>
                  </p>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-3 font-read text-[11px] uppercase text-cream/70">
                <span>Reel</span>
                <div className="relative h-2 flex-1 bg-ink/40">
                  <div className="reel-progress absolute inset-0 origin-left scale-x-0 bg-rec" />
                  {CHAPTERS.map((c, i) => (
                    <span key={c.word} className={`absolute -top-5 ${i === 0 ? "" : i === CHAPTERS.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${i * 33.33}%` }}>{c.word}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div id="after-story" className="relative z-10">
        <section className="mx-auto max-w-[90rem] px-4 py-24 sm:px-8">
          <Amp as="h2" text="The deck, by the numbers." className="title mb-12 text-[clamp(3rem,8vw,7rem)]" />
          <div className="plate grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="border-b-2 border-ink p-6 lg:border-b-0 lg:border-r-2" data-reveal>
              <VuMeter className="w-full max-w-md" />
              <p className="tag mt-4 normal-case">Needle = how fast you&apos;re scrolling. Peg it to light the peak lamp.</p>
            </div>
            <div className="grid sm:grid-cols-2">
              {SPECS.map((s, i) => (
                <div
                  key={s.label}
                  className={`border-ink p-6 ${i < 3 ? "border-b-2" : ""} ${i === 2 ? "sm:border-b-0" : ""} ${i % 2 === 0 ? "sm:border-r-2" : ""}`}
                  data-reveal
                >
                  <TapeCounter to={s.n} className="font-title text-7xl font-black text-ink" />
                  <p className="mt-3 text-lg font-bold">{s.label}</p>
                  <p className="tag mt-1 normal-case">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-4 pb-28 sm:px-8">
          <div className="flex flex-col gap-8 border-t-2 border-cream/30 pt-12 lg:flex-row lg:items-end lg:justify-between">
            <Amp as="h2" text="Roll it." className="title text-[clamp(5rem,18vw,16rem)]" />
            <div className="max-w-md pb-4" data-reveal>
              <p className="text-lg text-cream/85">Make an account, drop in an MP4 and the audio link lands in your inbox when the converter is done.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/signup" className="key-rec" data-magnetic>Create account</Link>
                <Link href="/upload" className="key-cream" data-magnetic>Upload a video</Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
