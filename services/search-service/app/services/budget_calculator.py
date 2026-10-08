import os
import httpx


PROVIDER_SERVICE_URL = os.getenv("PROVIDER_SERVICE_URL", "http://localhost:8003")


class BudgetCalculatorService:

    @staticmethod
    async def calculate(
        service_ids,
        budget
    ):

        total = 0

        async with httpx.AsyncClient() as client:

            for service_id in service_ids:

                response = await client.get(
                    f"{PROVIDER_SERVICE_URL}/services/{service_id}/price"
                )

                pricing = response.json()

                total += float(
                    pricing["amount"]
                )

        return {
            "budget": budget,
            "total_amount": total,
            "remaining_budget": budget - total,
            "within_budget": total <= budget
        }