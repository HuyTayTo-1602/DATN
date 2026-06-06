# FRONTEND DESIGN SPECIFICATION — DATN Job Portal

> Tài liệu thiết kế giao diện người dùng cho hệ thống tuyển dụng DATN.  
> Dựa trên: `BACKEND.MD` (2026-06-06)  
> Phiên bản: 1.1 — 2026-06-06

---

## DANH SÁCH TRANG XÂY DỰNG

| # | Đường dẫn | Tên trang | Vai trò | Ưu tiên |
|---|---|---|---|---|
| 1 | `/` | Trang chủ | Public | 🔴 Cao |
| 2 | `/jobs` | Tìm việc làm | Public | 🔴 Cao |
| 3 | `/jobs/:id` | Chi tiết việc làm | Public | 🔴 Cao |
| 4 | `/companies/:id` | Trang công ty | Public | 🟡 Trung bình |
| 5 | `/login` | Đăng nhập | Public | 🔴 Cao |
| 6 | `/register` | Đăng ký | Public | 🔴 Cao |
| 7 | `/profile` | Hồ sơ cá nhân | job_seeker | 🔴 Cao |
| 8 | `/my-cvs` | Quản lý CV | job_seeker | 🔴 Cao |
| 9 | `/my-applications` | Đơn ứng tuyển | job_seeker | 🔴 Cao |
| 10 | `/recommendations` | Việc làm phù hợp | job_seeker | 🟡 Trung bình |
| 11 | `/recruiter/dashboard` | Dashboard nhà tuyển dụng | recruiter | 🔴 Cao |
| 12 | `/recruiter/companies` | Quản lý công ty | recruiter | 🔴 Cao |
| 13 | `/recruiter/jobs` | Quản lý tin tuyển dụng | recruiter | 🔴 Cao |
| 14 | `/recruiter/jobs/:id/applicants` | Danh sách ứng viên | recruiter | 🔴 Cao |
| 15 | `/recruiter/candidates` | Tìm kiếm ứng viên | recruiter | 🟡 Trung bình |
| 16 | `/chatbot` | Trợ lý AI | job_seeker, recruiter | 🟡 Trung bình |
| 17 | `/admin` | Dashboard quản trị | admin | 🔴 Cao |
| 18 | `/admin/users` | Quản lý người dùng | admin | 🔴 Cao |
| 19 | `/admin/companies` | Quản lý công ty (Admin) | admin | 🟡 Trung bình |
| 20 | `/admin/jobs` | Quản lý tin (Admin) | admin | 🟡 Trung bình |

---

## I. ĐỊNH HƯỚNG THIẾT KẾ TỔNG THỂ

### Triết lý thẩm mỹ

**"Refined Calm"** — Tối giản tinh tế, chuyên nghiệp, dễ nhìn trong thời gian dài. Lấy cảm hứng từ các nền tảng tuyển dụng cao cấp như Linear, Notion Jobs, và các trang tuyển dụng Nhật Bản/Hàn Quốc. Không phô trương, không rối mắt — mỗi phần tử đều có lý do tồn tại.

### Bảng màu (Color Palette)

```css
:root {
  /* Nền & bề mặt */
  --color-bg:        #F7F8FA;   /* Nền tổng thể — xám trắng nhẹ */
  --color-surface:   #FFFFFF;   /* Card, panel, modal */
  --color-surface-2: #F0F2F5;   /* Nền phụ, hover state nhẹ */
  --color-border:    #E4E7EC;   /* Viền, divider */

  /* Màu chủ đạo — Teal-Slate */
  --color-primary:   #2D6A8A;   /* Xanh dương đậm, dịu mắt */
  --color-primary-light: #EBF4FA; /* Nền nhạt của primary */
  --color-primary-hover: #245A77; /* Hover state */

  /* Màu phụ */
  --color-accent:    #4AABB8;   /* Teal sáng — CTA thứ cấp, badge */

  /* Trạng thái */
  --color-success:   #2D8A6A;   /* Xanh lá dịu — accepted, active */
  --color-warning:   #C47F1A;   /* Cam vàng dịu — pending, warning */
  --color-error:     #B84A4A;   /* Đỏ dịu — rejected, banned, error */
  --color-info:      #2D5FA8;   /* Xanh dương dịu — reviewed, info */
  --color-neutral:   #8A9099;   /* Xám — inactive, draft */

  /* Chữ */
  --color-text-primary:   #1A2332; /* Tiêu đề, văn bản chính */
  --color-text-secondary: #5A6470; /* Nhãn, mô tả phụ */
  --color-text-muted:     #9AA3AD; /* Placeholder, timestamp */

  /* Shadow */
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.06);
  --shadow-md:  0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.10);
}
```

