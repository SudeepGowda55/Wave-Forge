import hashlib, os, subprocess, tempfile
import cloudinary, cloudinary.uploader, ormsgpack, requests
import db
from llm import QuotaError

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)

MIN_SAMPLE, TARGET_SAMPLE, MAX_SAMPLE = 8, 20, 30  # seconds of reference speech
# Fish retires and renames models; switching is an .env change (402 when the free tier ends -> "voice paused")
FISH_MODEL = os.environ.get("FISH_MODEL", "s2.1-pro-free")


class VoiceError(Exception):
    """A user-facing reason the clip can't be made (e.g. not enough speech)."""


def reference(usermail, fileid):
    """First ~20 s of transcribed speech: (start, end, the words spoken), taken from whole segments."""
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT start_s, end_s, text FROM transcript_segments WHERE usermail = %s AND fileid = %s ORDER BY start_s",
            (usermail, fileid),
        ).fetchall()
    picked = []
    for start, end, text in rows:
        if picked and end - picked[0][0] > MAX_SAMPLE:
            break
        picked.append((start, end, text))
        if end - picked[0][0] >= TARGET_SAMPLE:
            break
    if not picked or picked[-1][1] - picked[0][0] < MIN_SAMPLE:
        raise VoiceError(f"This file needs at least {MIN_SAMPLE} seconds of transcribed speech to clone a voice.")
    return picked[0][0], picked[-1][1], " ".join(t for _, _, t in picked)


def cut_sample(fileurl, start, end, path):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(start), "-to", str(end), "-i", fileurl, "-ac", "1", "-ar", "22050", path], check=True)


def fish_tts(text, sample_path, sample_text):
    body = {"text": text, "format": "mp3", "references": [{"audio": open(sample_path, "rb").read(), "text": sample_text}]}
    r = requests.post(
        "https://api.fish.audio/v1/tts",
        data=ormsgpack.packb(body),
        headers={"Authorization": f"Bearer {os.environ['FISH_API_KEY']}", "Content-Type": "application/msgpack", "model": FISH_MODEL},
        timeout=180,
    )
    if r.status_code in (402, 429) or r.status_code >= 500:
        raise QuotaError(f"fish {r.status_code}")
    r.raise_for_status()
    return r.content


def speak(usermail, fileid, text):
    """Say `text` in the voice of the speaker in `fileid`; returns the clip URL (cached per file + text)."""
    with db.connect() as conn:
        row = conn.execute("SELECT fileurl FROM userfiles WHERE usermail = %s AND fileid = %s AND status = 'done'", (usermail, fileid)).fetchone()
        cached = conn.execute("SELECT url FROM voice_clips WHERE usermail = %s AND fileid = %s AND text = %s", (usermail, fileid, text)).fetchone()
    if not row:
        raise VoiceError("Pick one of your transcribed files.")
    if cached:
        return cached[0], True

    start, end, sample_text = reference(usermail, fileid)
    with tempfile.TemporaryDirectory() as workdir:
        sample = os.path.join(workdir, "sample.wav")
        cut_sample(row[0], start, end, sample)
        audio = fish_tts(text, sample, sample_text)
        clip = os.path.join(workdir, "clip.mp3")
        with open(clip, "wb") as f:
            f.write(audio)
        digest = hashlib.sha1(text.encode()).hexdigest()[:10]
        url = cloudinary.uploader.upload(
            clip, resource_type="video", public_id=f"voice_{fileid}_{digest}", context="caption=AI-generated voice", tags=["ai-voice"]
        )["secure_url"]

    with db.connect() as conn:
        conn.execute("INSERT INTO voice_clips (usermail, fileid, text, url) VALUES (%s, %s, %s, %s)", (usermail, fileid, text, url))
    return url, False


def clips(usermail, fileid):
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT text, url, created_at FROM voice_clips WHERE usermail = %s AND fileid = %s ORDER BY created_at DESC", (usermail, fileid)
        ).fetchall()
    return [{"text": t, "url": u, "created_at": c.isoformat()} for t, u, c in rows]
