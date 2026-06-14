# Job Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Completion note:** Chỉ đánh dấu plan này là `DONE` sau khi agent finish coding, chạy test, tự kiểm tra checkpoint cuối, và xác nhận luồng search hoạt động đúng trên UI.

**Goal:** Cho phép ứng viên tìm job bằng thanh search với từ khóa tự nhiên như `java backend senior`, trả kết quả nhanh và đủ liên quan cho MVP.

**Architecture:** Dùng PostgreSQL full-text search làm trục chính, thêm `ILIKE` fallback cho từ khóa lẻ và typo nhẹ. Backend FastAPI cung cấp một endpoint search duy nhất; frontend Vite dùng một ô search đơn giản, query debounce, và hiển thị danh sách job theo mức độ liên quan.

**Tech Stack:** FastAPI, PostgreSQL (`tsvector`, `GIN`, `ts_rank`), Vite, React, pytest.

---

## 1. Ý nghĩa với người dùng

- Ứng viên chỉ cần gõ vài từ khóa gần đúng thay vì lọc phức tạp.
- Kết quả ưu tiên job có tiêu đề, level, mô tả và yêu cầu khớp nhiều nhất.
- MVP chưa cần semantic search hay AI ranking.

## 2. Phạm vi MVP

- Search theo `title`, `level`, `description`, `requirements`, `benefits`, `location`.
- Hỗ trợ từ khóa nhiều từ: `java backend senior`.
- Có phân trang cơ bản.
- Có sắp xếp theo `relevance` và fallback `created_at desc`.
- Không làm bộ lọc nâng cao nhiều tầng ở giai đoạn này.

## 3. Giả định cấu trúc file

Nếu repo đang dùng tên thư mục khác, agent phải map 1-1 sang module tương đương.

**Backend**
- Modify: `backend/app/models/job.py`
- Create or Modify: `backend/app/schemas/job_search.py`
- Create: `backend/app/services/job_search_service.py`
- Modify: `backend/app/api/v1/endpoints/jobs.py`
- Create: `backend/app/db/migrations/<timestamp>_add_job_search_vector.sql`

**Frontend**
- Modify: `frontend/src/pages/jobs/JobListPage.tsx`
- Create or Modify: `frontend/src/components/jobs/JobSearchBar.tsx`
- Create or Modify: `frontend/src/services/jobApi.ts`
- Create or Modify: `frontend/src/types/job.ts`

**Tests**
- Create: `backend/tests/services/test_job_search_service.py`
- Create: `backend/tests/api/test_job_search_api.py`
- Create: `frontend/src/components/jobs/JobSearchBar.test.tsx`

## 4. Thiết kế dữ liệu và API

- Thêm cột `search_vector` cho bảng `jobs`.
- Dữ liệu index gồm: `title`, `level`, `description`, `requirements`, `benefits`, `location`.
- Tạo `GIN index` trên `search_vector`.
- API đề xuất:
  - `GET /api/v1/jobs/search?q=java backend senior&page=1&page_size=10`
- Response nên gồm:
  - `items`
  - `total`
  - `page`
  - `page_size`
  - `sort = relevance`

## 5. Checklist triển khai

### Task 1: Chuẩn hóa dữ liệu search trong PostgreSQL

- [ ] Thêm `search_vector` vào bảng `jobs`.
- [ ] Tạo migration để backfill dữ liệu cho các job hiện có.
- [ ] Tạo `GIN index` cho `search_vector`.
- [ ] Bổ sung cơ chế cập nhật `search_vector` khi job được tạo hoặc sửa.

### Task 2: Tạo service search phía backend

- [ ] Viết `job_search_service.py` để nhận `q`, tách chuỗi, chuẩn hóa khoảng trắng, bỏ query rỗng.
- [ ] Ưu tiên `websearch_to_tsquery` hoặc `plainto_tsquery` để xử lý input tự nhiên.
- [ ] Nếu full-text cho kết quả quá ít, thêm fallback `ILIKE` trên `title` và `requirements`.
- [ ] Chuẩn hóa response pagination để frontend chỉ cần render.

### Task 3: Expose API search job

- [ ] Thêm endpoint riêng trong `jobs.py` hoặc mở rộng endpoint listing sẵn có nếu codebase đang dùng pattern đó.
- [ ] Validate `q`, `page`, `page_size`.
- [ ] Trả lỗi rõ ràng khi query quá ngắn hoặc thiếu dữ liệu cần thiết.

### Task 4: Gắn vào giao diện ứng viên

- [ ] Thêm ô search ở đầu trang danh sách job.
- [ ] Dùng debounce 300-500ms để tránh gọi API liên tục.
- [ ] Hiển thị trạng thái `loading`, `empty result`, `error`.
- [ ] Khi người dùng clear search, quay về danh sách job mặc định.

### Task 5: Kiểm thử và chốt chất lượng

- [ ] Kiểm tra query `java backend senior` trả job backend trước các job không liên quan.
- [ ] Kiểm tra query rỗng không gây lỗi server.
- [ ] Kiểm tra phân trang và sort ổn định.
- [ ] Kiểm tra UI không spam request khi gõ liên tục.

## 6. Checkpoint cuối

- [ ] Người dùng gõ `java backend senior` trên thanh search và nhận kết quả hợp lý.
- [ ] Job có nhiều trường khớp hơn được xếp trên.
- [ ] Không làm chậm trang list job rõ rệt khi dữ liệu seed tăng.
- [ ] API search có phân trang và xử lý input xấu an toàn.

## 7. Yêu cầu test bắt buộc cho agent sau khi code xong

- [ ] Tạo unit test cho hàm build query và hàm ranking trong `job_search_service.py`.
- [ ] Tạo API test cho endpoint search job với ít nhất 3 case: query bình thường, query rỗng, query nhiều từ.
- [ ] Nếu frontend có logic debounce hoặc chuẩn hóa input, tạo test cho component search bar.
- [ ] Chỉ được coi là xong khi tất cả test mới đều pass và không làm hỏng CRUD jobs hiện có.
