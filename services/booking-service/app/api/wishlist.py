from uuid import UUID

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.core.dependencies import (
    get_current_user,
    require_self_or_admin
)

from app.schemas.wishlist import (
    WishlistCreate,
    WishlistResponse
)

from app.crud.wishlist import (
    add_to_wishlist,
    remove_from_wishlist,
    get_customer_wishlist,
    get_wishlist_item
)

router = APIRouter(
    prefix="/wishlist",
    tags=["Wishlist"]
)


@router.post(
    "",
    response_model=WishlistResponse
)
def add_wishlist_item(
    payload: WishlistCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    require_self_or_admin(
        payload.customer_id,
        current_user
    )

    return add_to_wishlist(
        db,
        payload.customer_id,
        payload.provider_id
    )


@router.get(
    "/customer/{customer_id}",
    response_model=list[WishlistResponse]
)
def list_customer_wishlist(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    require_self_or_admin(
        customer_id,
        current_user
    )

    return get_customer_wishlist(db, customer_id)


@router.get(
    "/customer/{customer_id}/provider/{provider_id}"
)
def check_wishlist_item(
    customer_id: UUID,
    provider_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    require_self_or_admin(
        customer_id,
        current_user
    )

    item = get_wishlist_item(db, customer_id, provider_id)

    return {"is_wishlisted": item is not None}


@router.delete(
    "/customer/{customer_id}/provider/{provider_id}"
)
def remove_wishlist_item(
    customer_id: UUID,
    provider_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    require_self_or_admin(
        customer_id,
        current_user
    )

    removed = remove_from_wishlist(
        db, customer_id, provider_id
    )

    if not removed:
        raise HTTPException(
            status_code=404,
            detail="Wishlist item not found"
        )

    return {"message": "Removed from wishlist"}
