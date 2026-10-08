import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models.state import State
from app.db.models.district import District

BASE_DIR = Path(__file__).parent
SEED_DIR = BASE_DIR / "seeds"


def seed_master_data():
    db: Session = SessionLocal()

    try:
        # ------------------------
        # States
        # ------------------------
        with open(SEED_DIR / "states.json", "r", encoding="utf-8") as f:
            states = json.load(f)

        existing_state_ids = {
            row[0] for row in db.query(State.id).all()
        }

        for item in states:
            if item["id"] not in existing_state_ids:
                db.add(
                    State(
                        id=item["id"],
                        name=item["name"]
                    )
                )

        db.commit()

        # ------------------------
        # Districts
        # ------------------------
        with open(SEED_DIR / "districts.json", "r", encoding="utf-8") as f:
            districts = json.load(f)

        existing_district_ids = {
            row[0] for row in db.query(District.id).all()
        }

        for item in districts:
            if item["id"] not in existing_district_ids:
                db.add(
                    District(
                        id=item["id"],
                        state_id=item["state_id"],
                        name=item["name"]
                    )
                )

        db.commit()


        print("Master data seeded successfully")

    except Exception as e:
        db.rollback()
        print(f"Error seeding master data: {e}")
        raise

    finally:
        db.close()