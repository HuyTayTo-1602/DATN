from app.chatbot.schemas import ChatState

# Vietnamese and English keywords that signal a query about specific applicants.
# We keep this list narrow to avoid false positives in general Q&A.
_APPLICANT_KEYWORDS = (
    "ứng viên",
    "ứng tuyển",
    "nộp đơn",
    "đơn ứng tuyển",
    "applicant",
    "candidate",
)


def classify_intent_node(state: ChatState) -> dict:
    """
    Rule-based intent classifier (upgraded to LLM in Sprint 8 if needed).

    applicant_query:  job_id is provided  OR  message contains applicant keywords
    general_qa:       everything else
    """
    # Explicit job context → recruiter wants to analyse applicants
    if state.get("job_id") is not None:
        return {"intent": "applicant_query"}

    msg_lower = state.get("message", "").lower()
    for keyword in _APPLICANT_KEYWORDS:
        if keyword in msg_lower:
            return {"intent": "applicant_query"}

    return {"intent": "general_qa"}
