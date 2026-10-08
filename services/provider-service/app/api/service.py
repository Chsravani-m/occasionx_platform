from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse
)

from app.crud.service import (
    create_service,
    get_provider_services,
    update_service,
    delete_service,
    get_service
)

router = APIRouter(
    prefix="/providers",
    tags=["Services"]
)
@router.post(
    "/{provider_id}/services",
    response_model=ServiceResponse
)
def create_provider_service(
    provider_id: UUID,
    request: ServiceCreate,
    db: Session = Depends(get_db)
):
    return create_service(
        db,
        provider_id,
        request
    )
@router.get(
    "/{provider_id}/services",
    response_model=list[
        ServiceResponse
    ]
)
def get_services(
    provider_id: UUID,
    db: Session = Depends(get_db)
):
    return get_provider_services(
        db,
        provider_id
    )
@router.put(
    "/services/{service_id}",
    response_model=ServiceResponse
)
def update_provider_service(
    service_id: UUID,
    request: ServiceUpdate,
    db: Session = Depends(get_db)
):
    service = update_service(
        db,
        service_id,
        request
    )

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    return service

@router.delete(
    "/services/{service_id}"
)
def remove_service(
    service_id: UUID,
    db: Session = Depends(get_db)
):
    deleted = delete_service(
        db,
        service_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    return {
        "message": "Service deleted"
    }