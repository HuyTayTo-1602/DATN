# Kế hoạch: Tách trường địa chỉ + Sinh CV file + Job theo thời gian linh hoạt

> **Mục tiêu:** Cho 3 bảng `user_profiles`, `companies`, `jobs` lưu địa chỉ tách thành **Tỉnh / Quận-Huyện / Địa chỉ chi tiết**, sinh lại bộ seed data khớp schema mới, tạo **file CV PDF thật** cho ứng viên (nội dung khớp hồ sơ), và cho job có `created_at` rải đều **01/01/2026 → hôm nay**.
>
> File này để review. Chưa code gì cho tới khi được duyệt.

---

## 1. Hiện trạng (vì sao cần sửa)

| Bảng | Trường địa chỉ hiện tại | Vấn đề |
|------|------------------------|--------|
| `user_profiles` | `address` (1 chuỗi) | Không lọc/search theo tỉnh, quận được |
| `companies` | `address` (1 chuỗi) | Như trên |
| `jobs` | `location` (1 chuỗi) | Lẫn lộn **nơi chốn** + **hình thức làm việc** (vd `"Hà Nội (Hybrid)"`, `"Remote"`) trong cùng 1 cột |

- CV ứng viên: chỉ có `cv_text.extracted_text`, còn `candidate_cvs.object_key` trỏ tới file **không có thật** trên MinIO.
- `jobs.created_at` = `func.now()` → toàn bộ job cùng một mốc thời gian, không thực tế.

---

## 2. Thiết kế mới

### 2.1. Thêm 3 cột vào mỗi bảng (3 bảng)

Mỗi bảng thêm:

| Cột mới | Kiểu | Ví dụ |
|---------|------|-------|
| `province` | VARCHAR(100) | `Hà Nội` |
| `district` | VARCHAR(100) | `Thanh Xuân` |
| `address_detail` | VARCHAR(255) | `47 Nguyễn Tuân` |

**Riêng `jobs` (đã chốt): tách "địa chỉ" và "hình thức làm việc" thành 2 khái niệm riêng**
- 3 cột địa chỉ ở trên (`province` / `district` / `address_detail`) = nơi văn phòng.
- Thêm cột mới `work_mode` VARCHAR(20): `onsite` | `hybrid` | `remote`.
  - `onsite` / `hybrid` → 3 cột địa chỉ điền đầy đủ.
  - `remote` → `work_mode = remote`, địa chỉ lấy theo trụ sở công ty hoặc để trống.
- **Bỏ hẳn cột `location` cũ** của `jobs` (chuỗi `"Remote"`, `"Hà Nội (Hybrid)"` không còn cần) → phải sửa các nơi đọc `jobs.location`.

**`user_profiles` và `companies`: giữ lại** cột cũ `address` nhưng **tự động ghép** = `"{address_detail}, {district}, {province}"` để không vỡ màn hình / search / schema đang đọc cột cũ → giảm rủi ro, migrate dần.

### 2.2. Migration

