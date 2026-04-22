from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import TenantScopedMixin, TimestampMixin


class CallSession(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "call_sessions"

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("chat_conversations.id"), nullable=True, index=True)
    initiated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    call_type = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="initiated")
    started_at = db.Column(db.DateTime(timezone=True), nullable=True)
    ended_at = db.Column(db.DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("call_type IN ('audio', 'video')", name="ck_call_sessions_type"),
        CheckConstraint(
            "status IN ('initiated', 'ringing', 'active', 'ended', 'missed', 'rejected')",
            name="ck_call_sessions_status",
        ),
    )


class CallParticipant(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "call_participants"

    id = db.Column(db.Integer, primary_key=True)
    call_session_id = db.Column(db.Integer, db.ForeignKey("call_sessions.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    joined_at = db.Column(db.DateTime(timezone=True), nullable=True)
    left_at = db.Column(db.DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "call_session_id", "user_id", name="uq_call_participants_company_call_user"),
    )