> **Lưu ý màu sắc badge trạng thái:**
> | Trạng thái | Màu nền | Màu chữ | Áp dụng |
> |---|---|---|---|
> | active / accepted | `--color-success` nhạt | `--color-success` | Job active, đơn accepted |
> | pending | `--color-warning` nhạt | `--color-warning` | Đơn chờ xét |
> | reviewed | `--color-info` nhạt | `--color-info` | Đơn đã xem |
> | rejected / closed / banned | `--color-error` nhạt | `--color-error` | Đơn bị từ chối |
> | draft / inactive | `--color-neutral` nhạt | `--color-neutral` | Bản nháp |

### Typography

```css
/* Font chữ */
--font-display: 'Be Vietnam Pro', sans-serif; /* Tiêu đề lớn, brand name */
--font-body:    'Inter', 'DM Sans', sans-serif; /* Nội dung, form, table */
--font-mono:    'JetBrains Mono', monospace;   /* Code, ID kỹ thuật nếu cần */

/* Scale */
--text-xs:   0.75rem;   /* 12px — label phụ, timestamp */
--text-sm:   0.875rem;  /* 14px — body nhỏ, badge */
--text-base: 1rem;      /* 16px — body chính */
--text-lg:   1.125rem;  /* 18px — tiêu đề card */
--text-xl:   1.25rem;   /* 20px — section title */
--text-2xl:  1.5rem;    /* 24px — page title */
--text-3xl:  1.875rem;  /* 30px — hero title */
```

### Spacing & Layout

```
Gutter:       24px (desktop), 16px (mobile)
Max-width:    1200px (content), 1440px (full-bleed)
Border-radius: --radius-sm: 6px | --radius-md: 10px | --radius-lg: 16px | --radius-full: 9999px
Transition:   200ms ease (hover), 300ms ease (modal/drawer)
```

### Nguyên tắc thiết kế bắt buộc

1. **Không lộ dữ liệu kỹ thuật** — Không hiển thị ID nội bộ, tên trường DB, endpoint URL, token, object_key, bucket_name lên giao diện.
2. **Label thân thiện** — Enum từ backend phải được chuyển đổi sang tiếng Việt tự nhiên trước khi hiển thị.
3. **Empty state rõ ràng** — Mọi danh sách đều phải có trạng thái rỗng với hình minh họa và CTA.
4. **Loading skeleton** — Thay spinner toàn trang bằng skeleton placeholder cho từng card/table row.
5. **Responsive** — Mobile-first. Breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`.

---

## II. THÀNH PHẦN DÙNG CHUNG (SHARED COMPONENTS)

### 2.1 Navbar

**Cấu trúc:**
```
[Logo "CareerBridge"]   [Tìm việc] [Công ty]   [Thông báo 🔔] [Avatar ▼]
```

- Logo: "CareerBridge" — font Be Vietnam Pro Bold, màu `--color-primary`
- Navbar nền trắng, border-bottom `--color-border`, shadow khi scroll
- **Bell icon** — badge tròn đỏ nhỏ hiển thị số thông báo chưa đọc (từ `/notifications/unread-count`); ẩn khi = 0
- **Dropdown thông báo** — khi click bell:
  - Danh sách tối đa 5 thông báo gần nhất
  - Thông báo chưa đọc: nền `--color-primary-light`
  - Nút "Đánh dấu tất cả đã đọc" ở cuối
  - Không hiển thị `related_id`, `related_type` — chỉ hiển thị `title` + `message` + thời gian tương đối ("2 giờ trước")
- **Avatar dropdown** — Hồ sơ / Cài đặt / Đăng xuất
- **Chưa đăng nhập:** Nút "Đăng nhập" (outline) + "Đăng ký" (solid)

**Enum chuyển đổi thông báo:**
| Loại (ẩn) | Tiêu đề hiển thị |
|---|---|
| application_submitted | Có ứng viên mới nộp đơn |
| application_accepted | Đơn ứng tuyển được chấp nhận |
| application_rejected | Đơn ứng tuyển không được chọn |

### 2.2 Footer

Gồm 3 cột: Thông tin dự án | Liên kết nhanh | Liên hệ. Nền `--color-surface-2`, chữ `--color-text-secondary`.

### 2.3 Status Badge

Component dùng chung, nhận `status` string, tự tra bảng màu và nhãn tiếng Việt:

| Giá trị backend (ẩn) | Nhãn hiển thị | Màu |
|---|---|---|
| `active` (job) | Đang tuyển | success |
| `closed` | Đã đóng | error |
| `draft` | Bản nháp | neutral |
| `pending` | Chờ xét | warning |
| `reviewed` | Đã xem | info |
| `accepted` | Được chọn | success |
| `rejected` | Không được chọn | error |
| `active` (user) | Hoạt động | success |
| `inactive` | Không hoạt động | neutral |
| `banned` | Bị khóa | error |

### 2.4 Job Card

```
┌─────────────────────────────────────────────┐
│  [Logo công ty 48px]  Tên công ty            │
│  Tiêu đề việc làm (--text-lg, bold)          │
│  📍 Địa điểm   💰 Mức lương   📅 Hết hạn     │
│  [Badge Level]  [Badge Trạng thái]           │
└─────────────────────────────────────────────┘
```

- Hover: `box-shadow: --shadow-md`, transform `translateY(-2px)`, transition 200ms
- Badge "Sắp hết hạn" nếu deadline < 3 ngày (màu warning)
- Badge "Hết hạn" nếu deadline đã qua (màu error)
- Logo lỗi → hiển thị chữ cái đầu tên công ty trên nền màu
- **Không hiển thị:** `company_id`, `job_id` dạng thô, `status: "active"` khi đang tuyển (mặc nhiên)

### 2.5 Level Badge

| Giá trị backend | Hiển thị | Màu |
|---|---|---|
| Junior | Mới ra trường | teal nhạt |
| Mid | Trung cấp | blue nhạt |
| Senior | Cao cấp | purple nhạt |
| Manager | Quản lý | slate nhạt |

### 2.6 Pagination

Hiển thị: `[<] [1] [2] [3] ... [n] [>]` — tổng số trang từ `total / page_size`.  
Không hiển thị tham số URL kỹ thuật cho người dùng.

### 2.7 Confirm Dialog

Modal nhỏ 400px, có nút Hủy (outline) + Xác nhận (solid đỏ nếu hành động nguy hiểm).

### 2.8 Toast Notification

Góc dưới phải màn hình. 4 loại: success / error / warning / info. Auto-dismiss sau 4 giây.  
WebSocket notification → toast "Bạn có thông báo mới" kèm icon chuông.

---

## III. TRANG CÔNG KHAI (PUBLIC)

### 3.1 Trang chủ `/`

**Hero Section:**
- Heading lớn: "Tìm việc làm phù hợp với bạn"
- Sub-heading: "Hàng nghìn cơ hội từ các công ty hàng đầu"
- Thanh tìm kiếm nhanh: [🔍 Từ khóa] [📍 Địa điểm] [Tìm kiếm]
- Nền: gradient nhẹ từ `--color-primary` xuống `--color-bg`

**Section: Việc làm nổi bật**
- Grid 3 cột (desktop), 1 cột (mobile)
- 6 job cards mới nhất, status = active
- Nút "Xem tất cả việc làm" → `/jobs`

**Section: Gợi ý dành cho bạn** *(chỉ hiển thị khi đăng nhập với role job_seeker)*
- Tiêu đề: "Việc làm phù hợp với bạn"
- Nếu `has_cv: false` → banner "Upload CV để nhận gợi ý cá nhân hóa" + nút Upload
- Nếu `cv_parsed: false` → skeleton loading + "Đang phân tích CV..."
- Nếu có kết quả → 3 job cards với match % badge

**Section: Thống kê tin tưởng** (số liệu tĩnh, hardcode):
```
[💼] 500+ Việc làm   [🏢] 150+ Công ty   [👥] 2,000+ Ứng viên
```
> Số liệu tĩnh, không gọi API. Cập nhật thủ công khi cần.

---

### 3.2 Trang tìm việc `/jobs`

**Layout:** Sidebar filter (240px) + Danh sách job (flex-1)

**Sidebar Filter:**
```
🔍 Từ khóa (text input)
📍 Địa điểm (text input)
📊 Cấp bậc (checkbox group)
   □ Mới ra trường   □ Trung cấp
   □ Cao cấp         □ Quản lý
