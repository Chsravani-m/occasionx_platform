"use client";

import { useState } from "react";
import { Mail, Phone, Clock, MessageCircle } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // No contact-form backend exists yet, so this opens the visitor's
    // own email client with the message pre-filled instead of silently
    // going nowhere - still gets the message to support@occasionx.com.
    const subject = encodeURIComponent(`Message from ${name || "OccasionX visitor"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);

    window.location.href = `mailto:support@occasionx.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-[#F8F6F2] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="text-[#1E3A8A]" size={28} />
          <h1 className="text-3xl font-bold text-[#1F2937]">Contact Us</h1>
        </div>

        <p className="text-gray-600 mb-10">
          Questions about a booking, a listing, or anything else - reach us
          directly below, or send a message and it'll go straight to our
          inbox.
        </p>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-6">
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-[#1E3A8A]" />
              <a href="mailto:support@occasionx.com" className="hover:underline">
                support@occasionx.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-[#1E3A8A]" />
              <a href="tel:+919876543210" className="hover:underline">
                +91 98765 43210
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-[#1E3A8A]" />
              <span>Support Hours: 9 AM – 7 PM IST (Mon–Sat)</span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-semibold text-[#1F2937]">Send us a message</h2>

          <div>
            <label className="text-xs font-medium text-[#1F2937]">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#1F2937]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#1F2937]">Message</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg bg-[#FFFCF8] border border-[#E5E7EB] text-[#1F2937] px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/70"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[#1E3A8A] hover:bg-[#182E6E] text-white text-sm font-semibold py-2.5 transition"
          >
            Send Message
          </button>
        </form>

        <div className="mt-8 text-sm text-center">
          <a href="/" className="text-[#1E3A8A] hover:underline">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
