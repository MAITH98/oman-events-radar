import hashlib
import hmac
import time

MAX_AGE_SECONDS = 300  # reject replays older than 5 minutes


def verify_radar_signature(raw_body: bytes, timestamp: str, signature: str, secret: str) -> bool:
    """raw_body must be the exact bytes received, before any JSON parsing."""
    try:
        if abs(time.time() - int(timestamp)) > MAX_AGE_SECONDS:
            return False
    except ValueError:
        return False
    expected = hmac.new(secret.encode(), timestamp.encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
