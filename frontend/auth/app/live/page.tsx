"use client"

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Amp } from '@/components/Motion';
import { DUB_LANGS, SITE } from '@/lib/site';

type Mode = 'clone' | 'interpret' | 'talk';
type Turn = { role: 'user' | 'assistant'; text: string; audio?: string };

const PASSAGE = "Hi, this is my voice for WaveForge. I'm reading a short passage so the machine can learn how I sound. The quick brown fox jumps over the lazy dog, and the morning train leaves at half past seven every weekday.";
const MAX_SAMPLE_MS = 30_000;

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${Math.round(n)} ms`);

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SITE.api}${path}`, { ...init, headers: { ...auth(), ...(init.headers || {}) } });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    throw new ApiError(r.status, typeof body === 'string' ? body : 'Something went wrong. Try again.');
  }
  return r;
}
const postJson = (path: string, data: unknown) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

/** Microphone recorder with a live analyser, so the page can draw your voice while you speak. */
function useRecorder(canvas: React.RefObject<HTMLCanvasElement>) {
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const raf = useRef(0);
  const [recording, setRecording] = useState(false);

  const draw = useCallback((analyser: AnalyserNode) => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = c.clientHeight * devicePixelRatio);
      const bars = 72, bw = w / bars;
      const grad = g.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, '#6bf6ff');
      grad.addColorStop(1, '#b18cff');
      g.fillStyle = grad;
      for (let i = 0; i < bars; i++) {
        // voice energy sits in the low bins, so spread the first third of the spectrum across the bars
        const v = data[Math.floor((i / bars) * data.length * 0.33)] / 255;
        const bh = Math.max(2, v * h);
        g.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      }
      raf.current = requestAnimationFrame(loop);
    };
    loop();
  }, [canvas]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
    const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      cancelAnimationFrame(raf.current);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    };
    r.start();
    rec.current = r;
    setRecording(true);
    draw(analyser);
  }, [draw]);

  const stop = useCallback(() => new Promise<Blob>((resolve) => {
    const r = rec.current;
    if (!r) return resolve(new Blob());
    r.addEventListener('stop', () => resolve(new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })), { once: true });
    r.stop();
    rec.current = null;
    setRecording(false);
  }), []);

  useEffect(() => () => { rec.current?.stop(); cancelAnimationFrame(raf.current); }, []);
  return { recording, start, stop };
}

