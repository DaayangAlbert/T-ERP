from datetime import datetime, timezone
from typing import Any

from app.extensions import db, socketio
from app.models.calls import CallParticipant, CallSession
from app.models.chat import ChatParticipant
from app.models.user import User


class CallError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _user_room(company_id: int, user_id: int) -> str:
    return f"user:{company_id}:{user_id}"


def _call_room(company_id: int, call_session_id: int) -> str:
    return f"call:{company_id}:{call_session_id}"


def _serialize_call(session: CallSession, participants: list[CallParticipant] | None = None) -> dict[str, Any]:
    participant_items = []
    for row in participants or []:
        participant_items.append(
            {
                "id": row.id,
                "user_id": row.user_id,
                "joined_at": row.joined_at.isoformat() if row.joined_at else None,
                "left_at": row.left_at.isoformat() if row.left_at else None,
            }
        )

    return {
        "id": session.id,
        "company_id": session.company_id,
        "conversation_id": session.conversation_id,
        "initiated_by_user_id": session.initiated_by_user_id,
        "call_type": session.call_type,
        "status": session.status,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "participants": participant_items,
    }


def _require_company_user(company_id: int, user_id: int) -> User:
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None or user.deleted_at is not None or not user.is_active:
        raise CallError("User not found in company", status_code=404)
    return user


def _require_call(company_id: int, call_session_id: int) -> CallSession:
    row = CallSession.query.filter_by(id=call_session_id, company_id=company_id).first()
    if row is None:
        raise CallError("Call session not found", status_code=404)
    return row


def _get_participants(company_id: int, call_session_id: int) -> list[CallParticipant]:
    return (
        CallParticipant.query.filter_by(company_id=company_id, call_session_id=call_session_id)
        .order_by(CallParticipant.created_at.asc())
        .all()
    )


def is_call_participant(company_id: int, call_session_id: int, user_id: int) -> bool:
    row = CallParticipant.query.filter_by(
        company_id=company_id,
        call_session_id=call_session_id,
        user_id=user_id,
    ).first()
    return row is not None


def create_call_session(
    company_id: int,
    initiator_user_id: int,
    payload: dict[str, Any],
    *,
    emit_events: bool = True,
) -> dict[str, Any]:
    _require_company_user(company_id=company_id, user_id=initiator_user_id)

    call_type = str(payload.get("call_type") or "").strip().lower()
    if call_type not in ("audio", "video"):
        raise CallError("call_type must be audio or video", status_code=400)

    conversation_id = payload.get("conversation_id")
    participant_ids_raw = payload.get("participant_ids") or []
    if not isinstance(participant_ids_raw, list) or len(participant_ids_raw) == 0:
        raise CallError("participant_ids must be a non-empty list", status_code=400)

    participant_ids = {int(pid) for pid in participant_ids_raw}
    participant_ids.add(initiator_user_id)

    if len(participant_ids) < 2:
        raise CallError("A call requires at least two participants", status_code=400)

    for participant_id in participant_ids:
        _require_company_user(company_id=company_id, user_id=participant_id)

    if conversation_id is not None:
        for participant_id in participant_ids:
            is_member = ChatParticipant.query.filter_by(
                company_id=company_id,
                conversation_id=int(conversation_id),
                user_id=participant_id,
            ).first()
            if is_member is None:
                raise CallError("All participants must belong to the conversation", status_code=403)

    session = CallSession(
        company_id=company_id,
        conversation_id=int(conversation_id) if conversation_id is not None else None,
        initiated_by_user_id=initiator_user_id,
        call_type=call_type,
        status="ringing",
    )
    db.session.add(session)
    db.session.flush()

    now = datetime.now(timezone.utc)
    for user_id in participant_ids:
        row = CallParticipant(
            company_id=company_id,
            call_session_id=session.id,
            user_id=user_id,
            joined_at=now if user_id == initiator_user_id else None,
            left_at=None,
        )
        db.session.add(row)

    db.session.commit()

    participants = _get_participants(company_id=company_id, call_session_id=session.id)
    data = _serialize_call(session, participants)

    if emit_events:
        for user_id in participant_ids:
            if user_id == initiator_user_id:
                continue
            socketio.emit("call:incoming", data, room=_user_room(company_id, user_id))

    return data


def list_calls(company_id: int, user_id: int, status: str | None = None) -> list[dict[str, Any]]:
    _require_company_user(company_id=company_id, user_id=user_id)

    query = (
        db.session.query(CallSession)
        .join(CallParticipant, CallParticipant.call_session_id == CallSession.id)
        .filter(CallSession.company_id == company_id, CallParticipant.user_id == user_id)
    )

    if status:
        query = query.filter(CallSession.status == status)

    sessions = query.order_by(CallSession.created_at.desc()).all()

    output = []
    for session in sessions:
        participants = _get_participants(company_id=company_id, call_session_id=session.id)
        output.append(_serialize_call(session, participants))

    return output


