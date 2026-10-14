from uuid import UUID

import os
import re
import uuid

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi import File
from fastapi import Form
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.db.models.provider import Provider
from app.db.models.provider_document import ProviderDocument

from app.schemas.provider_document import (
    ProviderDocumentCreate,
    ProviderDocumentResponse
)

from app.crud.provider_document import (
    upload_document,
    get_documents
)

from app.core.service_auth import onboarding_user
from app.core.ownership import can_manage, ensure_can_manage_provider

# KYC documents (PAN, Aadhaar, cancelled cheque, ...). Stored inside the
# uploads volume but NEVER served by the public /uploads static mount -
# see main.py. They are only downloadable through
# GET /uploads/provider-documents/{filename} (download_provider_document
# below), which checks the caller owns the document or is an admin.
UPLOAD_DIR = "uploads/provider-documents"
PUBLIC_URL_PREFIX = "/uploads/provider-documents/"

DOCUMENT_TYPES = {
    "GST_CERTIFICATE",
    "PAN_CARD",
    "AADHAAR",
    "BUSINESS_LICENSE",
    "CERTIFICATION",
    "CANCELLED_CHEQUE",
}

ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png", "webp"}
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024  # 10 MB

_SAFE_FILENAME = re.compile(r"^[0-9a-f-]{36}\.[a-z0-9]{1,5}$", re.IGNORECASE)

router = APIRouter(
    prefix="/providers",
    tags=["Provider Documents"]
)

# Mounted directly on the app (not under /providers) so the existing
# document_url values - "/uploads/provider-documents/<file>" - keep
# working, now behind a login check.
files_router = APIRouter(tags=["Provider Documents"])


@router.post(
    "/{provider_id}/documents",
    response_model=ProviderDocumentResponse
)
def upload_provider_document(
    provider_id: UUID,
    document: ProviderDocumentCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    ensure_can_manage_provider(db, user, provider_id)

    if not document.document_url.startswith(PUBLIC_URL_PREFIX):
        raise HTTPException(
            status_code=400,
            detail="Upload the file with /documents/upload first"
        )

    return upload_document(
        db,
        provider_id,
        document.model_dump()
    )


@router.get(
    "/{provider_id}/documents",
    response_model=list[
        ProviderDocumentResponse
    ]
)
def get_provider_documents(
    provider_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    ensure_can_manage_provider(db, user, provider_id)

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
    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    ensure_can_manage_provider(db, user, provider_id)

    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unknown document type"
        )

    extension = (
        (file.filename or "").rsplit(".", 1)[-1].lower()
        if "." in (file.filename or "")
        else ""
    )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPG, PNG and WEBP files are allowed"
        )

    contents = file.file.read(MAX_DOCUMENT_SIZE + 1)

    if len(contents) > MAX_DOCUMENT_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Document exceeds 10 MB"
        )

    os.makedirs(
        UPLOAD_DIR,
        exist_ok=True
    )

    filename = f"{uuid.uuid4()}.{extension}"

    with open(os.path.join(UPLOAD_DIR, filename), "wb") as buffer:
        buffer.write(contents)

    document = upload_document(
        db,
        provider_id,
        {
            "document_type": document_type,
            "document_url": f"{PUBLIC_URL_PREFIX}{filename}"
        }
    )

    return {
        "message": "Document uploaded successfully",
        "document": document
    }


@files_router.get("/uploads/provider-documents/{filename}")
def download_provider_document(
    filename: str,
    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    if not _SAFE_FILENAME.match(filename):
        raise HTTPException(status_code=404, detail="Not found")

    url = f"{PUBLIC_URL_PREFIX}{filename}"

    document = (
        db.query(ProviderDocument)
        .filter(ProviderDocument.document_url == url)
        .first()
    )

    provider_id = document.provider_id if document else None

    if provider_id is None:
        owner = (
            db.query(Provider)
            .filter(Provider.cancelled_cheque_url == url)
            .first()
        )
        provider_id = owner.id if owner else None

    provider = (
        db.query(Provider).filter(Provider.id == provider_id).first()
        if provider_id
        else None
    )

    # 404 rather than 403 so the endpoint doesn't reveal which file
    # names exist.
    if not can_manage(user, provider):
        raise HTTPException(status_code=404, detail="Not found")

    path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(
        path,
        headers={"Cache-Control": "private, no-store"},
    )
