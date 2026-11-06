# WaveForge

Upload a video (or audio file), pick MP3 or WAV and a sampling rate, and get the converted audio by email and on your dashboard. Every upload is also transcribed, so you can ask questions about your videos, generate new lines in the speaker's cloned voice, and dub the video into another language.

Live: https://waveforge.sudeepgowda.tech · API: https://api.waveforge.sudeepgowda.tech

![Architecture_diagram](https://github.com/SudeepGowda55/Audio_Conversion-Microservice/blob/main/images/mini-arch.png?raw=true)

## How it works

1. **Gateway** (Go/Gin, port 8000): the only public service. Checks the JWT with the auth service, stores the upload in **MongoDB GridFS**, records it through the auth service and publishes a message to the `file_uploaded` queue.
2. **Authentication service** (Go/Gin, port 8001, internal): signup and JWT validation, plus the `users`/`userfiles` tables in **PostgreSQL (Neon)**.
3. **Converter** (Python + ffmpeg): consumes `file_uploaded`, pulls the file from GridFS, converts/re-samples it with pydub, uploads the result to **Cloudinary**, writes the URL back through the auth service and publishes to `file_converted_notification`.
4. **AI service** (Python): gets its own copy of every converted file from the `file_converted` fanout exchange.
   - **Transcription**: first 10 minutes via Groq Whisper into Postgres full-text-indexed segments.
   - **Ask your videos** (`/ai/ask`): full-text retrieval over a user's transcripts, answered by a free Groq LLM with `[mm:ss]` citations.
   - **Voice cloning** (`/ai/voice`): any line in the speaker's voice, using ~20 s of their transcribed speech as the reference for Fish Audio's free `s2.1-pro-free` model.
   - **Dubbing** (`/ai/dub`, queue `dub_requested`): translates the first 3 minutes, voices each ~12 s chunk in the cloned voice at its original timestamp, and muxes it onto the original video.
   - Consent is required for cloning and dubbing, and per-user daily caps keep everything inside free tiers.
5. **Notification service** (Node): consumes `file_converted_notification` and emails the download link with **Mailgun**.

Messages flow through **RabbitMQ (CloudAMQP)**. Each file's status (`queued → converting → converted → transcribing → done`) is shown live on the dashboard. The frontend is Next.js in `frontend/auth`, deployed on Vercel.

## Run locally

Prerequisites: Docker, and accounts for Neon, MongoDB Atlas, CloudAMQP, Cloudinary and Mailgun (all have free tiers).

```sh
# 1. database tables (once)
psql "$NEON_CONNECTION_STRING" -f authentication_service/schema.sql

# 2. configuration: copy each example and fill it in
for s in authentication_service gateway-service converter-service ai-service notification_service; do cp $s/.env.example $s/.env; done

# 3. backend — gateway is reachable at http://localhost (Caddy) and the health check at /health
docker compose up -d --build

# 4. frontend
cd frontend/auth && cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost
npm install && npm run dev
```

Try the API directly:

```sh
TOKEN=$(curl -s -X POST localhost/signup -H 'Content-Type: application/json' -d '{"usermail":"you@example.com","firstname":"You","username":"you","password":"at-least-8-chars"}' | jq -r .token)
curl -X POST localhost/upload -H "Authorization: Bearer $TOKEN" -F sourcefile=@video.mp4 -F destaudioformat=mp3 -F samplingrate=n/a -F firstname=You
curl -X POST localhost/getfiles -H "Authorization: Bearer $TOKEN"
```

## Deploy

**Images**: every push to `main` builds the five service images on GitHub Actions (`.github/workflows/deploy.yml`, ~1–2 min with layer caching) and publishes them to `ghcr.io/sudeepgowda55/waveforge-*`. The Go services ship as ~12 MB distroless images.

**Backend**: any Linux VM with Docker (it runs on an Oracle Cloud Always Free VM). The server never builds; it only pulls:

```sh
git clone https://github.com/SudeepGowda55/Wave-Forge && cd Wave-Forge
# create the five .env files as above, and .env with API_DOMAIN=api.waveforge.sudeepgowda.tech, then:
docker compose pull && docker compose up -d
```

To redeploy after a push: `git pull && docker compose pull && docker compose up -d`. Setting the `DEPLOY_HOST`, `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` repository secrets lets the workflow do this itself.

Point an `A` record for `API_DOMAIN` at the VM; Caddy obtains the HTTPS certificate automatically.

**Frontend**: import the repo in Vercel with root directory `frontend/auth` and set `NEXT_PUBLIC_API_URL=https://api.waveforge.sudeepgowda.tech`.

**Mailgun**: on the free plan with a sandbox domain, email is only delivered to addresses added as *Authorized Recipients* in the Mailgun dashboard. Verify your own domain to send to anyone.

## Notes

- Passwords are bcrypt-hashed; `POST /signup` and `POST /login` both return `{"token", "firstname"}` and the token is sent as `Authorization: Bearer <token>`.
- Failed conversions are recorded as `conversion failed` on the file and the message is acknowledged, so one bad file never blocks the queue.
- `*/manifests` and `ingress.yaml` are the original Kubernetes manifests; Docker Compose is the maintained deployment path.

Debugging: `docker compose logs -f converter` (or `gateway`, `auth`, `ai`, `notifier`).
