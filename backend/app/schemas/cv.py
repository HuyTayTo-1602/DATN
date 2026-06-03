from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CVResponse(BaseModel):
    id: int
    user_id: int
    file_name: str
    object_key: str
    bucket_name: str
    mime_type: str
    file_size: int
    is_active: bool
    uploaded_at: Optional[datetime] = None
    parse_status: Optional[str] = None

    model_config = {"from_attributes": True}


class CVUploadResponse(BaseModel):
    id: int
    file_name: str
    is_active: bool
    parse_status: str
    message: str


class CVActivateResponse(BaseModel):
    message: str
    cv_id: int
