"use client";

import TermsDocument from "@/components/legal/TermsDocument";
import { PROVIDER_TERMS_SECTIONS } from "@/components/legal/providerTermsContent";
import {
  acceptProviderTerms,
  hasAcceptedProviderTerms,
} from "@/utils/terms";

export default function ProviderTermsPage() {
  return (
    <TermsDocument
      title="Service Provider Registration Terms & Conditions"
      backHref="/provider/register"
      backLabel="Back to Provider Registration"
      sections={PROVIDER_TERMS_SECTIONS}
      onAgree={acceptProviderTerms}
      checkAlreadyAgreed={hasAcceptedProviderTerms}
    />
  );
}
