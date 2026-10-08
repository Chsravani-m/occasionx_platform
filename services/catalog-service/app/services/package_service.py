from sqlalchemy.orm import Session

from app.db.models.package import Package
from app.db.models.package_category import PackageCategory
from app.db.models.category import Category


class PackageService:

    @staticmethod
    def create_package(
        db: Session,
        payload
    ):

        package = Package(
            event_type_id=payload.event_type_id,
            name=payload.name,
            description=payload.description,
            min_budget=payload.min_budget,
            max_budget=payload.max_budget,
            tier=payload.tier
        )

        db.add(package)
        db.flush()

        for category in payload.categories:
            db.add(
                PackageCategory(
                    package_id=package.id,
                    category_id=category.category_id,
                    required=category.required
                )
            )

        db.commit()
        db.refresh(package)

        return package

    @staticmethod
    def update_package(
        db: Session,
        package_id,
        payload
    ):
        package = db.query(Package).filter(
            Package.id == package_id
        ).first()

        if not package:
            return None

        package.event_type_id = payload.event_type_id
        package.name = payload.name
        package.description = payload.description
        package.min_budget = payload.min_budget
        package.max_budget = payload.max_budget
        package.active = payload.active
        package.tier = payload.tier

        db.query(PackageCategory).filter(
            PackageCategory.package_id == package_id
        ).delete()

        for category in payload.categories:
            db.add(
                PackageCategory(
                    package_id=package.id,
                    category_id=category.category_id,
                    required=category.required
                )
            )

        db.commit()
        db.refresh(package)

        return package

    @staticmethod
    def get_packages(db: Session):
        return db.query(Package).all()

    @staticmethod
    def get_package(
        db: Session,
        package_id
    ):
        return db.query(Package).filter(
            Package.id == package_id
        ).first()

    @staticmethod
    def delete_package(
        db: Session,
        package_id
    ):
        package = db.query(Package).filter(
            Package.id == package_id
        ).first()

        if package:
            package.active = False
            db.commit()

        return package

    @staticmethod
    def get_package_categories(
        db: Session,
        package_id
    ):
        rows = (
            db.query(PackageCategory, Category)
            .join(
                Category,
                Category.id == PackageCategory.category_id
            )
            .filter(
                PackageCategory.package_id == package_id
            )
            .all()
        )

        return [
            {
                "id": package_category.id,
                "package_id": package_category.package_id,
                "category_id": package_category.category_id,
                "category_name": category.name,
                "required": package_category.required,
            }
            for package_category, category in rows
        ]
