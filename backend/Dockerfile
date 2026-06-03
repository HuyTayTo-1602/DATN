# =============================================================================
# Dockerfile - Backend FastAPI
# Mục đích: Đóng gói ứng dụng FastAPI vào Docker container.
# Build: docker build -t job-recruitment-backend .
# Run:   docker run -p 8000:8000 job-recruitment-backend
# =============================================================================

# Sử dụng Python 3.12 slim để giảm kích thước image
FROM python:3.12-slim

# Đặt thư mục làm việc trong container
WORKDIR /app

# Cài đặt dependencies hệ thống cần thiết cho psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements trước để tận dụng Docker layer cache
# (nếu requirements.txt không đổi, bước này được cache lại)
COPY requirements.txt .

# Cài đặt Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn vào container
COPY . .

# Expose cổng 8000 (cổng mặc định của uvicorn)
EXPOSE 8000

# Lệnh khởi chạy ứng dụng
# --host 0.0.0.0: lắng nghe trên tất cả network interfaces trong container
# --port 8000: cổng lắng nghe
# Bỏ --reload trong production để tăng hiệu năng
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