💰 Mức lương (range slider hoặc 2 input)
🏢 Tên công ty (text input)
☑ Chỉ hiện việc còn hạn (toggle)
[Áp dụng bộ lọc]  [Xóa bộ lọc]
```

> **Lưu ý:** Label "Cấp bậc" thay cho "Level"; giá trị gửi lên API là enum gốc (Junior/Mid/Senior/Manager) nhưng KHÔNG hiển thị cho người dùng.

**Danh sách job:**
- Hiển thị `total` kết quả: "Tìm thấy 124 việc làm"
- Sort dropdown góc phải:
  - **Mới nhất** (default) → `GET /jobs` với filter thông thường, sort `created_at` DESC
  - **Phù hợp nhất** → `GET /jobs/recommendations` (chỉ hiện khi đăng nhập với role `job_seeker`; ẩn hoặc disable với guest/recruiter); hiển thị `match_score %` badge trên mỗi card; nếu `has_cv: false` → toast "Upload CV để dùng tính năng này"
- Loading: skeleton 6 card
- Empty: Hình minh họa + "Không tìm thấy việc làm phù hợp" + nút "Xóa bộ lọc"
- Pagination ở cuối (ẩn pagination khi đang ở mode "Phù hợp nhất" vì recommendations trả `top_n` cố định)

**Mobile:** Filter ẩn sau nút "Bộ lọc" (bottom sheet hoặc modal)

---

### 3.3 Chi tiết việc làm `/jobs/:id`

**Layout 2 cột (desktop):**

**Cột chính (2/3):**
```
[Logo 64px] Tên công ty
Tiêu đề việc làm (--text-3xl, bold)
📍 Địa điểm | 💰 Lương | 📅 Hạn nộp | [Badge Cấp bậc]

─── Mô tả công việc ──────────────────
[Nội dung HTML từ description]

