"use client";

import { useEffect, useState } from "react";
import { TermsSection } from "./TermsDocument";

interface TermsModalProps {
  open: boolean;
  title: string;
  sections: TermsSection[];

  // Called once, when the reader clicks "I Agree" - the caller is
  // responsible for both persisting acceptance (e.g. acceptUserTerms
  // from src/utils/terms.ts) and updating whatever local state gates
  // the "Continue"/"Register" button, since this modal renders and
  // closes within the same tab/page (no more window.opener /
  // storage-event handoff between tabs).
  onAgree: () => void;

  onClose: () => void;
}

// Renders Terms & Conditions as an in-page dialog instead of opening
// a new browser tab - opening a real new tab was unreliable (popup
// blockers, or landing on an unrelated page/search result depending
// on the browser) and split the registration flow across two tabs.
// The reader has to scroll to the bottom of the document before
// "I Agree" becomes clickable, and must click it to close the dialog
// and move on - there's no way to progress in the underlying form
// without agreeing.
export default function TermsModal({
  open,
  title,
  sections,
  onAgree,
  onClose,
}: TermsModalProps) {
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    if (open) setReachedEnd(false);
  }, [open]);

  if (!open) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setReachedEnd(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
          <h2 className="text-lg md:text-xl font-bold text-[#1F2937]">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
        >
          {sections.map((section, index) => (
            <section key={section.heading}>
              <h3 className="text-base font-semibold text-[#1F2937]">
                {index + 1}. {section.heading}
              </h3>

              {section.intro && (
                <p className="mt-1 text-sm text-gray-600">{section.intro}</p>
              )}

              {section.items && section.items.length > 0 && (
                <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-gray-600">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              {section.outro && (
                <p className="mt-1 text-sm text-gray-600">{section.outro}</p>
              )}
            </section>
          ))}
        </div>

        <div className="border-t border-[#E5E7EB] px-6 py-4">
          {!reachedEnd && (
            <p className="text-xs text-gray-500 mb-3">
              Please scroll to the end of the document to agree.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-[#E5E7EB] text-[#1F2937] font-medium hover:bg-[#F8F6F2] transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!reachedEnd}
              onClick={() => {
                onAgree();
                onClose();
              }}
              className="px-8 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#182E6E] text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
