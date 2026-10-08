// Tracks whether the customer/provider has clicked "I Agree" at the
// bottom of the full Terms & Conditions document (see
// src/components/legal/TermsDocument.tsx). Deliberately not a
// pre-submit checkbox - the requirement is that people actually open
// and scroll the document, then explicitly agree there, rather than
// ticking a box next to a link they may never have opened.
//
// Registration forms open the terms in a new tab (target="_blank") so
// the in-progress form isn't lost, then pick up the acceptance via
// the "storage" event once the user clicks "I Agree" in that tab and
// switches back.
//
// The acceptance is normally cleared once registration succeeds (see
// RegisterPage/ProviderOnboardingPage), but if someone agrees and then
// abandons the form entirely - closes the tab, comes back days later -
// there'd be nothing to clear it, and a brand new visit to /register
// would incorrectly show "already agreed" forever. To avoid that, the
// stored value is a timestamp rather than a bare flag, and it's only
// honored for a short window after agreeing - long enough to cover the
// terms-tab-redirects-back-to-register flow, not long enough to survive
// someone returning another day.
const ACCEPTANCE_TTL_MS = 60 * 60 * 1000; // 1 hour

const USER_TERMS_KEY = "ox_terms_accepted_user";
const PROVIDER_TERMS_KEY = "ox_terms_accepted_provider";

function isAccepted(key: string): boolean {
  if (typeof window === "undefined") return false;

  const raw = localStorage.getItem(key);
  if (!raw) return false;

  const acceptedAt = Number(raw);
  if (!acceptedAt || Date.now() - acceptedAt > ACCEPTANCE_TTL_MS) {
    localStorage.removeItem(key);
    return false;
  }

  return true;
}

export function hasAcceptedUserTerms(): boolean {
  return isAccepted(USER_TERMS_KEY);
}

export function acceptUserTerms() {
  localStorage.setItem(USER_TERMS_KEY, String(Date.now()));
}

export function clearUserTermsAcceptance() {
  localStorage.removeItem(USER_TERMS_KEY);
}

export function hasAcceptedProviderTerms(): boolean {
  return isAccepted(PROVIDER_TERMS_KEY);
}

export function acceptProviderTerms() {
  localStorage.setItem(PROVIDER_TERMS_KEY, String(Date.now()));
}

export function clearProviderTermsAcceptance() {
  localStorage.removeItem(PROVIDER_TERMS_KEY);
}
