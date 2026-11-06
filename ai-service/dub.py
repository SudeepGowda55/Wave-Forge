"""Dub a transcribed upload into another language in the speaker's cloned voice."""
import json, os, subprocess, tempfile
import cloudinary.uploader, requests
from bson import ObjectId
from gridfs import GridFSBucket
from pymongo import MongoClient
import db, llm, voice

# Hindi and Kannada come out accented with an English reference voice, so the UI marks them beta
LANGUAGES = {
    "es": "Spanish", "fr": "French", "de": "German", "ja": "Japanese",
    "zh": "Chinese (Simplified)", "en": "English", "hi": "Hindi", "kn": "Kannada",
}
MAX_SECONDS = int(os.environ.get("DUB_MAX_SECONDS", "180"))
CHUNK_SECONDS, GAP_SECONDS = 12, 1.5

_gridfs = None


def gridfs():
    global _gridfs
    if _gridfs is None:
        client = MongoClient(os.environ["MONGODB_CONNECTION_STRING"])
        _gridfs = GridFSBucket(client["audioconversion"], bucket_name="gridfsbucket")
    return _gridfs


def set_status(dub_id, status, url=None, error=None):
    with db.connect() as conn:
        conn.execute("UPDATE dubs SET status = %s, url = COALESCE(%s, url), error = %s WHERE id = %s", (status, url, error, dub_id))


def group(segments):
    """Merge Whisper segments into ~12 s chunks of continuous speech: (start, end, text)."""
    chunks = []
    for start, end, text in segments:
        last = chunks[-1] if chunks else None
        if last and end - last[0] <= CHUNK_SECONDS and start - last[1] <= GAP_SECONDS:
            chunks[-1] = (last[0], end, f"{last[2]} {text}")
        else:
            chunks.append((start, end, text))
    return chunks


def translate(lines, language):
    system = (
        f"Translate each line into {language} for a voice-over. Keep each translation about as long to say as the original, "
        'and keep names, numbers and product names. Reply with only JSON: {"lines": [...]}, '
        "exactly one translated string per input line, in the same order."
    )
    out = json.loads(llm.complete(system, json.dumps({"lines": lines}, ensure_ascii=False), json_mode=True))["lines"]
    if len(out) != len(lines):
        # the model merged or split lines; fall back to one call per line so timing stays aligned
        out = [llm.complete(f"Translate the user's text into {language}. Reply with only the translation.", line) for line in lines]
    return [str(line) for line in out]


def probe(path, entries):
    return subprocess.run(["ffprobe", "-v", "error", *entries, "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout.strip()


def run(dub_id):
    with db.connect() as conn:
        usermail, fileid, lang, fileurl = conn.execute(
            "SELECT d.usermail, d.fileid, d.language, f.fileurl FROM dubs d JOIN userfiles f ON f.fileid = d.fileid AND f.usermail = d.usermail WHERE d.id = %s",
            (dub_id,),
        ).fetchone()
        segments = conn.execute(
            "SELECT start_s, end_s, text FROM transcript_segments WHERE usermail = %s AND fileid = %s AND start_s < %s ORDER BY start_s",
            (usermail, fileid, MAX_SECONDS),
        ).fetchall()

    set_status(dub_id, "translating")
    chunks = group(segments)
    lines = translate([text for _, _, text in chunks], LANGUAGES[lang])

    with tempfile.TemporaryDirectory() as work:
        set_status(dub_id, "voicing")
        start, end, sample_text = voice.reference(usermail, fileid)
        sample = os.path.join(work, "sample.wav")
        voice.cut_sample(fileurl, start, end, sample)

        source = os.path.join(work, "source")
        with open(source, "wb") as f:
            gridfs().download_to_stream(ObjectId(fileid), f)
        duration = min(float(probe(source, ["-show_entries", "format=duration"])), MAX_SECONDS)

        clips = []
        for i, ((c_start, c_end, _), line) in enumerate(zip(chunks, lines)):
            path = os.path.join(work, f"clip{i}.mp3")
            with open(path, "wb") as f:
                f.write(voice.fish_tts(line, sample, sample_text))
            length = float(probe(path, ["-show_entries", "format=duration"]))
            slot = (chunks[i + 1][0] if i + 1 < len(chunks) else duration) - c_start
            # a translation that runs long is sped up a little so it doesn't talk over the next line
            tempo = min(max(length / slot, 1.0), 1.4) if slot > 0 else 1.0
            clips.append((path, int(c_start * 1000), tempo))

        set_status(dub_id, "mixing")
        # mp3 cover art shows up as a video stream with attached_pic=1; only real video gets muxed
        video = any(line.endswith(",0") for line in probe(source, ["-select_streams", "v", "-show_entries", "stream=index:stream_disposition=attached_pic"]).splitlines())
        inputs = ["-i", source]
        graph = [f"[0:a]volume=0.12,atrim=0:{duration}[bg]"]
        for i, (path, delay, tempo) in enumerate(clips, start=1):
            inputs += ["-i", path]
            graph.append(f"[{i}:a]atempo={tempo:.3f},adelay={delay}:all=1[c{i}]")
        graph.append("[bg]" + "".join(f"[c{i}]" for i in range(1, len(clips) + 1)) + f"amix=inputs={len(clips) + 1}:normalize=0:duration=first[out]")
        out = os.path.join(work, "dub.mp4" if video else "dub.mp3")
        codec = ["-map", "0:v", "-map", "[out]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k"] if video else ["-map", "[out]", "-c:a", "libmp3lame", "-b:a", "128k"]
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *inputs, "-filter_complex", ";".join(graph), *codec, "-t", str(duration), out], check=True)

        url = cloudinary.uploader.upload(
            out, resource_type="video", public_id=f"dub_{fileid}_{lang}_{dub_id}", context="caption=AI-generated voice, machine translated", tags=["ai-voice", "dub"]
        )["secure_url"]
    set_status(dub_id, "done", url=url)


def process(dub_id):
    try:
        run(dub_id)
        print(f"Dub {dub_id} done")
    except llm.QuotaError:
        set_status(dub_id, "failed", error="The free AI limit was reached. Try again later.")
    except voice.VoiceError as e:
        set_status(dub_id, "failed", error=str(e))
    except Exception as e:
        print(f"Dub {dub_id} failed: {e}")
        set_status(dub_id, "failed", error="Dubbing failed.")


def dubs(usermail, fileid):
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT id, language, status, url, error FROM dubs WHERE usermail = %s AND fileid = %s ORDER BY created_at DESC", (usermail, fileid)
        ).fetchall()
    return [{"id": i, "language": l, "status": s, "url": u, "error": e} for i, l, s, u, e in rows]
