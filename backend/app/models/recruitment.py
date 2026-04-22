from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import SoftDeleteMixin, TenantScopedMixin, TimestampMixin


class JobOffer(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "job_offers"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    contract_type = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(255), nullable=True)
    salary_min = db.Column(db.Numeric(12, 2), nullable=True)
    salary_max = db.Column(db.Numeric(12, 2), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="draft")
    published_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published', 'closed')", name="ck_job_offers_status"),
    )


class CandidateProfile(db.Model, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "candidate_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    first_name = db.Column(db.String(120), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    city = db.Column(db.String(120), nullable=True)
    years_experience = db.Column(db.Integer, nullable=True)
    desired_position = db.Column(db.String(150), nullable=True)
    skills_summary = db.Column(db.Text, nullable=True)
    availability_status = db.Column(db.String(30), nullable=False, default="immediate")
    cv_url = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "availability_status IN ('immediate', 'short_notice', 'not_available')",
            name="ck_candidate_profiles_availability_status",
        ),
    )


class JobApplication(db.Model, TimestampMixin):
    __tablename__ = "job_applications"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    job_offer_id = db.Column(db.Integer, db.ForeignKey("job_offers.id"), nullable=False, index=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    status = db.Column(db.String(30), nullable=False, default="submitted")
    score = db.Column(db.Numeric(5, 2), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("job_offer_id", "candidate_id", name="uq_job_applications_offer_candidate"),
        CheckConstraint(
            "status IN ('submitted', 'screening', 'interview', 'shortlisted', 'rejected', 'hired')",
            name="ck_job_applications_status",
        ),
    )


class CandidateMatch(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "candidate_matches"

    id = db.Column(db.Integer, primary_key=True)
    job_offer_id = db.Column(db.Integer, db.ForeignKey("job_offers.id"), nullable=False, index=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate_profiles.id"), nullable=False, index=True)
    match_score = db.Column(db.Numeric(5, 2), nullable=False)
    rationale = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "job_offer_id", "candidate_id", name="uq_candidate_matches_company_offer_candidate"),
        CheckConstraint("match_score >= 0 AND match_score <= 100", name="ck_candidate_matches_score"),
    )
