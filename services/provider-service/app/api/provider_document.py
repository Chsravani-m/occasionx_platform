from uuid import UUID

import os
import shutil
import uuid

from fastapi import APIRouter
from fastapi import Depends
from fastapi import UploadFile
from fastapi import File
from fastapi import Form

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.provider_document import (
    ProviderDocumentCreate,
    ProviderDocumentResponse
)

from app.crud.provider_document import (
    upload_document,
    get_documents
)

UPLOAD_DIR = "uploads/provider-documents"

router = APIRouter(
    prefix="/providers",
    tags=["Provider Documents"]
)

@router.post(
    "/{provider_id}/documents",
    response_model=ProviderDocumentResponse
)
def upload_provider_document(
    provider_id: UUID,
    document: ProviderDocumentCreate,
    db: Session = Depends(get_db)
):
    return upload_document(
        db,
        provider_id,
        document
    )

@router.get(
    "/{provider_id}/documents",
    response_model=list[
        ProviderDocumentResponse
    ]
)
def get_provider_documents(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    return get_documents(
        db,
        provider_id
    )

@router.post(
    "/{provider_id}/documents/upload"
)
def upload_provider_document_file(
    provider_id: UUID,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    os.makedirs(
        UPLOAD_DIR,
        exist_ok=True
    )

    extension = file.filename.split(".")[-1]

    filename = (
        f"{uuid.uuid4()}.{extension}"
    )

    file_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    document = upload_document(
        db,
        provider_id,
        {
            "document_type": document_type,
            "document_url": f"/uploads/provider-documents/{filename}"
        }
    )

    return {
        "message": "Document uploaded successfully",
        "document": document
    }