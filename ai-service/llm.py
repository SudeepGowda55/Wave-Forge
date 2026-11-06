import os
import requests

GROQ_URL = "https://api.groq.com/openai/v1"
# tried in order; a rate-limited or failing model falls through to the next
MODELS = os.environ.get("LLM_MODELS", "openai/gpt-oss-120b,openai/gpt-oss-20b").split(",")


class QuotaError(Exception):
    """Every provider is rate limited or unavailable; the caller shows 'AI paused'."""


def groq_headers():
    return {"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"}


def complete(system, prompt):
    last_error = None
    for model in MODELS:
        r = requests.post(
            f"{GROQ_URL}/chat/completions",
            headers=groq_headers(),
            json={
                "model": model,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                "max_tokens": 1500,
                "reasoning_effort": "low",
            },
            timeout=60,
        )
        if r.status_code == 429 or r.status_code >= 500:
            last_error = f"{model}: {r.status_code}"
            continue
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    raise QuotaError(last_error)
