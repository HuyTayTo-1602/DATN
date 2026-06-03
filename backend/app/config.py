# =============================================================================
# config.py
# Mục đích: Quản lý toàn bộ cấu hình của ứng dụng thông qua biến môi trường.
# Sử dụng thư viện pydantic-settings để tự động đọc file .env và validate
# kiểu dữ liệu của từng biến cấu hình.
# Các thành phần khác import Settings từ đây thay vì đọc os.environ trực tiếp.
# =============================================================================

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # --- Thông tin kết nối cơ sở dữ liệu PostgreSQL ---
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/job_recruitment"

    # --- Cấu hình JWT (JSON Web Token) ---
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30          # Access token hết hạn sau 30 phút
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7             # Refresh token hết hạn sau 7 ngày

    # --- Cấu hình ứng dụng ---
    APP_NAME: str = "Job Recruitment API"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # --- Cấu hình CORS (cho phép frontend React gọi API) ---
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # --- Cấu hình MinIO (Object Storage cho CV) ---
    MINIO_ENDPOINT: str = "localhost:9000"        # Internal endpoint (backend → MinIO)
    MINIO_PUBLIC_ENDPOINT: str = "localhost:9000" # Public endpoint (browser → MinIO)
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_NAME: str = "cv-files"
    MINIO_SECURE: bool = False
    MAX_CV_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB

    # --- Cấu hình LLM cho Chatbot ---
    ANTHROPIC_API_KEY: str = ""           # Claude API key (primary)
    GROQ_API_KEY: str = ""               # Groq API key (fallback)
    LLM_MODEL: str = "claude-sonnet-4-6" # Model mặc định

    class Config:
        # Đọc biến môi trường từ file .env ở thư mục gốc backend
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"   # bỏ qua các biến env không được khai báo (vd: GROQ_API_KEY)


@lru_cache()
def get_settings() -> Settings:
    """
    Trả về instance Settings duy nhất (Singleton).
    Dùng lru_cache để chỉ khởi tạo một lần, tránh đọc file .env nhiều lần.
    Sử dụng: from app.config import get_settings; settings = get_settings()
    """
    return Settings()
