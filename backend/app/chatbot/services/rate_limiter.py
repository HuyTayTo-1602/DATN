"""
rate_limiter — Sprint 8.

Sliding-window in-memory rate limiter scoped per user_id.
Default: MAX_REQUESTS = 30 per WINDOW_SECONDS = 60.

Thread-safe (threading.Lock); suitable for a single-process deployment.
Production note: replace _store with Redis INCR + EXPIRE for multi-process safety.
"""

import time
from collections import defaultdict
from threading import Lock

WINDOW_SECONDS: int = 60
MAX_REQUESTS: int = 30

# user_id → list of monotonic timestamps within the current window
_store: dict[int, list[float]] = defaultdict(list)
_lock = Lock()


def check_rate_limit(user_id: int) -> bool:
    """
    Record the current request and return True if it is within the allowed limit.
    Returns False if the user has already sent MAX_REQUESTS within WINDOW_SECONDS.
    """
    now = time.monotonic()
    cutoff = now - WINDOW_SECONDS
    with _lock:
        ts = _store[user_id]
        # Prune timestamps outside the sliding window
        _store[user_id] = [t for t in ts if t > cutoff]
        if len(_store[user_id]) >= MAX_REQUESTS:
            return False
        _store[user_id].append(now)
        return True


def get_request_count(user_id: int) -> int:
    """Return the number of requests recorded for user_id in the current window."""
    now = time.monotonic()
    cutoff = now - WINDOW_SECONDS
    with _lock:
        return sum(1 for t in _store.get(user_id, []) if t > cutoff)


def reset_user(user_id: int) -> None:
    """Clear rate-limit state for a single user (test helper / logout)."""
    with _lock:
        _store.pop(user_id, None)


def reset_all() -> None:
    """Flush the entire rate-limit store (test isolation only)."""
    with _lock:
        _store.clear()
