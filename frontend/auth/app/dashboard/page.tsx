"use client"

import axios from 'axios';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Amp } from '@/components/Motion';
import { SITE } from '@/lib/site';

interface FileData {
  fileid: string;
  filename: string;
  fileurl: string;
  destaudioformat: string;
  samplingrate: string;
  status: string;
}

interface Segment { start: number; end: number; text: string }
interface Source { fileid: string; filename: string; start: number; text: string }
interface Clip { text: string; url: string }

const PENDING = ['queued', 'converting', 'converted', 'transcribing'];
// how far along the signal path each status is: upload, convert, transcribe, ready
const LEVEL: Record<string, number> = { queued: 1, converting: 2, converted: 3, transcribing: 3, done: 4, failed: 2 };
const LABEL: Record<string, string> = {
  queued: 'In the queue',
  converting: 'Converting',
  converted: 'Audio ready',
  transcribing: 'Transcribing',
  done: 'Transcript ready',
  failed: 'Conversion failed',
};
const STAGES = ['Upload', 'Convert', 'Transcribe', 'Ready'];

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// decorative optical-track glyph seeded by the file id, so each file gets a stable silhouette
function Glyph({ seed }: { seed: string }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bars = Array.from({ length: 18 }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 3 + ((h >>> 16) % 14) * Math.sin(((i + 1) / 19) * Math.PI);
  });
  return (
    <svg width="72" height="24" viewBox="0 0 72 24" aria-hidden="true" className="shrink-0">
      {bars.map((b, i) => (
        <rect key={i} x={i * 4} y={12 - b / 2} width="3" height={b} fill={i % 4 ? '#0c0f2a' : '#ff3d2e'} />
      ))}
    </svg>
  );
}

function SignalMeter({ status }: { status: string }) {
  const level = LEVEL[status] ?? 1;
  const busy = PENDING.includes(status) && status !== 'converted';
  return (
    <div className="flex items-center gap-3" role="status" aria-label={LABEL[status] ?? status}>
      <div className="flex gap-1" aria-hidden="true">
        {STAGES.map((stage, i) => (
          <span
            key={stage}
            title={stage}
            className={`led !h-3 !w-5 ${i < level ? (status === 'failed' && i === level - 1 ? 'led-on' : '!bg-ink') : '!bg-ink/15'} ${busy && i === level - 1 ? 'led-on animate-pulse' : ''}`}
          />
        ))}
      </div>
      <span className={`font-read text-xs ${status === 'failed' ? 'font-bold text-rec' : 'text-ink/70'}`}>{LABEL[status] ?? status}</span>
    </div>
  );
}

