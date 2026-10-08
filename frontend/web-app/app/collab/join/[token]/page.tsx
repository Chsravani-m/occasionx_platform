import { CollabJoinPage } from "@/screens/CollabJoinPage";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CollabJoinPage token={token} />;
}
