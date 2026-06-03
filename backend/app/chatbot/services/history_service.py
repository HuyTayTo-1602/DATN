"""
history_service — Sprint 7.

In-memory conversation history store for dev mode.
Each thread_id is bound to the user_id that created it (ownership).

Production note: replace _store with a Postgres table or Redis hash.
Schema equivalent:
  chat_history(id SERIAL, thread_id TEXT, user_id INT, role TEXT,
               content TEXT, created_at TIMESTAMPTZ DEFAULT now())

Thread isolation rules:
  - First write for a thread_id registers the owner (user_id).
  - Subsequent writes from a different user_id are silently dropped
    (the chat still works; history just won't be persisted).
  - Reads from a non-owner return None → HTTP 403 in the route.
"""

from datetime import datetime, timezone
from threading import Lock

# thread_id → {"user_id": int, "messages": list[dict]}
_store: dict[str, dict] = {}
_lock = Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def append_turn(
    thread_id: str,
    user_id: int,
    user_message: str,
    assistant_answer: str,
) -> None:
    """
    Persist a user+assistant exchange for a thread.
    If the thread already belongs to a different user, the call is a no-op.
    """
    ts = _now_iso()
    with _lock:
        entry = _store.get(thread_id)
        if entry is None:
            # First message in this thread — register ownership
            _store[thread_id] = {
                "user_id": user_id,
                "messages": [],
            }
            entry = _store[thread_id]
        elif entry["user_id"] != user_id:
            # Thread belongs to another user — refuse silently
            return

        entry["messages"].extend([
            {"role": "user",      "content": user_message,     "created_at": ts},
            {"role": "assistant", "content": assistant_answer,  "created_at": ts},
        ])


def get_history(thread_id: str, user_id: int) -> list[dict] | None:
    """
    Return the full message list for a thread.
    Returns [] for an unknown thread_id.
    Returns None when the thread exists but is owned by a different user (→ 403).
    """
    with _lock:
        entry = _store.get(thread_id)
        if entry is None:
            return []
        if entry["user_id"] != user_id:
            return None
        return list(entry["messages"])


def clear_thread(thread_id: str) -> None:
    """Remove a thread from the store (tests / logout)."""
    with _lock:
        _store.pop(thread_id, None)


def clear_all() -> None:
    """Flush the entire store — for test isolation only."""
    with _lock:
        _store.clear()


def thread_count() -> int:
    with _lock:
        return len(_store)
