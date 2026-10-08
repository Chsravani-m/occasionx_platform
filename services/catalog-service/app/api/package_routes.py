from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.package import (
    PackageCreateRequest,
    PackageUpdateRequest
)

from app.services.package_service import (
    PackageService
)

router = APIRouter(
    prefix="/packages",
    tags=["Packages"]
)


@router.post("")
def create_package(
    payload: PackageCreateRequest,
    db: Session = Depends(get_db)
):
    return PackageService.create_package(
        db,
        payload
    )


@router.get("")
def get_packages(
    db: Session = Depends(get_db)
):
    return PackageService.get_packages(db)


@router.get("/{package_id}")
def get_package(
    package_id: UUID,
    db: Session = Depends(get_db)
):
    package = PackageService.get_package(
        db,
        package_id
    )

    if not package:
        raise HTTPException(
            status_code=404,
            detail="Package not found"
        )

    return package


@router.put("/{package_id}")
def update_package(
    package_id: UUID,
    payload: PackageUpdateRequest,
    db: Session = Depends(get_db)
):
    package = PackageService.update_package(
        db,
        package_id,
        payload
    )

    if not package:
        raise HTTPException(
            status_code=404,
            detail="Package not found"
        )

    return package


@router.delete("/{package_id}")
def delete_package(
    package_id: UUID,
    db: Session = Depends(get_db)
):
    package = PackageService.delete_package(
        db,
        package_id
    )

    if not package:
        raise HTTPException(
            status_code=404,
            detail="Package not found"
        )

    return {
        "message": "Package deactivated"
    }

@router.get("/{package_id}/categories")
def get_package_categories(
    package_id: UUID,
    db: Session = Depends(get_db)
):
    return PackageService.get_package_categories(
        db,
        package_id
    )