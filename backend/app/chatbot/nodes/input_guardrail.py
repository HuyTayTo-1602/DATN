import re

from app.chatbot.schemas import ChatState

MAX_MESSAGE_LENGTH = 2000

# Common prompt injection phrases (case-insensitive, partial match)
_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        # ── Jailbreak / persona override ──────────────────────────────────
        r"ignore\s+(all\s+)?previous\s+instructions?",
        r"disregard\s+(all\s+)?previous",
        r"forget\s+(all\s+)?(your\s+)?instructions?",
        r"system\s+prompt",
        r"you\s+are\s+now\s+",
        r"act\s+as\s+(if\s+you\s+(are|were)\b|a\s+\w)",
        r"pretend\s+(you\s+are|to\s+be)\b",
        r"override\s+(all\s+)?previous",
        r"new\s+persona\b",
        r"jailbreak\b",
        r"DAN\s+mode",
        # ── SQL / data-exfiltration ────────────────────────────────────────
        r"SELECT\s+.{0,80}\s+FROM\s+\w",          # SQL SELECT … FROM
        r"UNION\s+SELECT\b",                        # UNION injection
        r"DROP\s+TABLE\b",                          # DDL injection
        r"list\s+all\s+\w+\s+(in|from)\s+(the\s+)?(db|database|system)\b",
    ]
]


def input_guardrail_node(state: ChatState) -> dict:
    """
    Block prompt injection attempts and oversized messages.
    Returns {"blocked_reason": "..."} to halt the graph, or {} to continue.
    """
    message: str = state.get("message", "")

    if len(message) > MAX_MESSAGE_LENGTH:
        return {
            "blocked_reason": (
                f"Tin nhắn quá dài ({len(message)} ký tự). "
                f"Tối đa {MAX_MESSAGE_LENGTH} ký tự."
            )
        }

    for pattern in _INJECTION_PATTERNS:
        if pattern.search(message):
            return {"blocked_reason": "Tin nhắn chứa nội dung không được phép."}

    return {}
