"""
Unit tests for candidate_search_service.
Các hàm score_profile_match và score_cv_text_match không cần DB.
Hàm search_candidates và _build_tsquery được test với mock DB.
"""

import pytest
from app.services.candidate_search_service import (
    score_profile_match,
    score_cv_text_match,
    _build_tsquery,
)


# ---------------------------------------------------------------------------
# _build_tsquery
# ---------------------------------------------------------------------------

class TestBuildTsquery:
    def test_single_term(self):
        assert _build_tsquery("java") == "java"

    def test_multiple_terms_joined_with_or(self):
        result = _build_tsquery("java python")
        assert result == "java | python"

    def test_three_terms(self):
        result = _build_tsquery("java python backend")
        assert result == "java | python | backend"

    def test_extra_spaces_trimmed(self):
        result = _build_tsquery("  java   python  ")
        assert result == "java | python"

    def test_empty_string_returns_empty(self):
        assert _build_tsquery("") == ""

    def test_whitespace_only_returns_empty(self):
        assert _build_tsquery("   ") == ""


# ---------------------------------------------------------------------------
# score_profile_match
# ---------------------------------------------------------------------------

class TestScoreProfileMatch:
    def test_exact_skill_match_scores_higher(self):
        score = score_profile_match("python", skills="Python, Django", experience=None, full_name=None)
        assert score > 0

    def test_experience_match_scores_lower_than_skills(self):
        skill_score = score_profile_match("java", skills="Java, Spring", experience=None, full_name=None)
        exp_score = score_profile_match("java", skills=None, experience="3 years Java developer", full_name=None)
        assert skill_score > exp_score

    def test_full_name_match_returns_nonzero(self):
        score = score_profile_match("nguyen", skills=None, experience=None, full_name="Nguyen Van A")
        assert score > 0

    def test_no_match_returns_zero(self):
        score = score_profile_match("java", skills="Python, React", experience="Frontend engineer", full_name="An Bui")
        assert score == 0.0

    def test_empty_query_returns_zero(self):
        score = score_profile_match("", skills="Java, Python", experience="Backend dev", full_name="Dev")
        assert score == 0.0

    def test_multiple_terms_accumulate(self):
        score_single = score_profile_match("java", skills="java python", experience=None, full_name=None)
        score_multi = score_profile_match("java python", skills="java python", experience=None, full_name=None)
        assert score_multi > score_single

    def test_none_fields_do_not_raise(self):
        score = score_profile_match("java", skills=None, experience=None, full_name=None)
        assert score == 0.0


# ---------------------------------------------------------------------------
# score_cv_text_match
# ---------------------------------------------------------------------------

class TestScoreCvTextMatch:
    def test_term_in_cv_text_scores_nonzero(self):
        score = score_cv_text_match("python", "Worked on Python microservices and REST APIs.")
        assert score > 0

    def test_term_not_in_cv_text_scores_zero(self):
        score = score_cv_text_match("java", "Expert in Python and React development.")
        assert score == 0.0

    def test_multiple_terms_accumulate(self):
        score_single = score_cv_text_match("python", "Experienced in python and java.")
        score_multi = score_cv_text_match("python java", "Experienced in python and java.")
        assert score_multi > score_single

    def test_empty_cv_text_returns_zero(self):
        assert score_cv_text_match("java", "") == 0.0
        assert score_cv_text_match("java", None) == 0.0

    def test_empty_query_returns_zero(self):
        assert score_cv_text_match("", "Java developer with 5 years experience.") == 0.0

    def test_case_insensitive(self):
        score = score_cv_text_match("PYTHON", "Expert Python developer.")
        assert score > 0
