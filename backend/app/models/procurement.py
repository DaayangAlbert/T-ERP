from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import SoftDeleteMixin, TenantScopedMixin, TimestampMixin


class PublicTender(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "public_tenders"

    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    contracting_authority = db.Column(db.String(255), nullable=False)
    location = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)
    budget_estimate = db.Column(db.Numeric(14, 2), nullable=True)
    publication_date = db.Column(db.Date, nullable=True)
    submission_deadline = db.Column(db.Date, nullable=True)
    dao_url = db.Column(db.String(500), nullable=True)
    source_url = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="monitoring")

    __table_args__ = (
        UniqueConstraint("company_id", "reference", name="uq_public_tenders_company_reference"),
        CheckConstraint(
            "status IN ('draft', 'monitoring', 'preparing', 'submitted', 'awarded', 'lost', 'cancelled')",
            name="ck_public_tenders_status",
        ),
    )


class TenderChecklistItem(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "tender_checklist_items"

    id = db.Column(db.Integer, primary_key=True)
    tender_id = db.Column(db.Integer, db.ForeignKey("public_tenders.id"), nullable=False, index=True)
    label = db.Column(db.String(255), nullable=False)
    is_required = db.Column(db.Boolean, nullable=False, default=True)
    is_completed = db.Column(db.Boolean, nullable=False, default=False)
    notes = db.Column(db.Text, nullable=True)


class TenderSubmission(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "tender_submissions"

    id = db.Column(db.Integer, primary_key=True)
    tender_id = db.Column(db.Integer, db.ForeignKey("public_tenders.id"), nullable=False, index=True)
    submitted_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(30), nullable=False, default="draft")
    submission_amount = db.Column(db.Numeric(14, 2), nullable=True)
    submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    dao_package_url = db.Column(db.String(500), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "tender_id", name="uq_tender_submissions_company_tender"),
        CheckConstraint(
            "status IN ('draft', 'submitted', 'under_review', 'awarded', 'lost', 'cancelled')",
            name="ck_tender_submissions_status",
        ),
    )