def get_call(company_id: int, call_session_id: int, user_id: int) -> dict[str, Any]:
    session = _require_call(company_id=company_id, call_session_id=call_session_id)
    if not is_call_participant(company_id=company_id, call_session_id=call_session_id, user_id=user_id):
        raise CallError("User is not a participant", status_code=403)

    participants = _get_participants(company_id=company_id, call_session_id=call_session_id)
    return _serialize_call(session, participants)


def join_call(company_id: int, call_session_id: int, user_id: int, *, emit_events: bool = True) -> dict[str, Any]:
    session = _require_call(company_id=company_id, call_session_id=call_session_id)
    participant = CallParticipant.query.filter_by(
        company_id=company_id,
        call_session_id=call_session_id,
        user_id=user_id,
    ).first()
    if participant is None:
        raise CallError("User is not a participant", status_code=403)

    if session.status in ("ended", "missed", "rejected"):
        raise CallError("Call is already closed", status_code=400)

    if participant.joined_at is None:
        participant.joined_at = datetime.now(timezone.utc)

    if session.started_at is None:
        session.started_at = datetime.now(timezone.utc)

    if session.status in ("initiated", "ringing"):
        session.status = "active"

    db.session.commit()

    participants = _get_participants(company_id=company_id, call_session_id=call_session_id)
    data = _serialize_call(session, participants)

    if emit_events:
        socketio.emit(
            "call:participant-joined",
            {"call_session_id": call_session_id, "user_id": user_id},
            room=_call_room(company_id, call_session_id),
        )

    return data


def reject_call(company_id: int, call_session_id: int, user_id: int, *, emit_events: bool = True) -> dict[str, Any]:
    session = _require_call(company_id=company_id, call_session_id=call_session_id)
    participant = CallParticipant.query.filter_by(
        company_id=company_id,
        call_session_id=call_session_id,
        user_id=user_id,
    ).first()
    if participant is None:
        raise CallError("User is not a participant", status_code=403)

    participant.left_at = participant.left_at or datetime.now(timezone.utc)

    active_participants = (
        CallParticipant.query.filter_by(company_id=company_id, call_session_id=call_session_id)
        .filter(CallParticipant.left_at.is_(None))
        .count()
    )
    if active_participants <= 1 and session.status in ("initiated", "ringing"):
        session.status = "rejected"
        session.ended_at = datetime.now(timezone.utc)

    db.session.commit()

    participants = _get_participants(company_id=company_id, call_session_id=call_session_id)
    data = _serialize_call(session, participants)

    if emit_events:
        socketio.emit(
            "call:rejected",
            {"call_session_id": call_session_id, "user_id": user_id},
            room=_call_room(company_id, call_session_id),
        )

    return data


def leave_call(company_id: int, call_session_id: int, user_id: int, *, emit_events: bool = True) -> dict[str, Any]:
    session = _require_call(company_id=company_id, call_session_id=call_session_id)
    participant = CallParticipant.query.filter_by(
        company_id=company_id,
        call_session_id=call_session_id,
        user_id=user_id,
    ).first()
    if participant is None:
        raise CallError("User is not a participant", status_code=403)

    participant.left_at = participant.left_at or datetime.now(timezone.utc)

    active_count = (
        CallParticipant.query.filter_by(company_id=company_id, call_session_id=call_session_id)
        .filter(CallParticipant.left_at.is_(None))
        .count()
    )

    if active_count == 0 and session.status not in ("ended", "missed", "rejected"):
        session.status = "ended"
        session.ended_at = datetime.now(timezone.utc)

    db.session.commit()

    participants = _get_participants(company_id=company_id, call_session_id=call_session_id)
    data = _serialize_call(session, participants)

    if emit_events:
        socketio.emit(
            "call:participant-left",
            {"call_session_id": call_session_id, "user_id": user_id},
            room=_call_room(company_id, call_session_id),
        )
        if data["status"] == "ended":
            socketio.emit("call:ended", data, room=_call_room(company_id, call_session_id))

    return data


def end_call(company_id: int, call_session_id: int, user_id: int, *, emit_events: bool = True) -> dict[str, Any]:
    session = _require_call(company_id=company_id, call_session_id=call_session_id)
    if not is_call_participant(company_id=company_id, call_session_id=call_session_id, user_id=user_id):
        raise CallError("User is not a participant", status_code=403)

    participants = _get_participants(company_id=company_id, call_session_id=call_session_id)
    now = datetime.now(timezone.utc)
    for participant in participants:
        if participant.left_at is None:
            participant.left_at = now

    session.status = "ended"
    session.ended_at = now
    if session.started_at is None:
        session.started_at = now

    db.session.commit()

    participants = _get_participants(company_id=company_id, call_session_id=call_session_id)
    data = _serialize_call(session, participants)

    if emit_events:
        socketio.emit("call:ended", data, room=_call_room(company_id, call_session_id))

    return data
