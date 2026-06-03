# Package models: chứa tất cả SQLAlchemy ORM models, mỗi file tương ứng một nhóm bảng.
# Import tập trung tại đây để Alembic và init_db có thể phát hiện đầy đủ các model.

from app.models.user import Role, User
from app.models.profile import UserProfile
from app.models.company import Company
from app.models.job import Job
from app.models.application import JobApplication
from app.models.candidate_cv import CandidateCV
from app.models.cv_text import CVText
from app.models.notification import Notification
