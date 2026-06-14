# =============================================================================
# utils/location.py
# Mục đích: Tiện ích xử lý địa chỉ tách cột (province/district/address_detail)
# và hình thức làm việc (work_mode) cho job.
#  - join_address(): ghép 3 cột thành chuỗi "chi tiết, quận, tỉnh".
#  - format_job_location(): tạo chuỗi hiển thị địa điểm job kèm work_mode,
#    thay thế cột `location` cũ đã bỏ.
# =============================================================================

from typing import Optional

# Các giá trị hợp lệ của work_mode
WORK_MODES = ("onsite", "hybrid", "remote")

WORK_MODE_LABELS = {
    "onsite": "Tại văn phòng",
    "hybrid": "Hybrid",
    "remote": "Remote",
}


def join_address(
    province: Optional[str] = None,
    district: Optional[str] = None,
    address_detail: Optional[str] = None,
) -> str:
    """Ghép địa chỉ thành '{address_detail}, {district}, {province}' (bỏ phần trống/không phải chuỗi)."""
    parts = [
        p.strip()
        for p in (address_detail, district, province)
        if isinstance(p, str) and p.strip()
    ]
    return ", ".join(parts)


def format_job_location(
    work_mode: Optional[str] = None,
    province: Optional[str] = None,
    district: Optional[str] = None,
    address_detail: Optional[str] = None,
) -> str:
    """
    Tạo chuỗi hiển thị địa điểm làm việc cho job (thay cột `location` cũ).
      - remote → "Remote"
      - hybrid → "{địa chỉ} (Hybrid)" (hoặc "Hybrid" nếu không có địa chỉ)
      - onsite/None → "{địa chỉ}"
    """
    addr = join_address(province, district, address_detail)
    if work_mode == "remote":
        return "Remote"
    if work_mode == "hybrid":
        return f"{addr} (Hybrid)" if addr else "Hybrid"
    return addr
