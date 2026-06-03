"""
role_check node — Sprint 4.

Gate that allows only recruiter to proceed to the applicant-analysis flow.
job_seeker trying to reach applicant_query → polite refusal via blocked_reason.
"""

from app.chatbot.schemas import ChatState

_REFUSAL = (
    "Tính năng phân tích ứng viên chỉ dành cho nhà tuyển dụng (recruiter). "
    "Nếu bạn có câu hỏi về tuyển dụng hoặc sự nghiệp, tôi rất sẵn lòng hỗ trợ."
)


def role_check_node(state: ChatState) -> dict:
    """
    Pass if role == 'recruiter', block otherwise.
    Returning a non-empty blocked_reason causes the graph router
    to send the request to the blocked node instead of continuing.
    """
    if state.get("role") == "recruiter":
        return {}
    return {"blocked_reason": _REFUSAL}
