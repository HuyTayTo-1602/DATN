"""
Sprint 5 — Unit tests cho thời gian tạo job và deadline.

- random_created_at(): luôn trong [start, today], không vượt hôm nay.
- job_deadline(): active → tương lai; closed → quá khứ (sau created_at).

Run: cd backend && pytest tests/scripts/test_job_time.py -v
"""
import sys
import os
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from scripts.seed.seed_utils import random_created_at, job_deadline


class TestRandomCreatedAt:
    def test_within_range(self):
        start = date(2026, 1, 1)
        now = datetime.now()
        for _ in range(300):
            ca = random_created_at("2026-01-01")
            assert isinstance(ca, datetime)
            assert ca.date() >= start, f"{ca} trước 2026-01-01"
            assert ca <= now, f"{ca} ở tương lai"

    def test_custom_start(self):
        for _ in range(50):
            ca = random_created_at("2026-03-01")
            assert ca.date() >= date(2026, 3, 1)
            assert ca <= datetime.now()

    def test_start_after_end_does_not_crash(self):
        # end mặc định = hôm nay; start ở tương lai xa → clamp về now, không lỗi
        future = (date.today() + timedelta(days=365)).isoformat()
        ca = random_created_at(future)
        assert isinstance(ca, datetime)
        assert ca <= datetime.now()


class TestJobDeadline:
    def test_active_is_future(self):
        ca = random_created_at("2026-01-01")
        for _ in range(100):
            d = job_deadline("active", ca)
            assert d > date.today(), f"active deadline {d} không ở tương lai"

    def test_closed_is_past(self):
        ca = datetime(2026, 1, 5, 10, 0, 0)
        for _ in range(100):
            d = job_deadline("closed", ca)
            assert d < date.today(), f"closed deadline {d} không ở quá khứ"
            assert d >= ca.date() - timedelta(days=1), "closed deadline trước created_at quá xa"
