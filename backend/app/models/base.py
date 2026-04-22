from datetime import datetime

from sqlalchemy import DateTime, func

from app.extensions import db


class TimestampMixin:
    created_at = db.Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = db.Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class TenantScopedMixin:
    # Every tenant-scoped record must carry company_id for strict isolation.
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)


class SoftDeleteMixin:
    deleted_at = db.Column(DateTime(timezone=True), nullable=True)

    @property
    def is_deleted(self):
        return self.deleted_at is not None
