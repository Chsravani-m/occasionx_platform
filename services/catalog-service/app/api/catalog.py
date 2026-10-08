from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.db.models.event_type import EventType
from app.db.models.category import Category
from app.db.models.subcategory import SubCategory

router = APIRouter(
    prefix="/catalog",
    tags=["Catalog"]
)

@router.get("/full")
def get_full_catalog(
    db: Session = Depends(get_db)
):
    return {
        "event_types":
            db.query(EventType).all(),

        "categories":
            db.query(Category).all(),

        "subcategories":
            db.query(SubCategory).all()
    }