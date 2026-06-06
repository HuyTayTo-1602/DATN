# =============================================================================
# main.py
# Mục đích: Entry point của ứng dụng FastAPI.
# File này chịu trách nhiệm:
#   1. Khởi tạo ứng dụng FastAPI với các cấu hình cơ bản
#   2. Cấu hình CORS để frontend React có thể gọi API
#   3. Đăng ký tất cả các router (nhóm endpoint) vào ứng dụng
#   4. Chạy init_db khi ứng dụng khởi động lần đầu
# Khởi chạy: uvicorn app.main:app --reload --port 8000
# =============================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.db.init_db import init_db
from app.routers import auth, users, companies, jobs, applications, admin, cvs, notifications, recruiter_candidates
from app.chatbot import routes as chatbot_routes

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle handler của FastAPI.
    init_db được bọc try/except để server không crash nếu DB chưa sẵn sàng.
    Khi DB sẵn sàng, server tự kết nối và tạo bảng tại request đầu tiên.
    """
    try:
        init_db()
    except Exception as e:
        print(f"\n[WARNING] Không thể kết nối database khi khởi động: {e}")
        print("[WARNING] Server vẫn chạy — cập nhật DATABASE_URL trong .env rồi restart.\n")
    yield


# Khởi tạo FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="API cho hệ thống website thông tin tuyển dụng JobCV",
    version="1.0.0",
    docs_url="/docs",       # Swagger UI tại http://localhost:8000/docs
    redoc_url="/redoc",     # ReDoc tại http://localhost:8000/redoc
    lifespan=lifespan,
)

# --- Cấu hình CORS ---
# Cho phép frontend React (chạy ở cổng 3000 hoặc 5173) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,    # Cho phép gửi cookie
    allow_methods=["*"],       # Cho phép tất cả HTTP methods
    allow_headers=["*"],       # Cho phép tất cả headers (bao gồm Authorization)
)

# --- Đăng ký các Router ---
# Tất cả endpoint sẽ có prefix /api/v1/ phía trước
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(companies.router, prefix=settings.API_PREFIX)
app.include_router(jobs.router, prefix=settings.API_PREFIX)
app.include_router(applications.router, prefix=settings.API_PREFIX)
app.include_router(chatbot_routes.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)
app.include_router(cvs.router, prefix=settings.API_PREFIX)
app.include_router(notifications.router, prefix=settings.API_PREFIX)
app.include_router(recruiter_candidates.router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Health Check"])
def root():
    """Health check endpoint - kiểm tra server có đang chạy không."""
    return {"message": f"{settings.APP_NAME} đang hoạt động", "docs": "/docs"}
