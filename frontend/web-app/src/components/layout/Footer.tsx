"use client";

import { FiInstagram, FiFacebook, FiYoutube, FiLinkedin, FiTwitter } from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#18285A] text-white py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Top Section: 5 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Social & App */}
                    <div>
                      <h4 className="font-semibold mb-3">Connect with us</h4>
                      <div className="flex items-center gap-3 text-xl mb-4">
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><FiInstagram /></a>
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FiFacebook /></a>
                        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><FiYoutube /></a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><FiLinkedin /></a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter/X"><FiTwitter /></a>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-slate-300 mb-1">📱 Download the OccasionX App (Coming Soon)</span>
                        <div className="flex gap-2">
                          <div className="bg-white/10 rounded px-3 py-1 text-xs text-slate-200">Google Play</div>
                          <div className="bg-white/10 rounded px-3 py-1 text-xs text-slate-200">App Store</div>
                        </div>
                      </div>
                    </div>
          {/* Most Searched Categories */}
          <div>
            <h4 className="font-semibold mb-3">Most Searched Categories</h4>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li><Link href="/categories/venues" className="hover:underline">Venues</Link></li>
              <li><Link href="/categories/catering" className="hover:underline">Catering</Link></li>
              <li><Link href="/categories/photography" className="hover:underline">Photography</Link></li>
              <li><Link href="/categories/decor" className="hover:underline">Decor & Flowers</Link></li>
              <li><Link href="/categories/purohits" className="hover:underline">Purohits & Rituals</Link></li>
              <li><Link href="/categories/entertainment" className="hover:underline">Entertainment</Link></li>
              <li><Link href="/categories/invitations" className="hover:underline">Invitations & Gifting</Link></li>
              <li><Link href="/categories/travel" className="hover:underline">Travel & Logistics</Link></li>
            </ul>
          </div>
          {/* Support & Legal */}
          <div>
            <h4 className="font-semibold mb-3">Support & Legal</h4>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li><Link href="/help" className="hover:underline">Help Center</Link></li>
              <li><Link href="/terms" className="hover:underline">Terms & Conditions</Link></li>
              <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:underline">Refund & Cancellation Policy</Link></li>
              <li><Link href="/provider-agreement" className="hover:underline">Service Provider Agreement</Link></li>
              <li><Link href="/membership-policy" className="hover:underline">User Membership Policy</Link></li>
              <li><Link href="/payment-security" className="hover:underline">Payment & Security</Link></li>
            </ul>
          </div>
          {/* Contact Information */}
          <div>
            <h4 className="font-semibold mb-3">Contact Information</h4>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li><span className="inline-block">📍 Hyderabad, Telangana, India</span></li>
              <li><a href="mailto:support@occasionx.com" className="hover:underline">📧 support@occasionx.com</a></li>
              <li><a href="tel:+919876543210" className="hover:underline">📞 +91 98765 43210</a></li>
              <li><span className="inline-block">⏰ Support Hours: 9 AM – 7 PM IST (Mon–Sat)</span></li>
            </ul>
          </div>
        </div>
        {/* Divider */}
        <div className="border-t border-[#E5E7EB] pt-6" />
        {/* Bottom Row */}
        <div className="text-xs text-slate-300 flex flex-col md:flex-row justify-between items-center gap-2">
          <span>© {year} OccasionX. All rights reserved.</span>
          <span className="flex items-center gap-2">
            <span>A product of Neocon Technologies.</span>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
