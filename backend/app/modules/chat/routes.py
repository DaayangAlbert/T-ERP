from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.file_storage import FileStorageError, store_uploaded_file
from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.pagination import get_pagination_params, paginate_items
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.modules.chat.service import (
    ChatError,
    create_conversation,
    create_message,
    download_message_attachment,
    get_unread_summary,
    is_participant,
    list_chat_contacts,
    list_conversation_messages,
    list_user_conversations,
    mark_messages_read,
)

chat_bp = Blueprint("chat", __name__, url_prefix="/chat")

CHAT_ATTACHMENT_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".webm",
    ".ogg",
    ".mp3",
    ".wav",
    ".m4a",
}


def _resolve_target_company_id(payload: dict | None = None) -> int:
    return resolve_company_scope(ChatError, payload)


@chat_bp.get("/status")
@jwt_required()
@require_permission("chat.read")
def chat_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "chat", "status": "ready", "tenant_id": tenant_id}), 200


@chat_bp.get("/conversations")
@jwt_required()
@require_permission("chat.read")
@rate_limit(max_requests=120, window_seconds=60, scope="chat-conversations")
def chat_list_conversations():
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id()
        rows = list_user_conversations(company_id=company_id, user_id=user_id)
        page, page_size = get_pagination_params(default_page_size=30)
        paginated = paginate_items(rows, page, page_size)
        return jsonify(paginated), 200
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@chat_bp.get("/contacts")
@jwt_required()
@require_permission("chat.read")
def chat_list_contacts():
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id()
        search = request.args.get("search")
        limit = int(request.args.get("limit", 100))
        rows = list_chat_contacts(company_id=company_id, user_id=user_id, search=search, limit=limit)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ValueError:
        return jsonify({"message": "limit must be an integer"}), 400
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@chat_bp.post("/conversations")
@jwt_required()
@require_permission("chat.manage")
def chat_create_conversation():
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())

    try:
        company_id = _resolve_target_company_id(payload)
        conversation = create_conversation(company_id=company_id, creator_user_id=user_id, payload=payload)
        return jsonify({"message": "Conversation created", "conversation": conversation}), 201
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@chat_bp.get("/conversations/<int:conversation_id>/messages")
@jwt_required()
@require_permission("chat.read")
def chat_list_messages(conversation_id):
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id()
        limit = int(request.args.get("limit", 50))
        rows = list_conversation_messages(company_id=company_id, conversation_id=conversation_id, user_id=user_id, limit=limit)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ValueError:
        return jsonify({"message": "limit must be an integer"}), 400
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@chat_bp.post("/conversations/<int:conversation_id>/messages")
@jwt_required()
@require_permission("chat.manage")
@rate_limit(max_requests=120, window_seconds=60, scope="chat-send")
def chat_send_message(conversation_id):
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())

    try:
        company_id = _resolve_target_company_id(payload)
        message = create_message(
            company_id=company_id,
            conversation_id=conversation_id,
            sender_user_id=user_id,
            payload=payload,
        )
        return jsonify({"message": "Message sent", "data": message}), 201
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@chat_bp.post("/conversations/<int:conversation_id>/attachments")
@jwt_required()
@require_permission("chat.manage")
@rate_limit(max_requests=40, window_seconds=60, scope="chat-upload")
def chat_upload_attachment(conversation_id):
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id()
        if not is_participant(company_id, conversation_id, user_id):
            raise ChatError("User is not a participant in this conversation", status_code=403)
        stored_file = store_uploaded_file(
            request.files.get("file"),
            storage_segments=[
                "companies",
                str(company_id),
                "chat",
                str(conversation_id),
                str(user_id),
            ],
            allowed_extensions=CHAT_ATTACHMENT_EXTENSIONS,
        )
        return (
            jsonify(
                {
                    "message": "Attachment uploaded",
                    "data": {
                        "attachment_url": stored_file.stored_path,
                        "attachment_name": stored_file.filename,
                        "size_bytes": stored_file.size_bytes,
                    },
                }
            ),
            201,
        )
    except FileStorageError as exc:
        return jsonify({"message": exc.message}), exc.status_code
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@chat_bp.post("/conversations/<int:conversation_id>/read")
@jwt_required()
@require_permission("chat.read")
def chat_mark_read(conversation_id):
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())

    try:
        company_id = _resolve_target_company_id(payload)
        until_message_id = payload.get("until_message_id")
        parsed_until = int(until_message_id) if until_message_id is not None else None
        result = mark_messages_read(
            company_id=company_id,
            conversation_id=conversation_id,
            user_id=user_id,
            until_message_id=parsed_until,
        )
        return jsonify({"message": "Messages marked as read", "data": result}), 200
    except ValueError:
        return jsonify({"message": "until_message_id must be an integer"}), 400
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@chat_bp.get("/messages/<int:message_id>/attachment")
@jwt_required()
@require_permission("chat.read")
def chat_download_attachment(message_id):
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id()
        return download_message_attachment(company_id=company_id, message_id=message_id, user_id=user_id)
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@chat_bp.get("/unread")
@jwt_required()
@require_permission("chat.read")
def chat_unread_summary():
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id()
        summary = get_unread_summary(company_id=company_id, user_id=user_id)
        return jsonify(summary), 200
    except ChatError as exc:
        return jsonify({"message": exc.message}), exc.status_code
