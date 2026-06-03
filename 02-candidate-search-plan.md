# Candidate Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Completion note:** Chỉ đánh dấu plan này là `DONE` sau khi agent finish coding, chạy test, và xác nhận recruiter tìm được ứng viên theo skill hoặc keyword CV.

**Goal:** Cho phép recruiter tìm ứng viên bằng skill hoặc keyword như `java python`, nhìn thấy danh sách ứng viên phù hợp mà không cần đọc thủ công toàn bộ CV.

**Architecture:** Search dựa trên hai nguồn chính: `user_profiles` và `cv_text`. PostgreSQL full-text search dùng cho nội dung CV; profile fields như `skills`, `experience`, `full_name` được gộp vào một vector hoặc query song song rồi chấm điểm tổng hợp.

**Tech Stack:** FastAPI, PostgreSQL (`tsvector`, `GIN`, `ts_rank`), Vite, React, pytest, PyMuPDF output data.

---

## 1. Ý nghĩa với người dùng

- Recruiter gõ skill mong muốn và có ngay shortlist ban đầu.
- Ứng viên có profile chưa đầy đủ vẫn có thể được tìm thấy nhờ text lấy từ CV.
- MVP ưu tiên “dễ tìm đúng” hơn là “chấm điểm thông minh”.

## 2. Phạm vi MVP

- Search theo `skills`, `experience`, `full_name`, và `cv_text.extracted_text`.
- Chỉ hiển thị ứng viên đang active.
- Mỗi dòng kết quả có thông tin cơ bản: tên, skills, năm kinh nghiệm hoặc mô tả ngắn, link CV gần nhất.
- Chưa cần bộ lọc nâng cao như expected salary hoặc city map.

## 3. Giả định cấu trúc file

**Backend**
- Modify: `backend/app/models/user_profile.py`
- Create or Modify: `backend/app/models/cv_text.py`
- Create or Modify: `backend/app/schemas/candidate_search.py`
- Create: `backend/app/services/candidate_search_service.py`
- Modify: `backend/app/api/v1/endpoints/recruiter_candidates.py`
- Create: `backend/app/db/migrations/<timestamp>_add_candidate_search_vector.sql`

**Frontend**
- Modify: `frontend/src/pages/recruiter/CandidateListPage.tsx`
- Create or Modify: `frontend/src/components/recruiter/CandidateSearchBar.tsx`
- Create or Modify: `frontend/src/services/candidateApi.ts`
- Create or Modify: `frontend/src/types/candidate.ts`

**Tests**
- Create: `backend/tests/services/test_candidate_search_service.py`
- Create: `backend/tests/api/test_candidate_search_api.py`
- Create: `frontend/src/components/recruiter/CandidateSearchBar.test.tsx`

## 4. Thiết kế dữ liệu và API

- Có thể chọn một trong hai cách:
  - Tạo `search_vector` cho `user_profiles`.
  - Hoặc build query kết hợp `user_profiles` và `cv_text`.
- MVP khuyến nghị:
  - `user_profiles.search_vector` từ `full_name`, `skills`, `experience`.
  - `cv_text.search_vector` từ `extracted_text`.
- API đề xuất:
  - `GET /api/v1/recruiter/candidates/search?q=java python&page=1&page_size=10`

## 5. Checklist triển khai

### Task 1: Chuẩn bị dữ liệu search của ứng viên

- [ ] Thêm `search_vector` cho `user_profiles` nếu chưa có.
- [ ] Thêm `search_vector` cho `cv_text`.
- [ ] Backfill dữ liệu cho hồ sơ và CV đã tồn tại.
- [ ] Đảm bảo mỗi ứng viên lấy đúng CV active hoặc CV mới nhất để tránh trùng bản ghi.

### Task 2: Tạo logic chấm điểm ứng viên

- [ ] Viết service search kết hợp điểm từ profile và CV text.
- [ ] Ưu tiên match từ `skills` cao hơn đoạn text dài trong CV.
- [ ] Hỗ trợ query nhiều từ như `java python backend`.
- [ ] Loại bỏ ứng viên bị khóa hoặc thiếu hồ sơ tối thiểu nếu hệ thống đang có trạng thái đó.

### Task 3: Expose API cho recruiter

- [ ] Tạo endpoint search chỉ cho recruiter/admin.
- [ ] Trả response gồm summary ngắn, điểm match, link CV, và metadata cần render list.
- [ ] Thêm phân trang và validate đầu vào.

### Task 4: Gắn vào giao diện recruiter

- [ ] Thêm thanh search trên trang ứng viên.
- [ ] Hiển thị tags skill nổi bật và trích đoạn CV text khớp nếu có.
- [ ] Có trạng thái `loading`, `empty`, `error`.
- [ ] Có nút mở CV hoặc xem hồ sơ chi tiết.

### Task 5: Kiểm thử và tinh chỉnh

- [ ] Kiểm tra ứng viên có `skills=java, python` luôn lên trước ứng viên chỉ nhắc tới skill đó trong CV text.
- [ ] Kiểm tra không lặp nhiều bản ghi cho cùng một user.
- [ ] Kiểm tra recruiter không thấy candidate không hợp lệ nếu business rule yêu cầu ẩn.

## 6. Checkpoint cuối

- [ ] Recruiter gõ `java python` và nhận được danh sách ứng viên có liên quan rõ ràng.
- [ ] Kết quả không trùng lặp theo user.
- [ ] Có thể mở CV từ kết quả search.
- [ ] Search vẫn usable khi dữ liệu seed tăng lên.

## 7. Yêu cầu test bắt buộc cho agent sau khi code xong

- [ ] Tạo unit test cho hàm score profile match và CV text match.
- [ ] Tạo API test cho endpoint search ứng viên với case nhiều skill, case không có kết quả, và case phân quyền sai.
- [ ] Nếu UI có logic highlight keyword hoặc debounce, thêm component test tương ứng.
- [ ] Chỉ được coi là xong khi test pass và recruiter workflow không phá vỡ các trang hồ sơ hiện có.
