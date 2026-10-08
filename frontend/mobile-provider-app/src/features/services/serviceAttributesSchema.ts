// Category-specific spec/checklist fields providers fill in from this
// app (Services screen -> "Specifications" on a service card), so e.g.
// a Venue lists Indoor Capacity/Amenities while a Caterer lists
// Cuisine/Per Plate pricing instead of one generic form for everyone.
//
// Ported verbatim from frontend/web-app/src/utils/serviceAttributesSchema.ts
// (the web provider dashboard's original) and mirrored in
// frontend/mobile-customer-app/src/utils/serviceAttributesSchema.ts,
// which uses the same schema to render attribute filters on search
// results. Keep all three in sync if the taxonomy changes.
//
// Categories are free-text names set by admins (see
// services/catalog-service/app/seeders/categories.py), not a fixed
// enum, so - same as this app's utils/categoryIcons.ts - this is a
// keyword-matched rule list rather than a name -> schema lookup
// table. The keyword buckets below mirror the broader taxonomy
// (Venues & Locations, Catering & Food, Decor & Ambience, etc.) those
// categories were renamed to, so e.g. "Venue" matches the Venues &
// Locations bucket and "Music Bands"/"Dance Performers"/"Anchors &
// Emcees" all match the Entertainment bucket.
//
// Values collected by the form are stored as a flat key/value map on
// Service.attributes (provider-service) - see
// screens/provider/SpecificationsScreen.tsx for the renderer and
// api/providerServiceApi.ts for the save call.

export type AttributeFieldType =
  | "boolean"
  | "number"
  | "text"
  | "checkbox_group";

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeFieldType;
  options?: string[]; // only used when type === "checkbox_group"
}

export interface AttributeSection {
  title: string;
  fields: AttributeField[];
}

interface AttributeSchemaRule {
  keywords: string[];
  sections: AttributeSection[];
}

const LANGUAGE_OPTIONS = [
  "Telugu",
  "Hindi",
  "English",
  "Tamil",
  "Kannada",
  "Malayalam",
];

