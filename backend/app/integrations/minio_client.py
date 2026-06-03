import io
import uuid
from datetime import date, timedelta

from minio import Minio
from minio.error import S3Error

from app.config import get_settings

settings = get_settings()


def get_minio_client() -> Minio:
    return Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )


def ensure_bucket_exists(client: Minio) -> None:
    if not client.bucket_exists(settings.MINIO_BUCKET_NAME):
        client.make_bucket(settings.MINIO_BUCKET_NAME)


def build_object_key(user_id: int, filename: str) -> str:
    """Tạo object key theo dạng: {user_id}/{yyyy-mm-dd}/{uuid}-{filename}"""
    today = date.today().strftime("%Y-%m-%d")
    safe_name = filename.replace(" ", "_")
    return f"{user_id}/{today}/{uuid.uuid4()}-{safe_name}"


def upload_file(file_bytes: bytes, object_key: str, content_type: str = "application/pdf") -> str:
    client = get_minio_client()
    ensure_bucket_exists(client)
    client.put_object(
        settings.MINIO_BUCKET_NAME,
        object_key,
        io.BytesIO(file_bytes),
        length=len(file_bytes),
        content_type=content_type,
    )
    return object_key


def get_presigned_url(object_key: str, expires_seconds: int = 3600) -> str:
    # Dùng MINIO_PUBLIC_ENDPOINT để URL sinh ra trỏ về địa chỉ browser có thể truy cập
    public_client = Minio(
        settings.MINIO_PUBLIC_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )
    return public_client.presigned_get_object(
        settings.MINIO_BUCKET_NAME,
        object_key,
        expires=timedelta(seconds=expires_seconds),
    )
