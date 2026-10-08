import json
from pathlib import Path

BASE_DIR = Path(__file__).parent

STATES_FILE = BASE_DIR / "states.json"
SOURCE_FILE = BASE_DIR / "india_states_districts.json"
OUTPUT_FILE = BASE_DIR / "districts.json"


def main():
    with open(STATES_FILE, "r", encoding="utf-8") as f:
        states = json.load(f)

    with open(SOURCE_FILE, "r", encoding="utf-8") as f:
        source = json.load(f)

    state_name_to_id = {
        state["name"].strip().lower(): state["id"]
        for state in states
    }

    districts = []
    district_id = 1

    for state in source:
        state_name = state["state"].strip().lower()

        state_id = state_name_to_id.get(state_name)

        if not state_id:
            print(f"Skipping state: {state['state']}")
            continue

        for district_name in state["districts"]:
            districts.append(
                {
                    "id": district_id,
                    "state_id": state_id,
                    "name": district_name.strip()
                }
            )

            district_id += 1

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            districts,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        f"Generated {len(districts)} districts "
        f"into {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()