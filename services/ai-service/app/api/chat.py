from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chatbot import ChatbotService

router = APIRouter(
    prefix="/ai",
    tags=["Chatbot"],
)


@router.post(
    "/chat",
    response_model=ChatResponse,
)
def chat(payload: ChatRequest):
    available, reply, used_tool = ChatbotService.chat(payload)

    return ChatResponse(
        available=available,
        reply=reply,
        used_tool=used_tool,
    )
