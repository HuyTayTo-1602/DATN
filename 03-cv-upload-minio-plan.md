# CV Upload And MinIO Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Completion note:** Chỉ đánh dấu plan này là `DONE` sau khi agent finish coding, upload thử CV thật, parse PDF bằng PyMuPDF thành công, và test pass.

**Goal:** Cho phép ứng viên upload CV PDF lên MinIO, lưu metadata vào PostgreSQL, đọc text từ PDF bằng PyMuPDF và lưu text để phục vụ search và recommendation.

**Architecture:** Request upload xử lý theo 2 chặng: lưu file lên MinIO trước, sau đó tạo job parse nền hoặc gọi service parse sau khi upload thành công. Metadata file và text trích xuất được tách thành hai bảng để dễ quản lý trạng thái parse và retry.

**Tech Stack:** FastAPI, PostgreSQL, MinIO (S3 compatible), PyMuPDF, pytest.

---

## 1. Ý nghĩa với người dùng

- Ứng viên có nơi lưu CV chính thức trong hệ thống.
- Recruiter có thể mở CV từ hồ sơ ứng viên.
- Hệ thống đọc text tự động để hỗ trợ search và recommendation sau này.

## 2. Phạm vi MVP

- Chỉ hỗ trợ PDF text-based ở giai đoạn đầu.
- Mỗi ứng viên có thể upload nhiều CV, nhưng chỉ một CV active.
- Có trạng thái parse: `pending`, `success`, `failed`.
- Chưa làm OCR cho file scan ảnh.

## 3. Giả định cấu trúc file

**Backend** *(đã điều chỉnh theo cấu trúc thực tế của dự án)*
- ✅ Created: `backend/app/models/candidate_cv.py`
- ✅ Created: `backend/app/models/cv_text.py`
- ✅ Created: `backend/app/schemas/cv.py`
- ✅ Created: `backend/app/integrations/minio_client.py`
- ✅ Created: `backend/app/services/cv_storage_service.py`
- ✅ Created: `backend/app/services/cv_parse_service.py`
- ✅ Modified: `backend/app/routers/cvs.py` (thay vì `api/v1/endpoints/`)
- ✅ Modified: `backend/app/config.py` (thay vì `core/config.py`)

**Frontend**
- ✅ Modified: `frontend/src/pages/ProfilePage.jsx` (thêm CvUploadCard)
- ✅ Created: `frontend/src/components/CvUploadCard.jsx`
- ✅ Modified: `frontend/src/services/api.js` (thêm cvApi)

**Tests**
- ✅ Created: `backend/tests/services/test_cv_storage_service.py`
- ✅ Created: `backend/tests/services/test_cv_parse_service.py`
- ✅ Created: `backend/tests/api/test_cv_upload_api.py`

## 4. Thiết kế dữ liệu và API

- Bảng `candidate_cvs`
  - `id`, `user_id`, `file_name`, `object_key`, `bucket_name`, `mime_type`, `file_size`, `is_active`, `uploaded_at`
- Bảng `cv_text`
  - `id`, `cv_id`, `extracted_text`, `parse_status`, `parse_error`, `extracted_at`
- API đề xuất:
  - ✅ `POST /api/v1/cvs/upload`
  - ✅ `GET /api/v1/cvs/me`
  - ✅ `POST /api/v1/cvs/{cv_id}/activate`

## 5. Checklist triển khai

### Task 1: Tạo tầng lưu trữ MinIO

- ✅ Cấu hình endpoint, access key, secret key, bucket name trong config.
- ✅ Viết `minio_client.py` với các hàm upload file, get object key, và generate presigned URL nếu cần.
- ✅ Chuẩn hóa naming rule cho object key theo `user_id/date/uuid-file-name.pdf`.

### Task 2: Tạo metadata và trạng thái parse

- ✅ Tạo bảng `candidate_cvs` và `cv_text`.
- ✅ Ràng buộc chỉ một CV active cho mỗi user.
- ✅ Khi upload mới, nếu business rule yêu cầu, set CV mới thành active và CV cũ inactive.

### Task 3: Parse PDF bằng PyMuPDF

- ✅ Viết `cv_parse_service.py` để mở PDF, đọc từng trang, nối text, chuẩn hóa xuống dòng.
- ✅ Nếu parse thất bại, lưu `parse_status=failed` và `parse_error`.
- ✅ Nếu parse thành công, lưu `parse_status=success` và `extracted_text`.

### Task 4: Expose API và gắn vào UI

- ✅ Thêm endpoint upload dùng multipart/form-data.
- ✅ Validate file type, file size, và user ownership.
- ✅ Trên frontend, thêm trang quản lý CV: upload mới, xem CV hiện tại, trạng thái parse.
- ✅ Hiển thị lỗi rõ ràng khi file sai định dạng hoặc parse fail.

### Task 5: Đảm bảo khả năng dùng lại cho feature sau

- ✅ Service upload phải trả về `cv_id` để notification, candidate search và recommendation dùng lại.
- ✅ Chuẩn hóa logic lấy CV active mới nhất làm nguồn dữ liệu chính.

## 6. Checkpoint cuối

- ✅ Ứng viên upload PDF thành công lên MinIO.
- ✅ Metadata và text trích xuất được lưu đúng trong PostgreSQL.
- ✅ Có thể xem danh sách CV của chính mình và biết CV nào đang active.
- ✅ Parse thất bại không làm hỏng luồng upload.

## 7. Yêu cầu test bắt buộc cho agent sau khi code xong

- ✅ Tạo unit test cho `cv_storage_service.py` với mock MinIO client.
- ✅ Tạo unit test cho `cv_parse_service.py` với PDF mẫu có text và PDF lỗi.
- ✅ Tạo API test cho upload endpoint với case thành công, sai file type, và file quá lớn.
- ✅ Nếu frontend có logic đổi trạng thái upload hoặc hiển thị parse status, thêm component test.
- [ ] Chỉ được coi là xong khi unit test pass và có ít nhất một file PDF thật được upload thử thành công ở môi trường dev.
