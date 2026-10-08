import os
import httpx

from app.services.package_cost import (
    PackageCostCalculator
)

CATALOG_SERVICE = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8004")

PROVIDER_SERVICE = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")


class PackageRecommendationService:

    @staticmethod
    async def recommend_packages(
        event_type_id,
        budget,
        guest_count,
        state_id,
        district_id,
        location_id,
        event_date=None
    ):

        recommendations = []

        async with httpx.AsyncClient() as client:

            packages_response = (
                await client.get(
                    f"{CATALOG_SERVICE}/packages"
                )
            )

            packages = (
                packages_response.json()
            )

            for package in packages:

                if (
                    str(
                        package[
                            "event_type_id"
                        ]
                    )
                    != str(event_type_id)
                ):
                    continue

                if not package["active"]:
                    continue

                categories_response = (
                    await client.get(
                        f"{CATALOG_SERVICE}/packages/{package['id']}/categories"
                    )
                )

                categories = (
                    categories_response.json()
                )

                estimated_cost = 0

                breakdown = []

                providers_count = 0

                package_min_budget = float(
                    package.get("min_budget") or 0
                )

                package_max_budget = float(
                    package.get("max_budget") or 0
                )

                package_target_budget = (
                    (package_min_budget + package_max_budget) / 2
                    if package_max_budget
                    else 0
                )

                category_target_budget = (
                    package_target_budget / len(categories)
                    if categories and package_target_budget
                    else None
                )

                for category in categories:

                    provider_params = {
                        "state_id": state_id,
                        "district_id": district_id,
                        "location_id": location_id
                    }

                    if event_date:
                        provider_params["event_date"] = (
                            str(event_date)
                        )

                    providers_response = (
                        await client.get(
                            f"{PROVIDER_SERVICE}/providers/category/{category['category_id']}",
                            params=provider_params
                        )
                    )

                    providers = (
                        providers_response.json()
                    )

                    if not providers:
                        continue

                    candidate_costs = []

                    for provider in providers:

                        for pricing in (
                            provider[
                                "pricing"
                            ]
                        ):

                            cost = (
                                PackageCostCalculator
                                .calculate(
                                    pricing,
                                    guest_count
                                )
                            )

                            candidate_costs.append(cost)

                    selected_cost = (
                        PackageCostCalculator
                        .select_best_cost(
                            candidate_costs,
                            category_target_budget
                        )
                    )

                    if (
                        selected_cost
                        is not None
                    ):

                        estimated_cost += (
                            selected_cost
                        )

                        providers_count += (
                            len(providers)
                        )

                        breakdown.append({
                            "category":
                                category[
                                    "category_name"
                                ],
                            "cost":
                                selected_cost
                        })

                if estimated_cost <= budget:

                    recommendations.append({

                        "package_id":
                            package["id"],

                        "package_name":
                            package["name"],

                        "estimated_cost":
                            estimated_cost,

                        "budget_fit":
                            True,

                        "providers_count":
                            providers_count,

                        "breakdown":
                            breakdown
                    })

        recommendations.sort(
            key=lambda x:
            abs(
                budget -
                x["estimated_cost"]
            )
        )

        return recommendations