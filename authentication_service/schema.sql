-- Run once against the Postgres database (Neon): psql "$DATABASE_URL" -f schema.sql
CREATE TABLE IF NOT EXISTS users (
    usermail      text PRIMARY KEY,
    firstname     text,
    username      text,
    password_hash text
);

CREATE TABLE IF NOT EXISTS userfiles (
    usermail        text,
    fileid          text,
    filename        text,
    fileurl         text,
    destaudioformat text,
    samplingrate    text,
    status          text DEFAULT 'queued',
    created_at      timestamptz DEFAULT now()
);

-- owned by ai-service: one row per Whisper segment, searchable with Postgres full-text
CREATE TABLE IF NOT EXISTS transcript_segments (
    fileid   text,
    usermail text,
    start_s  real,
    end_s    real,
    text     text,
    tsv      tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);
CREATE INDEX IF NOT EXISTS transcript_segments_tsv ON transcript_segments USING gin (tsv);
CREATE INDEX IF NOT EXISTS transcript_segments_file ON transcript_segments (fileid, start_s);

-- owned by ai-service: cloned-voice clips, made only with the user's consent
CREATE TABLE IF NOT EXISTS voice_clips (
    usermail   text,
    fileid     text,
    text       text,
    url        text,
    created_at timestamptz DEFAULT now()
);

-- per-user daily caps that keep the free tiers from being exhausted
CREATE TABLE IF NOT EXISTS ai_usage (
    usermail   text,
    kind       text,
    created_at timestamptz DEFAULT now()
);
