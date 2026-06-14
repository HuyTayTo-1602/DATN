# Kế hoạch thực thi: Tách địa chỉ + work_mode + CV PDF + Job theo thời gian

> **Nguồn:** triển khai theo [08-address-fields-cv-seed-plan.md](08-address-fields-cv-seed-plan.md).
> **Cách dùng:** làm tuần tự từng Sprint. Mỗi Sprint có ✅ checkbox, 🔎 mục validate và 🧪 test phải chạy trước khi qua Sprint sau. **Không qua checkpoint kế tiếp nếu phần validate/test chưa pass.**
> **Thư viện PDF:** `fpdf2` (mặc định theo đề xuất — đổi sang reportlab nếu được yêu cầu).

---

## Tổng quan các Sprint

| Sprint | Nội dung | Rủi ro |
|--------|----------|--------|
| 0 | Chuẩn bị: branch, backup DB, cài deps | Thấp |
| 1 | Schema model + migration 3 bảng (địa chỉ) | Trung bình |
| 2 | Job: thêm `work_mode`, bỏ `location` | **Cao** (nhiều nơi đọc) |
| 3 | Dữ liệu địa chỉ + helper seed | Thấp |
| 4 | Sinh CV PDF thật + upload MinIO | Trung bình |
| 5 | Seed job theo thời gian 01/01/2026 → nay | Thấp |
| 6 | Chạy full seed + nghiệm thu tổng thể | Trung bình |

---

## Sprint 0 — Chuẩn bị

- [ ] Tạo nhánh git `feat/address-fields-cv-seed`.
- [ ] Backup DB dev (`pg_dump`) phòng khi migration/drop cột sai.
- [ ] Thêm `fpdf2` vào `requirements.txt`, `pip install`, tải font Unicode `DejaVuSans.ttf` vào `backend/scripts/seed/assets/`.

🔎 **Validate:** `python -c "import fpdf; print(fpdf.__version__)"` chạy được; file font tồn tại.
🧪 **Test:** chưa có.
🚩 **Checkpoint 0:** deps sẵn sàng, có đường lùi (backup) trước khi đụng schema.

---

## Sprint 1 — Schema địa chỉ cho 3 bảng

- [ ] Thêm `province`, `district`, `address_detail` vào `models/profile.py`, `company.py`, `job.py`.
- [ ] Viết `migrate_address_fields()` trong `db/init_db.py` dùng `ADD COLUMN IF NOT EXISTS` (an toàn chạy lại).
- [ ] Gọi `migrate_address_fields()` trong `init_db()`.

🔎 **Validate:**
- Khởi động app → không lỗi; `\d user_profiles`, `\d companies`, `\d jobs` thấy đủ 3 cột mới.
- Chạy init lần 2 không lỗi (idempotent).

🧪 **Test:**
- [ ] Unit test: insert 1 record có 3 cột địa chỉ rồi đọc lại đúng giá trị (mỗi bảng).

🚩 **Checkpoint 1:** 3 bảng có cột mới, app vẫn chạy, cột cũ `address`/`location` chưa đụng → chưa vỡ gì.

---

## Sprint 2 — Job: thêm `work_mode`, bỏ `location` (⚠️ rủi ro cao)

- [ ] Grep toàn repo các nơi đọc/ghi `jobs.location` / `.location` (backend services, chatbot nodes, schema job, FE) → lập danh sách.
- [ ] Thêm cột `work_mode` (`onsite|hybrid|remote`) vào model + migration.
- [ ] Sửa từng nơi trong danh sách: thay hiển thị `location` bằng địa chỉ ghép + `work_mode`.
- [ ] Cập nhật schema job (Pydantic) trả ra 3 field địa chỉ + `work_mode`.
- [ ] Sau khi không còn ai đọc `location` → migration `DROP COLUMN location IF EXISTS`.

🔎 **Validate:**
- `grep -ri "\.location" backend/app` không còn tham chiếu tới job.location.
- API `GET /jobs` và `GET /jobs/{id}` trả `work_mode` + địa chỉ, không 500.

🧪 **Test:**
- [ ] Chạy lại test suite job hiện có (`pytest` phần jobs) → pass.
- [ ] Test API job list/detail trả đúng field mới.
- [ ] Smoke test recommendation/match service không lỗi khi job không còn `location`.

🚩 **Checkpoint 2:** cột `location` đã bỏ, không nơi nào còn tham chiếu, toàn bộ test job xanh.

---

## Sprint 3 — Dữ liệu địa chỉ + helper seed

- [ ] Tạo `backend/scripts/seed/data/locations_vn.json` (Tỉnh → Quận/Huyện → vài tên đường, ≥ HN/HCM/ĐN + vài tỉnh).
- [ ] Thêm `random_location()` vào `seed_utils.py` trả `(province, district, address_detail)` nhất quán (quận thuộc đúng tỉnh).
- [ ] Cập nhật `seed_candidates.py` + `seed_companies.py`: set 3 cột địa chỉ và **ghép `address` cũ** = `"{detail}, {district}, {province}"`.

