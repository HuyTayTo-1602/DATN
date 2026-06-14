# 📝 Ghi chú phiên làm việc – Hệ thống JobCV

> Tóm tắt toàn bộ công việc đã thực hiện trong phiên này.

---

## 1. Sửa lỗi xác thực JWT (401 Unauthorized)

**Vấn đề:** Đăng nhập thành công (200 OK) nhưng gọi `GET /auth/me` vẫn trả về 401.

**Nguyên nhân:** Trường `sub` trong JWT payload được lưu là **integer** (`user.id`) thay vì **string** theo chuẩn JWT RFC 7519.

**Đã sửa:**
- `backend/app/services/auth_service.py` → đổi `"sub": user.id` thành `"sub": str(user.id)`
- `backend/app/middleware/auth.py` → parse `sub` về int trước khi query DB: `user_id = int(payload.get("sub"))`

---

## 2. Xây dựng Frontend (React + Vite)

**Tạo mới toàn bộ** thư mục `frontend/` từ đầu.

**Công nghệ:** React 18 + Vite 5 + React Router 6 + CSS thuần

**Cấu trúc:**
```
frontend/
├── src/
│   ├── services/api.js          # Tập trung toàn bộ API calls (fetch + proxy /api)
│   ├── context/AuthContext.jsx  # Global auth state (user, login, logout)
│   ├── components/
│   │   ├── Navbar.jsx           # Menu phân quyền theo role
│   │   ├── JobCard.jsx          # Card hiển thị job trong danh sách
│   │   └── Spinner.jsx          # Loading indicator
│   └── pages/
│       ├── HomePage.jsx         # Hero + 6 job mới nhất + CTA
│       ├── JobsPage.jsx         # Danh sách job, filter, phân trang
│       ├── JobDetailPage.jsx    # Chi tiết job + form ứng tuyển
│       ├── LoginPage.jsx        # Form đăng nhập
│       ├── RegisterPage.jsx     # Form đăng ký (chọn role)
│       ├── ProfilePage.jsx      # Hồ sơ ứng viên
│       ├── MyApplicationsPage.jsx  # Danh sách đơn ứng tuyển (job_seeker)
│       ├── PostJobPage.jsx      # Đăng tin tuyển dụng (recruiter)
│       └── MyJobsPage.jsx       # Quản lý tin đã đăng (recruiter)
├── package.json
├── vite.config.js               # Proxy /api → http://localhost:8000
└── index.html
```

**Tính năng:**
- Phân quyền theo role: `job_seeker` / `recruiter` / chưa đăng nhập
- Loading state, error handling, success message trên tất cả form
- Sau đăng ký → tự động đăng nhập → redirect theo role
- Access token lưu `localStorage`, khôi phục session khi reload trang

---

## 3. Tạo QUICKSTART.md

File hướng dẫn chạy hệ thống cho **người không biết code**.

**Nội dung:**
- Demo nhanh 2 lệnh
- Bảng yêu cầu phần mềm (Docker Desktop, Node.js)
- 4 bước cụ thể kèm output mẫu
- Hướng dẫn tạo tài khoản & demo
- 5 lỗi thường gặp + cách fix
- Cách tắt hệ thống

---

## 4. Xây dựng tính năng Profile ứng viên

**Backend – đã sửa 2 lỗi logic:**

| File | Lỗi cũ | Đã sửa |
|------|---------|--------|
| `services/profile_service.py` | `get_profile` raise 404 nếu chưa có | Trả `None` thay vì lỗi |
| `services/profile_service.py` | `update_profile` crash khi chưa có profile | Upsert: tạo mới nếu chưa có, update nếu đã có |
| `routers/users.py` | `response_model=ProfileResponse` không nhận `None` | Đổi thành `Optional[ProfileResponse]` |

**Frontend – tạo mới:**
- `ProfilePage.jsx`: form 8 trường (họ tên, SĐT, địa chỉ, ngày sinh, kỹ năng, kinh nghiệm, học vấn, bio)
- Load sẵn data nếu đã có profile, form rỗng nếu lần đầu
- Thêm route `/profile` và link "Hồ sơ" vào Navbar

---

## 5. Rà soát & hoàn thiện hệ thống (4 bug fixes)

### Bug 1 – Job tạo xong không hiện trong danh sách
`job_service.py`: `create_job` tạo job với `status="pending"` nhưng `get_jobs` chỉ lọc `status="active"`.
→ **Fix:** Đổi default status thành `"active"`.

### Bug 2 – `get_jobs_by_employer` thiếu job
Chỉ lấy công ty đầu tiên của recruiter, bỏ sót các công ty còn lại.
→ **Fix:** Query tất cả companies của user rồi dùng `IN` để lấy jobs.

### Bug 3 – `ApplicationResponse` thiếu `job_title`, `company_name`
Schema có 2 trường này nhưng service trả ORM object không có attributes tương ứng → luôn `null`.
→ **Fix:** Thêm hàm `_to_dict()` trong `application_service.py` để populate từ ORM relationships.

### Bug 4 – Recruiter không tạo được công ty
Không có endpoint `POST /companies` → recruiter đăng ký xong không đăng được job.
→ **Fix:** Thêm `create_company` vào `company_service.py` và `POST /companies` vào router.

