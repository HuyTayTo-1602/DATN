# BACKEND FEATURE REFERENCE — DATN Job Portal

> Tài liệu này mô tả toàn bộ tính năng backend để designer/frontend agent thiết kế UI.  
> Base URL: `http://localhost:8000/api/v1`  
> Cập nhật: 2026-06-06

---

## MỤC LỤC

1. [Kiến trúc tổng quan](#i-kiến-trúc-tổng-quan)
2. [Phân quyền người dùng](#ii-phân-quyền-người-dùng)
3. [Xác thực (Auth)](#iii-xác-thực-auth)
4. [Hồ sơ ứng viên (Profile)](#iv-hồ-sơ-ứng-viên-profile)
5. [Công ty (Companies)](#v-công-ty-companies)
6. [Tin tuyển dụng (Jobs)](#vi-tin-tuyển-dụng-jobs)
7. [Ứng tuyển (Applications)](#vii-ứng-tuyển-applications)
8. [CV (Upload & Manage)](#viii-cv-upload--manage)
9. [Thông báo (Notifications)](#ix-thông-báo-notifications)
10. [Tìm kiếm ứng viên (Recruiter)](#x-tìm-kiếm-ứng-viên-recruiter)
11. [Gợi ý việc làm (Recommendations)](#xi-gợi-ý-việc-làm-recommendations)
12. [Chatbot AI](#xii-chatbot-ai)
13. [Admin — Quản lý hệ thống](#xiii-admin--quản-lý-hệ-thống)
14. [Admin — Dashboard](#xiv-admin--dashboard)
15. [Dữ liệu mẫu (Seed Data)](#xv-dữ-liệu-mẫu-seed-data)
16. [Enum & Giá trị cố định](#xvi-enum--giá-trị-cố-định)

---

## I. KIẾN TRÚC TỔNG QUAN

| Thành phần | Công nghệ |
|---|---|
| Framework API | FastAPI (Python) |
| Database | PostgreSQL |
| Object Storage | MinIO (CV files) |
| Auth | JWT (access token + refresh token) |
| Realtime | WebSocket |
| Full-text search | PostgreSQL TSVECTOR + GIN index |
| AI Chatbot | LangGraph + Claude/Ollama |

**3 role người dùng:**
- `job_seeker` — Ứng viên tìm việc
- `recruiter` — Nhà tuyển dụng
- `admin` — Quản trị viên hệ thống

---

## II. PHÂN QUYỀN NGƯỜI DÙNG

| Tính năng | job_seeker | recruiter | admin | Public |
|---|:---:|:---:|:---:|:---:|
| Xem danh sách job | ✅ | ✅ | ✅ | ✅ |
| Xem chi tiết job | ✅ | ✅ | ✅ | ✅ |
| Xem thông tin công ty | ✅ | ✅ | ✅ | ✅ |
| Đăng ký / Đăng nhập | — | — | — | ✅ |
| Quản lý hồ sơ cá nhân | ✅ | — | — | — |
| Upload & quản lý CV | ✅ | — | — | — |
| Nộp đơn ứng tuyển | ✅ | — | — | — |
| Xem đơn ứng tuyển của mình | ✅ | — | — | — |
| Gợi ý việc làm | ✅ | — | — | — |
| Quản lý công ty của mình | — | ✅ | — | — |
| Đăng/sửa/xóa job | — | ✅ | — | — |
| Xem danh sách ứng viên nộp đơn | — | ✅ | — | — |
| Cập nhật trạng thái đơn | — | ✅ | — | — |
| Tìm kiếm ứng viên | — | ✅ | ✅ | — |
| Xem CV của ứng viên | — | ✅ | — | — |
| Chatbot | ✅ | ✅ | — | — |
| Thông báo | ✅ | ✅ | ✅ | — |
| Admin: quản lý user/company/job | — | — | ✅ | — |
| Admin: dashboard | — | — | ✅ | — |

---

## III. XÁC THỰC (AUTH)

**Prefix:** `/auth`

### Đăng ký tài khoản
```
POST /auth/register
Body: { email, password (min 6 ký tự), role: "job_seeker" | "recruiter" }
Response: { message, user: { id, email, role, status } }
```

### Đăng nhập
```
POST /auth/login
Body: { email, password }
Response: {
  access_token,
  refresh_token,
  token_type: "bearer",
  user: { id, email, role, status }
}
```

### Làm mới token
```
POST /auth/refresh
Body: { refresh_token }
Response: { access_token, token_type }
```

### Lấy thông tin tài khoản hiện tại
```
GET /auth/me
Header: Authorization: Bearer <access_token>
Response: { id, email, role, status, created_at }
```

### Trạng thái tài khoản (user.status)
- `active` — Bình thường
- `inactive` — Không hoạt động
- `banned` — Bị khóa

---

## IV. HỒ SƠ ỨNG VIÊN (PROFILE)

**Prefix:** `/users` | **Role:** job_seeker

### Lấy hồ sơ cá nhân
```
GET /users/profile
Response: ProfileResponse | null  (null nếu chưa tạo hồ sơ)
```

### Tạo / Cập nhật hồ sơ (upsert)
```
PUT /users/profile
Body (tất cả optional):
{
  full_name, phone, address, dob (YYYY-MM-DD),
  avatar_url, cv_url,
  skills (text),
  experience (text),
  education (text),
  bio (text)
}
Response: { id, user_id, full_name, phone, address, dob, avatar_url, cv_url, skills, experience, education, bio, updated_at }
```

**UX gợi ý:**
- Trang Profile có thể hiển thị form inline editable
- Hiển thị avatar tròn, với placeholder nếu chưa có
- Chỉ hiện trạng thái "Hồ sơ chưa hoàn thiện" nếu thiếu full_name, skills, experience
- `skills` là text tự do (không cần chip UI bắt buộc)

---

## V. CÔNG TY (COMPANIES)

**Prefix:** `/companies`

### Tạo công ty mới (recruiter)
```
POST /companies
Body: { name (bắt buộc), description, size, type, address, website, logo_url, phone }
Response: CompanyResponse
```

### Danh sách công ty của recruiter
```
GET /companies/my
Response: [CompanyResponse]
```

### Xem thông tin công ty (public)
```
GET /companies/{company_id}
Response: { id, user_id, name, description, size, type, address, website, logo_url, phone, created_at, updated_at }
```

### Cập nhật công ty (recruiter, chủ sở hữu)
```
PUT /companies/{company_id}
Body: { name (bắt buộc), description, size, type, address, website, logo_url, phone }
Response: CompanyResponse
```

**Dữ liệu tóm tắt công ty (CompanyBriefResponse) dùng trong danh sách job:**
```json
{ "id": 1, "name": "Acme Corp", "logo_url": "...", "address": "Hà Nội" }
```

**UX gợi ý:**
- Recruiter có thể sở hữu nhiều công ty
- Trang "Công ty của tôi" → grid card hoặc list
- Khi tạo job cần chọn công ty → dropdown từ `/companies/my`

---

## VI. TIN TUYỂN DỤNG (JOBS)

**Prefix:** `/jobs`

### Danh sách job công khai (có filter + phân trang)
```
GET /jobs
Query params:
  keyword       — tìm trong title, description
  location      — lọc địa điểm
  level         — Junior | Mid | Senior | Manager
  salary_min    — lương tối thiểu (integer)
  salary_max    — lương tối đa (integer)
  company_name  — tên công ty
  only_active_deadline — true/false (chỉ job chưa hết hạn)
  page          — trang (default: 1)
  page_size     — số item/trang (default: 10)

Response: {
  total, page, page_size,
  items: [JobResponse]
}
```

### Chi tiết một job (public)
```
GET /jobs/{job_id}
Response: {
  id, title, level, salary, location, deadline, status,
  description, requirements, benefits,
  created_at, updated_at,
  company: { id, name, logo_url, address }
}
```

### Danh sách job của recruiter
```
GET /jobs/my
Response: [JobResponse + applicant_count]
```

### Tạo job mới (recruiter)
```
POST /jobs
Body: {
  company_id (bắt buộc),
  title (bắt buộc),
  level: "Junior" | "Mid" | "Senior" | "Manager",
  salary (text, VD: "15-20 triệu"),
  location,
  deadline (YYYY-MM-DD),
  description,
  requirements,
  benefits
}
Response: JobResponse
```

### Cập nhật job (recruiter, chủ sở hữu)
```
PUT /jobs/{job_id}
Body (tất cả optional):
  title, level, salary, location, deadline,
  status: "active" | "closed" | "draft",
  description, requirements, benefits
Response: JobResponse
```

### Xóa job (recruiter, chủ sở hữu)
```
DELETE /jobs/{job_id}
Response: 204 No Content
```

**Trạng thái job (job.status):**
- `active` — Đang tuyển dụng
- `closed` — Đã đóng
- `draft` — Bản nháp (chưa công khai)

**Level job:**
- `Junior`, `Mid`, `Senior`, `Manager`

**UX gợi ý:**
- Trang tìm việc (`/jobs`): filter sidebar + job card grid
- Job card cần: logo công ty, tên job, company, location, salary, deadline, badge level
- Recruiter dashboard (`/my-jobs`): table với cột applicant_count, status badge, actions
- Form tạo/sửa job: rich text editor cho description/requirements/benefits
- Hiển thị badge "Hết hạn" nếu deadline đã qua

---

## VII. ỨNG TUYỂN (APPLICATIONS)

**Prefix:** `/applications`

### Nộp đơn ứng tuyển (job_seeker)
```
POST /applications/{job_id}
Body: { cover_letter (optional) }
Response: ApplicationResponse
Side effect: Tạo notification cho recruiter
```

### Xem đơn của ứng viên (job_seeker)
```
GET /applications/mine
Response: [ApplicationResponse]
```

### Xem ứng viên nộp vào job (recruiter)
```
GET /applications/job/{job_id}
Response: [ApplicationResponse] (kèm applicant_email, applicant_name, applicant_phone)
```

### Stream file CV của đơn
```
GET /applications/{application_id}/cv
Response: file stream PDF
```

### Cập nhật trạng thái đơn (recruiter)
```
PUT /applications/{application_id}/status
Body: { status: "reviewed" | "accepted" | "rejected" }
Response: ApplicationResponse
Side effect: Tạo notification cho candidate (nếu accepted hoặc rejected)
```

**Trạng thái đơn (application.status):**
- `pending` — Chờ xét
- `reviewed` — Đã xem
- `accepted` — Chấp nhận
- `rejected` — Từ chối

**Quy tắc:**
- Mỗi ứng viên chỉ nộp được 1 đơn cho 1 job
- CV đính kèm là CV active tại thời điểm nộp đơn

**UX gợi ý:**
- Trang "Đơn của tôi" (ứng viên): list với status badge, tên job, ngày nộp
- Trang "Ứng viên" (recruiter per job): table với tên, email, SĐT, ngày nộp, status, nút xem CV
- Status badge màu: pending=gray, reviewed=blue, accepted=green, rejected=red

---

## VIII. CV (UPLOAD & MANAGE)

**Prefix:** `/cvs` | **Role:** job_seeker

### Upload CV (PDF)
```
POST /cvs/upload
Body: multipart/form-data { file: <PDF file> }
Response: { id, file_name, is_active, parse_status, message }
Side effect: Tự động parse text PDF (background task)
```

### Danh sách CV của ứng viên
```
GET /cvs/me
Response: [{
  id, user_id, file_name, object_key, bucket_name,
  mime_type, file_size, is_active, uploaded_at, parse_status
}]
```

### Đặt CV làm active
```
POST /cvs/{cv_id}/activate
Response: { message, cv_id }
Side effect: Tất cả CV khác tự động inactive
```

**Trạng thái parse CV (parse_status):**
- `pending` — Đang xử lý
- `success` — Parse thành công (có thể dùng cho recommendation và search)
- `failed` — Parse thất bại

**Logic:**
- Chỉ 1 CV là active tại một thời điểm
- CV active được dùng cho Job Recommendation
- CV active được recruiter tìm thấy qua Candidate Search
- Khi nộp đơn, CV active lúc đó được đính kèm vào đơn

**UX gợi ý:**
- Danh sách CV: file name, ngày upload, trạng thái parse, active badge
- Nút "Đặt làm CV chính" cho từng CV
- Hiển thị spinner khi parse_status = pending
- Cảnh báo nếu parse_status = failed (hệ thống không đọc được CV)

---

## IX. THÔNG BÁO (NOTIFICATIONS)

**Prefix:** `/notifications` | **Role:** Authenticated

### Danh sách thông báo
```
GET /notifications?limit=50&offset=0
Response: [{
  id, user_id, type, title, message,
  is_read, read_at,
  related_id, related_type,
  created_at
}]
```

### Số thông báo chưa đọc
```
GET /notifications/unread-count
Response: { count: 5 }
```

### Đánh dấu đã đọc (1 thông báo)
```
POST /notifications/{notification_id}/read
Response: 200
```

### Đánh dấu tất cả đã đọc
```
POST /notifications/read-all
Response: 200
```

### WebSocket Realtime
```
WebSocket: ws://localhost:8000/api/v1/notifications/ws?token=<JWT>
Payload nhận: {
  type: "application_submitted" | "application_accepted" | "application_rejected",
  title: "...",
  message: "...",
  related_id: 123,
  related_type: "job_application"
}
```

**Loại thông báo:**
- `application_submitted` → Recruiter nhận khi ứng viên nộp đơn
- `application_accepted` → Ứng viên nhận khi được chấp nhận
- `application_rejected` → Ứng viên nhận khi bị từ chối

**UX gợi ý:**
- Bell icon trên Navbar với badge số chưa đọc (từ `/unread-count`)
- Dropdown notification list khi click bell
- Kết nối WebSocket khi login, ngắt khi logout
- Toast popup khi nhận notification qua WebSocket
- Unread notification có nền khác màu
- Click vào notification → navigate đến related_id nếu có

---

## X. TÌM KIẾM ỨNG VIÊN (RECRUITER)

**Prefix:** `/recruiter/candidates` | **Role:** recruiter, admin

### Tìm kiếm ứng viên
```
GET /recruiter/candidates/search?q=java+python&page=1&page_size=10
Query:
  q         — keyword/skill (optional, rỗng = tất cả)
  page      — trang (default: 1)
  page_size — số item/trang (default: 10)

Response: {
  total, page, page_size,
  items: [{
    user_id, email, full_name, skills, experience, bio, avatar_url,
    cv_id, cv_file_name, score
  }]
}
```

**Logic tìm kiếm:**
- Search trong: full_name, skills, experience, bio, cv text
- Ưu tiên: match profile > match CV text
- Chỉ ứng viên có profile và tài khoản active
- Mỗi ứng viên chỉ xuất hiện 1 lần (dedup)
- `score` — điểm liên quan (dùng để sort)

### Xem CV active của ứng viên
```
GET /recruiter/candidates/{user_id}/cv
Response: file stream PDF
```

**UX gợi ý:**
- Trang tìm kiếm ứng viên: search bar + kết quả dạng card
- Card ứng viên: avatar, tên, skills (tags), kinh nghiệm tóm tắt, nút "Xem CV"
- Nút "Xem CV" mở modal hoặc tab mới với PDF viewer

---

## XI. GỢI Ý VIỆC LÀM (RECOMMENDATIONS)

**Prefix:** `/jobs` | **Role:** job_seeker

### Gợi ý job dựa CV active
```
GET /jobs/recommendations?top_n=10
Query: top_n — số job gợi ý (default: 10)

Response: {
  total, has_cv (bool), cv_parsed (bool),
  items: [{
    ...JobResponse,
    match_score: 85,
    match_reason: "Kỹ năng Python, FastAPI phù hợp với yêu cầu"
  }]
}
```

**Logic:**
- Rule-based (không AI), không dùng lịch sử
- Dựa trên CV active đã parse
- Score dựa: title match (cao) + requirements match (trung bình) + level match (bonus)
- `has_cv: false` → ứng viên chưa upload CV → hiện empty state + CTA upload CV
- `cv_parsed: false` → CV chưa parse xong → hiện loading state

**UX gợi ý:**
- Section "Việc làm phù hợp với bạn" trên trang chủ hoặc trang riêng
- Hiện match_score dạng progress bar hoặc % badge
- match_reason tooltip hoặc text nhỏ bên dưới card
- Empty state A (chưa có CV): "Upload CV để nhận gợi ý việc làm phù hợp"
- Empty state B (CV chưa parse): "Đang phân tích CV, vui lòng chờ..."

---

## XII. CHATBOT AI

**Prefix:** `/chatbot` | **Role:** job_seeker, recruiter (không dành cho admin)

### Gửi tin nhắn
```
POST /chatbot/message
Body: {
  message: "..." (max 2000 ký tự),
  job_id: 123 (optional, recruiter dùng khi hỏi về ứng viên của job),
  thread_id: "uuid" (optional, để tiếp tục hội thoại cũ)
}
Response: { answer: "...", thread_id: "uuid" }
```

### Danh sách job của recruiter (cho chatbot chọn)
```
GET /chatbot/my-jobs
Response: [{ id, title, status }]
```

### Lịch sử chat của thread
```
GET /chatbot/history?thread_id=<uuid>
Response: [{ role: "user" | "assistant", content, created_at }]
```

**Features:**
- Hỗ trợ hội thoại nhiều lượt (giữ context theo thread_id)
- Recruiter có thể hỏi về ứng viên của job cụ thể (kèm job_id)
- Rate limit — tránh spam
- Không log nội dung tin nhắn (privacy)

**UX gợi ý:**
- Chat bubble UI (user bên phải, assistant bên trái)
- Recruiter: dropdown chọn job để context chatbot biết hỏi về ứng viên nào
- Hiển thị typing indicator khi chờ phản hồi
- Lịch sử chat persistent theo thread_id (lưu localStorage)
- Nút "Cuộc hội thoại mới" → tạo thread_id mới

---

## XIII. ADMIN — QUẢN LÝ HỆ THỐNG

**Prefix:** `/admin` | **Role:** admin

### Quản lý User

```
GET  /admin/users?page=1&page_size=20&role=recruiter&status=active&search=email@
POST /admin/users         { email, password, role }
GET  /admin/users/{id}
PUT  /admin/users/{id}    { email?, role?, status? }
DELETE /admin/users/{id}

UserResponse: { id, email, role, status, created_at, full_name }
```

### Quản lý Company

```
GET    /admin/companies?page=1&page_size=20&search=keyword
POST   /admin/companies   { user_id (owner), name, description, size, type, address, website, logo_url, phone }
GET    /admin/companies/{id}
PUT    /admin/companies/{id}   { name?, description?, ... }
DELETE /admin/companies/{id}
```

### Quản lý Job

```
GET    /admin/jobs?page=1&page_size=20&status=active&search=keyword
POST   /admin/jobs    { company_id, title, level, salary, location, deadline, status, description, requirements, benefits }
GET    /admin/jobs/{id}
PUT    /admin/jobs/{id}   { title?, status?, ... }
DELETE /admin/jobs/{id}
```

**UX gợi ý (Admin Panel):**
- Layout: sidebar navigation + main content area
- Mỗi section (Users, Companies, Jobs) là 1 tab hoặc route
- Bảng dữ liệu: sortable columns, search bar, filter dropdown
- Inline actions: Edit (modal) + Delete (confirm dialog)
- Pagination ở cuối bảng
- Status badges màu: active=green, inactive=yellow, banned=red, draft=gray, closed=red, active=green

---

## XIV. ADMIN — DASHBOARD

**Endpoint:** `GET /admin/dashboard/summary?period=today|7d|30d`

### Response đầy đủ

```json
{
  "totals": {
    "users": 1250,
    "candidates": 980,
    "recruiters": 270,
    "companies": 145,
    "jobs": 620,
    "applications": 3400
  },
  "period_stats": {
    "period": "30d",
    "new_users": 85,
    "new_jobs": 42,
    "new_applications": 310,
    "new_companies": 12,
    "users_change_pct": 7.2,
    "jobs_change_pct": -3.1,
    "applications_change_pct": 15.8,
    "companies_change_pct": 9.0
  },
  "jobs_by_status": {
    "active": 410,
    "closed": 150,
    "draft": 60
  },
  "applications_by_status": {
    "pending": 1200,
    "reviewed": 900,
    "accepted": 800,
    "rejected": 500
  },
  "top_companies": [
    { "id": 1, "name": "FPT Software", "job_count": 45 }
  ],
  "cv_parse_stats": {
    "total": 980,
    "success": 920,
    "failed": 30,
    "pending": 30
  },
  "weekly_trend": [
    { "week_start": "2026-05-01", "new_jobs": 15, "new_applications": 85 }
  ],
  "attention": {
    "draft_jobs": 60,
    "overdue_applications": 45,
    "inactive_users": 120
  }
}
```

**UX gợi ý (Dashboard):**
- Stat cards hàng đầu: totals (users, candidates, recruiters, companies, jobs, applications)
- Period selector: Today / 7 ngày / 30 ngày → re-fetch
- Period stats cards: new_* kèm % change (arrow up/down màu green/red)
- Biểu đồ tròn: jobs_by_status, applications_by_status
- Biểu đồ đường/cột: weekly_trend (new_jobs vs new_applications)
- Bảng top_companies
- Attention section: cards cảnh báo (draft_jobs, overdue_applications, inactive_users)
- CV parse stats: progress bar hoặc pie chart

---

## XV. DỮ LIỆU MẪU (SEED DATA)

Hệ thống có seed data sẵn cho demo:

| Loại | Số lượng |
|---|---|
| Companies | 30–50 |
| Jobs | 300–700 |
| Candidates (job_seeker) | 200–400 |
| Applications | 500–1500 |
| Notifications | Tương ứng applications |

**Tài khoản demo mặc định:**
- Admin: `admin@example.com` / `admin123`
- Recruiter: `recruiter@example.com` / `recruiter123`
- Candidate: `candidate@example.com` / `candidate123`

---

## XVI. ENUM & GIÁ TRỊ CỐ ĐỊNH

### User Role
```
job_seeker | recruiter | admin
```

### User Status
```
active | inactive | banned
```

### Job Level
```
Junior | Mid | Senior | Manager
```

### Job Status
```
active | closed | draft
```

### Application Status
```
pending | reviewed | accepted | rejected
```

### CV Parse Status
```
pending | success | failed
```

### Notification Type
```
application_submitted | application_accepted | application_rejected
```

### Company Size
```
"1-50" | "51-200" | "200+"
```

---

## XVII. HTTP STATUS CODES

| Code | Ý nghĩa |
|---|---|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 204 | Xóa thành công (no content) |
| 400 | Dữ liệu đầu vào không hợp lệ |
| 401 | Chưa đăng nhập / Token hết hạn |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 409 | Xung đột (VD: đã nộp đơn rồi) |
| 429 | Quá nhiều request (chatbot rate limit) |

---

## XVIII. AUTH HEADER

Tất cả endpoint yêu cầu đăng nhập đều cần header:
```
Authorization: Bearer <access_token>
```

Token hết hạn → dùng refresh token để lấy access token mới.

---

## XIX. TỔNG HỢP TRANG FRONTEND CẦN XÂY DỰNG

| Trang | Role | Tính năng chính |
|---|---|---|
| `/` — Trang chủ | Public | Banner, gợi ý job (nếu đã login), search nhanh |
| `/jobs` — Tìm việc | Public | Filter + list job |
| `/jobs/:id` — Chi tiết job | Public | Thông tin job, nút Apply |
| `/companies/:id` — Công ty | Public | Thông tin công ty |
| `/login` | Public | Form đăng nhập |
| `/register` | Public | Form đăng ký (chọn role) |
| `/profile` — Hồ sơ | job_seeker | Xem + sửa hồ sơ cá nhân |
| `/my-cvs` — Quản lý CV | job_seeker | Upload, list, activate CV |
| `/my-applications` — Đơn của tôi | job_seeker | List đơn ứng tuyển + status |
| `/recommendations` — Gợi ý | job_seeker | Job phù hợp dựa CV |
| `/recruiter/dashboard` | recruiter | Overview tóm tắt |
| `/recruiter/companies` | recruiter | Quản lý công ty |
| `/recruiter/jobs` | recruiter | Quản lý tin tuyển dụng |
| `/recruiter/jobs/:id/applicants` | recruiter | Danh sách ứng viên của job |
| `/recruiter/candidates` | recruiter | Tìm kiếm ứng viên |
| `/chatbot` | job_seeker, recruiter | Chat với AI |
| `/admin` — Dashboard | admin | Stat cards + charts |
| `/admin/users` | admin | Quản lý người dùng |
| `/admin/companies` | admin | Quản lý công ty |
| `/admin/jobs` | admin | Quản lý tin tuyển dụng |

---

*BACKEND.MD — Tài liệu tham chiếu cho frontend designer agent. Phản ánh trạng thái backend tại 2026-06-06.*
