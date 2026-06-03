# Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Completion note:** Chỉ đánh dấu plan này là `DONE` sau khi agent finish coding, seed thành công dữ liệu lớn sạch, và các màn hình chính có dữ liệu demo hợp lý.

**Goal:** Tạo bộ seed data lớn, sạch, và đủ thực tế để demo search, CV flow, notification, admin dashboard và recommendation cơ bản.

**Architecture:** Seed data được chia thành lớp nền và lớp nghiệp vụ. Lớp nền tạo roles, users, companies, profiles; lớp nghiệp vụ tạo jobs, CV text mẫu, applications và notifications mẫu theo quy tắc nhất quán để dữ liệu không rối.

**Tech Stack:** FastAPI backend scripts, PostgreSQL, Faker hoặc dữ liệu curated thủ công, pytest.

---

## 1. Ý nghĩa với người dùng

- Có dữ liệu đẹp để demo ngay sau khi clone dự án.
- Search và dashboard có đủ khối lượng dữ liệu để kiểm tra thực tế.
- Tránh tình trạng dữ liệu seed “ngẫu nhiên vô nghĩa”.

## 2. Phạm vi MVP

- Roles, users, companies, user_profiles, jobs, candidate_cvs metadata giả lập, cv_text mẫu, job_applications, notifications.
- Có ít nhất các nhóm nghề phổ biến: backend, frontend, data, QA, DevOps, mobile, business analyst.
- Có tương quan hợp lý giữa company type, job title, skill, seniority.
- Không cần dữ liệu cực lớn kiểu hàng trăm nghìn bản ghi.

## 3. Giả định cấu trúc file

**Backend**
- Create: `backend/scripts/seed/seed_base_data.py`
- Create: `backend/scripts/seed/seed_companies.py`
- Create: `backend/scripts/seed/seed_jobs.py`
- Create: `backend/scripts/seed/seed_candidates.py`
- Create: `backend/scripts/seed/seed_applications.py`
- Create: `backend/scripts/seed/seed_notifications.py`
- Create: `backend/scripts/seed/run_full_seed.py`
- Create: `backend/tests/scripts/test_seed_generators.py`

**Data assets**
- Create: `backend/scripts/seed/data/skills_catalog.json`
- Create: `backend/scripts/seed/data/job_templates.json`
- Create: `backend/scripts/seed/data/company_templates.json`

## 4. Bộ dữ liệu đề xuất cho MVP

- `roles`: admin, recruiter, candidate.
- `companies`: 30-50 công ty.
- `jobs`: 300-700 job.
- `candidates`: 200-400 ứng viên.
- `applications`: 500-1500 đơn ứng tuyển.
- `notifications`: đủ để test unread/read và dashboard.

## 5. Checklist triển khai

### Task 1: Tạo catalog dữ liệu sạch

- [ ] Chuẩn bị danh sách skill thực tế theo nhóm nghề.
- [ ] Chuẩn bị template job title và requirement theo level: junior, middle, senior.
- [ ] Chuẩn bị template company profile hợp lý theo domain.

### Task 2: Viết seed generator có tính nhất quán

- [ ] Tạo company rồi mới tạo jobs thuộc company đó.
- [ ] Tạo candidate profiles có skill khớp với ít nhất một nhóm job.
- [ ] Sinh `cv_text` mẫu theo bộ skill của candidate thay vì text ngẫu nhiên vô nghĩa.
- [ ] Sinh applications theo logic: candidate backend ưu tiên apply backend jobs.

### Task 3: Hỗ trợ reset và seed lặp lại an toàn

- [ ] Tạo script chạy full seed có thứ tự rõ ràng.
- [ ] Có chế độ truncate hoặc upsert tùy chiến lược hiện có của dự án.
- [ ] Không tạo duplicate vô kiểm soát khi chạy nhiều lần nếu mục tiêu là dữ liệu demo ổn định.

### Task 4: Kiểm tra chất lượng dữ liệu

- [ ] Lấy mẫu ngẫu nhiên vài company, job, candidate để đọc tay.
- [ ] Kiểm tra search `java backend` và `python data` cho kết quả hợp lý.
- [ ] Kiểm tra dashboard có số liệu không lệch hoặc vô lý.

## 6. Checkpoint cuối

- [ ] Toàn hệ thống có dữ liệu đủ nhiều để demo.
- [ ] Job, candidate và CV text liên quan nhau về mặt nội dung.
- [ ] Search job và search ứng viên trả kết quả nhìn “đúng nghề”.
- [ ] Admin dashboard có số liệu đủ đẹp để xem.

## 7. Yêu cầu test bắt buộc cho agent sau khi code xong

- [ ] Tạo unit test cho các generator chính: company, job, candidate profile, CV text.
- [ ] Tạo test xác nhận dữ liệu sinh ra không vi phạm khóa ngoại hoặc rule cơ bản.
- [ ] Tạo smoke test cho script `run_full_seed.py`.
- [ ] Chỉ được coi là xong khi seed chạy thành công trên database dev sạch và ít nhất một vòng search demo cho kết quả hợp lý.