─── Yêu cầu ──────────────────────────
[Nội dung HTML từ requirements]

─── Quyền lợi ────────────────────────
[Nội dung HTML từ benefits]
```

**Cột phụ (1/3) — sticky:**
```
┌────────────────────────┐
│  [Nộp đơn ngay]        │  ← primary button
│  [Lưu việc làm ♡]     │  ← outline button (UI only)
│                        │
│  Hạn nộp: DD/MM/YYYY   │
│  Cấp bậc: Trung cấp    │
│                        │
│  ─── Về công ty ───    │
│  [Logo] Tên công ty    │
│  📍 Địa chỉ            │
│  🌐 Website            │
│  [Xem hồ sơ công ty]   │
└────────────────────────┘
```

**Logic nút "Nộp đơn":**
- Chưa đăng nhập → mở modal "Vui lòng đăng nhập để ứng tuyển"
- Đã đăng nhập (job_seeker) + chưa nộp → mở modal ứng tuyển
- Đã nộp → hiển thị badge trạng thái đơn, disable nút
- Role recruiter/admin → ẩn nút ứng tuyển

**Modal Ứng tuyển:**
```
Tiêu đề: "Nộp đơn ứng tuyển"
Hiển thị: CV đang active (tên file + parse status)
Nếu chưa có CV active → "Bạn chưa có CV. Hãy upload CV trước."
Textarea: Thư giới thiệu (tùy chọn, max 2000 ký tự)
[Hủy]  [Gửi đơn ứng tuyển]
```

> **Không hiển thị:** `job_id`, `application_id`, `cv_url`, `object_key`

---

### 3.4 Trang công ty `/companies/:id`

```
─── Banner / Header ────────────────────────────────
[Logo 80px]  Tên công ty  [Quy mô] [Loại hình]
📍 Địa chỉ  🌐 Website  📞 Số điện thoại

─── Giới thiệu ─────────────────────────────────────
[Nội dung description]

─── Tin tuyển dụng đang mở ─────────────────────────
[Grid job cards — chỉ job active của công ty này]
```

**Lấy danh sách job của công ty:**  
Gọi `GET /jobs?company_id={id}` — filter theo `company_id` (backend sẽ triển khai). Trong thời gian chờ, dùng tạm `GET /jobs?company_name={name}` làm fallback.

> **Không hiển thị:** `user_id`, `company_id` dạng thô

---

### 3.5 Đăng nhập `/login`

**Layout:** Trang trắng 2 cột — cột trái hình minh họa/brand (ẩn trên mobile), cột phải form.

```
Form (max-width: 400px):
  Tiêu đề: "Chào mừng trở lại"
  Sub: "Đăng nhập để tiếp tục"

  [Email]
  [Mật khẩu] [👁 ẩn/hiện]
  [Đăng nhập]  ← primary full-width

  ─────── hoặc ───────

  Chưa có tài khoản? [Đăng ký]
```

**Validation:** Email hợp lệ, mật khẩu không được rỗng.  
**Lỗi:** Hiển thị inline "Email hoặc mật khẩu không đúng" — không nói rõ lỗi ở đâu.  
**Tài khoản bị khóa:** Hiển thị "Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ hỗ trợ."  
> **Không hiển thị:** `access_token`, `refresh_token`, `token_type`, `user.status` dạng enum thô

---

### 3.6 Đăng ký `/register`

```
Form (max-width: 400px):
  Tiêu đề: "Tạo tài khoản"

  [Email]
  [Mật khẩu] (tối thiểu 6 ký tự)
  [Xác nhận mật khẩu]

  Tôi là:
  ○ Ứng viên tìm việc
  ○ Nhà tuyển dụng

  [Tạo tài khoản]  ← primary full-width

  Đã có tài khoản? [Đăng nhập]
```

> **Lưu ý:** Radio "Ứng viên tìm việc" = `job_seeker`, "Nhà tuyển dụng" = `recruiter` — chuyển đổi nội bộ trước khi gửi API.

---

## IV. TRANG ỨNG VIÊN (JOB_SEEKER)

### 4.1 Hồ sơ cá nhân `/profile`

**Layout:** Avatar lớn bên trái + form bên phải (hoặc stacked trên mobile)

```
┌──────────────────────────────────────────────────┐
│  [Avatar tròn 96px]  [Đổi ảnh 📷]               │
│  ↳ Click → file picker (jpg/png, max 5MB)        │
│  ↳ Upload lên MinIO → cập nhật avatar_url        │
│  Nguyễn Văn A                                    │
│  ✉ email@example.com                             │
│  [Banner: "Hồ sơ chưa hoàn thiện"] ← nếu thiếu  │
└──────────────────────────────────────────────────┘

─── Thông tin cá nhân ────────────────
Họ và tên *     [___________________]
Số điện thoại   [___________________]
Địa chỉ         [___________________]
Ngày sinh       [date picker]

─── Hồ sơ chuyên môn ─────────────────
Kỹ năng *       [textarea tự do]
  Gợi ý: "Python, React, Quản lý dự án..."
