import { PackageBuilderPage } from "@/screens/PackageBuilderPage";

interface Props {
  params: Promise<{
    packageId: string;
  }>;
  searchParams: Promise<{
    state?: string;
    district?: string;
    location?: string;
    budget?: string;
    eventType?: string;
    guestCount?: string;
    packageName?: string;
    eventDate?: string;
  }>;
}

export default async function Page({
  params,
  searchParams,
}: Props) {
  const { packageId } = await params;
  const query = await searchParams;

  return (
    <PackageBuilderPage
      packageId={packageId}
      budget={Number(query.budget) || 0}
      stateId={Number(query.state) || 0}
      districtId={Number(query.district) || 0}
      locationId={Number(query.location) || 0}
      guestCount={Number(query.guestCount) || 0}
      packageName={query.packageName || ""}
      eventDate={query.eventDate || ""}
    />
  );
}