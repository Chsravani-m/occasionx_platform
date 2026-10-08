"use client";

import ProviderCard, {
  ProviderCardModel,
} from "./ProviderCard";

import SearchSkeleton from "./SearchSkeleton";
import EmptyState from "./EmptyState";

interface Props {
  providers: ProviderCardModel[];

  loading: boolean;

  categoryMap?: Record<string, string>;
}

export default function SearchResultsGrid({
  providers,
  loading,
  categoryMap = {},
}: Props) {

  if (loading) {
    return <SearchSkeleton />;
  }

  if (providers.length === 0) {
    return <EmptyState />;
  }

  return (

    <div
      className="
      grid
      grid-cols-1
      md:grid-cols-2
      xl:grid-cols-3
      gap-8
    "
    >

      {providers.map((provider) => (

        <ProviderCard
          key={provider.id}
          provider={{
            ...provider,

            category_name:
              provider.category_id
                ? categoryMap[
                    provider.category_id
                  ]
                : undefined,
          }}
        />

      ))}

    </div>

  );

}