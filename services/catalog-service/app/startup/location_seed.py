import json
from pathlib import Path

from app.db.models.state import State
from app.db.models.district import District
from app.db.models.location import Location

BASE_DIR = Path(__file__).resolve().parent.parent


def seed_locations(db):

    state_count = db.query(State).count()
    district_count = db.query(District).count()
    location_count = db.query(Location).count()

    if (
        state_count > 0
        and district_count > 0
        and location_count > 0
    ):
        print("Locations already seeded")
        return

    print("Seeding locations...")

    with open(
        BASE_DIR / "seeds" / "states.json",
        encoding="utf-8"
    ) as f:
        states = json.load(f)

    with open(
        BASE_DIR / "seeds" / "districts.json",
        encoding="utf-8"
    ) as f:
        districts = json.load(f)

    with open(
        BASE_DIR / "seeds" / "locations.json",
        encoding="utf-8"
    ) as f:
        locations = json.load(f)

    # States
    db.add_all(
        [State(**state) for state in states]
    )
    db.flush()

    # Districts
    db.add_all(
        [District(**district) for district in districts]
    )
    db.flush()

    # Locations
    db.add_all(
        [Location(**location) for location in locations]
    )

    db.commit()

    print("Location seed completed")