- Thêm vào `app/db/init_db.py` một hàm `migrate_address_fields()` dùng `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (an toàn chạy nhiều lần), gọi trong `init_db()`.
- Cập nhật model SQLAlchemy: `models/profile.py`, `models/company.py`, `models/job.py`.

### 2.3. Dữ liệu địa chỉ chuẩn

- Tạo `backend/scripts/seed/data/locations_vn.json`: danh sách **Tỉnh → Quận/Huyện → vài tên đường** thực tế (Hà Nội, TP.HCM, Đà Nẵng, + vài tỉnh phổ biến).
- Thêm helper `random_location()` trong `seed_utils.py` trả về `(province, district, address_detail)` nhất quán (quận thuộc đúng tỉnh).

---

## 3. Sinh lại seed data (khớp schema mới)

Sửa các script seed sẵn có trong `backend/scripts/seed/`:

- **`seed_candidates.py`** — gán `province/district/address_detail` cho profile.
- **`seed_companies.py`** — tách địa chỉ công ty (từ `company_templates.json` hoặc random) thành 3 cột.
- **`seed_jobs.py`** — gán `work_mode` (onsite/hybrid/remote) + 3 cột địa chỉ (onsite/hybrid lấy theo địa chỉ công ty, remote có thể bỏ trống). Bỏ logic ghép chuỗi `location` cũ.

Giữ nguyên quy mô như `05-seed-data-plan.md` (30–50 công ty, 300–700 job, 200–400 ứng viên).

---

## 4. Sinh file CV PDF thật cho ứng viên

- **Thư viện:** thêm `fpdf2` vào `requirements.txt` (thuần Python, nhẹ) + 1 font Unicode (`DejaVuSans.ttf`) để render được tiếng Việt có dấu.
- **Nội dung CV:** dùng lại `generate_cv_text(...)` đã có (đã chứa tên, email, SĐT, kỹ năng, kinh nghiệm, học vấn theo domain) → **render thành PDF**, đảm bảo nội dung khớp hồ sơ ứng viên.
- **Luồng trong `seed_candidates.py`:**
  1. Sinh text CV (như hiện tại) → khớp `full_name`, `skills`, `domain`, địa chỉ.
  2. Render text đó ra `bytes` PDF (helper mới `render_cv_pdf()` trong `seed_utils.py`).
  3. Upload lên MinIO qua `upload_file(bytes, object_key)` đã có → `object_key` trỏ tới **file thật**.
  4. Ghi `candidate_cvs` (file_size = đúng kích thước bytes) + `cv_text` (`parse_status="success"`).
- **Fallback:** nếu MinIO không chạy lúc seed → vẫn ghi DB + lưu PDF tạm vào thư mục local `backend/scripts/seed/_cv_out/` và log cảnh báo (không làm hỏng seed).

---

## 5. Job có thời gian tạo linh hoạt (01/01/2026 → hôm nay)

- Thêm helper `random_created_at(start="2026-01-01", end=today)` trong `seed_utils.py`.
- Trong `seed_jobs.py`: set tường minh `job.created_at` (và `updated_at >= created_at`) bằng giá trị random trong khoảng trên, **ghi đè** `func.now()`.
- `deadline` tính tương đối theo `created_at` (job active → deadline tương lai; job closed → đã qua) để logic hợp lý.

---

## 6. Cập nhật liên quan (để không vỡ app)

- Schemas: `app/schemas/company.py`, `app/schemas/application.py`, schema profile/job → thêm 3 field địa chỉ mới + (với job) field `work_mode`.
- **Job bỏ `location`** → bắt buộc rà & sửa mọi nơi đọc `jobs.location`: schema job, `job_service.py`, `job_recommendation_service.py`, `job_candidate_match_service.py`, chatbot nodes, và FE hiển thị job. Đây là phần ảnh hưởng lớn nhất, cần grep kỹ trước khi xóa cột.
- `user_profiles` / `companies` giữ cột cũ tự-ghép nên ảnh hưởng nhỏ.
- Frontend: ưu tiên backend trước; FE đọc 3 field địa chỉ + `work_mode` khi có (ngoài phạm vi seed).

---

## 7. Các bước thực hiện (checklist)

### Bước 1 — Schema & migration
- [ ] Thêm 3 cột địa chỉ vào `models/profile.py`, `company.py`, `job.py`.
- [ ] `models/job.py`: thêm `work_mode`, **bỏ `location`** (sau khi đã sửa hết nơi dùng).
- [ ] Viết `migrate_address_fields()` trong `init_db.py` (ADD COLUMN IF NOT EXISTS, và DROP COLUMN `location` IF EXISTS) + gọi trong `init_db()`.

### Bước 2 — Dữ liệu địa chỉ
- [ ] Tạo `data/locations_vn.json` (tỉnh → quận → đường).
- [ ] Thêm `random_location()` vào `seed_utils.py`.

### Bước 3 — Seed khớp schema mới
- [ ] Cập nhật `seed_candidates.py`, `seed_companies.py` để set 3 cột địa chỉ + ghép cột `address` cũ.
- [ ] Cập nhật `seed_jobs.py`: set `work_mode` + 3 cột địa chỉ, bỏ ghép chuỗi `location`.
- [ ] Grep & sửa mọi nơi đọc `jobs.location` trước khi drop cột.

### Bước 4 — CV PDF thật
- [ ] Thêm `fpdf2` + font Unicode vào dự án.
- [ ] Viết `render_cv_pdf()` và tích hợp upload MinIO trong `seed_candidates.py`.

### Bước 5 — Job theo thời gian
- [ ] Thêm `random_created_at()` và áp dụng trong `seed_jobs.py` (kèm deadline hợp lý).

### Bước 6 — Chạy & kiểm tra
- [ ] `python scripts/seed/run_full_seed.py --truncate --yes` chạy sạch không lỗi.
- [ ] Kiểm tra vài record: 3 cột địa chỉ đúng, quận thuộc đúng tỉnh; job có `work_mode` hợp lệ (remote thì địa chỉ trống/theo công ty).
- [ ] Tải 1 CV từ MinIO mở được, nội dung khớp tên/kỹ năng ứng viên.
- [ ] `jobs.created_at` phân bố trong 01/01/2026 → hôm nay.

---

## 8. Quyết định

1. ~~Cột địa chỉ cũ~~ → **Đã chốt:** `jobs` bỏ `location` + thêm `work_mode`; `user_profiles`/`companies` giữ `address` tự-ghép.
2. **Thư viện PDF:** `fpdf2` (đề xuất, nhẹ) hay `reportlab` (mạnh hơn, nặng hơn)? — *còn chờ duyệt.*
