"""
Answers "what will this budget realistically get me?" for an event
type, WITHOUT locking in specific providers - unlike AutoPackageBuilder
(auto_package.py), which picks one real provider per category to
assemble a bookable package, this only previews a per-category cost
range using real, currently-available provider data. It's meant to be
cheap to call repeatedly (e.g. from the chatbot, or before a customer
commits to Build Your Own Package / AI + Custom).
"""

import os
import httpx

from app.services.package_cost import PackageCostCalculator

CATALOG_SERVICE = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8004")
PROVIDER_SERVICE = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")


class BudgetEstimateService:

    @staticmethod
    async def estimate(
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
                    "event type yet, so we can't estimate a budget "
                    "breakdown for it."
                ),
                "budget": budget,
                "total_estimated_cost": 0,
                "within_budget": True,
                "remaining_budget": budget,
                "categories_count": 0,
                "breakdown": [],
            }

        category_target_budget = budget / len(categories)

        breakdown = []
        total_estimated_cost = 0.0

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
                    breakdown.append(
                        {
                            "category_id": category["id"],
                            "category_name": category["name"],
                            "estimated_cost": 0,
                            "provider_count": 0,
                            "min_price": None,
                            "max_price": None,
                            "note": "No providers available yet",
                        }
                    )
                    continue

                costs = [
                    PackageCostCalculator.calculate(
                        {
                            "pricing_type": service.get("pricing_type"),
                            "amount": service.get("price") or 0,
                            "min_quantity": service.get("min_quantity"),
                            "max_quantity": service.get("max_quantity"),
                        },
                        guest_count,
                    )
                    for service in services
                ]

                representative_cost = (
                    PackageCostCalculator.select_best_cost(
                        costs, category_target_budget
                    )
                )

                breakdown.append(
                    {
                        "category_id": category["id"],
                        "category_name": category["name"],
                        "estimated_cost": representative_cost,
                        "provider_count": len(services),
                        "min_price": min(costs),
                        "max_price": max(costs),
                        "note": None,
                    }
                )

                total_estimated_cost += representative_cost

        return {
            "available": True,
            "message": None,
            "budget": budget,
            "total_estimated_cost": total_estimated_cost,
            "within_budget": total_estimated_cost <= budget,
            "remaining_budget": budget - total_estimated_cost,
            "categories_count": len(categories),
            "breakdown": breakdown,
        }
