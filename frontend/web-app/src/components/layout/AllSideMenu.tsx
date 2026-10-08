"use client";

import React from 'react';
import Link from "next/link";

interface Props {
  open: boolean;
  onClose: () => void;
}

const AllSideMenu: React.FC<Props> = ({ open, onClose }) => {
  return (
    <div className={`fixed inset-0 z-50 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* overlay */}
      <div className={`absolute inset-0 bg-black/40 ${open ? 'opacity-100' : 'opacity-0'} transition`} onClick={onClose} />
      {/* drawer */}
      <div className={`absolute left-0 top-0 h-full w-80 bg-white/10 backdrop-blur border-r border-white/20 transform transition ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">All Menu</h3>
          <nav className="flex flex-col gap-2">
            <Link href="/" onClick={onClose} className="hover:underline">Home</Link>
            <Link href="/search" onClick={onClose} className="hover:underline">Search Services</Link>
            <Link href="/categories" onClick={onClose} className="hover:underline">Categories</Link>
            <Link href="/packages" onClick={onClose} className="hover:underline">Event Packages</Link>
            <Link href="/offers" onClick={onClose} className="hover:underline">Offers & Deals</Link>
            <Link href="/provider/onboard" onClick={onClose} className="hover:underline">Become a Provider</Link>
            <Link href="/support" onClick={onClose} className="hover:underline">Customer Support</Link>
            <Link href="/about" onClick={onClose} className="hover:underline">About Us</Link>
            <Link href="/contact" onClick={onClose} className="hover:underline">Contact</Link>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default AllSideMenu;