Kinh nghiệm *   [textarea]
Học vấn         [textarea]
Giới thiệu bản thân [textarea]

[Lưu thay đổi]
```

**Luồng upload avatar:**
1. User click "Đổi ảnh" → file picker chỉ nhận `image/jpeg`, `image/png`, max 5MB
2. Chọn file → hiển thị preview tạm (Object URL) trên avatar tròn
3. Gọi `POST /users/avatar` (upload multipart lên MinIO) → nhận `avatar_url`
4. Tự động gọi `PUT /users/profile` với `avatar_url` mới → lưu vào profile
5. Lỗi upload → Toast "Không thể tải ảnh lên, vui lòng thử lại"

**Quy tắc "Hồ sơ chưa hoàn thiện":** Chỉ hiện khi thiếu ít nhất 1 trong: Họ tên, Kỹ năng, Kinh nghiệm.  
> **Không hiển thị:** `user_id`, `avatar_url` dạng path thô, `object_key`, MinIO URL nội bộ

---

### 4.2 Quản lý CV `/my-cvs`

```
─── CV của tôi ──────────────────────────────────────
[Upload CV (PDF)]  ← nút dashed border khi chưa có CV

Danh sách CV:
┌────────────────────────────────────────────────────┐
│ 📄 cv_thang3_2026.pdf    [★ CV chính]              │
│    Ngày upload: 15/03/2026  •  Đã phân tích ✓      │
│    [Xem] [Đặt làm CV chính ← nếu chưa active]      │
├────────────────────────────────────────────────────┤
│ 📄 cv_cu_2025.pdf                                  │
│    Ngày upload: 01/12/2025  •  ⏳ Đang phân tích   │
│    [Xem] [Đặt làm CV chính]                        │
└────────────────────────────────────────────────────┘
```

**Trạng thái parse (label hiển thị):**
| Giá trị backend (ẩn) | Hiển thị | UI |
|---|---|---|
| pending | Đang phân tích | Spinner + text xám |
| success | Đã phân tích | ✓ icon xanh |
| failed | Không đọc được | ⚠ icon đỏ + tooltip "Hệ thống không đọc được file. Thử upload lại." |

> **Không hiển thị:** `object_key`, `bucket_name`, `mime_type`, `parse_status` dạng enum thô, `cv_id`, `user_id`

---

### 4.3 Đơn ứng tuyển `/my-applications`

**Tiêu đề:** "Đơn ứng tuyển của tôi"

```
─── Bộ lọc nhanh ──────────────────────────────
[Tất cả] [Chờ xét] [Đã xem] [Được chọn] [Không được chọn]

─── Danh sách ─────────────────────────────────
┌────────────────────────────────────────────┐
│ [Logo] Tên công ty                         │
│ Tiêu đề việc làm (bold)                   │
│ Ngày nộp: 01/06/2026  [Chờ xét 🟡]       │
│ [Xem chi tiết việc làm →]                 │
├────────────────────────────────────────────┤
│ [Logo] Tên công ty                         │
│ Tiêu đề việc làm (bold)                   │
│ Ngày nộp: 28/05/2026  [Được chọn 🟢]     │
└────────────────────────────────────────────┘
```

**Empty state:** "Bạn chưa nộp đơn ứng tuyển nào. [Tìm việc ngay →]"  
> **Không hiển thị:** `application_id`, `job_id`, `cv_id`, `user_id`

---

### 4.4 Gợi ý việc làm `/recommendations`

**Tiêu đề:** "Việc làm phù hợp với bạn"

**State A — Chưa có CV:**
```
[Hình minh họa upload]
"Upload CV để nhận gợi ý việc làm cá nhân hóa"
[Đi đến trang CV →]
```

**State B — CV đang phân tích:**
```
[Skeleton loading 3 cards]
"Đang phân tích CV của bạn, vui lòng chờ..."
```

**State C — Có kết quả:**
```
Grid job cards, mỗi card thêm:
  ┌────── Phù hợp 85% ──────┐
  │ ████████░░ 85%           │  ← progress bar
  │ "Kỹ năng Python, React   │  ← match_reason (text nhỏ italic)
  │  phù hợp với yêu cầu"   │
  └─────────────────────────┘
```

> **Không hiển thị:** `match_score` dạng số thô (chỉ hiển thị %, progress bar); không lộ logic rule-based

---

## V. TRANG NHÀ TUYỂN DỤNG (RECRUITER)

### 5.1 Dashboard nhà tuyển dụng `/recruiter/dashboard`

```
Chào buổi sáng, Anh Minh 👋

─── Tổng quan ──────────────────────────────────
[Card] Tin đang đăng: 12     [Card] Ứng viên mới: 45
[Card] Công ty quản lý: 2    [Card] Đơn cần xem: 8

─── Hoạt động gần đây ──────────────────────────
[List 5 đơn mới nhất — tên ứng viên, job, thời gian]
[Xem tất cả →]

─── Tin tuyển dụng của tôi ─────────────────────
[Bảng rút gọn 5 job: Tiêu đề | Ứng viên | Trạng thái | Hạn]
[Quản lý tất cả tin →]
```

> **Nguồn dữ liệu:** Tổng hợp từ `/jobs/my` và `/applications/job/:id` — không expose endpoint URL

---

### 5.2 Quản lý công ty `/recruiter/companies`

```
─── Công ty của tôi ─────────────────────────
[+ Thêm công ty mới]

┌───────────────────────────────────────────┐
│ [Logo] FPT Software                        │
│ 🏢 Công ty TNHH  •  200+ nhân viên        │
│ 📍 Hà Nội  •  🌐 fpt.com.vn               │
│ [Chỉnh sửa] [Xem việc làm]                │
└───────────────────────────────────────────┘
```

**Modal Tạo/Sửa công ty:**
```
Tên công ty *     [_______________]
Mô tả             [textarea]
Quy mô            [Dropdown: 1-50 / 51-200 / 200+]
Loại hình         [Dropdown]
Địa chỉ           [_______________]
Website           [_______________]
Số điện thoại     [_______________]
Logo (URL)        [_______________]
[Hủy]  [Lưu]
```

> **Không hiển thị:** `user_id`, `company_id` dạng thô

---

### 5.3 Quản lý tin tuyển dụng `/recruiter/jobs`

**Toolbar:**
```
[+ Đăng tin mới]  [🔍 Tìm kiếm]  [Bộ lọc ▾ Trạng thái]
```

**Bảng:**
| Tiêu đề | Công ty | Ứng viên | Cấp bậc | Trạng thái | Hạn nộp | Thao tác |
|---|---|---|---|---|---|---|
| Backend Dev | FPT | 12 | Trung cấp | Đang tuyển | 30/06 | ✏ 🗑 |
| Frontend Dev | FPT | 5 | Mới ra trường | Bản nháp | — | ✏ 🗑 |

- Cột "Ứng viên" → click → navigate `/recruiter/jobs/:id/applicants`
- Cột "Thao tác": ✏ Sửa (mở modal) | 🗑 Xóa (confirm dialog)
- Badge trạng thái dùng `StatusBadge` component

**Modal Tạo/Sửa tin:**
```
Công ty *         [Dropdown — danh sách công ty của recruiter]
Tiêu đề *         [_______________]
Cấp bậc           [Dropdown: Mới ra trường / Trung cấp / Cao cấp / Quản lý]
Mức lương         [___ VD: 15-20 triệu]
Địa điểm          [_______________]
Hạn nộp           [date picker]
Trạng thái        [Đang tuyển / Bản nháp / Đã đóng]
Mô tả công việc   [rich text editor]
Yêu cầu           [rich text editor]
Quyền lợi         [rich text editor]
[Hủy]  [Lưu]
```

> **Không hiển thị:** `company_id`, `job_id`, `applicant_count` raw trong URL/query

---

### 5.4 Danh sách ứng viên `/recruiter/jobs/:id/applicants`

**Header:**
```
← Quay lại  |  Ứng viên nộp đơn: "Tên việc làm"  |  Tổng: 12 đơn
```

**Bảng:**
| Họ tên | Email | Số điện thoại | Ngày nộp | Trạng thái | Thao tác |
|---|---|---|---|---|---|
| Nguyễn A | a@... | 0901... | 01/06 | Chờ xét | [Xem CV] [Cập nhật] |

**Nút "Xem CV":** Mở modal PDF viewer (iframe/embed) — không download trực tiếp.  
**Dropdown "Cập nhật trạng thái":**
```
○ Đã xem
○ Được chọn    ← gửi notification cho ứng viên
○ Không được chọn  ← gửi notification cho ứng viên
```

> **Không hiển thị:** `application_id`, `cv_id`, `user_id`, endpoint URL

---

### 5.5 Tìm kiếm ứng viên `/recruiter/candidates`

```
─── Tìm ứng viên ──────────────────────────────
[🔍 Nhập kỹ năng, kinh nghiệm...] [Tìm kiếm]

