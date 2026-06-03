# Feedback: Mâu thuẫn giữa CHATBOT_DESIGN.md và kiến trúc hiện tại

Ngày kiểm tra: 2026-05-30

---

## Mâu thuẫn 1 — Tên role không khớp (CRITICAL)

**Thiết kế nói:**
```python
role: Literal["recruiter", "candidate"]
```
Và toàn bộ tài liệu dùng thuật ngữ "Candidate".

**Thực tế DB:**
Bảng `roles` có 3 giá trị: `job_seeker`, `recruiter`, `admin`.  
Không có role nào tên là `candidate`.

**Ảnh hưởng:**
- `ChatState.role` sẽ không match với `users.role_id` → mọi logic phân quyền dựa trên role đều sai.
- Các node `role_check`, `classify_intent`, `general_qa_node` viết theo thiết kế sẽ fail ngay khi chạy.

**Cần sửa:** Thay `"candidate"` → `"job_seeker"` xuyên suốt thiết kế và code.

---

## Mâu thuẫn 2 — API prefix không nhất quán (MINOR)

**Thiết kế nói:**
```
POST /api/chatbot/message
GET  /api/chatbot/my-jobs
GET  /api/chatbot/history
```

**Thực tế dự án:**  
Tất cả API đều dùng prefix `/api/v1`. Ví dụ:
```
POST /api/v1/auth/login
GET  /api/v1/jobs/my
POST /api/v1/applications/{job_id}
```
Chatbot stub hiện tại cũng đặt ở `/api/v1/chatbot/`.

**Ảnh hưởng:** Frontend sẽ call sai URL nếu dùng theo thiết kế.

**Cần sửa:** Thống nhất dùng `/api/v1/chatbot/...` cho tất cả endpoint chatbot mới.

---

## Mâu thuẫn 3 — CV file là URL, không phải local path (IMPORTANT)

**Thiết kế nói:**
```
Sprint 1: Viết service pdf_service.extract_text(file_path) -> str
```
Và:
```
Caching cache text đã trích xuất từ PDF theo cv_file_hash
```

**Thực tế DB:**
```python
# user_profiles
cv_url: str  # e.g. "/uploads/cv/user_1_cv.pdf" hoặc URL đầy đủ

# job_applications
cv_url: str  # URL/path tới CV nộp kèm
```

Không rõ `cv_url` là local filesystem path hay HTTP URL. Cần xác định:
- Nếu là local path → `pdf_service.extract_text(path)` dùng được.
- Nếu là HTTP URL → phải download file trước, rồi mới extract.
- Nếu dùng external storage (S3, MinIO) → cần thêm bước auth khi download.

**Cần sửa:** Kiểm tra `UPLOAD_DIR` hoặc cách serve static files trong `main.py` / `.env`.  
Cập nhật `pdf_service` để handle cả local path lẫn URL.

---

## Mâu thuẫn nhỏ — Endpoint chatbot stub hiện tại

File `backend/app/routers/chatbot.py` đã có 2 endpoint:
- `POST /api/v1/chatbot/analyze-cv` (job_seeker only)
- `POST /api/v1/chatbot/analyze-job` (recruiter only)

Đây là placeholder cũ, **không nằm trong thiết kế LangGraph mới**.  
Không có conflict về logic nhưng cần quyết định: **xóa hay giữ lại** trước khi triển khai Sprint 1.

---

## Tóm tắt

| # | Mức độ | Vấn đề | Hành động |
|---|--------|---------|-----------|
| 1 | 🔴 CRITICAL | `"candidate"` → đổi thành `"job_seeker"` | Sửa trong CHATBOT_DESIGN.md và tất cả code |
| 2 | 🟡 MINOR | API prefix `/api/chatbot/` → `/api/v1/chatbot/` | Sửa trong CHATBOT_DESIGN.md |
| 3 | 🟠 IMPORTANT | `cv_url` là URL hay path — cần xác nhận cách serve file | Kiểm tra upload config, cập nhật pdf_service |
| 4 | 🔵 INFO | 2 endpoint stub cũ không thuộc thiết kế mới | Quyết định xóa hay migrate |
