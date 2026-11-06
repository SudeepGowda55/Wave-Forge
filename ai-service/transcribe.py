import os, subprocess, tempfile
import requests
import db
from llm import GROQ_URL, QuotaError, groq_headers

MAX_SECONDS = int(os.environ.get("TRANSCRIBE_MAX_SECONDS", "600"))


def transcribe(fileid, usermail, fileurl):
    """Transcribe the first MAX_SECONDS of a converted file into transcript_segments.
    Returns the number of segments stored."""
    with tempfile.TemporaryDirectory() as workdir:
        source = os.path.join(workdir, "source")
        with requests.get(fileurl, stream=True, timeout=120) as r:
            r.raise_for_status()
            with open(source, "wb") as f:
                for chunk in r.iter_content(1 << 20):
                    f.write(chunk)

        # mono 16 kHz at 32 kbps keeps 10 minutes around 2.4 MB, well under Groq's upload limit
        small = os.path.join(workdir, "speech.mp3")
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", source, "-t", str(MAX_SECONDS), "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", small],
            check=True,
        )

        with open(small, "rb") as f:
            r = requests.post(
                f"{GROQ_URL}/audio/transcriptions",
                headers=groq_headers(),
                files={"file": ("speech.mp3", f, "audio/mpeg")},
                data={"model": "whisper-large-v3-turbo", "response_format": "verbose_json"},
                timeout=300,
            )
        if r.status_code == 429:
            raise QuotaError("whisper rate limited")
        r.raise_for_status()

    segments = [(fileid, usermail, s["start"], s["end"], s["text"].strip()) for s in r.json().get("segments", []) if s["text"].strip()]

    with db.connect() as conn:
        conn.execute("DELETE FROM transcript_segments WHERE fileid = %s", (fileid,))
        with conn.cursor() as cur:
            cur.executemany("INSERT INTO transcript_segments (fileid, usermail, start_s, end_s, text) VALUES (%s, %s, %s, %s, %s)", segments)
    return len(segments)
