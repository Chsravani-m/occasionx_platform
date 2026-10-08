class PackageCostCalculator:

    @staticmethod
    def effective_quantity(
        guest_count,
        pricing
    ):

        quantity = guest_count

        max_quantity = pricing.get("max_quantity")
        min_quantity = pricing.get("min_quantity")

        if max_quantity is not None:
            quantity = min(quantity, max_quantity)

        if min_quantity is not None:
            quantity = max(quantity, min_quantity)

        return quantity

    @staticmethod
    def calculate(
        pricing,
        guest_count: int
    ):

        pricing_type = pricing["pricing_type"]
        amount = float(pricing["amount"])

        if pricing_type == "PER_PLATE":
            return amount * PackageCostCalculator.effective_quantity(
                guest_count,
                pricing
            )

        if pricing_type == "PER_PERSON":
            return amount * PackageCostCalculator.effective_quantity(
                guest_count,
                pricing
            )

        if pricing_type == "FIXED":
            return amount

        if pricing_type == "PACKAGE":
            return amount

        if pricing_type == "HOURLY":
            return amount * 6

        if pricing_type == "PER_DAY":
            return amount

        return amount

    @staticmethod
    def select_best_cost(
        costs,
        target_budget=None
    ):

        if not costs:
            return None

        if not target_budget or target_budget <= 0:
            return min(costs)

        within_budget = [
            cost
            for cost in costs
            if cost <= target_budget
        ]

        if within_budget:
            return max(within_budget)

        return min(costs)