─── Kết quả ───────────────────────────────────
┌───────────────────────────────────────────┐
│ [Avatar 48px]  Nguyễn Văn A               │
│ Kỹ năng: [Python] [React] [SQL]          │
│ "3 năm kinh nghiệm backend..."           │
│ [Xem CV]                                  │
└───────────────────────────────────────────┘
```

- Tags kỹ năng: tách từ text `skills` (split by dấu phẩy/xuống dòng), hiển thị tối đa 5 tag, "+N thêm"
- "Xem CV" → modal PDF viewer
- Không hiển thị điểm `score` nội bộ ra giao diện
- Pagination cuối trang

---

## VI. TRANG CHATBOT `/chatbot`

**Layout:** Chat panel cố định, chiều cao 100vh trừ navbar.

```
┌─────────────────────────────────────────────────────┐
│ Trợ lý AI CareerBridge              [+ Cuộc hội thoại mới] │
│ ─────────────────────────────────────────────────── │
│ [Recruiter only: Chọn tin tuyển dụng ▾]             │
│                                                     │
│    [Tin nhắn assistant — trái]                      │
│                      [Tin nhắn user — phải]         │
│    [Typing indicator ● ● ●]                         │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ [✉ Nhập tin nhắn...]              [Gửi →]          │
└─────────────────────────────────────────────────────┘
```

**Chi tiết:**
- Bubble user: nền `--color-primary`, chữ trắng, căn phải
- Bubble assistant: nền `--color-surface-2`, chữ `--color-text-primary`, căn trái
- Typing indicator: 3 chấm nhảy animation
- Recruiter: dropdown chọn job để chatbot hiểu ngữ cảnh
- Nút "Cuộc hội thoại mới" → xóa lịch sử hiển thị, tạo thread_id mới
- Render markdown trong câu trả lời assistant (bold, danh sách, v.v.)
- Rate limit → Toast "Bạn gửi quá nhiều tin nhắn, vui lòng chờ"

> **Không hiển thị:** `thread_id`, `job_id` raw, endpoint URL

---

## VII. TRANG ADMIN

### Layout Admin

**Sidebar cố định (240px):**
```
[Logo CareerBridge Admin]

📊 Dashboard
👥 Người dùng
🏢 Công ty
💼 Việc làm

