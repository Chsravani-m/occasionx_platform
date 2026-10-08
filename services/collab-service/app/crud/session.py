import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.db.models.session import (
    CollabSession,
    SessionParticipant,
    SelectedService,
    ChatMessage,
    WebRTCSignal,
)


def create_session(
    db: Session,
    host_user_id: UUID,
    host_name: str,
    title: str | None,
) -> CollabSession:
    session = CollabSession(
        host_user_id=host_user_id,
        host_name=host_name,
        title=title,
    )
    db.add(session)
    db.flush()

    host_participant = SessionParticipant(
        session_id=session.id,
        user_id=host_user_id,
        display_name=host_name,
        role="HOST",
        joined_at=datetime.now(timezone.utc),
    )
    db.add(host_participant)

    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: UUID) -> CollabSession | None:
    return (
        db.query(CollabSession)
        .options(
            joinedload(CollabSession.participants),
            joinedload(CollabSession.selected_services),
            joinedload(CollabSession.messages),
        )
        .filter(CollabSession.id == session_id)
        .first()
    )


def count_active_guest_slots(session: CollabSession) -> int:
    """Guests already invited (pending or joined) - each one consumes
    a slot regardless of whether they've joined yet, so the host can't
    fire off more invites than the cap even if nobody's accepted."""
    return sum(1 for p in session.participants if p.role == "GUEST")


def create_invite(
    db: Session,
    session: CollabSession,
    contact: str,
    channel: str,
    guest_name: str | None,
) -> SessionParticipant:
    participant = SessionParticipant(
        session_id=session.id,
        display_name=guest_name or contact,
        contact=contact,
        channel=channel,
        role="GUEST",
        invite_token=secrets.token_urlsafe(24),
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def get_participant_by_token(
    db: Session, token: str
) -> SessionParticipant | None:
    return (
        db.query(SessionParticipant)
        .filter(SessionParticipant.invite_token == token)
        .first()
    )


def join_session(
    db: Session,
    participant: SessionParticipant,
    display_name: str | None,
    user_id: UUID | None,
) -> SessionParticipant:
    if display_name:
        participant.display_name = display_name
    if user_id:
        participant.user_id = user_id
    if not participant.joined_at:
        participant.joined_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(participant)
    return participant


def add_selected_service(
    db: Session,
    session_id: UUID,
    participant: SessionParticipant,
    provider_id: UUID,
    provider_name: str | None,
    category_name: str | None,
    service_id: UUID | None,
) -> SelectedService:
    item = SelectedService(
        session_id=session_id,
        provider_id=provider_id,
        provider_name=provider_name,
        category_name=category_name,
        service_id=service_id,
        added_by_participant_id=participant.id,
        added_by_name=participant.display_name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def remove_selected_service(
    db: Session, session_id: UUID, item_id: UUID
) -> bool:
    item = (
        db.query(SelectedService)
        .filter(
            SelectedService.id == item_id,
            SelectedService.session_id == session_id,
        )
        .first()
    )
    if not item:
        return False

    db.delete(item)
    db.commit()
    return True


def add_message(
    db: Session,
    session_id: UUID,
    participant: SessionParticipant,
    message: str,
) -> ChatMessage:
    chat_message = ChatMessage(
        session_id=session_id,
        participant_id=participant.id,
        sender_name=participant.display_name,
        message=message,
    )
    db.add(chat_message)
    db.commit()
    db.refresh(chat_message)
    return chat_message


def close_session(db: Session, session: CollabSession) -> CollabSession:
    session.status = "CLOSED"
    db.commit()
    db.refresh(session)
    return session


def start_screen_share(
    db: Session, session: CollabSession, participant_id: UUID
) -> CollabSession:
    session.is_screen_sharing = True
    session.sharing_participant_id = participant_id
    db.commit()
    db.refresh(session)
    return session


def stop_screen_share(db: Session, session: CollabSession) -> CollabSession:
    session.is_screen_sharing = False
    session.sharing_participant_id = None
    db.commit()
    db.refresh(session)

    # Signals only matter while a share is live - clear out anything
    # left over so a fresh share later doesn't get confused by stale
    # offers/candidates from the previous one.
    db.query(WebRTCSignal).filter(
        WebRTCSignal.session_id == session.id
    ).delete()
    db.commit()
    return session


def create_signal(
    db: Session,
    session_id: UUID,
    from_participant_id: UUID,
    to_participant_id: UUID,
    signal_type: str,
    payload: str | None,
) -> WebRTCSignal:
    signal = WebRTCSignal(
        session_id=session_id,
        from_participant_id=from_participant_id,
        to_participant_id=to_participant_id,
        signal_type=signal_type,
        payload=payload,
    )
    db.add(signal)
    db.commit()
    db.refresh(signal)
    return signal


def get_signals_for(
    db: Session,
    session_id: UUID,
    participant_id: UUID,
    since: datetime | None,
) -> list[WebRTCSignal]:
    query = db.query(WebRTCSignal).filter(
        WebRTCSignal.session_id == session_id,
        WebRTCSignal.to_participant_id == participant_id,
    )
    if since:
        query = query.filter(WebRTCSignal.created_at > since)
    return query.order_by(WebRTCSignal.created_at).all()
