from typing import Any

from flask import send_file
from sqlalchemy import and_, func, or_, select

from app.core.file_storage import get_stored_file_name, resolve_stored_file
from app.extensions import db, socketio
from app.models.chat import ChatConversation, ChatMessage, ChatMessageRead, ChatParticipant
from app.models.user import User


class ChatError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _conversation_room(company_id: int, conversation_id: int) -> str:
    return f"chat:{company_id}:{conversation_id}"


def _user_room(company_id: int, user_id: int) -> str:
    return f"user:{company_id}:{user_id}"


def _serialize_message(message: ChatMessage) -> dict[str, Any]:
    return {
        "id": message.id,
        "company_id": message.company_id,
        "conversation_id": message.conversation_id,
        "sender_user_id": message.sender_user_id,
        "message_type": message.message_type,
        "content": message.content,
        "attachment_url": f"/api/v1/chat/messages/{message.id}/attachment" if message.attachment_url else None,
        "attachment_name": get_stored_file_name(message.attachment_url),
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


def _serialize_contact(user: User, *, existing_conversation_id: int | None = None) -> dict[str, Any]:
    display_name = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip() or user.email
    is_admin = bool(user.is_primary_admin or user.user_type in ("company_admin", "super_admin"))
    return {
        "id": user.id,
        "company_id": user.company_id,
        "display_name": display_name,
        "email": user.email,
        "job_title": user.job_title,
        "department": user.department,
        "user_type": user.user_type,
        "is_admin": is_admin,
        "existing_conversation_id": existing_conversation_id,
    }


def _serialize_conversation_participants(company_id: int, conversation_id: int) -> list[dict[str, Any]]:
    rows = (
        db.session.query(User)
        .join(
            ChatParticipant,
            and_(
                ChatParticipant.user_id == User.id,
                ChatParticipant.company_id == company_id,
                ChatParticipant.conversation_id == conversation_id,
            ),
        )
        .filter(
            User.company_id == company_id,
            User.deleted_at.is_(None),
        )
        .order_by(User.is_primary_admin.desc(), func.lower(User.last_name), func.lower(User.first_name))
        .all()
    )
    return [_serialize_contact(user) for user in rows]


def _serialize_conversation(conversation: ChatConversation, user_id: int, unread_count: int, last_message: ChatMessage | None) -> dict[str, Any]:
    return {
        "id": conversation.id,
        "company_id": conversation.company_id,
        "type": conversation.type,
        "title": conversation.title,
        "created_by_user_id": conversation.created_by_user_id,
        "unread_count": unread_count,
        "last_message": _serialize_message(last_message) if last_message else None,
        "participants": _serialize_conversation_participants(conversation.company_id, conversation.id),
        "is_participant": True,
    }


def _require_company_user(company_id: int, user_id: int) -> User:
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None or user.deleted_at is not None or not user.is_active:
        raise ChatError("User not found in company", status_code=404)
    return user


def _require_conversation(company_id: int, conversation_id: int) -> ChatConversation:
    conversation = ChatConversation.query.filter_by(id=conversation_id, company_id=company_id).first()
    if conversation is None or conversation.deleted_at is not None:
        raise ChatError("Conversation not found", status_code=404)
    return conversation


def _require_membership(company_id: int, conversation_id: int, user_id: int) -> None:
    membership = ChatParticipant.query.filter_by(
        company_id=company_id,
        conversation_id=conversation_id,
        user_id=user_id,
    ).first()
    if membership is None:
        raise ChatError("User is not a participant in this conversation", status_code=403)


def create_conversation(company_id: int, creator_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _require_company_user(company_id=company_id, user_id=creator_user_id)

    conversation_type = str(payload.get("type") or "private").strip().lower()
    if conversation_type not in ("private", "group"):
        raise ChatError("type must be private or group", status_code=400)

    participant_ids = payload.get("participant_ids") or []
    if not isinstance(participant_ids, list):
        raise ChatError("participant_ids must be a list", status_code=400)

    normalized_participants = {int(pid) for pid in participant_ids}
    normalized_participants.add(creator_user_id)

    if conversation_type == "private" and len(normalized_participants) != 2:
        raise ChatError("private conversation requires exactly 2 participants", status_code=400)

    for participant_id in normalized_participants:
        _require_company_user(company_id=company_id, user_id=participant_id)

    if conversation_type == "private":
        existing_conversations = (
            db.session.query(ChatConversation)
            .join(ChatParticipant, ChatParticipant.conversation_id == ChatConversation.id)
            .filter(
                ChatConversation.company_id == company_id,
                ChatConversation.type == "private",
                ChatConversation.deleted_at.is_(None),
                ChatParticipant.user_id.in_(normalized_participants),
            )
            .group_by(ChatConversation.id)
            .having(func.count(ChatParticipant.id) == 2)
            .all()
        )
        if existing_conversations:
            conversation = existing_conversations[0]
            unread = get_unread_count_for_conversation(company_id, conversation.id, creator_user_id)
            last_message = (
                ChatMessage.query.filter_by(company_id=company_id, conversation_id=conversation.id)
                .order_by(ChatMessage.created_at.desc())
                .first()
            )
            return _serialize_conversation(conversation, creator_user_id, unread, last_message)

    conversation = ChatConversation(
        company_id=company_id,
        type=conversation_type,
        title=(payload.get("title") or "").strip() or None,
        created_by_user_id=creator_user_id,
    )
    db.session.add(conversation)
    db.session.flush()

    for participant_id in normalized_participants:
        db.session.add(
            ChatParticipant(
                company_id=company_id,
                conversation_id=conversation.id,
                user_id=participant_id,
            )
        )

    db.session.commit()

    return _serialize_conversation(conversation, creator_user_id, unread_count=0, last_message=None)


def list_chat_contacts(
    company_id: int,
    user_id: int,
    *,
    search: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    _require_company_user(company_id=company_id, user_id=user_id)

    private_conversation_ids = [
        row.id
        for row in (
            db.session.query(ChatConversation.id)
            .join(
                ChatParticipant,
                and_(
                    ChatParticipant.conversation_id == ChatConversation.id,
                    ChatParticipant.company_id == company_id,
                    ChatParticipant.user_id == user_id,
                ),
            )
            .filter(
                ChatConversation.company_id == company_id,
                ChatConversation.type == "private",
                ChatConversation.deleted_at.is_(None),
            )
            .all()
        )
    ]

    existing_conversations_by_user: dict[int, int] = {}
    if private_conversation_ids:
        participant_rows = ChatParticipant.query.filter(
            ChatParticipant.company_id == company_id,
            ChatParticipant.conversation_id.in_(private_conversation_ids),
            ChatParticipant.user_id != user_id,
        ).all()
        for row in participant_rows:
            existing_conversations_by_user[row.user_id] = row.conversation_id

    safe_limit = max(1, min(int(limit), 300))
    normalized_search = str(search or "").strip().lower()
    query = User.query.filter(
        User.company_id == company_id,
        User.id != user_id,
        User.deleted_at.is_(None),
        User.is_active.is_(True),
        User.account_status == "active",
    )
    if normalized_search:
        pattern = f"%{normalized_search}%"
        query = query.filter(
            or_(
                func.lower(User.first_name).like(pattern),
                func.lower(User.last_name).like(pattern),
                func.lower(User.email).like(pattern),
                func.lower(func.coalesce(User.job_title, "")).like(pattern),
                func.lower(func.coalesce(User.department, "")).like(pattern),
            )
        )

    users = (
        query.order_by(User.is_primary_admin.desc(), func.lower(User.last_name), func.lower(User.first_name))
        .limit(safe_limit)
        .all()
    )

    return [
        _serialize_contact(user, existing_conversation_id=existing_conversations_by_user.get(user.id))
        for user in users
    ]


def list_user_conversations(company_id: int, user_id: int) -> list[dict[str, Any]]:
    _require_company_user(company_id=company_id, user_id=user_id)

    conversations = (
        db.session.query(ChatConversation)
        .join(ChatParticipant, ChatParticipant.conversation_id == ChatConversation.id)
        .filter(
            ChatConversation.company_id == company_id,
            ChatConversation.deleted_at.is_(None),
            ChatParticipant.user_id == user_id,
        )
        .order_by(ChatConversation.updated_at.desc())
        .all()
    )

    output = []
    for conversation in conversations:
        unread_count = get_unread_count_for_conversation(company_id, conversation.id, user_id)
        last_message = (
            ChatMessage.query.filter_by(company_id=company_id, conversation_id=conversation.id)
            .filter(ChatMessage.deleted_at.is_(None))
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        output.append(_serialize_conversation(conversation, user_id, unread_count, last_message))

    return output


def list_conversation_messages(company_id: int, conversation_id: int, user_id: int, limit: int = 50) -> list[dict[str, Any]]:
    _require_conversation(company_id=company_id, conversation_id=conversation_id)
    _require_membership(company_id=company_id, conversation_id=conversation_id, user_id=user_id)

    safe_limit = max(1, min(limit, 200))
    messages = (
        ChatMessage.query.filter_by(company_id=company_id, conversation_id=conversation_id)
        .filter(ChatMessage.deleted_at.is_(None))
        .order_by(ChatMessage.created_at.desc())
        .limit(safe_limit)
        .all()
    )

    return [_serialize_message(row) for row in reversed(messages)]


def create_message(
    company_id: int,
    conversation_id: int,
    sender_user_id: int,
    payload: dict[str, Any],
    *,
    emit_events: bool = True,
) -> dict[str, Any]:
    _require_conversation(company_id=company_id, conversation_id=conversation_id)
    _require_membership(company_id=company_id, conversation_id=conversation_id, user_id=sender_user_id)

    message_type = str(payload.get("message_type") or "text").strip().lower()
    if message_type not in ("text", "image", "file", "system"):
        raise ChatError("Invalid message_type", status_code=400)

    content = (payload.get("content") or "").strip()
    attachment_url = (payload.get("attachment_url") or "").strip()

    if message_type == "text" and not content:
        raise ChatError("content is required for text messages", status_code=400)
    if message_type in ("image", "file") and not attachment_url:
        raise ChatError("attachment_url is required for image/file messages", status_code=400)

    message = ChatMessage(
        company_id=company_id,
        conversation_id=conversation_id,
        sender_user_id=sender_user_id,
        message_type=message_type,
        content=content or None,
        attachment_url=attachment_url or None,
    )
    db.session.add(message)
    db.session.commit()

    serialized = _serialize_message(message)

    if emit_events:
        conversation_room = _conversation_room(company_id, conversation_id)
        socketio.emit("chat:message", serialized, room=conversation_room)

        participants = ChatParticipant.query.filter_by(company_id=company_id, conversation_id=conversation_id).all()
        for participant in participants:
            if participant.user_id == sender_user_id:
                continue
            unread_count = get_unread_count_for_conversation(company_id, conversation_id, participant.user_id)
            socketio.emit(
                "chat:notification",
                {
                    "conversation_id": conversation_id,
                    "message_id": message.id,
                    "unread_count": unread_count,
                },
                room=_user_room(company_id, participant.user_id),
            )

    return serialized


def mark_messages_read(company_id: int, conversation_id: int, user_id: int, until_message_id: int | None = None) -> dict[str, Any]:
    _require_conversation(company_id=company_id, conversation_id=conversation_id)
    _require_membership(company_id=company_id, conversation_id=conversation_id, user_id=user_id)

    query = ChatMessage.query.filter(
        ChatMessage.company_id == company_id,
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.deleted_at.is_(None),
        ChatMessage.sender_user_id != user_id,
    )

    if until_message_id is not None:
        query = query.filter(ChatMessage.id <= until_message_id)

    messages = query.all()
    created = 0

    for message in messages:
        exists = ChatMessageRead.query.filter_by(
            company_id=company_id,
            message_id=message.id,
            user_id=user_id,
        ).first()
        if not exists:
            db.session.add(
                ChatMessageRead(
                    company_id=company_id,
                    message_id=message.id,
                    user_id=user_id,
                )
            )
            created += 1

    db.session.commit()

    unread_count = get_unread_count_for_conversation(company_id, conversation_id, user_id)
    socketio.emit(
        "chat:read",
        {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "unread_count": unread_count,
        },
        room=_conversation_room(company_id, conversation_id),
    )

    return {"conversation_id": conversation_id, "marked_count": created, "unread_count": unread_count}


def get_unread_count_for_conversation(company_id: int, conversation_id: int, user_id: int) -> int:
    read_message_ids = (
        select(ChatMessageRead.message_id)
        .filter(ChatMessageRead.company_id == company_id, ChatMessageRead.user_id == user_id)
    )

    count = (
        db.session.query(func.count(ChatMessage.id))
        .filter(
            ChatMessage.company_id == company_id,
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.deleted_at.is_(None),
            ChatMessage.sender_user_id != user_id,
            ~ChatMessage.id.in_(read_message_ids),
        )
        .scalar()
    )
    return int(count or 0)


def get_unread_summary(company_id: int, user_id: int) -> dict[str, Any]:
    _require_company_user(company_id=company_id, user_id=user_id)

    conversation_ids = (
        db.session.query(ChatParticipant.conversation_id)
        .filter(ChatParticipant.company_id == company_id, ChatParticipant.user_id == user_id)
        .all()
    )
    ids = [row.conversation_id for row in conversation_ids]

    summary_items = []
    total = 0
    for conversation_id in ids:
        unread = get_unread_count_for_conversation(company_id, conversation_id, user_id)
        total += unread
        summary_items.append({"conversation_id": conversation_id, "unread_count": unread})

    return {"total_unread": total, "items": summary_items}


def is_participant(company_id: int, conversation_id: int, user_id: int) -> bool:
    membership = ChatParticipant.query.filter_by(
        company_id=company_id,
        conversation_id=conversation_id,
        user_id=user_id,
    ).first()
    return membership is not None


def download_message_attachment(company_id: int, message_id: int, user_id: int):
    message = ChatMessage.query.filter_by(company_id=company_id, id=message_id).first()
    if message is None or message.deleted_at is not None:
        raise ChatError("Message not found", status_code=404)
    _require_membership(company_id=company_id, conversation_id=message.conversation_id, user_id=user_id)
    target = resolve_stored_file(message.attachment_url)
    filename = get_stored_file_name(message.attachment_url) or target.name
    return send_file(
        target,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=filename,
        max_age=0,
    )