─── Tài khoản ───
[Avatar] Admin
[Đăng xuất]
```

**Header admin:** Breadcrumb + tiêu đề trang + action buttons.

---

### 7.1 Admin Dashboard `/admin`

**Period selector:** [Hôm nay] [7 ngày qua] [30 ngày qua]

**Stat cards hàng 1 — Tổng quan:**
```
[Tổng người dùng: 1,250] [Ứng viên: 980] [Nhà tuyển dụng: 270]
[Công ty: 145] [Việc làm: 620] [Lượt ứng tuyển: 3,400]
```

**Stat cards hàng 2 — Trong kỳ (kèm % tăng/giảm):**
```
[Người dùng mới: 85  ↑7.2%] [Việc làm mới: 42  ↓3.1%]
[Lượt ứng tuyển mới: 310  ↑15.8%] [Công ty mới: 12  ↑9.0%]
```
- ↑ màu success, ↓ màu error

**Biểu đồ:**
- Cột/đường: `weekly_trend` (Việc làm mới vs Lượt ứng tuyển, theo tuần)
- Tròn 1: `jobs_by_status` — Đang tuyển / Đã đóng / Bản nháp
- Tròn 2: `applications_by_status` — Chờ xét / Đã xem / Được chọn / Không được chọn

**Bảng top công ty:** Tên | Số việc làm — Top 5

**Phần "Cần chú ý":**
```
⚠ 60 tin bản nháp chưa đăng
⚠ 45 đơn quá hạn xử lý
⚠ 120 người dùng không hoạt động
```

**Thống kê CV:**
```
Tổng: 980 | Thành công: 920 | Lỗi: 30 | Đang xử lý: 30
[████████████░░] 93.9% thành công
```

> **Không hiển thị:** Tên cột database, key JSON thô từ API response

---

### 7.2 Quản lý người dùng `/admin/users`

**Toolbar:**
```
[+ Tạo người dùng]  [🔍 Tìm theo email...]  [Vai trò ▾]  [Trạng thái ▾]
```

**Bảng:**
| Họ tên | Email | Vai trò | Trạng thái | Ngày tạo | Thao tác |
|---|---|---|---|---|---|
| Nguyễn A | a@... | Ứng viên | Hoạt động | 01/01/2026 | ✏ 🗑 |
| FPT HR | hr@fpt... | Nhà tuyển dụng | Hoạt động | 05/01/2026 | ✏ 🗑 |

**Chuyển đổi Vai trò:**
| Giá trị backend | Hiển thị |
|---|---|
| job_seeker | Ứng viên |
| recruiter | Nhà tuyển dụng |
| admin | Quản trị viên |

**Modal Sửa người dùng:**
```
Email *       [___________]
Vai trò       [Dropdown]
Trạng thái    [Hoạt động / Không hoạt động / Đã khóa]
[Hủy]  [Lưu]
```

> **Không hiển thị:** `user.id` dạng số thô; `role` dạng `job_seeker` raw; `status` dạng enum thô

---

### 7.3 Quản lý công ty `/admin/companies`

**Toolbar:** `[+ Thêm]  [🔍 Tìm...]`

**Bảng:**
| Logo | Tên công ty | Quy mô | Địa chỉ | Chủ sở hữu (email) | Thao tác |
|---|---|---|---|---|---|

**Modal Tạo/Sửa:** Tương tự recruiter nhưng thêm trường "Chủ sở hữu (email)".

> **Không hiển thị:** `user_id`, `company_id` trên giao diện; "Chủ sở hữu" chỉ hiển thị email — không hiện user ID

---

### 7.4 Quản lý tin tuyển dụng `/admin/jobs`

**Toolbar:** `[+ Thêm]  [🔍 Tìm...]  [Trạng thái ▾]`

**Bảng:**
| Tiêu đề | Công ty | Cấp bậc | Trạng thái | Hạn nộp | Thao tác |
|---|---|---|---|---|---|

> **Không hiển thị:** `company_id`, `job_id` dạng số thô

---

## VIII. RESPONSIVE DESIGN

### Breakpoints

| Kích thước | Breakpoint | Thay đổi chính |
|---|---|---|
| Mobile | < 640px | Sidebar ẩn, nav collapse, 1 cột |
| Tablet | 640–1024px | Sidebar overlay, 2 cột |
| Desktop | > 1024px | Layout đầy đủ, sidebar cố định |

### Ưu tiên mobile

- Filter trang `/jobs` → bottom sheet
- Sidebar admin → drawer (hamburger)
- Job card → stacked layout
- Bảng quản lý → scroll ngang hoặc card mode trên mobile

---

## IX. TRẠNG THÁI GIAO DIỆN (UI STATES)

| Trạng thái | Xử lý |
|---|---|
| **Loading** | Skeleton placeholder (không dùng spinner toàn trang) |
| **Empty** | Hình minh họa + mô tả + CTA |
| **Error** | Toast + inline error message (không lộ stack trace) |
| **Unauthenticated** | Redirect về `/login` + thông báo "Vui lòng đăng nhập" |
| **Unauthorized** | Trang 403 "Bạn không có quyền truy cập trang này" |
| **Not found** | Trang 404 "Không tìm thấy trang" |
| **Rate limited** | Toast "Quá nhiều yêu cầu, vui lòng thử lại sau" |
| **Banned** | Hiển thị "Tài khoản bị tạm khóa" khi đăng nhập |

---

## X. ANIMATION & MICRO-INTERACTION

- **Page transition:** Fade in 200ms
- **Card hover:** `translateY(-2px)` + shadow tăng, 200ms
- **Button click:** Scale `0.97`, 100ms
- **Modal open:** Slide up + backdrop fade, 250ms
- **Toast:** Slide in từ phải, 300ms; auto-dismiss 4s
- **Skeleton:** Shimmer animation (left-to-right gradient)
- **Notification badge:** Pulse animation khi có thông báo mới qua WebSocket
- **Chatbot typing:** Bounce animation 3 chấm

---

## XI. MAPPING ENUM → LABEL (BẢNG THAM CHIẾU)

> Tổng hợp toàn bộ giá trị enum backend và label thân thiện hiển thị trên UI.  
> Frontend dev dùng bảng này làm nguồn duy nhất (single source of truth) cho label.

| Enum backend | Label tiếng Việt |
|---|---|
| `job_seeker` | Ứng viên |
| `recruiter` | Nhà tuyển dụng |
| `admin` | Quản trị viên |
| `active` (user) | Hoạt động |
| `inactive` (user) | Không hoạt động |
| `banned` (user) | Đã khóa |
| `Junior` | Mới ra trường |
| `Mid` | Trung cấp |
| `Senior` | Cao cấp |
| `Manager` | Quản lý |
| `active` (job) | Đang tuyển |
| `closed` (job) | Đã đóng |
| `draft` (job) | Bản nháp |
| `pending` (app) | Chờ xét |
| `reviewed` (app) | Đã xem |
| `accepted` (app) | Được chọn |
| `rejected` (app) | Không được chọn |
| `pending` (cv) | Đang phân tích |
| `success` (cv) | Đã phân tích |
| `failed` (cv) | Không đọc được |
| `application_submitted` | Có ứng viên mới nộp đơn |
| `application_accepted` | Đơn ứng tuyển được chấp nhận |
| `application_rejected` | Đơn ứng tuyển không được chọn |
| `1-50` | Dưới 50 nhân viên |
| `51-200` | 51–200 nhân viên |
| `200+` | Trên 200 nhân viên |

---

## XII. CÁC QUY TẮC BẢO MẬT UI CỨNG (MUST-NOT-DISPLAY)

Danh sách tuyệt đối **KHÔNG** được hiển thị trên bất kỳ giao diện nào:

- `access_token`, `refresh_token` — token xác thực
- `object_key`, `bucket_name` — đường dẫn MinIO nội bộ
- `user_id`, `company_id`, `job_id`, `application_id`, `cv_id` dạng số nguyên thô
- `token_type: "bearer"` — loại token
- `cv_url` dạng path đầy đủ — chỉ dùng nội bộ để tạo link xem CV
- Endpoint URL (`/api/v1/...`) — trong error message, tooltip
- Stack trace, SQL error message — trong thông báo lỗi người dùng
- `ws://localhost:8000/...` — URL WebSocket nội bộ
- Enum thô như `job_seeker`, `recruiter`, `pending`, `active` — phải qua bảng mapping

---

*FRONTEND.MD — Tài liệu thiết kế giao diện cho DATN Job Portal. Phản ánh backend spec 2026-06-06.*
