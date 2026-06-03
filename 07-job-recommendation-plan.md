# Job Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Completion note:** Chỉ đánh dấu plan này là `DONE` sau khi agent finish coding, recommendation hiển thị ổn trên UI, và test pass. Feature này phải được làm sau cùng trong nhóm 7 feature.

**Goal:** Sau khi ứng viên upload CV và hệ thống parse được text, hiển thị danh sách job gợi ý cơ bản nhưng hợp lý, đủ tốt cho MVP.

**Architecture:** Recommendation rule-based, không dùng AI và không cần service riêng. Backend lấy text từ CV active, trích keyword cơ bản, so khớp với `jobs.search_vector` hoặc các trường text chính rồi tính điểm theo số lượng keyword trùng, độ khớp title và level.

**Tech Stack:** FastAPI, PostgreSQL full-text search, Vite, React, pytest, dữ liệu `cv_text` từ PyMuPDF.

---

## 1. Ý nghĩa với người dùng

- Ứng viên vừa upload CV có thể xem ngay các job liên quan.
- Tận dụng dữ liệu đã có từ feature CV parse và job search.
- Không cần recommendation “thông minh”, chỉ cần hợp lý và giải thích được.

## 2. Điều kiện tiên quyết

- Feature upload CV đã hoàn tất.
- Feature job search đã hoàn tất.
- Seed data đủ tốt để có kết quả recommendation nhìn hợp lý.

## 3. Phạm vi MVP

- Chỉ dùng CV active mới nhất của ứng viên.
- Trích keyword cơ bản từ text CV.
- Match với job theo `title`, `requirements`, `description`, `level`.
- Trả top N job liên quan.
- Chưa cá nhân hóa theo lịch sử click, save job hay ứng tuyển trước đó.

## 4. Giả định cấu trúc file

**Backend**
- Create: `backend/app/services/job_recommendation_service.py`
- Create or Modify: `backend/app/schemas/job_recommendation.py`
- Modify: `backend/app/api/v1/endpoints/jobs.py`

**Frontend**
- Modify: `frontend/src/pages/home/HomePage.tsx`
- Create or Modify: `frontend/src/components/jobs/RecommendedJobsSection.tsx`
- Create or Modify: `frontend/src/services/jobApi.ts`

**Tests**
- Create: `backend/tests/services/test_job_recommendation_service.py`
- Create: `backend/tests/api/test_job_recommendation_api.py`
- Create: `frontend/src/components/jobs/RecommendedJobsSection.test.tsx`

## 5. Thiết kế logic recommendation

- Bước 1: Lấy CV active mới nhất của user.
- Bước 2: Lấy `cv_text.extracted_text`.
- Bước 3: Tách keyword cơ bản:
  - skills phổ biến
  - title liên quan như `backend`, `frontend`, `data engineer`
  - seniority gần đúng như `junior`, `senior`
- Bước 4: Query jobs và tính score:
  - title match: trọng số cao
  - requirement match: trọng số trung bình cao
  - description match: trọng số thấp hơn
  - level match: bonus nhỏ

## 6. Checklist triển khai

### Task 1: Xây service recommendation đơn giản và giải thích được

- [ ] Viết `job_recommendation_service.py` nhận `user_id`.
- [ ] Nếu chưa có CV active hoặc chưa parse xong, trả danh sách rỗng hoặc fallback jobs mới nhất.
- [ ] Tách keyword bằng rule-based dictionary thay vì NLP phức tạp.
- [ ] Giới hạn top N để response nhẹ.

### Task 2: Expose API recommendation

- [ ] Thêm endpoint như `GET /api/v1/jobs/recommendations`.
- [ ] Chỉ cho candidate lấy recommendation của chính mình.
- [ ] Response nên có thêm `match_reason` ngắn nếu làm được, ví dụ `Matched: java, spring, backend`.

### Task 3: Gắn vào UI ứng viên

- [ ] Thêm section “Job gợi ý cho bạn” ở home page hoặc profile dashboard.
- [ ] Có empty state khi user chưa upload CV.
- [ ] Có loading state và CTA đi upload CV nếu chưa có dữ liệu.

### Task 4: Chốt chất lượng

- [ ] Kiểm tra CV thiên về backend thì không đề xuất quá nhiều job không liên quan như designer hoặc mobile iOS.
- [ ] Kiểm tra recommendation không trả job đã đóng nếu business rule muốn ẩn.
- [ ] Kiểm tra không đề xuất trùng lặp.

## 7. Checkpoint cuối

- [ ] Ứng viên có CV active và text parse thành công sẽ thấy danh sách job gợi ý.
- [ ] Kết quả nhìn hợp lý với skill chính trong CV.
- [ ] UI giải thích rõ khi chưa có CV hoặc parse chưa xong.
- [ ] Feature này được triển khai sau khi các nền tảng trước đó đã ổn định.

## 8. Yêu cầu test bắt buộc cho agent sau khi code xong

- [ ] Tạo unit test cho hàm extract keyword và hàm score recommendation.
- [ ] Tạo API test cho case có CV hợp lệ, chưa có CV, và CV parse fail.
- [ ] Nếu frontend có logic render `match_reason` hoặc empty state, thêm component test.
- [ ] Chỉ được coi là xong khi recommendation không phá hiệu năng trang chủ ở quy mô seed data MVP.
