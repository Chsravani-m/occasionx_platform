import ProviderDetailsPage from "@/screens/ProviderDetailsPage";

interface Props {
  params: Promise<{
    providerId: string;
  }>;
}

export default async function Page({
  params,
}: Props) {
  const { providerId } = await params;

  return (
    <ProviderDetailsPage
      providerId={providerId}
    />
  );
}