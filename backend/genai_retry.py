"""
Rate limiting and retry wrapper for Gemini API to avoid 429 RESOURCE_EXHAUSTED.

- Waits between requests (min_interval_sec) to stay under free-tier RPM.
- On 429, parses server retry_delay from the error message and retries after that time.
"""

import re
import time
import threading
import os

# Minimum seconds between any two generate_content calls (free tier is ~15 RPM; use ~6s = 10 RPM)
# Override with env GEMINI_MIN_INTERVAL_SEC or GEMINI_REQUEST_DELAY_SECONDS (e.g. 10 for stricter limiting)
DEFAULT_MIN_INTERVAL_SEC = 6.0
# Max retries when we get 429
DEFAULT_MAX_RETRIES = 3


def _get_min_interval_sec() -> float:
    try:
        v = os.getenv("GEMINI_MIN_INTERVAL_SEC") or os.getenv("GEMINI_REQUEST_DELAY_SECONDS")
        return float(v) if v else DEFAULT_MIN_INTERVAL_SEC
    except ValueError:
        return DEFAULT_MIN_INTERVAL_SEC

_last_request_time: float = 0
_lock = threading.Lock()


def _rate_limit(min_interval_sec: float) -> None:
    """Block until at least min_interval_sec has passed since the last request."""
    global _last_request_time
    with _lock:
        now = time.monotonic()
        elapsed = now - _last_request_time
        if elapsed < min_interval_sec:
            time.sleep(min_interval_sec - elapsed)
        _last_request_time = time.monotonic()


def _parse_retry_seconds(message: str) -> float | None:
    """Extract 'Please retry in X.XXs' from the error message. Returns seconds or None."""
    if not message:
        return None
    m = re.search(r"retry in (\d+\.?\d*)\s*s", message, re.IGNORECASE)
    return float(m.group(1)) if m else None


def generate_content_with_retry(
    client,
    model: str,
    contents,
    config=None,
    *,
    min_interval_sec: float | None = None,
    max_retries: int = DEFAULT_MAX_RETRIES,
):
    """
    Call client.models.generate_content with rate limiting and 429 retry.

    On 429 RESOURCE_EXHAUSTED, waits for the server-suggested retry delay (or 50s)
    and retries up to max_retries times.
    """
    from google.genai import errors as genai_errors

    if min_interval_sec is None:
        min_interval_sec = _get_min_interval_sec()
    last_error = None
    for attempt in range(max_retries + 1):
        _rate_limit(min_interval_sec)
        try:
            return client.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
        except genai_errors.ClientError as e:
            last_error = e
            # Check for 429 / RESOURCE_EXHAUSTED
            if getattr(e, "status_code", None) != 429 and "429" not in str(e) and "RESOURCE_EXHAUSTED" not in str(e).upper():
                raise
            if attempt == max_retries:
                raise
            delay = _parse_retry_seconds(str(e)) or 50.0
            # Cap delay to avoid absurd waits
            delay = min(max(delay, 10.0), 120.0)
            print(f"[Gemini 429] Rate limited. Retrying in {delay:.1f}s (attempt {attempt + 1}/{max_retries + 1})...")
            time.sleep(delay)
    raise last_error
