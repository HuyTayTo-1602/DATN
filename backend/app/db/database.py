# =============================================================================
# db/database.py
# Mục đích: Khởi tạo kết nối đến cơ sở dữ liệu PostgreSQL bằng SQLAlchemy.
# File này cung cấp:
#   - engine: đối tượng kết nối đến DB
#   - SessionLocal: factory tạo ra mỗi phiên làm việc với DB (mỗi request)
#   - Base: lớp cha mà tất cả các Model phải kế thừa để SQLAlchemy nhận diện
#   - get_db: dependency injection cho FastAPI, tự động đóng session sau mỗi request
# =============================================================================

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.config import get_settings

settings = get_settings()

# Tạo engine kết nối đến PostgreSQL
# pool_pre_ping=True: kiểm tra kết nối trước khi sử dụng, tránh lỗi connection timeout
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,  # In câu lệnh SQL ra console khi DEBUG=True
)

# Factory để tạo session làm việc với DB
# autocommit=False: phải gọi session.commit() thủ công
# autoflush=False: không tự động flush trước mỗi query
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Lớp cha cho tất cả SQLAlchemy models
# Các model kế thừa Base sẽ được SQLAlchemy quản lý và tạo bảng tương ứng
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency injection cho FastAPI.
    Mỗi request sẽ nhận một session DB riêng, đảm bảo:
      - Mở session khi bắt đầu xử lý request
      - Đóng session (trả về pool) sau khi request kết thúc, dù có lỗi hay không
    Cách dùng trong router:
      def some_route(db: Session = Depends(get_db)):
          ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
