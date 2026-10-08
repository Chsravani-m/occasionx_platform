"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


interface SideNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-[#1E3A8A] mb-2">{title}</h3>
    <ul className="space-y-2">
      {children}
    </ul>
  </div>
);

const DrawerLink: React.FC<{
  to: string;
  children: React.ReactNode;
}> = ({ to, children }) => {
  const pathname = usePathname();

  const isActive = pathname === to;

  return (
    <li>
      <Link
        href={to}
        className={`block px-3 py-2 rounded-lg hover:bg-[#C89B3C]/30 hover:text-[#1E3A8A] transition ${
          isActive
            ? "font-semibold text-[#1E3A8A]"
            : "text-[#1F2937]"
        }`}
      >
        {children}
      </Link>
    </li>
  );
};

const SideNavDrawer: React.FC<SideNavDrawerProps> = ({ open, onClose }) => {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[300px]
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          bg-[#F8F6F2]
          text-[#1F2937]
          shadow-xl
          border-r border-[#E5E7EB]
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold">Browse All</span>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-2 rounded hover:bg-white/10"
          >
            {/* X icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-49px)] px-4 py-4">
          <Section title="Events by Type">
            <DrawerLink to="/events/weddings">Weddings</DrawerLink>
            <DrawerLink to="/events/birthday-parties">Birthday Parties</DrawerLink>
            <DrawerLink to="/events/corporate">Corporate Events</DrawerLink>
            <DrawerLink to="/events/housewarming">Housewarming</DrawerLink>
            <DrawerLink to="/events/engagement">Engagement</DrawerLink>
            <DrawerLink to="/events/baby-shower">Baby Shower</DrawerLink>
            <DrawerLink to="/events/college">College Events</DrawerLink>
            <DrawerLink to="/events/religious-rituals">Religious Ritual Services</DrawerLink>
          </Section>

          <Section title="Popular Categories">
            <DrawerLink to="/categories/venues">Venues</DrawerLink>
            <DrawerLink to="/categories/catering">Catering</DrawerLink>
            <DrawerLink to="/categories/photography">Photography & Videography</DrawerLink>
            <DrawerLink to="/categories/decor">Decor & Flowers</DrawerLink>
            <DrawerLink to="/categories/purohits">Purohits & Rituals</DrawerLink>
            <DrawerLink to="/categories/makeup-mehendi">Makeup & Mehendi Artists</DrawerLink>
            <DrawerLink to="/categories/entertainment">Music / DJ & Entertainment</DrawerLink>
            <DrawerLink to="/categories/invitations-gifts">Invitations & Gifts</DrawerLink>
            <DrawerLink to="/categories/logistics">Logistics & Travel</DrawerLink>
          </Section>

          <Section title="User Account">
            <DrawerLink to="/my-bookings">My Bookings</DrawerLink>
            <DrawerLink to="/dashboard/calendar">My Calendar</DrawerLink>
            <DrawerLink to="/dashboard/ratings">My Ratings</DrawerLink>
            <DrawerLink to="/wishlist">Wishlist</DrawerLink>
            <DrawerLink to="/dashboard/profile">My Profile</DrawerLink>
          </Section>

          <Section title="Info & Support">
            <DrawerLink to="/careers">Careers</DrawerLink>
            <DrawerLink to="/about">About OccasionX</DrawerLink>
            <DrawerLink to="/terms">Terms & Conditions</DrawerLink>
            <DrawerLink to="/privacy">Privacy Policy</DrawerLink>
            <DrawerLink to="/contact">Contact Us</DrawerLink>
          </Section>

          <Section title="Browse">
            <DrawerLink to="/categories">Categories</DrawerLink>
            <DrawerLink to="/packages">Packages</DrawerLink>
            <DrawerLink to="/deals">Deals & Offers</DrawerLink>
            <DrawerLink to="/top-rated">Top Rated</DrawerLink>
            <DrawerLink to="/how-it-works">How It Works</DrawerLink>
            <DrawerLink to="/provider/register">Partner With Us</DrawerLink>
            <DrawerLink to="/help">Support</DrawerLink>
          </Section>
        </div>
      </aside>
    </>
  );
};

export default SideNavDrawer;