export default function Live() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { recording, start, stop } = useRecorder(canvas);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [voice, setVoice] = useState<{ exists: boolean; seconds?: number } | null>(null);
  const [mode, setMode] = useState<Mode>('interpret');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [lines, setLines] = useState<{ text: string; audio: string }[]>([]);
  const [typed, setTyped] = useState('');
  const [lang, setLang] = useState('es');
  const [interp, setInterp] = useState<{ heard: string; said: string; audio: string; timing: string } | null>(null);
  const [talkVoice, setTalkVoice] = useState<'machine' | 'mine'>('machine');
  const [turns, setTurns] = useState<Turn[]>([]);
  const player = useRef<HTMLAudioElement>(null);
  const capturing = useRef<'sample' | 'interpret' | 'talk' | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const ok = !!localStorage.getItem('token');
    setSignedIn(ok);
    if (ok) api('/ai/live/voice').then((r) => r.json()).then(setVoice).catch(() => setVoice({ exists: false }));
  }, []);

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      localStorage.clear();
      setSignedIn(false);
      return setError('Your session expired. Sign in again.');
    }
    if (e instanceof DOMException) return setError('Microphone access was blocked. Allow it in your browser and try again.');
    setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
  };

  const play = (url: string) => {
    if (!player.current) return;
    player.current.src = url;
    player.current.play().catch(() => {});
  };
  const speak = async (text: string, mine: boolean) => {
    const r = await postJson('/ai/live/speak', { text, voice: mine ? 'mine' : 'machine' });
    return URL.createObjectURL(await r.blob());
  };

  // one button records for every mode: press to start, press again to stop and send
  const toggleRecord = async (what: 'sample' | 'interpret' | 'talk') => {
    setError('');
    if (!recording) {
      try {
        await start();
        capturing.current = what;
        const t0 = Date.now();
        setElapsed(0);
        timer.current = setInterval(() => {
          setElapsed(Date.now() - t0);
          if (what === 'sample' && Date.now() - t0 > MAX_SAMPLE_MS) toggleRecord(what);
        }, 100);
      } catch (e) {
        fail(e);
      }
      return;
    }
    clearInterval(timer.current);
    const blob = await stop();
    const kind = capturing.current;
    capturing.current = null;
    if (!blob.size || !kind) return;
    try {
      if (kind === 'sample') {
        setBusy('Learning your voice…');
        await api('/ai/live/voice', { method: 'POST', headers: { 'Content-Type': blob.type, 'X-Consent': consent ? 'yes' : 'no' }, body: blob });
        setVoice(await (await api('/ai/live/voice')).json());
        return;
      }
      const t0 = performance.now();
      setBusy('Listening…');
      const heard = (await (await api('/ai/live/transcribe', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob })).json()).text as string;
      const t1 = performance.now();
      if (!heard) throw new Error("I didn't catch that. Try again a little closer to the mic.");
      if (kind === 'interpret') {
        setBusy('Translating…');
        const said = (await (await postJson('/ai/live/translate', { text: heard, lang })).json()).text as string;
        const t2 = performance.now();
        setBusy('Speaking in your voice…');
        const audio = await speak(said, true);
        const t3 = performance.now();
        setInterp({ heard, said, audio, timing: `heard ${ms(t1 - t0)} · translated ${ms(t2 - t1)} · voiced ${ms(t3 - t2)} · total ${ms(t3 - t0)}` });
        play(audio);
      } else {
        setTurns((ts) => [...ts, { role: 'user', text: heard }]);
        setBusy('Thinking…');
        const history = turns.map(({ role, text }) => ({ role, text }));
        const answer = (await (await postJson('/ai/live/reply', { history, text: heard })).json()).text as string;
        setBusy('Speaking…');
        const audio = await speak(answer, talkVoice === 'mine');
        setTurns((ts) => [...ts, { role: 'assistant', text: answer, audio }]);
        play(audio);
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy('');
    }
  };

  const speakTyped = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    setError('');
    setBusy('Speaking in your voice…');
    try {
      const audio = await speak(typed.trim(), true);
      setLines((l) => [{ text: typed.trim(), audio }, ...l].slice(0, 6));
      setTyped('');
      play(audio);
    } catch (e) {
      fail(e);
    } finally {
      setBusy('');
    }
  };

  const deleteVoice = async () => {
    setError('');
    try {
      await api('/ai/live/voice', { method: 'DELETE' });
      setVoice({ exists: false });
      setLines([]);
      setInterp(null);
    } catch (e) {
      fail(e);
    }
  };

  const recordKey = (what: 'sample' | 'interpret' | 'talk', label: string, disabled = false) => (
    <button
      type="button"
      onClick={() => toggleRecord(what)}
      disabled={disabled || (!!busy && !recording) || (recording && capturing.current !== what)}
      className={recording && capturing.current === what ? 'key-cream w-full !text-rose' : 'key-rec w-full'}
      data-magnetic
    >
      <span className={`h-2.5 w-2.5 rounded-full ${recording && capturing.current === what ? 'animate-pulse bg-rose' : 'bg-void'}`} aria-hidden="true" />
      {recording && capturing.current === what ? `Stop · ${(elapsed / 1000).toFixed(1)} s` : label}
    </button>
  );

  const needsVoice = mode !== 'talk' || talkVoice === 'mine';

  return (
    <div className="relative z-10 mx-auto min-h-screen max-w-[90rem] px-4 pb-24 pt-28 sm:px-8">
      <Amp text="Live." className="title text-[clamp(2.6rem,9vw,7.5rem)]" />
      <p className="mt-3 max-w-xl text-fg/75" data-reveal>
        Record your voice once. Then type and hear yourself, speak and hear yourself in another language, or talk to the machine. Every voice here is AI-generated.
      </p>

      {signedIn === false && (
        <div className="mt-10 border border-dashed border-cyan/30 px-6 py-14 text-center">
          <p className="title text-2xl text-fg/80">No signal</p>
          <p className="mt-2 text-sm text-fg/60"><Link href="/signin" className="font-bold text-cyan underline underline-offset-4">Sign in</Link> to go live.</p>
        </div>
      )}

      {signedIn && (
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
          {/* your voice */}
          <section className="plate p-6" aria-label="Your voice">
            <p className="tag">Your voice</p>
            <canvas ref={canvas} className="mt-4 h-24 w-full" aria-label="Live microphone spectrum" role="img" />
            {voice === null && <p className="mt-3 font-read text-xs text-fg/50">Checking…</p>}
            {voice?.exists ? (
              <div className="mt-3">
                <p className="flex items-center gap-2 font-read text-sm"><span className="led led-on" aria-hidden="true" /> Voice ready · {voice.seconds} s sample</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setVoice({ exists: false })} className="key-cream !px-3 !py-2.5 !text-[11px]">Re-record</button>
                  <button type="button" onClick={deleteVoice} className="key-cream !px-3 !py-2.5 !text-[11px] hover:!text-rose">Delete my voice</button>
                </div>
              </div>
            ) : voice && (
              <div className="mt-3">
                <p className="text-sm text-fg/70">Read this aloud, in a quiet room, for 10 to 30 seconds:</p>
                <blockquote className="mt-2 border-l-2 border-cyan/50 pl-3 text-[15px] leading-relaxed">{PASSAGE}</blockquote>
                <label className="mt-4 flex items-start gap-2 text-xs leading-snug text-fg/80">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#6bf6ff]" />
                  <span>This is my own voice. I agree to it being stored for my account and sent to Fish Audio to generate speech. I can delete it at any time.</span>
                </label>
                <div className="mt-4">{recordKey('sample', 'Record my voice', !consent)}</div>
              </div>
            )}
          </section>

          {/* modes */}
          <section className="plate p-6" aria-label="Live modes">
            <div className="flex flex-wrap gap-2" role="tablist">
              {(['clone', 'interpret', 'talk'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`border px-4 py-2 font-read text-[11px] uppercase tracking-[0.14em] transition-colors ${mode === m ? 'border-cyan bg-cyan/10 text-cyan' : 'border-fg/15 text-fg/60 hover:text-fg'}`}
                >
                  {m === 'clone' ? 'Type and hear' : m === 'interpret' ? 'Interpret' : 'Talk'}
                </button>
              ))}
            </div>

            {needsVoice && !voice?.exists && <p className="mt-6 text-sm text-fg/60">Record your voice first; this mode speaks with it.</p>}

            {mode === 'clone' && voice?.exists && (
              <form onSubmit={speakTyped} className="mt-6">
                <label htmlFor="typed" className="tag">Type a line</label>
                <textarea id="typed" className="slot min-h-[5rem] resize-y" maxLength={300} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Good morning! This is me, but generated." />
                <button type="submit" disabled={!!busy || !typed.trim()} className="key-rec mt-3" data-magnetic>Speak it</button>
                {lines.map((l) => (
                  <div key={l.audio} className="mt-3 flex items-center gap-3 border border-fg/15 p-3">
                    <button type="button" onClick={() => play(l.audio)} className="font-read text-xs text-cyan hover:underline" aria-label={`Play "${l.text}"`}>▶ play</button>
                    <p className="text-sm">&ldquo;{l.text}&rdquo;</p>
                  </div>
                ))}
              </form>
            )}

            {mode === 'interpret' && voice?.exists && (
              <div className="mt-6">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-end">
                  <div>
                    <label htmlFor="lang" className="tag">Speak back in</label>
                    <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)} className="slot">
                      {DUB_LANGS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                  </div>
                  {recordKey('interpret', 'Press and speak')}
                </div>
                {interp && (
                  <div className="mt-5 space-y-3 border-t border-fg/10 pt-4" aria-live="polite">
                    <p className="text-sm text-fg/60">You said: <span className="text-fg">{interp.heard}</span></p>
                    <p className="text-lg text-cyan">{interp.said}</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <button type="button" onClick={() => play(interp.audio)} className="font-read text-xs text-cyan hover:underline">▶ play again</button>
                      <p className="font-read text-[11px] text-fg/45">{interp.timing}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'talk' && (
              <div className="mt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <p className="tag">It answers in</p>
                  {(['machine', 'mine'] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="talkvoice" checked={talkVoice === v} onChange={() => setTalkVoice(v)} className="accent-[#6bf6ff]" />
                      {v === 'machine' ? "the machine's voice" : 'my voice'}
                    </label>
                  ))}
                </div>
                {(talkVoice === 'machine' || voice?.exists) && <div className="mt-4 max-w-sm">{recordKey('talk', 'Press and talk')}</div>}
                <ol className="mt-5 max-h-96 space-y-3 overflow-y-auto pr-1" data-lenis-prevent aria-live="polite">
                  {turns.map((t, i) => (
                    <li key={i} className={`max-w-[85%] border p-3 text-sm leading-relaxed ${t.role === 'user' ? 'ml-auto border-fg/15' : 'border-violet/40 text-fg'}`}>
                      <span className="mb-1 block font-read text-[10px] uppercase tracking-[0.14em] text-fg/45">{t.role === 'user' ? 'You' : 'WaveForge'}</span>
                      {t.text}
                      {t.audio && <button type="button" onClick={() => play(t.audio!)} className="ml-2 font-read text-xs text-cyan hover:underline">▶</button>}
                    </li>
                  ))}
                </ol>
                {turns.length > 0 && <button type="button" onClick={() => setTurns([])} className="mt-3 font-read text-xs text-fg/50 hover:text-fg">Clear conversation</button>}
              </div>
            )}

            {busy && <p className="mt-5 flex items-center gap-2 font-read text-xs text-amber" role="status"><span className="led led-on animate-pulse" aria-hidden="true" />{busy}</p>}
            {error && <p role="alert" className="mt-5 font-read text-xs font-medium text-rose">{error}</p>}
            <audio ref={player} className="hidden" />
          </section>
        </div>
      )}
    </div>
  );
}