**Frontend bổ sung:**
- `PostJobPage.jsx`: thêm `CreateCompanyForm` inline — recruiter mới đăng ký tạo công ty ngay tại trang đăng tin, sau đó tự động chuyển sang form đăng job.
- `api.js`: thêm `companiesApi.create()`

---

## 6. Form công ty – đầy đủ 8 trường

Cập nhật `CreateCompanyForm` trong `PostJobPage.jsx` để khớp hoàn toàn với `CompanyUpdateRequest`:

| Trường | Loại input |
|--------|-----------|
| `name` | Text (bắt buộc) |
| `type` | Dropdown (7 loại hình DN) |
| `size` | Dropdown (5 mức quy mô) |
| `address` | Dropdown 63 tỉnh/thành + "Khác" |
| `phone` | Tel |
| `website` | URL |
| `logo_url` | URL |
| `description` | Textarea |

---

## 7. Dropdown tỉnh thành VN + logic "Khác"

**Áp dụng cho:**
- Form công ty: trường `Tỉnh / Thành phố` (`address`)
- Form đăng tin: trường `Địa điểm làm việc` (`location`)

**Logic `ProvinceSelect` component:**
- Dropdown gồm 63 tỉnh/thành + "Khác"
- Chọn tỉnh/thành cụ thể → lưu tên tỉnh, không hiện gì thêm
- Chọn **"Khác"** → dropdown giữ trạng thái "Khác" + hiện ô text bên dưới
- Ô text có `required` + `autoFocus` + viền đỏ khi chưa nhập
- Submit khi chưa nhập → browser chặn (native validation) + handler kiểm tra thêm

---

## Danh sách file đã thay đổi / tạo mới

### Backend
| File | Thao tác |
|------|----------|
| `app/services/auth_service.py` | Sửa `sub` → `str(user.id)` |
| `app/middleware/auth.py` | Sửa parse `sub` → `int()` |
| `app/services/profile_service.py` | Sửa upsert logic, trả None thay vì 404 |
| `app/routers/users.py` | Optional response model cho GET profile |
| `app/services/job_service.py` | Sửa status active + all companies |
| `app/services/company_service.py` | Thêm `create_company` |
| `app/routers/companies.py` | Thêm `POST /companies` |
| `app/services/application_service.py` | Thêm `_to_dict()` populate job_title, company_name |

### Frontend
| File | Thao tác |
|------|----------|
| `src/services/api.js` | Tạo mới (authApi, jobsApi, companiesApi, profileApi, applicationsApi) |
| `src/context/AuthContext.jsx` | Tạo mới |
| `src/components/Navbar.jsx` | Tạo mới |
| `src/components/JobCard.jsx` | Tạo mới |
| `src/components/Spinner.jsx` | Tạo mới |
| `src/pages/HomePage.jsx` | Tạo mới |
| `src/pages/JobsPage.jsx` | Tạo mới |
| `src/pages/JobDetailPage.jsx` | Tạo mới |
| `src/pages/LoginPage.jsx` | Tạo mới |
| `src/pages/RegisterPage.jsx` | Tạo mới |
| `src/pages/ProfilePage.jsx` | Tạo mới |
| `src/pages/MyApplicationsPage.jsx` | Tạo mới |
| `src/pages/PostJobPage.jsx` | Tạo mới + cập nhật nhiều lần |
| `src/pages/MyJobsPage.jsx` | Tạo mới |
| `src/App.jsx` | Tạo mới |
| `src/main.jsx` | Tạo mới |
| `src/index.css` | Tạo mới (design system CSS thuần) |
| `package.json`, `vite.config.js`, `index.html` | Tạo mới |

### Tài liệu
| File | Thao tác |
|------|----------|
| `QUICKSTART.md` | Tạo mới |
| `SESSION_NOTES.md` | Tạo mới (file này) |

---

## API Endpoints tổng hợp

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/v1/auth/register` | — | Đăng ký |
| POST | `/api/v1/auth/login` | — | Đăng nhập |
| GET | `/api/v1/auth/me` | ✅ | Thông tin user hiện tại |
| GET | `/api/v1/users/profile` | job_seeker | Lấy hồ sơ |
| PUT | `/api/v1/users/profile` | job_seeker | Upsert hồ sơ |
| GET | `/api/v1/jobs` | — | Danh sách job (filter + phân trang) |
| GET | `/api/v1/jobs/{id}` | — | Chi tiết job |
| POST | `/api/v1/jobs` | recruiter | Tạo job mới |
| GET | `/api/v1/jobs/my` | recruiter | Job của recruiter |
| PUT | `/api/v1/jobs/{id}` | recruiter | Cập nhật job |
| DELETE | `/api/v1/jobs/{id}` | recruiter | Xóa job |
| POST | `/api/v1/companies` | recruiter | Tạo công ty |
| GET | `/api/v1/companies/my` | recruiter | Công ty của recruiter |
| GET | `/api/v1/companies/{id}` | — | Thông tin công ty |
| PUT | `/api/v1/companies/{id}` | recruiter | Cập nhật công ty |
| POST | `/api/v1/applications/{job_id}` | job_seeker | Ứng tuyển |
| GET | `/api/v1/applications/mine` | job_seeker | Đơn đã nộp |
| GET | `/api/v1/applications/job/{id}` | recruiter | Ứng viên của job |
| PUT | `/api/v1/applications/{id}/status` | recruiter | Cập nhật trạng thái đơn |
