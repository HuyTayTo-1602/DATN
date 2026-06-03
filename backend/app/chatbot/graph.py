"""
LangGraph graph for the recruitment chatbot.

Full flow (Sprint 6):
  auth_check → input_guardrail → classify_intent
                                     ├─ general_qa  → general_qa_node → output_guardrail → END
                                     └─ applicant_q → role_check
                                                        ├─ non-recruiter → blocked → END
                                                        └─ recruiter     → select_job (+job_info)
                                                                             ├─ bad job  → blocked → END
                                                                             └─ ok       → load_applicants
                                                                                            ├─ error    → blocked → END
                                                                                            ├─ ≤ 10    → single_shot_llm → output_guardrail → END
                                                                                            └─ > 10    → batch_map → reduce_llm → output_guardrail → END
"""

from typing import Literal

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from app.chatbot.schemas import ChatState
from app.chatbot.nodes.auth_check import auth_check_node
from app.chatbot.nodes.input_guardrail import input_guardrail_node
from app.chatbot.nodes.classify_intent import classify_intent_node
from app.chatbot.nodes.output_guardrail import output_guardrail_node
from app.chatbot.nodes.general_qa import general_qa_node
from app.chatbot.nodes.role_check import role_check_node
from app.chatbot.nodes.select_job import select_job_node
from app.chatbot.nodes.load_applicants import load_applicants_node
from app.chatbot.nodes.single_shot_llm import single_shot_llm_node
from app.chatbot.nodes.batch_map import batch_map_node
from app.chatbot.nodes.reduce_llm import reduce_llm_node


def _blocked_node(state: ChatState) -> dict:
    """Convert blocked_reason into a user-visible answer."""
    return {"answer": state.get("blocked_reason", "Yêu cầu bị từ chối.")}


# ---------------------------------------------------------------------------
# Routing functions
# ---------------------------------------------------------------------------

def _route_after_guardrail(state: ChatState) -> Literal["blocked", "continue"]:
    return "blocked" if state.get("blocked_reason") else "continue"


def _route_after_classify(state: ChatState) -> Literal["general_qa", "applicant_query"]:
    return state.get("intent") or "general_qa"


def _route_after_load_applicants(
    state: ChatState,
) -> Literal["blocked", "single_shot", "batch_map"]:
    """
    Three-way route after load_applicants:
      • blocked_reason set       → blocked
      • len(applicants) <= 10   → single_shot_llm
      • len(applicants) >  10   → batch_map → reduce_llm
    """
    if state.get("blocked_reason"):
        return "blocked"
    return "single_shot" if len(state.get("applicants", [])) <= 10 else "batch_map"


# ---------------------------------------------------------------------------
# Graph factory
# ---------------------------------------------------------------------------

def build_graph():
    """
    Compile the chatbot StateGraph with an in-memory checkpointer.
    Returns a compiled graph ready for ainvoke / invoke.
    """
    builder = StateGraph(ChatState)

    # ── Nodes ──────────────────────────────────────────────────────────────
    builder.add_node("auth_check",      auth_check_node)
    builder.add_node("input_guardrail", input_guardrail_node)
    builder.add_node("classify_intent", classify_intent_node)
    builder.add_node("general_qa",      general_qa_node)

    # Sprint 4
    builder.add_node("role_check",      role_check_node)
    builder.add_node("select_job",      select_job_node)
    builder.add_node("load_applicants", load_applicants_node)

    # Sprint 5
    builder.add_node("single_shot_llm", single_shot_llm_node)

    # Sprint 6
    builder.add_node("batch_map",       batch_map_node)
    builder.add_node("reduce_llm",      reduce_llm_node)

    builder.add_node("output_guardrail", output_guardrail_node)
    builder.add_node("blocked",          _blocked_node)

    # ── Entry point ────────────────────────────────────────────────────────
    builder.set_entry_point("auth_check")

    # auth_check → blocked | input_guardrail
    builder.add_conditional_edges(
        "auth_check",
        _route_after_guardrail,
        {"blocked": "blocked", "continue": "input_guardrail"},
    )

    # input_guardrail → blocked | classify_intent
    builder.add_conditional_edges(
        "input_guardrail",
        _route_after_guardrail,
        {"blocked": "blocked", "continue": "classify_intent"},
    )

    builder.add_edge("blocked", END)

    # classify_intent → general_qa | role_check
    builder.add_conditional_edges(
        "classify_intent",
        _route_after_classify,
        {"general_qa": "general_qa", "applicant_query": "role_check"},
    )

    builder.add_edge("general_qa", "output_guardrail")

    # role_check → blocked (non-recruiter) | select_job
    builder.add_conditional_edges(
        "role_check",
        _route_after_guardrail,
        {"blocked": "blocked", "continue": "select_job"},
    )

    # select_job → blocked (bad job) | load_applicants
    builder.add_conditional_edges(
        "select_job",
        _route_after_guardrail,
        {"blocked": "blocked", "continue": "load_applicants"},
    )

    # load_applicants → blocked | single_shot_llm (≤10) | batch_map (>10)
    builder.add_conditional_edges(
        "load_applicants",
        _route_after_load_applicants,
        {"blocked": "blocked", "single_shot": "single_shot_llm", "batch_map": "batch_map"},
    )

    # Sprint 5 path: single_shot_llm → output_guardrail
    builder.add_edge("single_shot_llm", "output_guardrail")

    # Sprint 6 path: batch_map → reduce_llm → output_guardrail
    builder.add_edge("batch_map",   "reduce_llm")
    builder.add_edge("reduce_llm",  "output_guardrail")

    builder.add_edge("output_guardrail", END)

    memory = MemorySaver()
    return builder.compile(checkpointer=memory)
