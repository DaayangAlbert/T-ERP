from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import TimestampMixin


class Company(db.Model, TimestampMixin):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    legal_name = db.Column(db.String(255), nullable=False)
    trade_name = db.Column(db.String(255), nullable=True)
    acronym = db.Column(db.String(80), nullable=True)
    registration_number = db.Column(db.String(128), nullable=False, unique=True)
    tax_number = db.Column(db.String(128), nullable=True, unique=True)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    country_code = db.Column(db.String(2), nullable=False, default="FR")
    country_name = db.Column(db.String(120), nullable=True)
    city = db.Column(db.String(120), nullable=True)
    address_line = db.Column(db.String(255), nullable=True)
    activity_domain = db.Column(db.String(255), nullable=True)
    logo_url = db.Column(db.String(500), nullable=True)
    administrative_documents = db.Column(db.JSON, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=False)
    onboarding_status = db.Column(db.String(30), nullable=False, default="pending")
    account_status = db.Column(db.String(30), nullable=False, default="pending")
    subscription_status = db.Column(db.String(30), nullable=False, default="pending")
    activated_at = db.Column(db.DateTime(timezone=True), nullable=True)
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    review_notes = db.Column(db.Text, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    requested_information = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "onboarding_status IN ('pending', 'under_review', 'approved', 'rejected', 'info_requested', 'suspended')",
            name="ck_companies_onboarding_status",
        ),
        CheckConstraint(
            "account_status IN ('pending', 'active', 'suspended', 'expired', 'rejected')",
            name="ck_companies_account_status",
        ),
        CheckConstraint(
            "subscription_status IN ('pending', 'in_validation', 'active', 'expired', 'suspended', 'rejected', 'cancelled', 'none')",
            name="ck_companies_subscription_status",
        ),
    )


class CompanySetting(db.Model, TimestampMixin):
    __tablename__ = "company_settings"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    currency = db.Column(db.String(3), nullable=False, default="EUR")
    timezone = db.Column(db.String(64), nullable=False, default="Europe/Paris")
    default_language = db.Column(db.String(5), nullable=False, default="fr")
    date_format = db.Column(db.String(20), nullable=False, default="DD/MM/YYYY")
    contact_person_name = db.Column(db.String(255), nullable=True)
    contact_person_phone = db.Column(db.String(50), nullable=True)
    website_url = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", name="uq_company_settings_company_id"),
        CheckConstraint("default_language IN ('fr', 'en')", name="ck_company_settings_default_language"),
    )
