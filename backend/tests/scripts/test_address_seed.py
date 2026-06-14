"""
Sprint 3 — Unit tests cho dữ liệu địa chỉ và helper random_location().

Pure unit tests (không cần DB): kiểm tra quận thuộc đúng tỉnh, 3 giá trị
non-empty, và `address` ghép đúng định dạng "{detail}, {district}, {province}".

Run: cd backend && pytest tests/scripts/test_address_seed.py -v
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.utils.location import join_address, format_job_location
from scripts.seed.seed_utils import random_location, _get_locations_vn


class TestLocationsData:
    def test_data_loads(self):
        data = _get_locations_vn()
        assert isinstance(data, dict) and len(data) >= 5

    def test_every_district_has_streets(self):
        data = _get_locations_vn()
        for province, districts in data.items():
            assert districts, f"Tỉnh {province} không có quận"
            for district, streets in districts.items():
                assert isinstance(streets, list) and len(streets) >= 1, (
                    f"{province}/{district} không có đường"
                )


class TestRandomLocation:
    def test_district_belongs_to_province(self):
        data = _get_locations_vn()
        for _ in range(200):
            province, district, address_detail = random_location()
            assert province in data
            assert district in data[province], (
                f"Quận '{district}' không thuộc tỉnh '{province}'"
            )

    def test_three_values_non_empty(self):
        for _ in range(50):
            province, district, address_detail = random_location()
            assert province and province.strip()
            assert district and district.strip()
            assert address_detail and address_detail.strip()

    def test_address_detail_has_number_and_street(self):
        province, district, address_detail = random_location()
        # "{num} {street}" → phần đầu là số
        assert address_detail.split(" ", 1)[0].isdigit()

    def test_province_pinning(self):
        data = _get_locations_vn()
        target = "Đà Nẵng"
        if target in data:
            for _ in range(20):
                province, district, _ = random_location(target)
                assert province == target
                assert district in data[target]

    def test_unknown_province_falls_back_random(self):
        province, district, address_detail = random_location("Không Tồn Tại XYZ")
        data = _get_locations_vn()
        assert province in data
        assert district in data[province]


class TestAddressComposition:
    def test_join_address_format(self):
        for _ in range(30):
            province, district, address_detail = random_location()
            address = join_address(province, district, address_detail)
            assert address == f"{address_detail}, {district}, {province}"

    def test_join_address_skips_empty(self):
        assert join_address("Hà Nội", None, None) == "Hà Nội"
        assert join_address(None, None, None) == ""

    def test_format_job_location_modes(self):
        assert format_job_location("remote", "Hà Nội", "Đống Đa", "1 Láng") == "Remote"
        assert format_job_location("hybrid", "Hà Nội", "Đống Đa", "1 Láng") == "1 Láng, Đống Đa, Hà Nội (Hybrid)"
        assert format_job_location("onsite", "Hà Nội", "Đống Đa", "1 Láng") == "1 Láng, Đống Đa, Hà Nội"
        assert format_job_location("remote", None, None, None) == "Remote"
