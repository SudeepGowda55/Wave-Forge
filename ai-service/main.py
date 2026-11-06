import json, os, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import dotenv, pika, requests

dotenv.load_dotenv()

import ask, db, dub, llm, transcribe, voice  # noqa: E402  (after .env is loaded)

AUTH = os.environ.get("AUTH_SERVICE_URL", "http://localhost:8001")
TRANSCRIBE_PER_DAY = int(os.environ.get("TRANSCRIBE_PER_DAY", "10"))
ASK_PER_DAY = int(os.environ.get("ASK_PER_DAY", "30"))
VOICE_PER_DAY = int(os.environ.get("VOICE_PER_DAY", "5"))
DUB_PER_DAY = int(os.environ.get("DUB_PER_DAY", "2"))


def set_status(fileid, status):
    requests.post(f"{AUTH}/updatestatus", data={"fileid": fileid, "status": status}, timeout=30)


def on_converted(ch, method, properties, body):
    data = json.loads(body)
    fileid, usermail = data["fileid"], data["usermail"]
    try:
        if db.used_today(usermail, "transcribe") >= TRANSCRIBE_PER_DAY:
            print(f"Skipping {fileid}: daily transcription cap reached for {usermail}")
            return
        set_status(fileid, "transcribing")
        count = transcribe.transcribe(fileid, usermail, data["fileurl"])
        db.record_usage(usermail, "transcribe")
        # "done" = audio + transcript; "converted" = audio only (no speech, quota hit or error)
        set_status(fileid, "done" if count else "converted")
        print(f"Transcribed {fileid}: {count} segments")
    except Exception as e:
        print(f"Transcription failed for {fileid}: {e}")
        set_status(fileid, "converted")
    finally:
        # shortcut: always ack so one bad file can't block the queue; add a dead-letter queue if retries matter
        ch.basic_ack(delivery_tag=method.delivery_tag)


def on_dub(ch, method, properties, body):
    try:
        dub.process(json.loads(body)["id"])
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def consume(queue, callback):
    # one connection per thread: pika connections are not thread-safe
    connection = pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"]))
    channel = connection.channel()
    channel.queue_declare(queue=queue)
    if queue == "file_converted_ai":
        channel.exchange_declare(exchange="file_converted", exchange_type="fanout")
        channel.queue_bind(queue=queue, exchange="file_converted")
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=queue, on_message_callback=callback)
    print(f"Waiting on {queue}")
    channel.start_consuming()


def publish(queue, payload):
    connection = pika.BlockingConnection(pika.URLParameters(os.environ["RABBITMQ_URL"]))
    try:
        channel = connection.channel()
        channel.queue_declare(queue=queue)
        channel.basic_publish(exchange="", routing_key=queue, body=json.dumps(payload))
    finally:
        connection.close()


class Handler(BaseHTTPRequestHandler):
    # only reachable inside the Docker network; the gateway checks the JWT and sets usermail
    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def user(self):
        usermail = self.headers.get("usermail")
        if not usermail:
            self.reply(401, "missing user")
        return usermail

    def do_GET(self):
        if self.path == "/health":
            return self.reply(200, "ok")
        usermail = self.user()
        if not usermail:
            return
        fileid = self.path.rsplit("/", 1)[1]
        if self.path.startswith("/ai/transcript/"):
            rows = ask.file_transcript(usermail, fileid)
            return self.reply(200, [{"start": s, "end": e, "text": t} for s, e, t in rows])
        if self.path.startswith("/ai/voice/"):
            return self.reply(200, voice.clips(usermail, fileid))
        if self.path.startswith("/ai/dub/"):
            return self.reply(200, dub.dubs(usermail, fileid))
        self.reply(404, "not found")

    def do_POST(self):
        if self.path not in ("/ai/ask", "/ai/voice", "/ai/dub"):
            return self.reply(404, "not found")
        usermail = self.user()
        if not usermail:
            return
        try:
            data = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        except json.JSONDecodeError:
            return self.reply(400, "invalid JSON")
        if self.path == "/ai/voice":
            return self.make_voice(usermail, data)
        if self.path == "/ai/dub":
            return self.make_dub(usermail, data)
        question = str(data.get("question", "")).strip()[:500]
        if not question:
            return self.reply(400, "question is required")
        if db.used_today(usermail, "ask") >= ASK_PER_DAY:
            return self.reply(429, f"Daily limit of {ASK_PER_DAY} questions reached. Try again tomorrow.")
        try:
            result = ask.answer(usermail, question, data.get("fileid") or None)
        except llm.QuotaError:
            return self.reply(429, "The free AI limit is reached right now. Try again in a minute.")
        db.record_usage(usermail, "ask")
        self.reply(200, result)

    def make_voice(self, usermail, data):
        text = str(data.get("text", "")).strip()
        if data.get("consent") is not True:
            return self.reply(400, "Confirm that this is your voice or that you have the speaker's permission.")
        if not text or len(text) > 300:
            return self.reply(400, "Write between 1 and 300 characters.")
        if db.used_today(usermail, "voice") >= VOICE_PER_DAY:
            return self.reply(429, f"Daily limit of {VOICE_PER_DAY} voice clips reached. Try again tomorrow.")
        try:
            url, cached = voice.speak(usermail, str(data.get("fileid", "")), text)
        except voice.VoiceError as e:
            return self.reply(400, str(e))
        except llm.QuotaError:
            return self.reply(429, "The free voice limit is reached right now. Try again later.")
        if not cached:
            db.record_usage(usermail, "voice")
        self.reply(200, {"url": url, "text": text})


    def make_dub(self, usermail, data):
        fileid, lang = str(data.get("fileid", "")), str(data.get("language", ""))
        if data.get("consent") is not True:
            return self.reply(400, "Confirm that this is your voice or that you have the speaker's permission.")
        if lang not in dub.LANGUAGES:
            return self.reply(400, "Pick one of the listed languages.")
        with db.connect() as conn:
            if not conn.execute("SELECT 1 FROM userfiles WHERE usermail = %s AND fileid = %s AND status = 'done'", (usermail, fileid)).fetchone():
                return self.reply(400, "Pick one of your transcribed files.")
            existing = conn.execute(
                "SELECT id, status FROM dubs WHERE usermail = %s AND fileid = %s AND language = %s AND status <> 'failed'", (usermail, fileid, lang)
            ).fetchone()
            if existing:
                return self.reply(200, {"id": existing[0], "language": lang, "status": existing[1]})
            if db.used_today(usermail, "dub") >= DUB_PER_DAY:
                return self.reply(429, f"Daily limit of {DUB_PER_DAY} dubs reached. Try again tomorrow.")
            dub_id = conn.execute(
                "INSERT INTO dubs (usermail, fileid, language) VALUES (%s, %s, %s) RETURNING id", (usermail, fileid, lang)
            ).fetchone()[0]
        db.record_usage(usermail, "dub")
        publish("dub_requested", {"id": dub_id})
        self.reply(202, {"id": dub_id, "language": lang, "status": "queued"})


if __name__ == "__main__":
    threading.Thread(target=consume, args=("file_converted_ai", on_converted), daemon=True).start()
    threading.Thread(target=consume, args=("dub_requested", on_dub), daemon=True).start()
    print("AI service listening on :8002")
    ThreadingHTTPServer(("0.0.0.0", 8002), Handler).serve_forever()
