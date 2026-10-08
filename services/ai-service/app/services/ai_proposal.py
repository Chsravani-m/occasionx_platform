"""
Turns the *already-computed, real* recommendation numbers (estimated
cost, category breakdown, budget, guest count - all sourced from the
catalog/provider databases by search-service's PackageRecommendationService)
into a written proposal and budget rationale via an LLM (OpenAI).

This lives in its own ai-service (rather than search-service) so AI
features can be added, swapped, or scaled independently of the
deterministic recommend/booking logic.

Important boundary: the AI is only ever given numbers we already
trust and computed elsewhere. It is never asked to invent vendor
names, prices, or availability - that stays 100% deterministic in
search-service. This service's only job is to narrate/explain real
data in plain language.

Requires OPENAI_API_KEY to be set in this service's environment.
If it isn't set, generate_proposal() returns available=False with a
friendly fallback message instead of raising - callers keep working
without AI, this is purely additive.
"""

import os

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

FALLBACK_MESSAGE = (
    "AI-written proposals aren't turned on yet for this deployment. "
    "Ask an admin to set OPENAI_API_KEY on the ai-service to "
    "enable this."
)


class AIProposalService:

    @staticmethod
    def _client():
        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            return None

        try:
            import openai
        except ImportError:
            return None

        return openai.OpenAI(api_key=api_key)

    @staticmethod
    def _build_prompt(payload) -> str:
        breakdown_lines = "\n".join(
            f"- {item.category}: Rs.{item.cost:,.0f}"
            for item in payload.breakdown
        ) or "- (no category breakdown available)"

        extra = []

        if payload.location_label:
            extra.append(f"Location: {payload.location_label}")

        if payload.event_date:
            extra.append(f"Event date: {payload.event_date}")

        extra_lines = ("\n" + "\n".join(extra)) if extra else ""

        return f"""You are writing a short, warm package proposal for a
customer planning an event through OccasionX, an event-planning
marketplace. Use ONLY the facts given below - do not invent vendor
names, exact prices, or availability beyond what's listed.

Event type: {payload.event_type_name}
Package: {payload.package_name}
Guest count: {payload.guest_count}
Customer's budget: Rs.{payload.budget:,.0f}
Estimated cost for this package: Rs.{payload.estimated_cost:,.0f}{extra_lines}

Category cost breakdown:
{breakdown_lines}

Write:
1. A short 2-3 sentence proposal summary explaining why this package
   fits their event and budget.
2. A brief budget rationale - comment on how the spend is allocated
   across categories (using the real numbers above) and whether it
   leaves room to spare or is tight against their budget.

Keep it under 120 words total, plain text, no markdown headers."""

    @staticmethod
    def generate_proposal(payload) -> tuple[bool, str]:
        client = AIProposalService._client()

        if client is None:
            return False, FALLBACK_MESSAGE

        try:
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                max_tokens=400,
                messages=[
                    {
                        "role": "user",
                        "content": AIProposalService._build_prompt(payload),
                    }
                ],
            )

            text = (response.choices[0].message.content or "").strip()

            if not text:
                return False, FALLBACK_MESSAGE

            return True, text
        except Exception as exc:
            return False, f"Couldn't generate an AI proposal right now ({exc})."
