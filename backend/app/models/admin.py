from sqlalchemy import CheckConstraint

from app.extensions import db
from app.models.base import TimestampMixin


class SubscriptionPlan(db.Model, TimestampMixin):
    __tablename__ = "subscription_plans"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(80), nullable=False, unique=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    duration_days = db.Column(db.Integer, nullable=False, default=30)
    price_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        CheckConstraint("duration_days > 0", name="ck_subscription_plans_duration_days_positive"),
        CheckConstraint("price_amount >= 0", name="ck_subscription_plans_price_amount_non_negative"),
    )


class CompanySubscription(db.Model, TimestampMixin):
    __tablename__ = "company_subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("subscription_plans.id"), nullable=False, index=True)
    validated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    status = db.Column(db.String(30), nullable=False, default="pending")
    validation_status = db.Column(db.String(30), nullable=False, default="pending")
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    amount_paid = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    payment_method = db.Column(db.String(50), nullable=True)
    transaction_reference = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_validation', 'active', 'expired', 'suspended', 'rejected', 'cancelled')",
            name="ck_company_subscriptions_status",
        ),
        CheckConstraint(
            "validation_status IN ('pending', 'in_validation', 'validated', 'rejected', 'on_hold')",
            name="ck_company_subscriptions_validation_status",
        ),
        CheckConstraint("amount_paid >= 0", name="ck_company_subscriptions_amount_paid_non_negative"),
    )


class AuditLog(db.Model, TimestampMixin):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True, index=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    actor_email = db.Column(db.String(255), nullable=True)
    module = db.Column(db.String(80), nullable=False)
    action = db.Column(db.String(120), nullable=False)
    target_type = db.Column(db.String(80), nullable=True)
    target_id = db.Column(db.Integer, nullable=True)
    description = db.Column(db.Text, nullable=True)
    details = db.Column(db.JSON, nullable=True)
    ip_address = db.Column(db.String(100), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