const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileData[] | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, Segment[]>>({});
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState<string>('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; sources: Source[] } | null>(null);
  const [clips, setClips] = useState<Record<string, Clip[]>>({});
  const [voiceText, setVoiceText] = useState('');
  const [consent, setConsent] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const audios = useRef<Record<string, HTMLAudioElement | null>>({});
  const pendingSeek = useRef<{ fileid: string; t: number } | null>(null);
  const pollUntil = useRef(0);

  const sessionExpired = () => {
    localStorage.clear();
    setSignedIn(false);
    setError('Your session expired. Sign in again.');
  };

  const loadFiles = useCallback(async () => {
    try {
      const response = await axios.post(`${SITE.api}/getfiles`, null, { headers: auth() });
      const list: FileData[] = Array.isArray(response.data) ? response.data : JSON.parse(response.data);
      setFiles(list);
      // keep polling a little after the last pending file, so "converted" can turn into "transcribing"
      if (list.some((f) => PENDING.includes(f.status))) pollUntil.current = Date.now() + 20_000;
      setError('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return sessionExpired();
      setError('Could not fetch files. Is the gateway up?');
    }
  }, []);

  useEffect(() => {
    const ok = !!localStorage.getItem('token');
    setSignedIn(ok);
    if (!ok) return;
    loadFiles();
    const id = setInterval(() => { if (Date.now() < pollUntil.current) loadFiles(); }, 2500);
    return () => clearInterval(id);
  }, [loadFiles]);

  const toggle = async (fileid: string) => {
    const next = open === fileid ? null : fileid;
    setOpen(next);
    setVoiceError('');
    if (next && !clips[next]) {
      axios.get(`${SITE.api}/ai/voice/${next}`, { headers: auth() })
        .then((r) => setClips((c) => ({ ...c, [next]: r.data })))
        .catch(() => {});
    }
    if (next && !transcripts[next]) {
      try {
        const r = await axios.get(`${SITE.api}/ai/transcript/${next}`, { headers: auth() });
        setTranscripts((t) => ({ ...t, [next]: r.data }));
      } catch {
        setTranscripts((t) => ({ ...t, [next]: [] }));
      }
    }
  };

  const seek = (fileid: string, t: number) => {
    const audio = audios.current[fileid];
    if (audio) {
      audio.currentTime = t;
      audio.play().catch(() => {});
    } else {
      // the card is closed: open it and seek once its <audio> mounts
      pendingSeek.current = { fileid, t };
      if (open !== fileid) toggle(fileid);
    }
  };

  const bindAudio = (fileid: string) => (el: HTMLAudioElement | null) => {
    audios.current[fileid] = el;
    if (el && pendingSeek.current?.fileid === fileid) {
      const { t } = pendingSeek.current;
      pendingSeek.current = null;
      el.currentTime = t;
      el.play().catch(() => {});
    }
  };

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const r = await axios.post(`${SITE.api}/ai/ask`, { question, fileid: scope || undefined }, { headers: auth() });
      setAnswer({ text: r.data.answer, sources: r.data.sources });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return sessionExpired();
      const msg = axios.isAxiosError(error) && typeof error.response?.data === 'string' ? error.response.data : 'Could not get an answer. Try again.';
      setAnswer({ text: msg, sources: [] });
    } finally {
      setAsking(false);
    }
  };

  const speak = async (fileid: string) => {
    setSpeaking(true);
    setVoiceError('');
    try {
      const r = await axios.post(`${SITE.api}/ai/voice`, { fileid, text: voiceText, consent }, { headers: auth() });
      setClips((c) => ({ ...c, [fileid]: [r.data, ...(c[fileid] ?? []).filter((x) => x.url !== r.data.url)] }));
      setVoiceText('');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return sessionExpired();
      setVoiceError(axios.isAxiosError(error) && typeof error.response?.data === 'string' ? error.response.data : 'Could not make the clip. Try again.');
    } finally {
      setSpeaking(false);
    }
  };

  const transcribed = files?.filter((f) => f.status === 'done') ?? [];

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-[90rem] px-4 pb-24 pt-28 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Amp text="Cue sheet." className="title text-[clamp(3.6rem,10vw,9rem)]" />
        <Link href="/upload" className="key-rec mb-3" data-magnetic>
          <span className="h-2.5 w-2.5 rounded-full bg-cream" aria-hidden="true" /> Upload
        </Link>
      </div>
      <p className="mt-2 max-w-md text-cream/85" data-reveal>Every file you have fed the deck, live as it moves down the signal path, with its transcript once the AI has listened to it.</p>

      {error && <p role="alert" className="mt-6 inline-block bg-ink px-2 py-1 font-read text-xs text-cream">{error}</p>}

      {signedIn === false && (
        <div className="mt-10 border-2 border-dashed border-cream/40 px-6 py-14 text-center">
          <p className="title text-4xl text-cream/80">No reel loaded</p>
          <p className="mt-2 text-sm text-cream/70"><Link href="/signin" className="font-bold text-cream underline underline-offset-4">Sign in</Link> to see your files.</p>
        </div>
      )}

      {signedIn && transcribed.length > 0 && (
        <form onSubmit={ask} className="plate mt-10 p-5">
          <label htmlFor="question" className="tag">Ask your videos</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input
              id="question"
              className="slot flex-1"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="When did they mention the deadline?"
              maxLength={500}
              required
            />
            <select aria-label="Which files to search" value={scope} onChange={(e) => setScope(e.target.value)} className="slot sm:max-w-[14rem]">
              <option value="">All my files</option>
              {transcribed.map((f) => <option key={f.fileid} value={f.fileid}>{f.filename}</option>)}
            </select>
            <button type="submit" disabled={asking} className="key-rec sm:min-w-[9rem]" data-magnetic>
              <span className={`h-2.5 w-2.5 rounded-full bg-cream ${asking ? 'animate-pulse' : ''}`} aria-hidden="true" />
              {asking ? 'Listening…' : 'Ask'}
            </button>
          </div>
          {answer && (
            <div className="mt-5 border-t-2 border-ink/15 pt-4 motion-safe:animate-[rowIn_500ms_cubic-bezier(0.2,0.9,0.3,1)_both]" aria-live="polite">
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{answer.text}</p>
              {answer.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {answer.sources.slice(0, 4).map((s) => (
                    <button
                      key={`${s.fileid}-${s.start}`}
                      type="button"
                      onClick={() => seek(s.fileid, s.start)}
                      className="border-2 border-ink px-2 py-1 font-read text-[11px] font-medium transition-colors hover:bg-ink hover:text-cream"
                    >
                      ▶ {s.filename} · {mmss(s.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {signedIn && files && files.length === 0 && (
        <p className="mt-16 text-center text-lg">No files yet. <Link href="/upload" className="font-bold underline underline-offset-4">Upload your first video</Link>.</p>
      )}

      {files && files.length > 0 && (
        <ul className="mt-8 space-y-4">
          {files.map((file, i) => {
            const playable = file.fileurl?.startsWith('http');
            const expanded = open === file.fileid;
            const segments = transcripts[file.fileid];
            return (
              <li
                key={file.fileid}
                className="plate motion-safe:animate-[rowIn_500ms_cubic-bezier(0.2,0.9,0.3,1)_both]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4 sm:p-5">
                  <span className="flex min-w-0 flex-1 basis-56 items-center gap-3 font-bold">
                    <Glyph seed={file.fileid} />
                    <span className="truncate">{file.filename}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="border-2 border-ink px-2 py-0.5 font-read text-[11px] font-medium uppercase">{file.destaudioformat}</span>
                    <span className="font-read text-xs text-ink/70">{file.samplingrate === 'n/a' ? 'original rate' : `${file.samplingrate} Hz`}</span>
                  </span>
                  <SignalMeter status={file.status} />
                  {playable && (
                    <button type="button" onClick={() => toggle(file.fileid)} aria-expanded={expanded} className="key-cream !px-4 !py-2 !text-xs">
                      {expanded ? 'Close' : file.status === 'done' ? 'Listen + transcript' : 'Listen'}
                    </button>
                  )}
                </div>

                {expanded && playable && (
                  <div className="border-t-2 border-ink px-4 pb-5 pt-4 sm:px-5">
                    <audio ref={bindAudio(file.fileid)} controls preload="none" src={file.fileurl} className="w-full" />
                    <a href={file.fileurl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-read text-xs font-medium text-rec underline-offset-4 hover:underline">
                      Download {file.destaudioformat.toUpperCase()} ↗
                    </a>
                    {file.status === 'done' && (
                      <div className="mt-4">
                        <p className="tag">Transcript · AI generated</p>
                        {!segments && <p className="mt-2 font-read text-xs text-ink/60">Loading transcript…</p>}
                        {segments && segments.length === 0 && <p className="mt-2 font-read text-xs text-ink/60">No transcript stored for this file.</p>}
                        {segments && segments.length > 0 && (
                          <ol className="mt-2 max-h-80 space-y-1 overflow-y-auto pr-2" data-lenis-prevent>
                            {segments.map((s) => (
                              <li key={s.start} className="flex items-baseline gap-3 text-sm leading-relaxed">
                                <button type="button" onClick={() => seek(file.fileid, s.start)} className="shrink-0 font-read text-xs font-medium text-rec hover:underline" aria-label={`Play from ${mmss(s.start)}`}>
                                  {mmss(s.start)}
                                </button>
                                <span>{s.text}</span>
                              </li>
                            ))}
                          </ol>
                        )}

                        <div className="mt-6 border-t-2 border-ink/15 pt-4">
                          <p className="tag">Voice studio · AI-generated voice</p>
                          <p className="mt-1 text-sm text-ink/70">Type a line and hear it in the voice of the speaker in this file.</p>
                          <textarea
                            aria-label="Text to speak"
                            className="slot min-h-[5rem] resize-y"
                            maxLength={300}
                            value={voiceText}
                            onChange={(e) => setVoiceText(e.target.value)}
                            placeholder="Hi team, quick update: the demo is ready."
                          />
                          <p className="mt-1 text-right font-read text-[11px] text-ink/50">{voiceText.length}/300</p>
                          <label className="mt-1 flex items-start gap-2 text-xs leading-snug text-ink/80">
                            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#ff3d2e]" />
                            <span>This is my voice, or I have the speaker&apos;s permission to clone it. A short sample is sent to Fish Audio to make the clip.</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => speak(file.fileid)}
                            disabled={speaking || !consent || !voiceText.trim()}
                            className="key-rec mt-3 !py-2.5"
                            data-magnetic
                          >
                            <span className={`h-2.5 w-2.5 rounded-full bg-cream ${speaking ? 'animate-pulse' : ''}`} aria-hidden="true" />
                            {speaking ? 'Recording…' : 'Generate clip'}
                          </button>
                          {voiceError && <p role="alert" className="mt-2 font-read text-xs font-medium text-rec">{voiceError}</p>}
                          {(clips[file.fileid] ?? []).map((c) => (
                            <div key={c.url} className="mt-3 border-2 border-ink/20 p-3">
                              <p className="text-sm">&ldquo;{c.text}&rdquo;</p>
                              <audio controls preload="none" src={c.url} className="mt-2 w-full" />
                              <p className="mt-1 font-read text-[11px] uppercase text-ink/50">AI-generated voice</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FilesPage;
