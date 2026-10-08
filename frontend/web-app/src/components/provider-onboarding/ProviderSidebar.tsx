"use client";

// Each Business Setup section gets its own icon, all sharing the same
// brand theme color (#1E3A8A) used everywhere else in the app - the
// active item is filled solid with that color, and inactive items show
// a light tint of it, so the nav reads as one consistent, professional
// palette instead of a rainbow of section colors.
const THEME_ACTIVE_BG = "bg-[#1E3A8A]";
const THEME_ICON_BG = "bg-[#1E3A8A]/10";

const items: {
  key: string;
  label: string;
  icon: string;
}[] = [
  { key: "profile", label: "Profile", icon: "🏢" },
  { key: "documents", label: "Documents", icon: "📄" },
  { key: "portfolio", label: "Portfolio", icon: "📸" },
  { key: "services", label: "Services", icon: "🛠️" },
  { key: "subscription", label: "Subscription", icon: "💳" },
];

export default function ProviderSidebar({
  active,
  setActive,
}: {
  active: string;
  setActive: (tab: string) => void;
}) {
  return (
    <aside className="w-72 bg-white h-screen sticky top-0 border-r p-6">

      <h2 className="font-bold text-xl mb-8 text-[#1F2937]">
        Provider Setup
      </h2>

      <div className="space-y-3">

        {items.map((item) => {
          const isActive = active === item.key;

          return (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`
                w-full
                flex items-center gap-3
                text-left
                p-3
                rounded-xl
                transition
                ${
                  isActive
                    ? `${THEME_ACTIVE_BG} text-white shadow`
                    : "bg-gray-50 hover:bg-gray-100 text-[#1F2937]"
                }
              `}
            >
              <span
                className={`
                  w-10 h-10
                  rounded-lg
                  flex items-center justify-center
                  text-lg
                  flex-shrink-0
                  ${isActive ? "bg-white/20" : THEME_ICON_BG}
                `}
              >
                {item.icon}
              </span>

              <span className="font-medium capitalize">
                {item.label}
              </span>
            </button>
          );
        })}

      </div>

    </aside>
  );
}