const ATTRIBUTE_SCHEMA_RULES: AttributeSchemaRule[] = [
  // Venues & Locations
  {
    keywords: ["venue"],
    sections: [
      {
        title: "Venue Details",
        fields: [
          { key: "venue_type", label: "Venue Type", type: "text" },
          { key: "indoor_capacity", label: "Indoor Capacity", type: "number" },
          { key: "outdoor_capacity", label: "Outdoor Capacity", type: "number" },
          { key: "seating_capacity", label: "Seating Capacity", type: "number" },
          { key: "floating_capacity", label: "Floating Capacity", type: "number" },
          { key: "number_of_rooms", label: "Number of Rooms", type: "number" },
          { key: "parking_capacity", label: "Parking Capacity", type: "number" },
          { key: "air_conditioned", label: "Air Conditioned", type: "boolean" },
          { key: "power_backup", label: "Power Backup", type: "boolean" },
          { key: "bridal_room", label: "Bridal Room", type: "boolean" },
          { key: "wheelchair_access", label: "Wheelchair Access", type: "boolean" },
          { key: "swimming_pool", label: "Swimming Pool", type: "boolean" },
          { key: "lawn_area", label: "Lawn Area", type: "boolean" },
          { key: "dining_hall", label: "Dining Hall", type: "boolean" },
          { key: "kitchen_available", label: "Kitchen Available", type: "boolean" },
        ],
      },
      {
        title: "Amenities",
        fields: [
          {
            key: "amenities",
            label: "Amenities",
            type: "checkbox_group",
            options: [
              "WiFi",
              "Generator",
              "Decoration Allowed",
              "Outside Catering Allowed",
              "DJ Allowed",
              "Alcohol Allowed",
              "Fireworks Allowed",
            ],
          },
        ],
      },
      {
        title: "Pricing",
        fields: [
          { key: "rental_price", label: "Rental Price", type: "number" },
          { key: "food_mandatory", label: "Food Mandatory", type: "boolean" },
          { key: "per_plate_charges", label: "Per Plate Charges", type: "number" },
          { key: "minimum_booking_hours", label: "Minimum Booking Hours", type: "number" },
        ],
      },
    ],
  },

  // Catering & Food
  {
    keywords: ["cater"],
    sections: [
      {
        title: "Cuisine",
        fields: [
          {
            key: "cuisine",
            label: "Cuisine",
            type: "checkbox_group",
            options: [
              "Veg",
              "Non-Veg",
              "Jain",
              "Vegan",
              "Continental",
              "Chinese",
              "Italian",
              "South Indian",
              "North Indian",
              "Live Counters",
            ],
          },
        ],
      },
      {
        title: "Capacity",
        fields: [
          { key: "minimum_guests", label: "Minimum Guests", type: "number" },
          { key: "maximum_guests", label: "Maximum Guests", type: "number" },
        ],
      },
      {
        title: "Kitchen",
        fields: [
          {
            key: "kitchen",
            label: "Kitchen",
            type: "checkbox_group",
            options: ["Own Kitchen", "Central Kitchen"],
          },
        ],
      },
      {
        title: "Pricing",
        fields: [
          { key: "per_plate_veg", label: "Per Plate Veg", type: "number" },
          { key: "per_plate_non_veg", label: "Per Plate Non-Veg", type: "number" },
          { key: "buffet", label: "Buffet", type: "number" },
          { key: "live_counter_cost", label: "Live Counter Cost", type: "number" },
        ],
      },
    ],
  },

  // Decor & Ambience
  {
    keywords: ["decor"],
    sections: [
      {
        title: "Decoration Types",
        fields: [
          {
            key: "decoration_types",
            label: "Decoration Types",
            type: "checkbox_group",
            options: [
              "Wedding",
              "Birthday",
              "Corporate",
              "Traditional",
              "Theme",
              "Floral",
              "Balloon",
            ],
          },
        ],
      },
      {
        title: "Materials",
        fields: [
          {
            key: "materials",
            label: "Materials",
            type: "checkbox_group",
            options: [
              "Artificial Flowers",
              "Fresh Flowers",
              "LED",
              "Stage",
              "Mandap",
              "Entrance Arch",
            ],
          },
        ],
      },
      {
        title: "Experience",
        fields: [
          {
            key: "number_of_events_completed",
            label: "Number of Events Completed",
            type: "number",
          },
        ],
      },
    ],
  },

  // Entertainment (Music Bands, Dance Performers, Anchors & Emcees,
  // Artist/Celebrity Management all fold into this bucket per
  // categories.py's comment)
  {
    keywords: [
      "entertain",
      "music band",
      "dance",
      "dj",
      "anchor",
      "emcee",
      "artist management",
      "celebrity",
    ],
    sections: [
      {
        title: "Artist Type",
        fields: [
          {
            key: "artist_type",
            label: "Artist Type",
            type: "checkbox_group",
            options: [
              "DJ",
              "Singer",
              "Band",
              "Dance Group",
              "Magician",
              "Anchor",
              "Celebrity",
            ],
          },
        ],
      },
      {
        title: "Languages",
        fields: [
          {
            key: "languages",
            label: "Languages",
            type: "checkbox_group",
            options: LANGUAGE_OPTIONS,
          },
        ],
      },
      {
        title: "Equipment",
        fields: [
          {
            key: "equipment",
            label: "Equipment",
            type: "checkbox_group",
            options: ["Own Sound System", "Lighting", "Stage"],
          },
        ],
      },
    ],
  },

  // Photography & Videography
  {
    keywords: ["photograph", "videograph", "media coverage", "live streaming"],
    sections: [
      {
        title: "Services",
        fields: [
          {
            key: "services",
            label: "Services",
            type: "checkbox_group",
            options: [
              "Photography",
              "Videography",
              "Drone",
              "Cinematic",
              "Live Streaming",
              "360 Booth",
            ],
          },
        ],
      },
      {
        title: "Equipment",
        fields: [
          { key: "camera_brands", label: "Camera Brands", type: "text" },
          { key: "drone_license", label: "Drone License", type: "boolean" },
          { key: "editing_team", label: "Editing Team", type: "boolean" },
        ],
      },
      {
        title: "Delivery",
        fields: [
          {
            key: "delivery",
            label: "Delivery",
            type: "checkbox_group",
            options: ["Album", "Digital Copy", "Reel", "Highlight Video"],
          },
        ],
      },
    ],
  },

  // Outfits & Styling
  {
    keywords: ["makeup", "bridal", "groom", "wedding shopping", "outfit", "styling"],
    sections: [
      {
        title: "Services",
        fields: [
          {
            key: "services",
            label: "Services",
            type: "checkbox_group",
            options: [
              "Bridal Makeup",
              "Groom Makeup",
              "Hair Styling",
              "Saree Draping",
              "Costume Design",
              "Tailoring",
            ],
          },
        ],
      },
      {
        title: "Details",
        fields: [
          { key: "home_service", label: "Home Service", type: "boolean" },
          { key: "brands_used", label: "Brands Used", type: "text" },
          { key: "trial_available", label: "Trial Available", type: "boolean" },
        ],
      },
    ],
  },

  // Invitations & Gifting
  {
    keywords: ["invitation", "gifting", "printing"],
    sections: [
      {
        title: "Services",
        fields: [
          {
            key: "services",
            label: "Services",
            type: "checkbox_group",
            options: [
              "Printed Cards",
              "Digital Invitations",
              "Video Invitations",
              "Return Gifts",
              "Customized Gifts",
            ],
          },
        ],
      },
      {
        title: "Printing Technology",
        fields: [
          {
            key: "printing_technology",
            label: "Printing Technology",
            type: "checkbox_group",
            options: ["Offset", "Digital", "Foil", "Laser"],
          },
        ],
      },
    ],
  },

  // Travel & Logistics
  {
    keywords: ["transport", "travel"],
    sections: [
      {
        title: "Vehicle Types",
        fields: [
          {
            key: "vehicle_types",
            label: "Vehicle Types",
            type: "checkbox_group",
            options: ["Sedan", "SUV", "Luxury", "Bus", "Mini Bus", "Tempo Traveller"],
          },
        ],
      },
      {
        title: "Details",
        fields: [
          { key: "fleet_size", label: "Fleet Size", type: "number" },
          { key: "driver_included", label: "Driver Included", type: "boolean" },
          { key: "fuel_included", label: "Fuel Included", type: "boolean" },
          { key: "interstate_permit", label: "Interstate Permit", type: "boolean" },
        ],
      },
    ],
  },

  // Event Essentials
  {
    keywords: [
      "security",
      "event staffing",
      "furniture",
      "tent house",
      "power",
      "utilit",
      "event technology",
      "event essentials",
    ],
    sections: [
      {
        title: "Services",
        fields: [
          {
            key: "services",
            label: "Services",
            type: "checkbox_group",
            options: [
              "Security",
              "Bouncers",
              "Event Managers",
              "Furniture",
              "Sound Systems",
              "LED Walls",
              "Licensing",
            ],
          },
        ],
      },
      {
        title: "Details",
        fields: [
          { key: "inventory_details", label: "Inventory Details", type: "text" },
          { key: "team_size", label: "Team Size", type: "number" },
        ],
      },
    ],
  },

  // Spiritual & Ritual Services
  {
    keywords: ["religious", "purohit", "pandit", "ritual"],
    sections: [
      {
        title: "Services",
        fields: [
          {
            key: "services",
            label: "Services",
            type: "checkbox_group",
            options: [
              "Marriage",
              "Housewarming",
              "Naming Ceremony",
              "Satyanarayana Vratham",
              "Homam",
              "Temple Rituals",
            ],
          },
        ],
      },
      {
        title: "Languages",
        fields: [
          {
            key: "languages",
            label: "Languages",
            type: "checkbox_group",
            options: LANGUAGE_OPTIONS,
          },
        ],
      },
      {
        title: "Sampradayam",
        fields: [
          {
            key: "sampradayam",
            label: "Sampradayam",
            type: "checkbox_group",
            options: ["Smartha", "Vaishnava", "Shaiva", "Others"],
          },
        ],
      },
      {
        title: "Details",
        fields: [
          { key: "travel_available", label: "Travel Available", type: "boolean" },
        ],
      },
    ],
  },

  // Special Add-ons (Special Attractions)
  {
    keywords: ["special attraction", "fireworks", "effects", "special add"],
    sections: [
      {
        title: "Services",
        fields: [
          {
            key: "services",
            label: "Services",
            type: "checkbox_group",
            options: [
              "Fireworks",
              "Photo Booth",
              "360 Booth",
              "Corporate Gifts",
              "Exhibition Stalls",
              "Kids Activities",
            ],
          },
        ],
      },
      {
        title: "Details",
        fields: [
          { key: "safety_certification", label: "Safety Certification", type: "boolean" },
          { key: "insurance", label: "Insurance", type: "boolean" },
        ],
      },
    ],
  },
];

// Returns the section list for a category name, or null if no bucket
// matches - callers should hide the "Specifications" action entirely
// in that case rather than show an empty form.
export function getServiceAttributeSchema(
  categoryName: string
): AttributeSection[] | null {
  const lower = categoryName.toLowerCase();

  const rule = ATTRIBUTE_SCHEMA_RULES.find((r) =>
    r.keywords.some((kw) => lower.includes(kw))
  );

  return rule ? rule.sections : null;
}
