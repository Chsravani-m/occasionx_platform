import { Suspense } from "react";
import { CollabSessionPage } from "@/screens/CollabSessionPage";

export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  // CollabSessionPage reads ?participant=/?name=/?compact=1 via
  // useSearchParams (for the mobile app's embedded WebView viewer),
  // which Next.js requires to sit under a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CollabSessionPage sessionId={sessionId} />
    </Suspense>
  );
}
