from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies import get_db

from app.schemas.session import (
    CreateSessionRequest,
    SessionStateResponse,
    SendInviteRequest,
    InviteResponse,
    JoinPreviewResponse,
    JoinSessionRequest,
    JoinSessionResponse,
    AddServiceRequest,
    SelectedServiceResponse,
    SendMessageRequest,
    ChatMessageResponse,
    StartScreenShareRequest,
    StopScreenShareRequest,
    SendSignalRequest,
    SignalResponse,
)

from app.crud import session as crud

from app.email_utils import send_session_invite_email
from app.whatsapp_utils import send_session_invite_whatsapp

import os
from dotenv import load_dotenv

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

from app.core.service_auth import current_user, ensure_self_or_admin

router = APIRouter(prefix="/collab", tags=["Collab Sessions"])


def _build_invite_link(token: str) -> str:
    return f"{FRONTEND_URL}/collab/join/{token}"


def _get_session_or_404(db: Session, session_id: UUID):
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


def _get_participant_or_404(db: Session, session, participant_id: UUID):
    participant = next(
        (p for p in session.participants if p.id == participant_id), None
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    return participant


@router.post("/sessions", response_model=SessionStateResponse)
def create_session(payload: CreateSessionRequest, db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    # The host is whoever is logged in - not just whoever names them.
    ensure_self_or_admin(user, payload.host_user_id)
    session = crud.create_session(
        db,
        host_user_id=payload.host_user_id,
        host_name=payload.host_name,
        title=payload.title,
    )
    return session


@router.get("/sessions/{session_id}", response_model=SessionStateResponse)
def get_session(session_id: UUID, db: Session = Depends(get_db)):
    return _get_session_or_404(db, session_id)


@router.post("/sessions/{session_id}/invites", response_model=InviteResponse)
def send_invite(
    session_id: UUID,
    payload: SendInviteRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    # The host is whoever is logged in - not just whoever names them.
    ensure_self_or_admin(user, payload.host_user_id)
    session = _get_session_or_404(db, session_id)

    if session.host_user_id != payload.host_user_id:
        raise HTTPException(
            status_code=403, detail="Only the host can invite participants"
        )

    if session.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Session is closed")

    if payload.channel not in ("EMAIL", "WHATSAPP"):
        raise HTTPException(
            status_code=400, detail="channel must be EMAIL or WHATSAPP"
        )

    if crud.count_active_guest_slots(session) >= session.max_guests:
        raise HTTPException(
            status_code=400,
            detail=f"This session already has the maximum of "
            f"{session.max_guests} invited guests",
        )

    participant = crud.create_invite(
        db,
        session=session,
        contact=payload.contact,
        channel=payload.channel,
        guest_name=payload.guest_name,
    )

    invite_link = _build_invite_link(participant.invite_token)

    if payload.channel == "EMAIL":
        delivered = send_session_invite_email(
            to_email=payload.contact,
            host_name=session.host_name,
            invite_link=invite_link,
            title=session.title,
        )
    else:
        delivered = send_session_invite_whatsapp(
            phone=payload.contact,
            host_name=session.host_name,
            invite_link=invite_link,
        )

    return InviteResponse(
        participant_id=participant.id,
        invite_token=participant.invite_token,
        invite_link=invite_link,
        delivered=delivered,
    )


@router.get(
    "/sessions/invites/{token}", response_model=JoinPreviewResponse
)
def preview_invite(token: str, db: Session = Depends(get_db)):
    participant = crud.get_participant_by_token(db, token)
    if not participant:
        raise HTTPException(status_code=404, detail="Invite link not found")

    session = crud.get_session(db, participant.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return JoinPreviewResponse(
        session_id=session.id,
        host_name=session.host_name,
        title=session.title,
        guest_name=participant.display_name,
        already_joined=participant.joined_at is not None,
        session_closed=session.status != "ACTIVE",
    )


@router.post(
    "/sessions/invites/{token}/join", response_model=JoinSessionResponse
)
def join_via_invite(
    token: str, payload: JoinSessionRequest, db: Session = Depends(get_db)
):
    participant = crud.get_participant_by_token(db, token)
    if not participant:
        raise HTTPException(status_code=404, detail="Invite link not found")

    session = crud.get_session(db, participant.session_id)
    if not session or session.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Session is no longer active")

    participant = crud.join_session(
        db,
        participant=participant,
        display_name=payload.display_name,
        user_id=payload.user_id,
    )

    return JoinSessionResponse(
        session_id=session.id, participant_id=participant.id
    )


@router.post(
    "/sessions/{session_id}/services", response_model=SelectedServiceResponse
)
def add_service(
    session_id: UUID,
    payload: AddServiceRequest,
    db: Session = Depends(get_db),
):
    session = _get_session_or_404(db, session_id)
    participant = _get_participant_or_404(db, session, payload.participant_id)

    return crud.add_selected_service(
        db,
        session_id=session_id,
        participant=participant,
        provider_id=payload.provider_id,
        provider_name=payload.provider_name,
        category_name=payload.category_name,
        service_id=payload.service_id,
    )


@router.delete("/sessions/{session_id}/services/{item_id}")
def remove_service(
    session_id: UUID, item_id: UUID, db: Session = Depends(get_db)
):
    removed = crud.remove_selected_service(db, session_id, item_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Removed"}


@router.post(
    "/sessions/{session_id}/messages", response_model=ChatMessageResponse
)
def send_message(
    session_id: UUID,
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
):
    session = _get_session_or_404(db, session_id)
    participant = _get_participant_or_404(db, session, payload.participant_id)

    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    return crud.add_message(
        db, session_id=session_id, participant=participant, message=payload.message
    )


@router.post("/sessions/{session_id}/close", response_model=SessionStateResponse)
def close_session(
    session_id: UUID, host_user_id: UUID, db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    # The host is whoever is logged in - not just whoever names them.
    ensure_self_or_admin(user, host_user_id)
    session = _get_session_or_404(db, session_id)
    if session.host_user_id != host_user_id:
        raise HTTPException(
            status_code=403, detail="Only the host can close this session"
        )
    return crud.close_session(db, session)


# --- Live screen sharing (web app only) -----------------------------
#
# The actual video never passes through this backend - these endpoints
# only carry the WebRTC handshake (who's sharing, and the SDP/ICE
# messages needed to set up a direct peer-to-peer connection between
# the host's browser and each guest's). is_screen_sharing/
# sharing_participant_id ride along in the normal 4s session-state
# poll everyone already has; /signals is polled separately, faster
# (~1.5s), only while a share is actually active.


@router.post(
    "/sessions/{session_id}/screen-share/start",
    response_model=SessionStateResponse,
)
def start_screen_share(
    session_id: UUID,
    payload: StartScreenShareRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    # The host is whoever is logged in - not just whoever names them.
    ensure_self_or_admin(user, payload.host_user_id)
    session = _get_session_or_404(db, session_id)
    if session.host_user_id != payload.host_user_id:
        raise HTTPException(
            status_code=403, detail="Only the host can share their screen"
        )
    if session.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Session is closed")

    host_participant = next(
        (p for p in session.participants if p.role == "HOST"), None
    )
    if not host_participant:
        raise HTTPException(status_code=404, detail="Host participant not found")

    return crud.start_screen_share(db, session, host_participant.id)


@router.post(
    "/sessions/{session_id}/screen-share/stop",
    response_model=SessionStateResponse,
)
def stop_screen_share(
    session_id: UUID,
    payload: StopScreenShareRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(current_user)
):
    # The host is whoever is logged in - not just whoever names them.
    ensure_self_or_admin(user, payload.host_user_id)
    session = _get_session_or_404(db, session_id)
    if session.host_user_id != payload.host_user_id:
        raise HTTPException(
            status_code=403, detail="Only the host can stop their screen share"
        )
    return crud.stop_screen_share(db, session)


@router.post("/sessions/{session_id}/signals", response_model=SignalResponse)
def send_signal(
    session_id: UUID,
    payload: SendSignalRequest,
    db: Session = Depends(get_db),
):
    session = _get_session_or_404(db, session_id)
    _get_participant_or_404(db, session, payload.from_participant_id)
    _get_participant_or_404(db, session, payload.to_participant_id)

    return crud.create_signal(
        db,
        session_id=session_id,
        from_participant_id=payload.from_participant_id,
        to_participant_id=payload.to_participant_id,
        signal_type=payload.signal_type,
        payload=payload.payload,
    )


@router.get(
    "/sessions/{session_id}/signals", response_model=list[SignalResponse]
)
def get_signals(
    session_id: UUID,
    participant_id: UUID = Query(...),
    since: datetime | None = Query(None),
    db: Session = Depends(get_db),
):
    session = _get_session_or_404(db, session_id)
    _get_participant_or_404(db, session, participant_id)

    return crud.get_signals_for(db, session_id, participant_id, since)
