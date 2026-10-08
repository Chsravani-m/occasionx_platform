"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface TermsSection {
  heading: string;
  intro?: string;
  items?: string[];
  outro?: string;
}

interface TermsDocumentProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  sections: TermsSection[];

  // Called when the reader clicks "I Agree" at the end of the
  // document - the page supplies this to record acceptance (see
  // src/utils/terms.ts). Omit to render the document read-only, with
  // no agree button (e.g. if it's ever linked to outside a
  // registration flow).
  onAgree?: () => void;

  // Checked once, client-side only, inside useEffect below - never
  // called during render, so its result (which depends on
  // localStorage) can't cause a server/client hydration mismatch.
  checkAlreadyAgreed?: () => boolean;
}

export default function TermsDocument({
  title,
  subtitle,
  backHref,
  backLabel,
  sections,
  onAgree,
  checkAlreadyAgreed,
}: TermsDocumentProps) {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setAgreed(checkAlreadyAgreed ? checkAlreadyAgreed() : false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAgree = () => {
    onAgree?.();
    setAgreed(true);

    // The registration link opens this in a new tab (target="_blank"),
    // and the original tab already picks up the acceptance on its own
    // via the "storage" event - it doesn't need this tab to navigate
    // anywhere. Redirecting this tab to backHref used to just produce
    // a second, blank /register page sitting open next to the
    // original filled-in one, which is confusing and easy to submit
    // from by mistake. So instead: close this tab and send focus back
    // to the tab that opened it. window.close() only works on tabs
    // that have a window.opener (i.e. were actually opened via a link
    // or window.open from another page) - if someone navigated here
    // directly (no opener, e.g. a bookmark), fall back to the old
    // redirect-to-registration behavior since there's no other tab to
    // return to.
    setTimeout(() => {
      if (window.opener) {
        window.opener.focus?.();
        window.close();
      } else {
        router.push(backHref);
      }
    }, 1200);
  };
  return (
    <div className="min-h-screen bg-[#F8F6F2] px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link
          href={backHref}
          className="text-sm font-medium text-[#182E6E]"
        >
          ← {backLabel}
        </Link>

        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-3xl shadow-lg p-8 md:p-10">
          <h1 className="text-2xl md:text-3xl font-bold text-[#1F2937]">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
          )}

          <div className="mt-8 space-y-8">
            {sections.map((section, index) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold text-[#1F2937]">
                  {index + 1}. {section.heading}
                </h2>

                {section.intro && (
                  <p className="mt-2 text-sm text-gray-600">
                    {section.intro}
                  </p>
                )}

                {section.items && section.items.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-gray-600">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                {section.outro && (
                  <p className="mt-2 text-sm text-gray-600">
                    {section.outro}
                  </p>
                )}
              </section>
            ))}
          </div>

          {onAgree && (
            <div className="mt-10 border-t border-[#E5E7EB] pt-6">
              {agreed ? (
                <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3">
                  You've agreed to these Terms & Conditions. This tab
                  will close automatically - switch back to your
                  registration tab to continue.
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Please read the Terms & Conditions above in full
                    before agreeing.
                  </p>

                  <button
                    type="button"
                    onClick={handleAgree}
                    className="rounded-full bg-[#1E3A8A] hover:bg-[#182E6E] text-white text-sm font-semibold px-8 py-2.5 transition"
                  >
                    I Agree
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
