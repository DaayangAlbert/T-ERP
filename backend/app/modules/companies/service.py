from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func

from app.core.audit import log_audit_event
from app.core.default_profiles import ensure_company_admin_role, ensure_permissions_exist
from app.extensions import db
from app.models.admin import CompanySubscription, SubscriptionPlan
from app.models.company import Company, CompanySetting
from app.models.user import User, UserRole
from app.modules.auth.service import DEFAULT_PERMISSION_CODES, hash_password


class CompanyError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str | None = None, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def _require_fields(payload: dict[str, Any], fields: list[str]) -> None:
    for field in fields:
        value = payload.get(field)
        if value is None or str(value).strip() == "":
            raise CompanyError(f"Missing field: {field}", status_code=400)


def _parse_date(value: Any, field_name: str) -> date | None:
    if value in (None, ""):
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value))
    except ValueError as exc:
        raise CompanyError(f"{field_name} must be a valid ISO date", status_code=400) from exc


def _serialize_plan(plan: SubscriptionPlan | None) -> dict[str, Any] | None:
    if plan is None:
        return None

    return {
        "id": plan.id,
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "duration_days": plan.duration_days,
        "price_amount": float(plan.price_amount or 0),
        "currency": plan.currency,
        "is_active": plan.is_active,
    }


