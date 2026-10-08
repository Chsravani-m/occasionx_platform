"""
General-purpose OccasionX chatbot: answers plain questions about how
the platform works (booking, payments, packages, providers, etc.) AND
can pull real, database-backed numbers for the user's *current*
planning context via two tool calls into search-service:

- get_budget_estimate: per-category cost breakdown for the event
  type/budget/guest-count/location already selected on the page the
  user is chatting from.
- get_vendor_recommendations: ranked real providers for the category
  already selected on that page.

Same trust boundary as AIProposalService: the model is only ever
given numbers this service already fetched from search-service. It
never invents vendor names, prices, or costs - if the page hasn't
given us enough context (no event type/budget/location picked yet,
or no category selected), the matching tool simply isn't offered to
the model, and it says so instead of guessing.
"""

import json
import os

import httpx

SEARCH_SERVICE = os.getenv("SEARCH_SERVICE_URL", "http://localhost:8006")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

FALLBACK_MESSAGE = (
    "The OccasionX assistant isn't turned on yet for this deployment. "
    "Ask an admin to set OPENAI_API_KEY on the ai-service to enable it."
)

SYSTEM_PROMPT = """You are the OccasionX assistant, embedded in an
event-planning marketplace app. You help customers understand how the
platform works (browsing categories, building a package, booking,
payments, cancellations, provider ratings, etc.) and, when tools are
available, answer budget and vendor questions using REAL numbers only
- never invent prices, vendor names, or availability.

If a tool isn't available to you right now, it means the user hasn't
picked an event type/budget/location (for budget questions) or a
service category (for vendor questions) on the page yet - tell them
what to pick first instead of guessing numbers.

Keep replies short and conversational (2-4 sentences unless listing
vendor options), plain text, no markdown headers."""


class ChatbotService:

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
    def _fetch_budget_estimate(payload):
        body = {
            "event_type_id": payload.event_type_id,
            "budget": payload.budget,
            "guest_count": payload.guest_count,
            "state_id": payload.state_id,
            "district_id": payload.district_id,
            "location_id": payload.location_id,
        }

        if payload.event_date:
            body["event_date"] = payload.event_date

        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                f"{SEARCH_SERVICE}/budget/estimate", json=body
            )

            return response.json()

    @staticmethod
    def _fetch_vendor_recommendations(payload, limit=5):
        body = {
            "category_id": payload.category_id,
            "category_name": payload.category_name,
            "guest_count": payload.guest_count,
            "state_id": payload.state_id,
            "district_id": payload.district_id,
            "location_id": payload.location_id,
            "limit": limit,
        }

        if payload.budget:
            body["budget"] = payload.budget

        if payload.event_date:
            body["event_date"] = payload.event_date

        with httpx.Client(timeout=15.0) as client:
            response = client.post(
                f"{SEARCH_SERVICE}/vendor/recommend", json=body
            )

            return response.json()

    @staticmethod
    def _available_tools(payload):
        tools = []

        has_budget_context = all(
            [
                payload.event_type_id,
                payload.budget,
                payload.guest_count,
                payload.state_id,
                payload.district_id,
                payload.location_id,
            ]
        )

        if has_budget_context:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "get_budget_estimate",
                        "description": (
                            "Get a real, database-backed per-category "
                            "cost breakdown for the user's currently "
                            "selected event type, budget, guest count "
                            "and location."
                        ),
                        "parameters": {
                            "type": "object",
                            "properties": {},
                        },
                    },
                }
            )

        has_vendor_context = all(
            [
                payload.category_id,
                payload.guest_count,
                payload.state_id,
                payload.district_id,
                payload.location_id,
            ]
        )

        if has_vendor_context:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "get_vendor_recommendations",
                        "description": (
                            "Get real, ranked vendor/provider "
                            "recommendations for the user's currently "
                            "selected service category, budget, guest "
                            "count and location."
                        ),
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "limit": {
                                    "type": "integer",
                                    "description": (
                                        "How many vendors to return "
                                        "(default 5)."
                                    ),
                                }
                            },
                        },
                    },
                }
            )

        return tools

    @staticmethod
    def _run_tool(name, args, payload):
        if name == "get_budget_estimate":
            return ChatbotService._fetch_budget_estimate(payload)

        if name == "get_vendor_recommendations":
            limit = args.get("limit") or 5
            return ChatbotService._fetch_vendor_recommendations(
                payload, limit
            )

        return {"error": f"Unknown tool {name}"}

    @staticmethod
    def chat(payload) -> tuple[bool, str, str | None]:
        client = ChatbotService._client()

        if client is None:
            return False, FALLBACK_MESSAGE, None

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        for turn in payload.history[-10:]:
            messages.append({"role": turn.role, "content": turn.content})

        messages.append({"role": "user", "content": payload.message})

        tools = ChatbotService._available_tools(payload)
        used_tool = None

        try:
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                max_tokens=500,
                messages=messages,
                tools=tools or None,
            )

            choice = response.choices[0].message

            if choice.tool_calls:
                messages.append(choice)

                for tool_call in choice.tool_calls:
                    try:
                        args = json.loads(
                            tool_call.function.arguments or "{}"
                        )
                    except ValueError:
                        args = {}

                    result = ChatbotService._run_tool(
                        tool_call.function.name, args, payload
                    )

                    used_tool = tool_call.function.name

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(result),
                        }
                    )

                follow_up = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    max_tokens=500,
                    messages=messages,
                )

                text = (
                    follow_up.choices[0].message.content or ""
                ).strip()
            else:
                text = (choice.content or "").strip()

            if not text:
                return False, FALLBACK_MESSAGE, used_tool

            return True, text, used_tool
        except Exception as exc:
            return (
                False,
                f"Couldn't reach the assistant right now ({exc}).",
                used_tool,
            )
