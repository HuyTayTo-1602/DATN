# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Completion note:** Chỉ đánh dấu plan này là `DONE` sau khi agent finish coding, admin nhìn thấy số liệu ổn định, và test pass.

**Goal:** Xây dựng admin dashboard mức vừa đủ để quan sát tình hình hệ thống mà không biến thành hệ thống BI phức tạp.

**Architecture:** Backend cung cấp một endpoint summary tổng hợp từ PostgreSQL. Frontend dùng trang admin sẵn có, chỉ bổ sung các khối số liệu, biểu đồ đơn giản và bảng top items. Tính toán tổng hợp nên tách vào service riêng để dễ test và không nhồi vào controller.

**Tech Stack:** FastAPI, PostgreSQL, Vite, React, chart library hiện có trong dự án hoặc thư viện nhỏ gọn, pytest.

---

## 1. Ý nghĩa với người dùng

- Admin nắm nhanh số lượng user, công ty, job, application.
- Có thể nhìn được tình trạng hệ thống ở mức vận hành cơ bản.
- Không yêu cầu drill-down sâu ở MVP.

## 2. Phạm vi MVP

- Tổng users, candidates, recruiters, companies, jobs, applications.
- Job theo status: active/closed.
- Application theo status: pending/accepted/rejected.
- Top companies theo số lượng job đăng.
- CV upload count và parse success/fail count.
- Có thể thêm số notification chưa đọc tổng nếu tiện.

## 3. Giả định cấu trúc file

**Backend**
- Create: `backend/app/services/admin_dashboard_service.py`
- Create or Modify: `backend/app/schemas/admin_dashboard.py`
- Modify: `backend/app/api/v1/endpoints/admin.py`

**Frontend**
- Modify: `frontend/src/pages/admin/AdminDashboardPage.tsx`
- Create or Modify: `frontend/src/components/admin/StatCard.tsx`
- Create or Modify: `frontend/src/components/admin/AdminChartPanel.tsx`
- Create or Modify: `frontend/src/services/adminApi.ts`

**Tests**
- Create: `backend/tests/services/test_admin_dashboard_service.py`
- Create: `backend/tests/api/test_admin_dashboard_api.py`
- Create: `frontend/src/pages/admin/AdminDashboardPage.test.tsx`

## 4. API đề xuất

- `GET /api/v1/admin/dashboard/summary`

Response gợi ý gồm các block:
- `totals`
- `jobs_by_status`
- `applications_by_status`
- `top_companies`
- `cv_parse_stats`

## 5. Checklist triển khai

### Task 1: Tách service tổng hợp số liệu

- [ ] Viết `admin_dashboard_service.py` với các hàm query từng nhóm dữ liệu.
- [ ] Giữ query đơn giản, tránh một mega-query khó bảo trì.
- [ ] Chuẩn hóa response schema để frontend chỉ render.

### Task 2: Expose API summary cho admin

- [ ] Chỉ cho admin truy cập endpoint này.
- [ ] Có xử lý khi một số bảng còn trống.
- [ ] Không trả quá nhiều dữ liệu thô ngoài nhu cầu dashboard.

### Task 3: Gắn vào trang admin hiện có

- [ ] Thêm các stat card ở đầu trang.
- [ ] Thêm 1-2 chart đơn giản hoặc bar/pie cơ bản.
- [ ] Thêm top companies table và CV parse summary.
- [ ] Hiển thị loading và empty state gọn gàng.

### Task 4: Tối ưu để không ngớ ngẩn

- [ ] Không nhồi quá nhiều widget khó đọc.
- [ ] Không làm dashboard phụ thuộc vào dữ liệu cực chuẩn mới render được.
- [ ] Mỗi chỉ số phải có ý nghĩa vận hành rõ ràng.

## 6. Checkpoint cuối

- [ ] Admin mở dashboard và thấy được bức tranh tổng quát của hệ thống trong một màn hình.
- [ ] Số liệu không lệch rõ rệt với dữ liệu seed.
- [ ] Trang vẫn usable khi một số bảng đang ít dữ liệu.
- [ ] Không yêu cầu truy vấn nặng hoặc loading quá chậm cho quy mô MVP.

## 7. Yêu cầu test bắt buộc cho agent sau khi code xong

- [ ] Tạo unit test cho từng hàm tổng hợp số liệu trong `admin_dashboard_service.py`.
- [ ] Tạo API test cho quyền truy cập admin và response summary.
- [ ] Nếu frontend có logic map dữ liệu thành chart series, thêm unit test cho phần đó.
- [ ] Chỉ được coi là xong khi dashboard render được với cả dữ liệu đầy đủ lẫn dữ liệu ít.
