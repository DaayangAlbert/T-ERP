from sqlalchemy import CheckConstraint

from app.extensions import db
from app.models.base import TimestampMixin


AGENDA_CATEGORY_VALUES = (
    "meeting",
    "task",
    "deadline",
    "leave",
    "personal",
    "follow_up",
    "other",
)


class AgendaEntry(db.Model, TimestampMixin):
    __tablename__ = "agenda_entries"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    category = db.Column(db.String(30), nullable=False, default="personal")
    start_at = db.Column(db.DateTime(timezone=True), nullable=False)
    end_at = db.Column(db.DateTime(timezone=True), nullable=True)
    all_day = db.Column(db.Boolean, nullable=False, default=False)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)
    source = db.Column(db.String(20), nullable=False, default="manual")

    __table_args__ = (
        CheckConstraint(
            "category IN ('meeting', 'task', 'deadline', 'leave', 'personal', 'follow_up', 'other')",
            name="ck_agenda_entries_category",
        ),
        CheckConstraint("source IN ('manual', 'project_sync')", name="ck_agenda_entries_source"),
    )
