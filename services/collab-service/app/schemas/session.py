from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    host_user_id: UUID
    host_name: str
    title: str | None = None


class ParticipantResponse(BaseModel):
    id: UUID
    user_id: UUID | None = None
    display_name: str
    role: str
    contact: str | None = None
    channel: str | None = None
    joined_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class SelectedServiceResponse(BaseModel):
    id: UUID
    provider_id: UUID
    provider_name: str | None = None
    category_name: str | None = None
    service_id: UUID | None = None
    added_by_name: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: UUID
    sender_name: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class SessionStateResponse(BaseModel):
    id: UUID
    host_user_id: UUID
    host_name: str
    title: str | None = None
    status: str
    max_guests: int
    created_at: datetime
    is_screen_sharing: bool = False
    sharing_participant_id: UUID | None = None
    participants: list[ParticipantResponse] = []
    selected_services: list[SelectedServiceResponse] = []
    messages: list[ChatMessageResponse] = []

    class Config:
        from_attributes = True


class SendInviteRequest(BaseModel):
    host_user_id: UUID
    contact: str
    channel: str  # "EMAIL" or "WHATSAPP"
    guest_name: str | None = None


class InviteResponse(BaseModel):
    participant_id: UUID
    invite_token: str
    invite_link: str
    delivered: bool


class JoinPreviewResponse(BaseModel):
    session_id: UUID
    host_name: str
    title: str | None = None
    guest_name: str | None = None
    already_joined: bool
    session_closed: bool


class JoinSessionRequest(BaseModel):
    display_name: str | None = None
    user_id: UUID | None = None


class JoinSessionResponse(BaseModel):
    session_id: UUID
    participant_id: UUID


class AddServiceRequest(BaseModel):
    participant_id: UUID
    provider_id: UUID
    provider_name: str | None = None
    category_name: str | None = None
    service_id: UUID | None = None


class SendMessageRequest(BaseModel):
    participant_id: UUID
    message: str


class StartScreenShareRequest(BaseModel):
    host_user_id: UUID


class StopScreenShareRequest(BaseModel):
    host_user_id: UUID


class SendSignalRequest(BaseModel):
    from_participant_id: UUID
    to_participant_id: UUID
    # OFFER / ANSWER / ICE_CANDIDATE / REQUEST_OFFER
    signal_type: str
    # JSON-encoded RTCSessionDescriptionInit or RTCIceCandidateInit -
    # kept as an opaque string here, the frontend is the only thing
    # that needs to understand its shape.
    payload: str | None = None


class SignalResponse(BaseModel):
    id: UUID
    from_participant_id: UUID
    to_participant_id: UUID
    signal_type: str
    payload: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
