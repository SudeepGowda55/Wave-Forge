"use client"

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Amp } from '@/components/Motion';
import { DUB_LANGS, SITE } from '@/lib/site';

interface DemoFile {
  fileid: string;
  filename: string;
  fileurl: string;
  summary: string | null;
  chapters: { start: number; title: string }[];
  transcript: { start: number; text: string }[];
  clips: { text: string; url: string }[];
  dubs: { id: number; language: string; url: string }[];
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function Demo() {
  const [files, setFiles] = useState<DemoFile[] | null>(null);
  const [failed, setFailed] = useState(false);
  const audios = useRef<Record<string, HTMLAudioElement | null>>({});

  useEffect(() => {
    fetch(`${SITE.api}/demo`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setFiles)
      .catch(() => setFailed(true));
  }, []);

  const seek = (fileid: string, t: number) => {
    const a = audios.current[fileid];
    if (!a) return;
    a.currentTime = t;
    a.play().catch(() => {});
  };

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-[90rem] px-4 pb-24 pt-28 sm:px-8">
      <Amp text="Demo reel." className="title text-[clamp(2.2rem,7vw,6.5rem)]" />
      <p className="mt-2 max-w-xl text-fg/75" data-reveal>
        Real output from the pipeline, generated ahead of time. Every upload is converted, transcribed, summarised and split into chapters; a line can be spoken in the speaker&apos;s cloned voice, and the whole video dubbed into another language.
      </p>
      <p className="mt-3 max-w-xl font-read text-xs text-fg/55" data-reveal>The voices here are synthetic text-to-speech voices, not real people.</p>

      {failed && <p role="alert" className="mt-8 inline-block border border-rose/40 bg-rose/10 px-2 py-1 font-read text-xs text-rose">The demo reel is offline right now. Try again in a minute.</p>}
      {files && files.length === 0 && <p className="mt-10 text-lg text-fg/75">The demo reel is being prepared.</p>}

      <div className="mt-10 space-y-8">
        {files?.map((f) => (
          <article key={f.fileid} className="plate p-5 sm:p-7">
            <h2 className="title text-4xl sm:text-5xl">{f.filename}</h2>
            <audio ref={(el) => { audios.current[f.fileid] = el; }} controls preload="none" src={f.fileurl} className="mt-4 w-full" />

            {f.summary && (
              <section className="mt-6">
                <p className="tag">Summary · AI generated</p>
                <p className="mt-1 text-[15px] leading-relaxed">{f.summary}</p>
                {f.chapters.length > 1 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Chapters">
                    {f.chapters.map((c) => (
                      <li key={c.start}>
                        <button type="button" onClick={() => seek(f.fileid, c.start)} className="border border-cyan/40 px-2 py-1 text-left text-xs transition-colors hover:bg-cyan hover:text-void">
                          <span className="font-read font-medium text-rec">{mmss(c.start)}</span> {c.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {f.transcript.length > 0 && (
              <details className="mt-6">
                <summary className="tag cursor-pointer select-none">Transcript · {f.transcript.length} lines</summary>
                <ol className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-2" data-lenis-prevent>
                  {f.transcript.map((s) => (
                    <li key={s.start} className="flex items-baseline gap-3 text-sm leading-relaxed">
                      <button type="button" onClick={() => seek(f.fileid, s.start)} className="shrink-0 font-read text-xs font-medium text-rec hover:underline" aria-label={`Play from ${mmss(s.start)}`}>{mmss(s.start)}</button>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            {f.clips.length > 0 && (
              <section className="mt-6 border-t border-fg/10 pt-4">
                <p className="tag">Cloned voice · AI-generated</p>
                {f.clips.map((c) => (
                  <div key={c.url} className="mt-3">
                    <p className="text-sm">&ldquo;{c.text}&rdquo;</p>
                    <audio controls preload="none" src={c.url} className="mt-1 w-full" />
                  </div>
                ))}
              </section>
            )}

            {f.dubs.length > 0 && (
              <section className="mt-6 border-t border-fg/10 pt-4">
                <p className="tag">Dubbed · AI voice, machine translated</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {f.dubs.map((d) => (
                    <div key={d.id}>
                      <p className="text-sm font-bold">{DUB_LANGS.find(([code]) => code === d.language)?.[1] ?? d.language}</p>
                      {d.url.endsWith('.mp4')
                        ? <video controls preload="none" src={d.url} className="mt-1 w-full border border-cyan/25" />
                        : <audio controls preload="none" src={d.url} className="mt-1 w-full" />}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap gap-3" data-reveal>
        <Link href="/signup" className="key-rec" data-magnetic>Try it with your own video</Link>
        <Link href="/pipeline" className="key-cream" data-magnetic>How it works</Link>
      </div>
    </div>
  );
}
