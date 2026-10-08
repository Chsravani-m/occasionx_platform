from uuid import UUID
from pydantic import BaseModel
from typing import Literal

from datetime import datetime

class ProviderDocumentCreate(BaseModel):

    document_type: Literal[
        "GST_CERTIFICATE",
        "PAN_CARD",
        "AADHAAR",
        "BUSINESS_LICENSE",
        "CERTIFICATION",
        "CANCELLED_CHEQUE"
    ]

    document_url: str


class ProviderDocumentResponse(BaseModel):

    id: UUID

    provider_id: UUID

    document_type: str

    document_url: str

    uploaded_at: datetime

    class Config:
        from_attributes = True