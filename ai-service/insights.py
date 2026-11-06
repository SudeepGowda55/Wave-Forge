"""Summary and chapters for a transcribed file."""
import json
import db, llm

SYSTEM = (
    "You write a short summary and a chapter list for a transcript whose lines start with [seconds] markers. "
    'Reply with only JSON: {"summary": "2-4 sentences", "chapters": [{"start": seconds, "title": "3-6 words"}]}. '
    "Start a new chapter at every change of topic, so a short talk that covers three topics gets one chapter per topic; "
    "give a short intro or sign-off its own chapter only if it is longer than about 15 seconds. Use at most 8 chapters. "
    "Every start must be one of the [seconds] markers, and the first chapter starts at the first marker. Plain text only, no Markdown."
)


def generate(usermail, fileid):
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT start_s, text FROM transcript_segments WHERE usermail = %s AND fileid = %s ORDER BY start_s", (usermail, fileid)
        ).fetchall()
    if not rows:
        return
    transcript = "\n".join(f"[{int(s)}] {t}" for s, t in rows)[:12_000]
    data = json.loads(llm.complete(SYSTEM, transcript, json_mode=True))

    # snap each chapter to a real segment start and drop duplicates, so every chapter seeks to speech
    markers = [int(s) for s, _ in rows]
    chapters = {}
    for c in data.get("chapters", [])[:8]:
        try:
            start = min(markers, key=lambda m: abs(m - float(c["start"])))
        except (KeyError, TypeError, ValueError):
            continue
        chapters.setdefault(start, str(c.get("title", "")).strip()[:80])
    chapters = [{"start": s, "title": t} for s, t in sorted(chapters.items()) if t]
    if chapters:
        chapters[0]["start"] = markers[0]  # the model sometimes skips the intro; chapters must cover the whole file
    summary = str(data.get("summary", "")).replace("**", "").strip()[:1000]

    with db.connect() as conn:
        conn.execute(
            """INSERT INTO file_insights (fileid, usermail, summary, chapters) VALUES (%s, %s, %s, %s)
               ON CONFLICT (fileid) DO UPDATE SET summary = EXCLUDED.summary, chapters = EXCLUDED.chapters""",
            (fileid, usermail, summary, json.dumps(chapters)),
        )


def get(usermail, fileid):
    with db.connect() as conn:
        row = conn.execute("SELECT summary, chapters FROM file_insights WHERE usermail = %s AND fileid = %s", (usermail, fileid)).fetchone()
    return {"summary": row[0], "chapters": row[1]} if row else {"summary": None, "chapters": []}
