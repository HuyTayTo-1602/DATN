# In-App Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Completion note:** Chỉ đánh dấu plan này là `DONE` sau khi agent finish coding, kiểm tra chuông thông báo, badge unread, và realtime event hoạt động ổn.

**Goal:** Xây dựng notification in-app cho hai luồng chính: recruiter nhận thông báo khi có ứng viên apply, ứng viên nhận thông báo khi recruiter chấp nhận hoặc từ chối CV/application.

**Architecture:** Notification luôn được lưu trong PostgreSQL để bảo đảm không mất dữ liệu. Realtime chỉ là lớp bổ sung bằng FastAPI WebSocket; nếu socket ngắt, người dùng vẫn thấy thông báo khi reload hoặc gọi API danh sách.

**Tech Stack:** FastAPI, PostgreSQL, WebSocket, Vite, React, pytest.

---

## 1. Ý nghĩa với người dùng

- Recruiter biết ngay khi có đơn apply mới.
- Ứng viên không phải kiểm tra thủ công trạng thái hồ sơ.
- Realtime giúp trải nghiệm tốt hơn nhưng không làm hệ thống quá phức tạp.

## 2. Phạm vi MVP

- Notification loại `application_submitted`, `application_accepted`, `application_rejected`.
- Có `is_read`, `read_at`.
- Có badge unread trên icon chuông.
- Có dropdown ngắn và trang "xem tất cả".
- Realtime qua WebSocket theo `user_id`.

## 3. Giả định cấu trúc file

**Backend**
- Modify: `backend/app/models/notification.py` ✅
- Create or Modify: `backend/app/schemas/notification.py` ✅
- Create: `backend/app/services/notification_service.py` ✅
- Create: `backend/app/services/notification_dispatcher.py` ✅
- Create: `backend/app/websocket/notification_hub.py` ✅
- Modify: `backend/app/routers/notifications.py` ✅
- Modify: `backend/app/routers/applications.py` ✅

**Frontend**
- Create or Modify: `frontend/src/components/notifications/NotificationBell.jsx` ✅
- Create or Modify: `frontend/src/components/notifications/NotificationDropdown.jsx` ✅
- Create or Modify: `frontend/src/pages/NotificationPage.jsx` ✅
- Create or Modify: `frontend/src/services/api.js` (notificationsApi) ✅
- Create or Modify: `frontend/src/services/notificationSocket.js` ✅

**Tests**
- Create: `backend/tests/services/test_notification_service.py` ✅
- Create: `backend/tests/api/test_notification_api.py` ✅
- Create: `backend/tests/websocket/test_notification_hub.py` ✅

## 4. Thiết kế dữ liệu và API

- Bảng `notifications` nên có:
  - `id`, `user_id`, `type`, `title`, `message`, `is_read`, `read_at`, `related_id`, `related_type`, `created_at`
- API đề xuất:
  - `GET /api/v1/notifications` ✅
  - `POST /api/v1/notifications/{id}/read` ✅
  - `POST /api/v1/notifications/read-all` ✅
  - `GET /api/v1/notifications/unread-count` ✅
  - `GET /api/v1/notifications/ws` (WebSocket) ✅

## 5. Checklist triển khai

### Task 1: Chuẩn hóa model và service notification ✅

- ✅ Bổ sung `is_read` và `read_at` nếu bảng chưa có.
- ✅ Viết `notification_service.py` để tạo thông báo, list theo user, mark read, unread count.
- ✅ Chuẩn hóa payload theo từng loại sự kiện để frontend render thống nhất.

### Task 2: Gắn notification vào luồng nghiệp vụ ✅

- ✅ Khi ứng viên apply job, tạo notification cho recruiter hoặc owner company.
- ✅ Khi recruiter accept/reject application, tạo notification cho candidate.
- ✅ Không nhúng logic tạo notification rải rác; gọi qua service chung (`notification_dispatcher.py`).

### Task 3: Thêm realtime nhẹ bằng WebSocket ✅

- ✅ Tạo `notification_hub.py` để quản lý connection theo `user_id`.
- ✅ Khi có notification mới, lưu DB trước rồi mới push socket (via `BackgroundTasks`).
- ✅ Nếu user offline, bỏ qua push realtime nhưng dữ liệu vẫn ở DB.

### Task 4: Gắn vào frontend ✅

- ✅ Thêm icon chuông ở layout chính (Navbar).
- ✅ Hiển thị badge unread count.
- ✅ Dropdown hiển thị 10 notification gần nhất.
- ✅ Trang full list cho phép đánh dấu đã đọc và xem chi tiết liên quan.

### Task 5: Chốt UX MVP ✅

- ✅ Click notification sẽ điều hướng tới job application hoặc hồ sơ liên quan nếu route đã có.
- ✅ Reconnect WebSocket nhẹ nếu mất kết nối (tối đa 10 lần, delay 5s).
- ✅ Không làm treo UI khi socket lỗi.

## 6. Checkpoint cuối

- ✅ Recruiter nhận notification khi candidate apply.
- ✅ Candidate nhận notification khi bị accept/reject.
- ✅ Badge unread tăng ngay nếu socket đang kết nối.
- ✅ Reload trang vẫn thấy đầy đủ notification từ DB.

## 7. Yêu cầu test bắt buộc cho agent sau khi code xong

- ✅ Tạo unit test cho `notification_service.py` với các case create, mark read, unread count. (13 tests)
- ✅ Tạo API test cho list/read/read-all endpoints. (9 tests)
- ✅ Tạo test cho luồng WebSocket nhận message mới. (10 tests)
- ✅ Nếu frontend có state management cho unread count, thêm unit/component test cho bell dropdown. (10 tests)
- ✅ Chỉ được coi là xong khi notification vừa hoạt động realtime vừa không mất dữ liệu khi user offline.

**Kết quả test:** 32 backend + 10 frontend = **42/42 passed** ✅ (2026-06-03)