🔎 **Validate:** in thử 10 mẫu từ `random_location()` → quận luôn thuộc đúng tỉnh, không lỗi key.

🧪 **Test:**
- [ ] Unit test `random_location()`: quận ∈ tỉnh, 3 giá trị non-empty.
- [ ] Unit test generator candidate/company: record sinh ra có đủ 3 cột + `address` ghép đúng định dạng.

🚩 **Checkpoint 3:** seed candidate & company tạo địa chỉ hợp lệ, nhất quán.

---

## Sprint 4 — Sinh CV PDF thật + upload MinIO

- [ ] Viết `render_cv_pdf(cv_text) -> bytes` trong `seed_utils.py` (fpdf2 + font Unicode, render tiếng Việt có dấu).
- [ ] Trong `seed_candidates.py`: dùng `generate_cv_text(...)` (đã khớp tên/kỹ năng/địa chỉ) → render PDF → `upload_file(bytes, object_key)`.
- [ ] Ghi `candidate_cvs` (file_size = đúng bytes, object_key thật) + `cv_text` (`parse_status="success"`).
- [ ] Fallback: MinIO lỗi → lưu PDF local `scripts/seed/_cv_out/` + log cảnh báo, không làm hỏng seed.

🔎 **Validate:**
- Seed thử 3 ứng viên → tải object_key từ MinIO mở được bằng trình đọc PDF.
- Nội dung PDF chứa đúng tên, kỹ năng, domain của ứng viên đó.

🧪 **Test:**
- [ ] Unit test `render_cv_pdf()`: trả bytes bắt đầu bằng `%PDF`, size > 0.
- [ ] Test PyMuPDF đọc lại PDF vừa sinh → text chứa tên ứng viên (đảm bảo CV ↔ hồ sơ khớp).

🚩 **Checkpoint 4:** mỗi ứng viên có 1 CV PDF thật trên MinIO, nội dung khớp hồ sơ.

---

## Sprint 5 — Job theo thời gian linh hoạt (01/01/2026 → nay)

- [ ] Thêm `random_created_at(start="2026-01-01", end=today)` vào `seed_utils.py`.
- [ ] `seed_jobs.py`: set tường minh `created_at` (ghi đè `func.now()`), `updated_at >= created_at`.
- [ ] `deadline` tính tương đối theo `created_at`: job `active` → deadline tương lai; `closed` → đã qua.

🔎 **Validate:** query `MIN/MAX(created_at)` của jobs nằm trong [2026-01-01, today]; không job nào ở tương lai.

🧪 **Test:**
- [ ] Unit test `random_created_at()`: kết quả luôn trong khoảng, không vượt hôm nay.
- [ ] Test logic deadline khớp status (active→tương lai, closed→quá khứ).

🚩 **Checkpoint 5:** thời gian tạo job phân bố thực tế, deadline hợp lý theo status.

---

## Sprint 6 — Full seed + nghiệm thu tổng thể

- [ ] Chạy `python scripts/seed/run_full_seed.py --truncate --yes` trên DB dev sạch → không lỗi.
- [ ] Kiểm tra số lượng record hợp lý (companies/jobs/candidates/cv).

🔎 **Validate (nghiệm thu):**
- [ ] Vài profile/company/job: 3 cột địa chỉ đúng, quận thuộc tỉnh.
- [ ] Job: có `work_mode`, remote thì địa chỉ trống/theo công ty; không còn cột `location`.
- [ ] Tải ngẫu nhiên 2–3 CV từ MinIO mở được, nội dung khớp ứng viên.
- [ ] `created_at` job rải đều 01/01/2026 → hôm nay.
- [ ] Màn hình chính (job list, candidate search, CV) hiển thị bình thường.

🧪 **Test:**
- [ ] Toàn bộ `pytest` xanh (gồm các test mới Sprint 1–5).
- [ ] Smoke test `run_full_seed.py` chạy lại lần 2 (idempotent) không vỡ.

🚩 **Checkpoint cuối (DONE khi tất cả đạt):**
- [ ] Migration chạy sạch & idempotent.
- [ ] Job bỏ `location`, dùng `work_mode` + địa chỉ tách cột, không nơi nào lỗi.
- [ ] Ứng viên có CV PDF thật khớp hồ sơ.
- [ ] Job có thời gian tạo linh hoạt đúng yêu cầu.
- [ ] Toàn bộ test pass, app demo chạy được.

---

## Ghi chú lệnh hay dùng

```bash
# Backup DB (Sprint 0)
pg_dump -U <user> <db> > backup_before_address.sql

# Chạy test backend
cd backend && pytest -q

# Seed sạch (Sprint 6)
cd backend && python scripts/seed/run_full_seed.py --truncate --yes

# Kiểm tra phân bố thời gian job
# SELECT MIN(created_at), MAX(created_at) FROM jobs;
```
