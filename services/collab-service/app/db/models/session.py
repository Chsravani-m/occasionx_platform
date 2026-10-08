"""
Group planning sessions ("plan together" / "share screen to choose
services"): a customer (the host) starts a session, invites up to a
fixed number of other customers via an emailed/WhatsApp'd link, and
everyone in the session sees the same shared list of picked services
plus a lightweight chat, kept in sync by polling GET
/collab/sessions/{id} every few seconds from the frontend.

Guests join via invite_token only - no account/registration required
(SessionParticipant.user_id is nullable and only gets populated if the
guest happens to already be logged in when they join).
"""

import uuid

from sqlalchemy import Column
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import Integer
from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import func

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class CollabSession(Base):
    __tablename__ = "collab_sessions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    host_user_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    host_name = Column(
        String(255),
        nullable=False
    )

    title = Column(
        String(255),
        nullable=True
    )

    # ACTIVE / CLOSED
    status = Column(
        String(20),
        default="ACTIVE"
    )

    # Max number of *invited guests* beyond the host - "allow max 3
    # customers" from the feature request. The host is not counted
    # against this cap.
    max_guests = Column(
        Integer,
        default=3
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    # True live screen mirroring (web app only) - the host's browser tab
    # streams video of their actual screen to guests via WebRTC. These
    # two columns are just the "who's sharing right now" signal the
    # frontend polls for; the actual video never touches this backend,
    # only the SDP offer/answer/ICE-candidate handshake does (see
    # WebRTCSignal below).
    is_screen_sharing = Column(
        Boolean,
        default=False
    )

    sharing_participant_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    participants = relationship(
        "SessionParticipant",
        backref="session",
        cascade="all, delete-orphan",
        order_by="SessionParticipant.created_at"
    )

    selected_services = relationship(
        "SelectedService",
        backref="session",
        cascade="all, delete-orphan",
        order_by="SelectedService.created_at"
    )

    messages = relationship(
        "ChatMessage",
        backref="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at"
    )

    signals = relationship(
        "WebRTCSignal",
        backref="session",
        cascade="all, delete-orphan",
        order_by="WebRTCSignal.created_at"
    )


class SessionParticipant(Base):
    __tablename__ = "collab_session_participants"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("collab_sessions.id"),
        nullable=False
    )

    # Null for guests who never had/used an account at join time.
    user_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    display_name = Column(
        String(255),
        nullable=False
    )

    # Email address or phone number the invite was sent to (null for
    # the host row, which is created directly, not invited).
    contact = Column(
        String(255),
        nullable=True
    )

    # EMAIL / WHATSAPP
    channel = Column(
        String(20),
        nullable=True
    )

    # HOST / GUEST
    role = Column(
        String(10),
        default="GUEST"
    )

    invite_token = Column(
        String(64),
        unique=True,
        nullable=True,
        index=True
    )

    # Null until the invitee actually opens the link and joins.
    joined_at = Column(
        DateTime,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class SelectedService(Base):
    """One entry in the shared "screen" of services the group is
    considering together."""

    __tablename__ = "collab_selected_services"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("collab_sessions.id"),
        nullable=False
    )

    provider_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    provider_name = Column(
        String(255),
        nullable=True
    )

    category_name = Column(
        String(255),
        nullable=True
    )

    service_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    added_by_participant_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    added_by_name = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class ChatMessage(Base):
    __tablename__ = "collab_chat_messages"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("collab_sessions.id"),
        nullable=False
    )

    participant_id = Column(
        UUID(as_uuid=True),
        nullable=True
    )

    sender_name = Column(
        String(255),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )


class WebRTCSignal(Base):
    """A single piece of the WebRTC handshake (SDP offer, SDP answer,
    or one ICE candidate) relayed between the host and one guest so
    their browsers can set up a direct peer connection for live screen
    mirroring. Frontend exchanges these by polling
    GET /signals?participant_id=<me>&since=<ts> every ~1.5s - much
    faster than the main 4s session-state poll since ICE negotiation is
    latency-sensitive, but still no WebSocket infra needed.

    Rows are cheap and short-lived; nothing prunes them automatically
    yet (fine at this scale - a handful of rows per screen-share
    session), but a cheap thing to add later if this table grows.
    """

    __tablename__ = "collab_webrtc_signals"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("collab_sessions.id"),
        nullable=False
    )

    from_participant_id = Column(
        UUID(as_uuid=True),
        nullable=False
    )

    # Who this signal is addressed to - always a specific participant
    # (host->guest or guest->host), never broadcast, since each
    # guest gets its own 1:1 peer connection with the host.
    to_participant_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True
    )

    # OFFER / ANSWER / ICE_CANDIDATE / REQUEST_OFFER (a late-joining or
    # reconnecting guest asks the host to (re)start the handshake)
    signal_type = Column(
        String(20),
        nullable=False
    )

    # JSON-encoded RTCSessionDescriptionInit or RTCIceCandidateInit
    payload = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
        index=True
    )
