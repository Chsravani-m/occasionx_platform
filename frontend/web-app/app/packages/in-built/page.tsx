import { PackagesTabsPage } from "@/screens/PackagesTabsPage";

interface Props {
  searchParams: Promise<{
    event?: string;
  }>;
}

export default async function Page({ searchParams }: Props) {
  const query = await searchParams;

  return (
    <PackagesTabsPage
      defaultTab="in-built"
      initialEventTypeSlug={query.event}
    />
  );
}
