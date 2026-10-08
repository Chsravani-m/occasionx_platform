PER_UNIT_PRICING_TYPES = ("PER_PLATE", "PER_PERSON")


def effective_starting_price(pricing_rows):
    """
    Compute the real minimum order value across a set of Pricing rows.

    For PER_PLATE / PER_PERSON pricing, the true minimum a customer can
    actually book is amount * min_quantity (if the provider set one) -
    not the bare per-unit rate. Flat/fixed pricing types are used as-is.
    """

    effective_amounts = []

    for pricing in pricing_rows:
        amount = float(pricing.amount)

        if (
            pricing.pricing_type in PER_UNIT_PRICING_TYPES
            and pricing.min_quantity is not None
        ):
            amount = amount * float(pricing.min_quantity)

        effective_amounts.append(amount)

    if not effective_amounts:
        return None

    return min(effective_amounts)
