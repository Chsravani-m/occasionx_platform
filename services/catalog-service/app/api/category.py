from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.crud.category import (
    get_all_categories,
    create_category,
    update_category,
    delete_category
)

from app.schemas.category import (
    CategoryResponse,
    CategoryCreateRequest,
    CategoryUpdateRequest
)
from app.crud.category_tree import (
    get_categories_with_subcategories
)

from app.schemas.category_tree import (
    CategoryWithSubcategories
)

router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


@router.get(
    "",
    response_model=list[CategoryResponse]
)
def get_categories(
    db: Session = Depends(get_db)
):
    return get_all_categories(db)

@router.get(
    "/with-subcategories",
    response_model=list[
        CategoryWithSubcategories
    ]
)
def get_category_tree(
    db: Session = Depends(get_db)
):
    return get_categories_with_subcategories(
        db
    )


@router.post(
    "",
    response_model=CategoryResponse
)
def create_category_api(
    payload: CategoryCreateRequest,
    db: Session = Depends(get_db)
):
    try:
        return create_category(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists."
        )


@router.put(
    "/{category_id}",
    response_model=CategoryResponse
)
def update_category_api(
    category_id: UUID,
    payload: CategoryUpdateRequest,
    db: Session = Depends(get_db)
):
    try:
        category = update_category(
            db, category_id, payload
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A category with this name already exists."
        )

    if not category:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return category


@router.delete("/{category_id}")
def delete_category_api(
    category_id: UUID,
    db: Session = Depends(get_db)
):
    try:
        deleted = delete_category(db, category_id)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "This category has subcategories or is referenced "
                "elsewhere. Remove those first."
            )
        )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Category not found"
        )

    return {"message": "Category deleted"}