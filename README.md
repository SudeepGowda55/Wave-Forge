# WaveForge

Upload a video (or audio file), pick MP3 or WAV and a sampling rate, and get the converted audio by email and on your dashboard.

Live: https://waveforge.sudeepgowda.tech · API: https://api.waveforge.sudeepgowda.tech

![Architecture_diagram](https://github.com/SudeepGowda55/Audio_Conversion-Microservice/blob/main/images/mini-arch.png?raw=true)

## How it works

1. **Gateway** (Go/Gin, port 8000): the only public service. Checks the JWT with the auth service, stores the upload in **MongoDB GridFS**, records it through the auth service and publishes a message to the `file_uploaded` queue.
2. **Authentication service** (Go/Gin, port 8001, internal): signup and JWT validation, plus the `users`/`userfiles` tables in **PostgreSQL (Neon)**.
3. **Converter** (Python + ffmpeg): consumes `file_uploaded`, pulls the file from GridFS, converts/re-samples it with pydub, uploads the result to **Cloudinary**, writes the URL back through the auth service and publishes to `file_converted_notification`.
4. **Notification service** (Node): consumes `file_converted_notification` and emails the download link with **Mailgun**.

Messages flow through **RabbitMQ (CloudAMQP)**. The frontend is Next.js in `frontend/auth`, deployed on Vercel.

## Run locally

Prerequisites: Docker, and accounts for Neon, MongoDB Atlas, CloudAMQP, Cloudinary and Mailgun (all have free tiers).

```sh
# 1. database tables (once)
psql "$NEON_CONNECTION_STRING" -f authentication_service/schema.sql

# 2. configuration: copy each example and fill it in
for s in authentication_service gateway-service converter-service notification_service; do cp $s/.env.example $s/.env; done

# 3. backend — gateway is reachable at http://localhost (Caddy) and the health check at /health
docker compose up -d --build

# 4. frontend
cd frontend/auth && cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost
npm install && npm run dev
```

Try the API directly:

```sh
TOKEN=$(curl -s -X POST localhost/signup -H 'Content-Type: application/json' -d '{"usermail":"you@example.com","firstname":"You","username":"you"}' | tr -d '"')
curl -X POST localhost/upload -H "Authorization: Bearer $TOKEN" -F sourcefile=@video.mp4 -F destaudioformat=mp3 -F samplingrate=n/a -F firstname=You
curl -X POST localhost/getfiles -H "Authorization: Bearer $TOKEN"
```

## Deploy

**Backend**: any Linux VM with Docker (Hetzner, Oracle Cloud free tier, EC2).

```sh
git clone https://github.com/SudeepGowda55/Wave-Forge && cd Wave-Forge
# create the four .env files as above, then:
API_DOMAIN=api.waveforge.sudeepgowda.tech docker compose up -d --build
```

Point an `A` record for `API_DOMAIN` at the VM; Caddy obtains the HTTPS certificate automatically.

**Frontend**: import the repo in Vercel with root directory `frontend/auth` and set `NEXT_PUBLIC_API_URL=https://api.waveforge.sudeepgowda.tech`.

**Mailgun**: on the free plan with a sandbox domain, email is only delivered to addresses added as *Authorized Recipients* in the Mailgun dashboard. Verify your own domain to send to anyone.

## Notes

- Signup is email-only (no password) and doubles as login: signing up again with the same email returns a fresh token.
- Failed conversions are recorded as `conversion failed` on the file and the message is acknowledged, so one bad file never blocks the queue.
- `*/manifests` and `ingress.yaml` are the original Kubernetes manifests; Docker Compose is the maintained deployment path.

Debugging: `docker compose logs -f converter` (or `gateway`, `auth`, `notifier`).
