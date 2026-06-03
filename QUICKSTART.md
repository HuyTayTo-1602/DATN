# QUICKSTART – Hướng dẫn chạy hệ thống JobCV

> Hệ thống tuyển dụng trực tuyến: ứng viên tìm việc, nhà tuyển dụng đăng tin.

---

## Demo nhanh trong 1 phút

```bash
docker-compose up -d
```

Xong! Mở trình duyệt → **http://localhost:5173**

---

## Yêu cầu trước khi chạy

| Phần mềm | Tải về | Kiểm tra |
|----------|--------|----------|
| **Docker Desktop** | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) | `docker --version` |

> Sau khi cài Docker Desktop, hãy **mở ứng dụng lên** trước khi chạy lệnh.

---

## Hướng dẫn từng bước

### Bước 1 — Tải mã nguồn về máy

Giải nén hoặc clone project vào một thư mục bất kỳ.

### Bước 2 — Khởi động toàn bộ hệ thống

Mở **Terminal** (hoặc PowerShell/CMD), di chuyển vào thư mục dự án, rồi chạy:

```bash
docker-compose up -d
```

Lần đầu chạy sẽ mất 3–7 phút để tải image và cài dependencies. Chờ đến khi thấy:

```
✔ Container job_postgres   Started
✔ Container job_backend    Started
✔ Container job_frontend   Started
```

### Bước 3 — Mở trình duyệt

| Trang | Địa chỉ |
|-------|---------|
| **Giao diện chính** | http://localhost:5173 |
| **API Docs (Swagger)** | http://localhost:8000/docs |

---

## Tạo tài khoản & Demo

1. Vào **http://localhost:5173** → nhấn **Đăng ký**
2. Chọn loại tài khoản:
   - **Ứng viên** → tìm kiếm & ứng tuyển việc làm
   - **Nhà tuyển dụng** → đăng tin tuyển dụng
3. Điền email, mật khẩu (tối thiểu 6 ký tự) → nhấn **Đăng ký**
4. Hệ thống tự động đăng nhập và chuyển vào trang chính

---

## Xem log khi cần debug

```bash
# Xem log tất cả services
docker-compose logs -f

# Xem log từng service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

---

## Lỗi thường gặp

**`docker: command not found`**
→ Docker chưa cài hoặc chưa mở Docker Desktop. Mở app Docker lên rồi thử lại.

**`Port 8000 is already in use`** hoặc **`Port 5173 is already in use`**
→ Có chương trình khác đang dùng cổng đó. Tắt chương trình đó hoặc restart máy.

**Frontend báo lỗi "Không thể kết nối API"**
→ Backend chưa lên. Chạy `docker-compose logs -f backend` để kiểm tra, sau đó thử lại sau 30 giây.

**Frontend khởi động chậm lần đầu**
→ Bình thường — Docker đang chạy `npm install` bên trong container. Chờ thêm 1–2 phút.

---

## Tắt hệ thống

```bash
docker-compose down
```

---

## Cấu trúc thư mục

```
ĐATN/
├── backend/            ← API server (FastAPI + PostgreSQL)
├── frontend/           ← Giao diện web (React + Vite)
└── docker-compose.yml  ← Khởi chạy toàn bộ hệ thống
```
