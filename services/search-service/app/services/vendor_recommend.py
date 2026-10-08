"""
Ranks the best real providers for a single category within (optionally)
a budget - used by the "Recommend vendors" action on Build Your Own
Package / AI + Custom, and by the chatbot when a user asks something
like "who are the best caterers under my budget?". Unlike
AutoPackageBuilder, this only ever looks at one category at a time and
returns several ranked options instead of picking a single winner.
"""

import os
import httpx

from app.services.package_cost import PackageCostCalculator

PROVIDER_SERVICE = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")


class VendorRecommendService:

    @staticmethod
    async def recommend(
        category_id,
        guest_count,
        state_id,
        district_id,
        location_id,
        category_name=None,
        budget=None,
        event_date=None,
        limit=5,
    ):
        service_params = {
            "state": state_id,
            "district": district_id,
            "location": location_id,
        }

        if event_date:
            service_params["date"] = str(event_date)

        async with httpx.AsyncClient() as client:
            services_response = await client.get(
                f"{PROVIDER_SERVICE}/search/category/"
                f"{category_id}/services",
                params=service_params,
            )

            services = services_response.json()

        if not services:
            return {
                "available": False,
                "message": (
                    "No providers are available in this category for "
                    "the selected location and date yet."
                ),
                "category_id": category_id,
                "category_name": category_name,
                "budget": budget,
                "total_options": 0,
                "recommendations": [],
            }

        scored = []

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

            within_budget = (
                budget is None or budget <= 0 or cost <= budget
            )

            scored.append(
                {
                    **service,
                    "estimated_cost": cost,
                    "within_budget": within_budget,
                }
            )

        # Best options first: within-budget beats over-budget, then
        # highest rating, then cheapest - so a highly-rated affordable
        # provider always outranks a cheaper-but-unrated one.
        scored.sort(
            key=lambda item: (
                0 if item["within_budget"] else 1,
                -item.get("rating", 0),
                item["estimated_cost"],
            )
        )

        top = scored[: max(limit, 1)]

        return {
            "available": True,
            "message": None,
            "category_id": category_id,
            "category_name": category_name,
            "budget": budget,
            "total_options": len(services),
            "recommendations": top,
        }
