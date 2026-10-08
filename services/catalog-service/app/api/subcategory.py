from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.crud.subcategory import (
    get_subcategories_by_category,
    create_subcategory,
    update_subcategory,
    delete_subcategory
)

from app.schemas.subcategory import (
    SubCategoryResponse,
    SubCategoryCreateRequest,
    SubCategoryUpdateRequest
)

router = APIRouter(
    prefix="/categories",
    tags=["Subcategories"]
)


@router.get(
    "/{category_id}/subcategories",
    response_model=list[SubCategoryResponse]
)
def get_subcategories(
    category_id: UUID,
    db: Session = Depends(get_db)
):
    return get_subcategories_by_category(
        db,
        category_id
    )


@router.post(
    "/{category_id}/subcategories",
    response_model=SubCategoryResponse
)
def create_subcategory_api(
    category_id: UUID,
    payload: SubCategoryCreateRequest,
    db: Session = Depends(get_db)
):
    try:
        return create_subcategory(
            db, category_id, payload
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "Could not create subcategory - check the parent "
                "category exists."
            )
        )


@router.put(
    "/subcategories/{subcategory_id}",
    response_model=SubCategoryResponse
)
def update_subcategory_api(
    subcategory_id: UUID,
    payload: SubCategoryUpdateRequest,
    db: Session = Depends(get_db)
):
    subcategory = update_subcategory(
        db, subcategory_id, payload
    )

    if not subcategory:
        raise HTTPException(
            status_code=404,
            detail="Subcategory not found"
        )

    return subcategory


@router.delete("/subcategories/{subcategory_id}")
def delete_subcategory_api(
    subcategory_id: UUID,
    db: Session = Depends(get_db)
):
    try:
        deleted = delete_subcategory(db, subcategory_id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This subcategory is referenced elsewhere."
        )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Subcategory not found"
        )

    return {"message": "Subcategory deleted"}