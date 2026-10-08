"""
Builds a genuinely custom package from real, currently-available
providers - unlike PackageRecommendationService (package_recommendation.py),
this does NOT match against an admin-created catalog Package row. It
uses the event type's *default categories* (catalog-service
EventTypeCategory mapping - the same defaults used to seed admin
packages) and picks the best real provider per category within the
customer's budget, using the same PackageCostCalculator logic already
trusted elsewhere in this service.

This is what powers the "AI + Custom Packages" tab: the customer gets
a package assembled just for them, from real bookable services, not a
pre-named template - the AI layer (ai-service) only narrates the
resulting numbers afterward, it never touches this selection logic.
"""

import os
import httpx

from app.services.package_cost import PackageCostCalculator

CATALOG_SERVICE = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8004")
PROVIDER_SERVICE = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")


class AutoPackageBuilder:

    @staticmethod
    def _select_best_service(candidates, target_budget):
        """
        candidates: list of (service_dict, cost) tuples.
        Same rule as PackageCostCalculator.select_best_cost, but keeps
        hold of which service produced the winning cost so it can be
        included in the response (and later booked as-is).
        """

        if not candidates:
            return None

        if not target_budget or target_budget <= 0:
            return min(candidates, key=lambda pair: pair[1])

        within_budget = [
            pair for pair in candidates if pair[1] <= target_budget
        ]

        if within_budget:
            return max(within_budget, key=lambda pair: pair[1])

        return min(candidates, key=lambda pair: pair[1])

    @staticmethod
    async def build(
        event_type_id,
        budget,
        guest_count,
        state_id,
        district_id,
        location_id,
        event_date=None,
    ):
        async with httpx.AsyncClient() as client:
            categories_response = await client.get(
                f"{CATALOG_SERVICE}/event-types/{event_type_id}/categories"
            )

            categories = categories_response.json()

        if not categories:
            return {
                "available": False,
                "message": (
                    "No default categories are configured for this "
                    "event type yet - try Build Your Own Package "
                    "instead, or an in-built package if one exists."
                ),
                "estimated_cost": 0,
                "providers_count": 0,
                "breakdown": [],
                "services": [],
            }

        category_target_budget = (
            budget / len(categories) if categories else None
        )

        chosen_services = []
        breakdown = []
        estimated_cost = 0.0

        async with httpx.AsyncClient() as client:
            for category in categories:
                service_params = {
                    "state": state_id,
                    "district": district_id,
                    "location": location_id,
                }

                if event_date:
                    service_params["date"] = str(event_date)

                services_response = await client.get(
                    f"{PROVIDER_SERVICE}/search/category/"
                    f"{category['id']}/services",
                    params=service_params,
                )

                services = services_response.json()

                if not services:
                    continue

                candidates = []

                for service in services:
                    cost = PackageCostCalculator.calculate(
                        {
                            "pricing_type": service.get("pricing_type"),
                            "amount": service.get("price") or 0,
                            "min_quantity": service.get("min_quantity"),
                            "max_quantity": service.get("max_quantity"),
                        },
                        guest_count,
                    )

                    candidates.append((service, cost))

                best = AutoPackageBuilder._select_best_service(
                    candidates, category_target_budget
                )

                if best is None:
                    continue

                service, cost = best

                chosen_services.append(
                    {
                        **service,
                        "category_id": category["id"],
                        "category_name": category["name"],
                    }
                )

                breakdown.append(
                    {
                        "category": category["name"],
                        "cost": cost,
                    }
                )

                estimated_cost += cost

        if not chosen_services:
            return {
                "available": False,
                "message": (
                    "No providers are available for this event type "
                    "at the selected location and date yet - try a "
                    "different location or Build Your Own Package."
                ),
                "estimated_cost": 0,
                "providers_count": 0,
                "breakdown": [],
                "services": [],
            }

        return {
            "available": True,
            "message": None,
            "estimated_cost": estimated_cost,
            "providers_count": len(chosen_services),
            "breakdown": breakdown,
            "services": chosen_services,
        }
