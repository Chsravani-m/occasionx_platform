"use client";

import TermsDocument from "@/components/legal/TermsDocument";
import { USER_TERMS_SECTIONS } from "@/components/legal/userTermsContent";
import { acceptUserTerms, hasAcceptedUserTerms } from "@/utils/terms";

export default function CustomerTermsPage() {
  return (
    <TermsDocument
      title="User Registration Terms & Conditions"
      backHref="/register"
      backLabel="Back to Registration"
      sections={USER_TERMS_SECTIONS}
      onAgree={acceptUserTerms}
      checkAlreadyAgreed={hasAcceptedUserTerms}
    />
  );
}
