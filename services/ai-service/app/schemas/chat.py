from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

    # Optional planning context - if the user already picked an event
    # type / budget / location on the page they're chatting from, pass
    # it along so the bot can answer budget/vendor questions without
    # re-asking. Any of these may be missing; the bot will ask for
    # what it needs.
    event_type_id: str | None = None
    event_type_name: str | None = None
    budget: float | None = None
    guest_count: int | None = None
    state_id: int | None = None
    district_id: int | None = None
    location_id: int | None = None
    event_date: str | None = None
    category_id: str | None = None
    category_name: str | None = None


class ChatResponse(BaseModel):
    available: bool
    reply: str
    used_tool: str | None = None
