from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import SoftDeleteMixin, TenantScopedMixin, TimestampMixin


class ChatConversation(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "chat_conversations"

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False, default="private")
    title = db.Column(db.String(255), nullable=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("type IN ('private', 'group')", name="ck_chat_conversations_type"),
    )


class ChatParticipant(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "chat_participants"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("chat_conversations.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    joined_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    __table_args__ = (
        UniqueConstraint("company_id", "conversation_id", "user_id", name="uq_chat_participants_company_conversation_user"),
    )


class ChatMessage(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "chat_messages"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("chat_conversations.id"), nullable=False, index=True)
    sender_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    message_type = db.Column(db.String(20), nullable=False, default="text")
    content = db.Column(db.Text, nullable=True)
    attachment_url = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        CheckConstraint("message_type IN ('text', 'image', 'file', 'system')", name="ck_chat_messages_type"),
    )


class ChatMessageRead(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "chat_message_reads"

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey("chat_messages.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    read_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())

    __table_args__ = (
        UniqueConstraint("company_id", "message_id", "user_id", name="uq_chat_message_reads_company_message_user"),
    )
