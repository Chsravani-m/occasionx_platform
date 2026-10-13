
from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi import File
from fastapi import Form
import uuid
import os

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioResponse
)

from app.crud.portfolio import (
    create_portfolio,
    get_provider_portfolios,
    delete_portfolio,
    get_provider_portfolio_summary
)

# Tab 1 of the registration wizard caps the gallery at 20 images -
# enforced here rather than in crud/portfolio.py since all the other
# upload validation (file type/size) already lives in this layer.
MAX_GALLERY_IMAGES = 20


IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
]

VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime"
]

ZIP_TYPES = [
    "application/zip",
    "application/x-zip-compressed"
]

MAX_IMAGE_SIZE = 10 * 1024 * 1024      # 10 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024     # 100 MB
MAX_ZIP_SIZE = 250 * 1024 * 1024       # 250 MB

from app.core.service_auth import onboarding_user
from app.core.ownership import (
    ensure_can_manage_provider,
    ensure_can_manage_portfolio,
)

router = APIRouter(
    prefix="/providers",
    tags=["Portfolio"]
)

async def validate_portfolio_file(
    file: UploadFile
) -> tuple[str, bytes]:

    contents = await file.read()

    size = len(contents)

    content_type = file.content_type

    if content_type in IMAGE_TYPES:

        if size > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Image exceeds 10 MB"
            )

        return "IMAGE", contents

    if content_type in VIDEO_TYPES:

        if size > MAX_VIDEO_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Video exceeds 100 MB"
            )

        return "VIDEO", contents

    if (
    content_type in ZIP_TYPES
    or (
        file.filename
        and file.filename.lower().endswith(".zip")
    )
):

        if size > MAX_ZIP_SIZE:
            raise HTTPException(
                status_code=400,
                detail="ZIP exceeds 250 MB"
            )

        return "ZIP", contents

    raise HTTPException(
        status_code=400,
        detail=(
            "Only JPG, PNG, WEBP, "
            "MP4, WEBM, MOV and ZIP files are allowed"
        )
    )

@router.post(
    "/{provider_id}/portfolio",
    response_model=PortfolioResponse
)
async def upload_portfolio(
    provider_id: UUID,

    title: str = Form(...),

    description: str = Form(None),

    file: UploadFile = File(...),

    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    ensure_can_manage_provider(db, user, provider_id)

    os.makedirs(
    "uploads/portfolio/images",
    exist_ok=True
    )

    os.makedirs(
        "uploads/portfolio/videos",
        exist_ok=True
    )

    os.makedirs(
        "uploads/portfolio/albums",
        exist_ok=True
    )

    media_type, contents = (
    await validate_portfolio_file(
        file
    )
)

    if media_type == "IMAGE":

        existing = get_provider_portfolios(db, provider_id)

        existing_image_count = len([
            p for p in existing
            if p.media_type == "IMAGE"
        ])

        if existing_image_count >= MAX_GALLERY_IMAGES:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Gallery is limited to {MAX_GALLERY_IMAGES} images"
                )
            )

    filename = (
        f"{uuid.uuid4()}_{file.filename}"
    )

    if media_type == "IMAGE":
        folder = "images"

    elif media_type == "VIDEO":
        folder = "videos"

    else:
        folder = "albums"

    filepath = (
        f"uploads/portfolio/{folder}/{filename}"
    )

    with open(
        filepath,
        "wb"
    ) as buffer:

        buffer.write(contents)
    portfolio_data = PortfolioCreate(
        media_type=media_type,
        media_url=(
            f"/uploads/portfolio/"
            f"{folder}/{filename}"
        ),
        title=title,
        description=description
    )

    return create_portfolio(
        db,
        provider_id,
        portfolio_data
    )

@router.get(
    "/{provider_id}/portfolio",
    response_model=list[
        PortfolioResponse
    ]
)
def get_portfolios(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    return get_provider_portfolios(
        db,
        provider_id
    )

@router.get(
    "/{provider_id}/portfolio/summary"
)
def portfolio_summary(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    return get_provider_portfolio_summary(
        db,
        provider_id
    )

@router.delete(
    "/portfolio/{portfolio_id}"
)
def remove_portfolio(
    portfolio_id: UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(onboarding_user)
):
    ensure_can_manage_portfolio(db, user, portfolio_id)

    deleted = delete_portfolio(
        db,
        portfolio_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Portfolio not found"
        )

    return {
        "message": "Portfolio deleted"
    }