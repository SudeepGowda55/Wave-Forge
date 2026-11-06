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
    samplingrate    text
);
