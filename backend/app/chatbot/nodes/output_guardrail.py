import re

from app.chatbot.schemas import ChatState

_SYSTEM_PROMPT_LEAK_PATTERNS: list[re.Pattern] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"my\s+(system\s+)?instructions?\s+(are|say|tell)",
        r"i\s+was\s+(instructed|told|programmed|configured)\s+to",
        r"here\s+are\s+my\s+(instructions?|rules?|guidelines?|constraints?)",
        r"as\s+(an?\s+)?ai\s+(language\s+)?model,?\s+my\s+(instructions?|rules?|system)",
        r"the\s+system\s+prompt\s+(says?|states?|tells?\s+me)",
        r"according\s+to\s+my\s+(instructions?|system\s+prompt)",
    ]
]

_SAFE_FALLBACK = (
    "Xin lỗi, đã xảy ra lỗi khi xử lý câu trả lời. Vui lòng thử lại."
)


def output_guardrail_node(state: ChatState) -> dict:
    """
    Post-process the LLM answer before sending to the user.
    Detects accidental system prompt leakage and replaces with a safe fallback.
    Does NOT run for blocked messages (those bypass this node entirely).
    """
    answer: str = state.get("answer", "")

    for pattern in _SYSTEM_PROMPT_LEAK_PATTERNS:
        if pattern.search(answer):
            return {"answer": _SAFE_FALLBACK}

    return {}
