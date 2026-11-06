import os
import psycopg


def connect():
    return psycopg.connect(os.environ["DATABASE_URL"], autocommit=True)


def used_today(usermail, kind):
    with connect() as conn:
        return conn.execute(
            "SELECT count(*) FROM ai_usage WHERE usermail = %s AND kind = %s AND created_at > now() - interval '1 day'",
            (usermail, kind),
        ).fetchone()[0]


def record_usage(usermail, kind):
    with connect() as conn:
        conn.execute("INSERT INTO ai_usage (usermail, kind) VALUES (%s, %s)", (usermail, kind))
