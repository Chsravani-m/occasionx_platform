import os
import httpx

PROVIDER_SERVICE_URL = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")
CATALOG_SERVICE_URL = os.getenv("CATALOG_SERVICE_URL", "http://localhost:8004")


class ProviderSelectionService:

    @staticmethod
    async def get_providers_for_package(
        package_id,
        state_id,
        district_id,
        location_id,
        event_date=None
    ):

        async with httpx.AsyncClient() as client:

            categories_response = await client.get(
                f"{CATALOG_SERVICE_URL}/packages/{package_id}/categories"
            )

            categories = categories_response.json()

        result = []

        async with httpx.AsyncClient() as client:

            for category in categories:

                service_params = {
                    "state": state_id,
                    "district": district_id,
                    "location": location_id
                }

                if event_date:
                    service_params["date"] = str(event_date)

                provider_response = await client.get(
                    f"{PROVIDER_SERVICE_URL}/search/category/{category['category_id']}/services",
                    params=service_params
                )

                providers = provider_response.json()

                providers.sort(
                    key=lambda x: x.get("rating", 0),
                    reverse=True
                )

                result.append({
                    "category_id": category["category_id"],
                    "category_name": category.get("category_name"),
                    "required": category["required"],
                    "providers": providers[:10]
                })

        return result