import db
import llm

MAX_CONTEXT_CHARS = 10_000  # ~2.5k tokens, inside Groq's free 8k tokens/minute

SYSTEM = (
    "You answer questions about the user's own audio and video files using only the transcript excerpts given. "
    "Cite where the answer comes from as [mm:ss], and include the file name when excerpts come from several files. "
    "If the excerpts do not contain the answer, say so in one sentence. Be concise. "
    "Reply in plain text: no Markdown, no bold, and square brackets only for the [mm:ss] citations."
)


def mmss(seconds):
    return f"{int(seconds) // 60:02d}:{int(seconds) % 60:02d}"


def search(usermail, question, fileid=None, limit=6):
    """Full-text search over the user's transcript segments, any-word match, best first."""
    with db.connect() as conn:
        return conn.execute(
            """
            SELECT s.fileid, f.filename, s.start_s, s.text
            FROM transcript_segments s JOIN userfiles f ON f.fileid = s.fileid
            WHERE s.usermail = %(u)s AND (%(f)s::text IS NULL OR s.fileid = %(f)s)
              AND s.tsv @@ replace(plainto_tsquery('english', %(q)s)::text, ' & ', ' | ')::tsquery
            ORDER BY ts_rank(s.tsv, replace(plainto_tsquery('english', %(q)s)::text, ' & ', ' | ')::tsquery) DESC
            LIMIT %(n)s
            """,
            {"u": usermail, "f": fileid, "q": question, "n": limit},
        ).fetchall()


def file_transcript(usermail, fileid):
    with db.connect() as conn:
        return conn.execute(
            "SELECT start_s, end_s, text FROM transcript_segments WHERE usermail = %s AND fileid = %s ORDER BY start_s",
            (usermail, fileid),
        ).fetchall()


def context_around(usermail, hits, pad=20):
    """The hits plus ±pad seconds of surrounding speech, grouped by file."""
    lines, seen = [], set()
    with db.connect() as conn:
        for fileid, filename, start, _ in hits:
            rows = conn.execute(
                "SELECT start_s, text FROM transcript_segments WHERE usermail = %s AND fileid = %s AND start_s BETWEEN %s AND %s ORDER BY start_s",
                (usermail, fileid, start - pad, start + pad),
            ).fetchall()
            for s, text in rows:
                if (fileid, s) not in seen:
                    seen.add((fileid, s))
                    lines.append(f"{filename} [{mmss(s)}] {text}")
    return "\n".join(lines)


def answer(usermail, question, fileid=None):
    hits = search(usermail, question, fileid)
    if fileid:
        # one file fits in context, so give the model all of it rather than only the keyword hits
        context = "\n".join(f"[{mmss(s)}] {t}" for s, _, t in file_transcript(usermail, fileid))
    else:
        context = context_around(usermail, hits)
    if not context:
        return {"answer": "I couldn't find anything about that in your transcripts.", "sources": []}

    reply = llm.complete(SYSTEM, f"Transcript excerpts:\n{context[:MAX_CONTEXT_CHARS]}\n\nQuestion: {question}")
    sources = [{"fileid": f, "filename": n, "start": s, "text": t} for f, n, s, t in hits]
    return {"answer": reply, "sources": sources}
