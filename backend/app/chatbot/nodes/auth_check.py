from app.chatbot.schemas import ChatState

VALID_ROLES = {"recruiter", "job_seeker"}


def auth_check_node(state: ChatState) -> dict:
    """
    Defense-in-depth: verify that user_id and a known role are present in state.
    The real 401/403 is raised at the HTTP layer by get_current_user;
    this node guards against a misconfigured route that forgot to set the fields.
    """
    if not state.get("user_id"):
        return {"blocked_reason": "Không xác thực được danh tính người dùng"}

    role = state.get("role")
    if role not in VALID_ROLES:
        return {"blocked_reason": f"Role '{role}' không được phép sử dụng chatbot"}

    return {}
