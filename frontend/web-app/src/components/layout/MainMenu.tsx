"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MainMenuProps {
  onOpenAll?: () => void;
}
const MainMenu: React.FC<MainMenuProps> = ({ onOpenAll }) => {
  const pathname = usePathname();

  const menuClass = (href: string) =>
  `hover:text-white transition ${
    pathname === href
      ? "font-semibold text-white"
      : "text-[#F8F6F2]"
  }`;

  return (

      <nav
        className="
          fixed
          top-[72px]
          left-0
          right-0
          z-40
          w-full
          bg-[#18285A]
          text-[#F8F6F2]
          shadow-sm
          border-b
          border-[#E5E7EB]
        "
      >

      <div className="container mx-auto px-4">
        <div className="flex items-center py-2 text-sm">

          {/* LEFT MENU */}
          <div className="flex flex-wrap items-center gap-6">

            {/* HAMBURGER */}
            <button
              type="button"
              aria-label="Open menu"
              onClick={onOpenAll}
              className="
                p-2 rounded-md
                hover:bg-[#182E6E]
                transition
                flex items-center justify-center
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* MENU LINKS */}
          <Link href="/" className={menuClass("/")}>
              Home
          </Link>

          <Link href="/categories" className={menuClass("/categories")}>
              Categories
          </Link>

          <Link href="/packages" className={menuClass("/packages")}>
              Packages
          </Link>

          <Link href="/#deals" className={menuClass("/")}>
              Deals & Offers
          </Link>

          <Link href="/top-rated" className={menuClass("/top-rated")}>
              Top Rated
          </Link>

          <Link href="/#how-it-works" className={menuClass("/")}>
              How It Works
          </Link>

          <Link href="/provider/register" className={menuClass("/provider/register")}>
              Partner With Us
          </Link>

          <Link href="/help" className={menuClass("/help")}>
              Support
          </Link>

          <Link href="/ox-products" className={menuClass("/ox-products")}>
              OXProducts
          </Link>


          </div>
        </div>
      </div>
    </nav>
  );
};

export default MainMenu;