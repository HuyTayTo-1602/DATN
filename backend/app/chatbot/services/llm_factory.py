"""
LLM client factory.

Provider selection (in priority order):
  1. Anthropic — when ANTHROPIC_API_KEY is set
  2. Groq      — when GROQ_API_KEY is set

Pass a mock to make_general_qa_node() in tests to avoid real API calls.
"""

import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


def build_llm():
    """Return a configured LangChain chat model based on available API keys."""
    settings = get_settings()

    if settings.ANTHROPIC_API_KEY:
        from langchain_anthropic import ChatAnthropic
        logger.info("LLM provider: Anthropic, model=%s", settings.LLM_MODEL)
        return ChatAnthropic(
            model=settings.LLM_MODEL,
            api_key=settings.ANTHROPIC_API_KEY,
            max_tokens=4096,
        )

    if settings.GROQ_API_KEY:
        from langchain_groq import ChatGroq
        logger.info("LLM provider: Groq, model=%s", settings.LLM_MODEL)
        return ChatGroq(
            model=settings.LLM_MODEL,
            api_key=settings.GROQ_API_KEY,
            max_tokens=4096,
        )

    raise RuntimeError(
        "Không tìm thấy API key cho LLM. "
        "Hãy đặt ANTHROPIC_API_KEY hoặc GROQ_API_KEY trong file .env."
    )
