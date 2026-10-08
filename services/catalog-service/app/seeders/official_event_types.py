"""
The ~10 "OX In-Built Package" event types - the official, curated
templates the product spec calls out by name, as opposed to the long
tail of other event types admins can freely add (see event_types.py).

Some of the spec's names don't exactly match what's already seeded in
EVENT_TYPES (event_types.py) - e.g. the spec says "Birthday" but the
seeded row is "Birthday Party". Renaming the existing rows would
orphan any Package rows already created against the old name, so this
maps spec name -> actual seeded EventType.name instead of renaming
anything.
"""

OFFICIAL_EVENT_TYPE_NAMES = [
    "Wedding",
    "Engagement",
    "Reception",
    "Birthday Party",       # spec: "Birthday"
    "Baby Shower",
    "Naming Ceremony",
    "House Warming",        # spec: "Housewarming"
    "Corporate Event",
    "Festival Celebration",  # spec: "Festival"
    "Religious Ceremony",
]