def _serialize_subscription(row: CompanySubscription | None) -> dict[str, Any] | None:
    if row is None:
        return None

    plan = SubscriptionPlan.query.filter_by(id=row.plan_id).first()
    return {
        "id": row.id,
        "company_id": row.company_id,
        "plan_id": row.plan_id,
        "plan": _serialize_plan(plan),
        "status": row.status,
        "validation_status": row.validation_status,
        "start_date": row.start_date.isoformat() if row.start_date else None,
        "end_date": row.end_date.isoformat() if row.end_date else None,
        "amount_paid": float(row.amount_paid or 0),
        "payment_method": row.payment_method,
        "transaction_reference": row.transaction_reference,
        "notes": row.notes,
        "validated_by_user_id": row.validated_by_user_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _get_primary_admin(company_id: int) -> User | None:
    primary = User.query.filter_by(
        company_id=company_id,
        is_primary_admin=True,
    ).filter(User.deleted_at.is_(None)).first()
    if primary is not None:
        return primary

    return (
        User.query.filter_by(company_id=company_id, user_type="company_admin")
        .filter(User.deleted_at.is_(None))
        .order_by(User.created_at.asc())
        .first()
    )


def _normalize_company_workspace_payload(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


def _build_company_setup(company: Company, settings: CompanySetting | None) -> dict[str, Any]:
    workspace = _normalize_company_workspace_payload(company.administrative_documents)
    compliance_documents = workspace.get("compliance_documents")
    has_compliance_documents = isinstance(compliance_documents, list) and len(compliance_documents) > 0

    checkpoints = [
        ("company_phone", bool((company.phone or "").strip())),
        ("company_address", bool((company.city or "").strip() and (company.address_line or "").strip())),
        ("activity_domain", bool((company.activity_domain or "").strip())),
        (
            "main_contact",
            bool(
                settings is not None
                and (settings.contact_person_name or "").strip()
                and (settings.contact_person_phone or "").strip()
            ),
        ),
        ("compliance_documents", has_compliance_documents),
    ]

    completed = sum(1 for _, is_done in checkpoints if is_done)
    total = len(checkpoints)
    pending_task_codes = [code for code, is_done in checkpoints if not is_done]
    completion_percent = int(round((completed / total) * 100)) if total else 100

    return {
        "status": "complete" if not pending_task_codes else "pending",
        "completion_percent": completion_percent,
        "completed_tasks": completed,
        "total_tasks": total,
        "pending_task_codes": pending_task_codes,
    }


def _serialize_company(company: Company) -> dict[str, Any]:
    settings = CompanySetting.query.filter_by(company_id=company.id).first()
    subscription = (
        CompanySubscription.query.filter_by(company_id=company.id)
        .order_by(CompanySubscription.created_at.desc(), CompanySubscription.id.desc())
        .first()
    )
    primary_admin = _get_primary_admin(company.id)
    setup = _build_company_setup(company, settings)

    return {
        "id": company.id,
        "legal_name": company.legal_name,
        "trade_name": company.trade_name,
        "acronym": company.acronym,
        "registration_number": company.registration_number,
        "tax_number": company.tax_number,
        "email": company.email,
        "phone": company.phone,
        "country_code": company.country_code,
        "country_name": company.country_name,
        "city": company.city,
        "address_line": company.address_line,
        "activity_domain": company.activity_domain,
        "logo_url": company.logo_url,
        "administrative_documents": company.administrative_documents or [],
        "onboarding_status": company.onboarding_status,
        "account_status": company.account_status,
        "subscription_status": company.subscription_status,
        "is_active": company.is_active,
        "activated_at": company.activated_at.isoformat() if company.activated_at else None,
        "reviewed_at": company.reviewed_at.isoformat() if company.reviewed_at else None,
        "review_notes": company.review_notes,
        "rejection_reason": company.rejection_reason,
        "requested_information": company.requested_information,
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "setup": setup,
        "settings": {
            "currency": settings.currency if settings else "EUR",
            "timezone": settings.timezone if settings else "Europe/Paris",
            "default_language": settings.default_language if settings else "fr",
            "date_format": settings.date_format if settings else "DD/MM/YYYY",
            "contact_person_name": settings.contact_person_name if settings else None,
            "contact_person_phone": settings.contact_person_phone if settings else None,
            "website_url": settings.website_url if settings else None,
        },
        "primary_admin": (
            {
                "id": primary_admin.id,
                "email": primary_admin.email,
                "login_identifier": primary_admin.login_identifier,
                "first_name": primary_admin.first_name,
                "last_name": primary_admin.last_name,
                "phone": primary_admin.phone,
                "job_title": primary_admin.job_title,
                "account_status": primary_admin.account_status,
                "is_primary_admin": primary_admin.is_primary_admin,
                "last_login_at": primary_admin.last_login_at.isoformat() if primary_admin.last_login_at else None,
            }
            if primary_admin
            else None
        ),
        "current_subscription": _serialize_subscription(subscription),
    }


def _apply_company_status(company: Company, *, onboarding_status: str, account_status: str, is_active: bool) -> None:
    company.onboarding_status = onboarding_status
    company.account_status = account_status
    company.is_active = is_active


def _resolve_subscription_plan(payload: dict[str, Any]) -> SubscriptionPlan | None:
    plan_id = payload.get("subscription_plan_id") or payload.get("plan_id")
    plan_code = (payload.get("subscription_plan_code") or payload.get("plan_code") or "").strip().lower()

    plan = None
    if plan_id is not None:
        plan = SubscriptionPlan.query.filter_by(id=int(plan_id)).first()
    elif plan_code:
        plan = SubscriptionPlan.query.filter(func.lower(SubscriptionPlan.code) == plan_code).first()

    if (plan_id is not None or plan_code) and plan is None:
        raise CompanyError("Subscription plan not found", status_code=404)

    return plan


def _maybe_create_subscription(company: Company, payload: dict[str, Any]) -> CompanySubscription | None:
    plan = _resolve_subscription_plan(payload)
    if plan is None:
        company.subscription_status = "none"
        return None

    status = str(payload.get("subscription_status") or "pending").strip().lower()
    validation_status = str(payload.get("subscription_validation_status") or "pending").strip().lower()
    if status not in {"pending", "in_validation", "active", "expired", "suspended", "rejected", "cancelled"}:
        raise CompanyError("Invalid subscription_status", status_code=400)
    if validation_status not in {"pending", "in_validation", "validated", "rejected", "on_hold"}:
        raise CompanyError("Invalid subscription_validation_status", status_code=400)

    start_date = _parse_date(payload.get("subscription_start_date"), "subscription_start_date")
    end_date = _parse_date(payload.get("subscription_end_date"), "subscription_end_date")
    if start_date and end_date and end_date < start_date:
        raise CompanyError("subscription_end_date must be after subscription_start_date", status_code=400)

    if start_date and end_date is None:
        end_date = start_date + timedelta(days=int(plan.duration_days))

    row = CompanySubscription(
        company_id=company.id,
        plan_id=plan.id,
        status=status,
        validation_status=validation_status,
        start_date=start_date,
        end_date=end_date,
        amount_paid=payload.get("subscription_amount_paid") or 0,
        payment_method=(payload.get("subscription_payment_method") or "").strip() or None,
        transaction_reference=(payload.get("subscription_transaction_reference") or "").strip() or None,
        notes=(payload.get("subscription_notes") or "").strip() or None,
    )
    db.session.add(row)

    company.subscription_status = status
    return row


def register_company(payload: dict[str, Any]) -> dict[str, Any]:
    required_fields = [
        "legal_name",
        "registration_number",
        "email",
        "country_code",
        "admin_first_name",
        "admin_last_name",
        "admin_email",
        "admin_password",
    ]
    _require_fields(payload, required_fields)

    registration_number = payload["registration_number"].strip()
    admin_email = payload["admin_email"].strip().lower()
    company_email = payload["email"].strip().lower()
    login_identifier = (payload.get("admin_login_identifier") or admin_email).strip().lower()

    existing_company = Company.query.filter_by(registration_number=registration_number).first()
    if existing_company:
        raise CompanyError("A company with this registration number already exists", status_code=409)

    if payload.get("tax_number"):
        tax_exists = Company.query.filter_by(tax_number=payload["tax_number"].strip()).first()
        if tax_exists:
            raise CompanyError("A company with this tax number already exists", status_code=409)

    existing_user = User.query.filter(
        User.deleted_at.is_(None),
        func.lower(User.email) == admin_email,
    ).first()
    if existing_user:
        raise CompanyError("Admin email is already used", status_code=409)

    existing_login = User.query.filter(
        User.deleted_at.is_(None),
        func.lower(User.login_identifier) == login_identifier,
    ).first()
    if existing_login:
        raise CompanyError("Admin login identifier is already used", status_code=409)

    default_language = (payload.get("default_language") or "fr").strip().lower()
    if default_language not in ("fr", "en"):
        raise CompanyError("default_language must be fr or en", status_code=400)

    company = Company(
        legal_name=payload["legal_name"].strip(),
        trade_name=(payload.get("trade_name") or "").strip() or None,
        acronym=(payload.get("acronym") or "").strip() or None,
        registration_number=registration_number,
        tax_number=(payload.get("tax_number") or "").strip() or None,
        email=company_email,
        phone=(payload.get("phone") or "").strip() or None,
        country_code=payload.get("country_code", "FR").strip().upper(),
        country_name=(payload.get("country_name") or "").strip() or None,
        city=(payload.get("city") or "").strip() or None,
        address_line=(payload.get("address_line") or "").strip() or None,
        activity_domain=(payload.get("activity_domain") or "").strip() or None,
        logo_url=(payload.get("logo_url") or "").strip() or None,
        administrative_documents=payload.get("administrative_documents") or [],
        is_active=False,
        onboarding_status="pending",
        account_status="pending",
        subscription_status="pending",
    )
    db.session.add(company)
    db.session.flush()

    setting = CompanySetting(
        company_id=company.id,
        currency=(payload.get("currency") or "EUR").strip().upper(),
        timezone=(payload.get("timezone") or "Europe/Paris").strip(),
        default_language=default_language,
        date_format=(payload.get("date_format") or "DD/MM/YYYY").strip(),
        contact_person_name=(payload.get("contact_person_name") or "").strip() or None,
        contact_person_phone=(payload.get("contact_person_phone") or "").strip() or None,
        website_url=(payload.get("website_url") or "").strip() or None,
    )
    db.session.add(setting)

    ensure_permissions_exist(DEFAULT_PERMISSION_CODES)
    db.session.flush()

    admin_role, _ = ensure_company_admin_role(company.id)

    admin_user = User(
        company_id=company.id,
        login_identifier=login_identifier,
        email=admin_email,
        password_hash=hash_password(payload["admin_password"]),
        first_name=payload["admin_first_name"].strip(),
        last_name=payload["admin_last_name"].strip(),
        phone=(payload.get("admin_phone") or "").strip() or None,
        job_title=(payload.get("admin_job_title") or "Administrateur principal").strip(),
        department=(payload.get("admin_department") or "").strip() or None,
        preferred_language=default_language,
        user_type="company_admin",
        account_status="active",
        must_change_password=bool(payload.get("admin_must_change_password", False)),
        is_primary_admin=True,
        is_active=True,
    )
    db.session.add(admin_user)
    db.session.flush()

    db.session.add(UserRole(user_id=admin_user.id, role_id=admin_role.id, company_id=company.id))
    _maybe_create_subscription(company, payload)
    log_audit_event(
        module="companies",
        action="registration_submitted",
        company_id=company.id,
        actor_user_id=admin_user.id,
        actor_email=admin_user.email,
        target_type="company",
        target_id=company.id,
        description="Company onboarding request submitted",
        details={"company_name": company.legal_name},
    )
    db.session.commit()

    result = _serialize_company(company)
    result["admin_user_id"] = admin_user.id
    return result


def list_pending_companies() -> list[dict[str, Any]]:
    rows = (
        Company.query.filter(Company.onboarding_status.in_(["pending", "under_review", "info_requested"]))
        .order_by(Company.created_at.asc())
        .all()
    )
    return [_serialize_company(row) for row in rows]


def review_company(
    company_id: int,
    decision: str,
    *,
    note: str | None = None,
    rejection_reason: str | None = None,
    requested_information: str | None = None,
    reviewed_by_user_id: int | None = None,
) -> dict[str, Any]:
    company = Company.query.filter_by(id=company_id).first()
    if company is None:
        raise CompanyError("Company not found", status_code=404)

    allowed_decisions = {"approved", "rejected", "pending", "under_review", "info_requested", "suspended"}
    if decision not in allowed_decisions:
        raise CompanyError("Decision must be approved, rejected, pending, under_review, info_requested or suspended", status_code=400)

    now = datetime.now(timezone.utc)
    company.reviewed_at = now
    company.review_notes = note
    company.rejection_reason = rejection_reason
    company.requested_information = requested_information

    if decision == "approved":
        _apply_company_status(company, onboarding_status="approved", account_status="active", is_active=True)
        company.activated_at = now

        latest_subscription = (
            CompanySubscription.query.filter_by(company_id=company.id)
            .order_by(CompanySubscription.created_at.desc(), CompanySubscription.id.desc())
            .first()
        )
        if latest_subscription is not None:
            latest_subscription.status = "active"
            latest_subscription.validation_status = "validated"
            if latest_subscription.start_date is None:
                latest_subscription.start_date = date.today()

            if latest_subscription.end_date is None:
                plan = SubscriptionPlan.query.filter_by(id=latest_subscription.plan_id).first()
                if plan is not None:
                    latest_subscription.end_date = latest_subscription.start_date + timedelta(days=int(plan.duration_days))

            company.subscription_status = "active"
            latest_subscription.validated_by_user_id = reviewed_by_user_id
        else:
            company.subscription_status = "none"
    elif decision == "rejected":
        _apply_company_status(company, onboarding_status="rejected", account_status="rejected", is_active=False)
    elif decision == "suspended":
        _apply_company_status(company, onboarding_status="suspended", account_status="suspended", is_active=False)
    elif decision == "info_requested":
        _apply_company_status(company, onboarding_status="info_requested", account_status="pending", is_active=False)
    elif decision == "under_review":
        _apply_company_status(company, onboarding_status="under_review", account_status="pending", is_active=False)
    else:
        _apply_company_status(company, onboarding_status="pending", account_status="pending", is_active=False)

    log_audit_event(
        module="companies",
        action="review_updated",
        company_id=company.id,
        actor_user_id=reviewed_by_user_id,
        target_type="company",
        target_id=company.id,
        description="Company review decision updated",
        details={"decision": decision},
    )
    db.session.commit()

    return _serialize_company(company)


def get_company_with_settings(company_id: int) -> dict[str, Any]:
    company = Company.query.filter_by(id=company_id).first()
    if company is None:
        raise CompanyError("Company not found", status_code=404)

    return _serialize_company(company)


def update_company_settings(company_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    company = Company.query.filter_by(id=company_id).first()
    if company is None:
        raise CompanyError("Company not found", status_code=404)

    settings = CompanySetting.query.filter_by(company_id=company_id).first()
    if settings is None:
        settings = CompanySetting(company_id=company_id)
        db.session.add(settings)

    if "email" in payload:
        company.email = payload["email"].strip().lower()
    if "phone" in payload:
        company.phone = (payload["phone"] or "").strip() or None
    if "city" in payload:
        company.city = (payload["city"] or "").strip() or None
    if "address_line" in payload:
        company.address_line = (payload["address_line"] or "").strip() or None
    if "trade_name" in payload:
        company.trade_name = (payload["trade_name"] or "").strip() or None
    if "acronym" in payload:
        company.acronym = (payload["acronym"] or "").strip() or None
    if "country_name" in payload:
        company.country_name = (payload["country_name"] or "").strip() or None
    if "activity_domain" in payload:
        company.activity_domain = (payload["activity_domain"] or "").strip() or None
    if "logo_url" in payload:
        company.logo_url = (payload["logo_url"] or "").strip() or None
    if "administrative_documents" in payload:
        company.administrative_documents = payload["administrative_documents"] or []

    if "currency" in payload:
        currency = str(payload["currency"]).strip().upper()
        if len(currency) != 3:
            raise CompanyError("currency must be a 3-letter code", status_code=400)
        settings.currency = currency
    if "timezone" in payload:
        settings.timezone = str(payload["timezone"]).strip()
    if "default_language" in payload:
        language = str(payload["default_language"]).strip().lower()
        if language not in ("fr", "en"):
            raise CompanyError("default_language must be fr or en", status_code=400)
        settings.default_language = language
    if "date_format" in payload:
        settings.date_format = str(payload["date_format"]).strip()
    if "contact_person_name" in payload:
        settings.contact_person_name = (payload["contact_person_name"] or "").strip() or None
    if "contact_person_phone" in payload:
        settings.contact_person_phone = (payload["contact_person_phone"] or "").strip() or None
    if "website_url" in payload:
        settings.website_url = (payload["website_url"] or "").strip() or None

    log_audit_event(
        module="companies",
        action="settings_updated",
        company_id=company.id,
        actor_user_id=actor_user_id,
        target_type="company",
        target_id=company.id,
        description="Company profile updated",
        details={"updated_fields": sorted(list(payload.keys()))},
    )
    db.session.commit()
    return get_company_with_settings(company_id)
