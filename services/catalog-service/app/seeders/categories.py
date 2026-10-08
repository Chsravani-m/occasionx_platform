CATEGORIES = [
    # Renamed to match the broader taxonomy shared in Teams (see
    # subcategories.py for the matching subcategory-list rewrite, and
    # fix_category_renames.py for the one-off DB migration that renames
    # already-seeded rows in place). This reverses the earlier decision
    # documented below: rather than folding those 10 bucket names'
    # items into the closest existing category, the closest existing
    # category is now renamed to the bucket name outright.
    "Photography & Videography",  # was "Photography"
    "Videography",
    "Decor & Ambience",  # was "Decoration"
    "Venues & Locations",  # was "Venue"
    "Catering & Food",  # was "Catering"
    "Entertainment",
    "Outfits & Styling",  # was "Makeup & Grooming"
    "Event Essentials",  # was "Event Planning"
    "Invitations & Gifting",  # was "Invitations"
    "Audio Visual",
    "Travel & Logistics",  # was "Transportation"
    "Accommodation",
    "Security Services",
    "Event Staffing",
    "Furniture Rental",
    "Tent House",
    "Power & Utilities",
    "Wedding Services",
    "Spiritual & Ritual Services",  # was "Religious Services"
    "Birthday Services",
    "Corporate Events",
    "Kids Entertainment",
    "Gifting Solutions",
    "Food Stalls",
    "Cake & Bakery",
    "Live Counters",
    "Florists",
    "Travel Services",
    "Luxury Experiences",
    "Artist Management",
    "Celebrity Management",
    "Music Bands",
    "Dance Performers",
    "Anchors & Emcees",
    "Printing Services",
    "Brand Promotion",
    "Digital Marketing",
    "Event Technology",
    "Ticketing Solutions",
    "Registration Services",
    "Live Streaming",
    "Media Coverage",
    "Wedding Shopping",
    "Bridal Services",
    "Groom Services",
    "Rental Services",
    "Wellness & Spa",
    "Fireworks & Effects",
    "Destination Weddings",
    "Special Add-Ons"  # was "Special Attractions"

    # Previously: a broader taxonomy shared in Teams (Venues &
    # Locations, Catering & Food, Decor & Ambience, Photography &
    # Videography, Outfits & Styling, Invitations & Gifting, Travel &
    # Logistics, Event Essentials, Spiritual & Ritual Services, Special
    # Add-Ons) was briefly added as 10 new top-level categories, then
    # reverted per follow-up feedback in favor of merging its items
    # into the closest matching categories instead. Follow-up feedback
    # after that asked for the opposite: rename each closest-matching
    # category to its bucket name (see above), rather than keep both
    # namings. "Videography", "Accommodation", "Gifting Solutions",
    # "Security Services", "Event Staffing", "Furniture Rental",
    # "Tent House", "Power & Utilities" and "Travel Services" all
    # overlap with bucket content too, but were left as their own
    # categories rather than merged/deleted, since collapsing them
    # would mean migrating their existing Service/ProviderCategory rows
    # in provider-service onto a different category_id - out of scope
    # here.
]