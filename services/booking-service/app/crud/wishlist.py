from sqlalchemy.orm import Session

from app.db.models.wishlist import WishlistItem


def get_wishlist_item(db: Session, customer_id, provider_id):
    return (
        db.query(WishlistItem)
        .filter(
            WishlistItem.customer_id == customer_id,
            WishlistItem.provider_id == provider_id,
        )
        .first()
    )


def add_to_wishlist(db: Session, customer_id, provider_id):
    existing = get_wishlist_item(db, customer_id, provider_id)

    if existing:
        return existing

    item = WishlistItem(
        customer_id=customer_id,
        provider_id=provider_id,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def remove_from_wishlist(db: Session, customer_id, provider_id) -> bool:
    item = get_wishlist_item(db, customer_id, provider_id)

    if not item:
        return False

    db.delete(item)
    db.commit()

    return True


def get_customer_wishlist(db: Session, customer_id):
    return (
        db.query(WishlistItem)
        .filter(WishlistItem.customer_id == customer_id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )
