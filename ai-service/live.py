"""Live mode: record your voice once, then speak typed lines, interpret speech, or talk to the machine."""
import hashlib, os, subprocess, tempfile
import cloudinary.uploader, requests
import db, llm, voice
from dub import LANGUAGES
from llm import GROQ_URL, QuotaError, groq_headers

MAX_UPLOAD = 6 * 1024 * 1024  # a 30 s browser recording is well under 1 MB
EXT = {"audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav"}

_samples = {}  # usermail -> (sample_url, local wav path), so each line doesn't re-download the sample

TALK_SYSTEM = (
    "You are WaveForge, a friendly voice assistant built into an app that converts videos to audio, transcribes them, "
    "answers questions about them, clones voices with consent, and dubs videos into other languages. "
    "Your reply will be spoken aloud: answer in one to three short sentences of plain text, no lists, no Markdown, no emoji."
)


def ext_for(content_type):
    return EXT.get((content_type or "").split(";")[0].strip(), "webm")


def whisper(path, filename):
    with open(path, "rb") as f:
        r = requests.post(
            f"{GROQ_URL}/audio/transcriptions",
            headers=groq_headers(),
            files={"file": (filename, f)},
            data={"model": "whisper-large-v3-turbo", "response_format": "verbose_json"},
            timeout=120,
        )
    if r.status_code == 429:
        raise QuotaError("whisper rate limited")
    r.raise_for_status()
    d = r.json()
    return d.get("text", "").strip(), d.get("language"), float(d.get("duration") or 0)


def transcribe(body, content_type):
    if len(body) > MAX_UPLOAD:
        raise voice.VoiceError("That recording is too long. Keep it under a minute.")
    with tempfile.TemporaryDirectory() as work:
        path = os.path.join(work, f"clip.{ext_for(content_type)}")
        with open(path, "wb") as f:
            f.write(body)
        text, language, _ = whisper(path, os.path.basename(path))
    return {"text": text, "language": language}


def save_voice(usermail, body, content_type):
    """Store the user's sample: converted to mono wav, at most 30 s, with Whisper's transcript as the reference text."""
    if len(body) > MAX_UPLOAD:
        raise voice.VoiceError("That recording is too long. Keep it under a minute.")
    with tempfile.TemporaryDirectory() as work:
        raw = os.path.join(work, f"raw.{ext_for(content_type)}")
        with open(raw, "wb") as f:
            f.write(body)
        wav = os.path.join(work, "sample.wav")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-t", "30", "-ac", "1", "-ar", "22050", wav], check=True)
        text, _, seconds = whisper(wav, "sample.wav")
        if seconds < voice.MIN_SAMPLE or len(text.split()) < 8:
            raise voice.VoiceError(f"I need at least {voice.MIN_SAMPLE} seconds of clear speech. Try reading the passage aloud.")
        public_id = "live_voice_" + hashlib.sha1(usermail.encode()).hexdigest()[:16]
        url = cloudinary.uploader.upload(
            wav, resource_type="video", public_id=public_id, overwrite=True, invalidate=True, tags=["live-voice-sample"]
        )["secure_url"]
    with db.connect() as conn:
        conn.execute(
            """INSERT INTO live_voices (usermail, sample_url, sample_text, seconds) VALUES (%s, %s, %s, %s)
               ON CONFLICT (usermail) DO UPDATE SET sample_url = EXCLUDED.sample_url, sample_text = EXCLUDED.sample_text,
               seconds = EXCLUDED.seconds, created_at = now()""",
            (usermail, url, text, seconds),
        )
    _samples.pop(usermail, None)
    return {"seconds": round(seconds, 1), "text": text}


def get_voice(usermail):
    with db.connect() as conn:
        row = conn.execute("SELECT sample_text, seconds, created_at FROM live_voices WHERE usermail = %s", (usermail,)).fetchone()
    return {"exists": True, "text": row[0], "seconds": round(row[1], 1), "created_at": row[2].isoformat()} if row else {"exists": False}


def delete_voice(usermail):
    cloudinary.uploader.destroy("live_voice_" + hashlib.sha1(usermail.encode()).hexdigest()[:16], resource_type="video", invalidate=True)
    with db.connect() as conn:
        conn.execute("DELETE FROM live_voices WHERE usermail = %s", (usermail,))
    cached = _samples.pop(usermail, None)
    if cached and os.path.exists(cached[1]):
        os.remove(cached[1])


def _sample(usermail):
    with db.connect() as conn:
        row = conn.execute("SELECT sample_url, sample_text FROM live_voices WHERE usermail = %s", (usermail,)).fetchone()
    if not row:
        raise voice.VoiceError("Record your voice first.")
    url, text = row
    cached = _samples.get(usermail)
    if not cached or cached[0] != url or not os.path.exists(cached[1]):
        fd, path = tempfile.mkstemp(suffix=".wav")
        with os.fdopen(fd, "wb") as f:
            f.write(requests.get(url, timeout=60).content)
        _samples[usermail] = (url, path)
    return _samples[usermail][1], text


def speak(usermail, text, mine):
    if mine:
        path, sample_text = _sample(usermail)
        # "low" starts audio ~2 s sooner on the free model (measured); studio clips and dubs keep "normal"
        return voice.fish_tts(text, path, sample_text, latency="low")
    # the machine's own voice: Fish's default speaker, no reference sample
    r = requests.post(
        "https://api.fish.audio/v1/tts",
        json={"text": text, "format": "mp3", "latency": "low"},
        headers={"Authorization": f"Bearer {os.environ['FISH_API_KEY']}", "model": voice.FISH_MODEL},
        timeout=120,
    )
    if r.status_code in (402, 429) or r.status_code >= 500:
        raise QuotaError(f"fish {r.status_code}")
    r.raise_for_status()
    return r.content


def translate(text, lang):
    if lang not in LANGUAGES:
        raise voice.VoiceError("Pick one of the listed languages.")
    out = llm.complete(f"Translate the user's words into {LANGUAGES[lang]} as they would be said aloud. Reply with only the translation.", text)
    return {"text": out.replace("**", "").strip()}


def reply(history, text):
    turns = [f"{'User' if h.get('role') == 'user' else 'WaveForge'}: {str(h.get('text', ''))[:500]}" for h in history[-8:]]
    prompt = "\n".join(turns + [f"User: {text}", "WaveForge:"])
    return {"text": llm.complete(TALK_SYSTEM, prompt).replace("**", "").strip()}
