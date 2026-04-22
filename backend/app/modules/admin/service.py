from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func

from app.core.audit import log_audit_event, serialize_audit_log
from app.extensions import db
from app.models.admin import AuditLog, CompanySubscription, SubscriptionPlan
from app.models.calls import CallSession
from app.models.chat import ChatConversation
from app.models.company import Company, CompanySetting
from app.models.finance import FinanceEntry, Invoice
from app.models.inventory import InventoryItem
from app.models.procurement import PublicTender
from app.models.project import Project
from app.models.recruitment import JobOffer
from app.models.user import Role, User, UserRole
from app.modules.companies.service import CompanyError, get_company_with_settings, register_company, review_company


def _serialize_plan(plan: SubscriptionPlan) -> dict[str, Any]:
    return {
        "id": plan.id,
        "code": plan.code,
        "name": plan.name,
        "description": plan.description,
        "duration_days": plan.duration_days,
        "price_amount": float(plan.price_amount or 0),
        "currency": plan.currency,
        "is_active": plan.is_active,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }


def _serialize_subscription(row: CompanySubscription) -> dict[str, Any]:
    plan = SubscriptionPlan.query.filter_by(id=row.plan_id).first()
    return {
        "id": row.id,
        "company_id": row.company_id,
        "plan_id": row.plan_id,
        "plan": _serialize_plan(plan) if plan else None,
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


def _get_company(company_id: int) -> Company:
    company = Company.query.filter_by(id=company_id).first()
    if company is None:
        raise CompanyError("Company not found", status_code=404)
    return company


def _sync_company_from_subscription(company: Company, status: str) -> None:
    company.subscription_status = status
    if status == "active" and company.onboarding_status == "approved" and company.account_status != "rejected":
        company.account_status = "active"
        company.is_active = True
    elif status == "expired" and company.account_status != "rejected":
        company.account_status = "expired"
        company.is_active = False
    elif status == "suspended" and company.account_status != "rejected":
        company.account_status = "suspended"
        company.is_active = False


def _activity_level(user_id: int) -> str:
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    total = (
        AuditLog.query.filter(AuditLog.actor_user_id == user_id, AuditLog.created_at >= cutoff).count()
        or 0
    )
    if total >= 20:
        return "high"
    if total >= 5:
        return "medium"
    return "low"


def get_platform_stats() -> dict[str, Any]:
    companies = Company.query.order_by(Company.created_at.asc()).all()
    total_companies = len(companies)
    approved_companies = sum(1 for row in companies if row.onboarding_status == "approved")
    pending_companies = sum(1 for row in companies if row.onboarding_status in {"pending", "under_review", "info_requested"})
    rejected_companies = sum(1 for row in companies if row.onboarding_status == "rejected")
    active_companies = sum(1 for row in companies if row.account_status == "active")
    suspended_companies = sum(1 for row in companies if row.account_status == "suspended")
    expired_companies = sum(1 for row in companies if row.account_status == "expired")

    subscriptions = CompanySubscription.query.all()
    active_subscriptions = sum(1 for row in subscriptions if row.status == "active")
    expired_subscriptions = sum(1 for row in subscriptions if row.status == "expired")
    suspended_subscriptions = sum(1 for row in subscriptions if row.status == "suspended")
    pending_subscriptions = sum(1 for row in subscriptions if row.status in {"pending", "in_validation"})

    users = User.query.filter(User.deleted_at.is_(None), User.user_type != "super_admin").all()
    total_users = len(users)
    active_users = sum(1 for row in users if row.account_status == "active" and row.is_active)
    users_by_type = dict(Counter(row.user_type for row in users))

    by_company_rows = (
        db.session.query(Company.id, Company.legal_name, func.count(User.id))
        .outerjoin(User, (User.company_id == Company.id) & (User.deleted_at.is_(None)))
        .group_by(Company.id, Company.legal_name)
        .order_by(Company.legal_name.asc())
        .all()
    )
    users_by_company = [
        {
            "company_id": row[0],
            "company_name": row[1],
            "user_count": row[2],
        }
        for row in by_company_rows
    ]

    month_counts: dict[str, int] = defaultdict(int)
    for company in companies:
        if company.created_at:
            month_key = company.created_at.strftime("%Y-%m")
            month_counts[month_key] += 1

    registrations_trend = [
        {"month": key, "count": month_counts[key]}
        for key in sorted(month_counts.keys())
    ]

    today = date.today()
    expiring_subscriptions = sum(
        1
        for row in subscriptions
        if row.status == "active" and row.end_date is not None and 0 <= (row.end_date - today).days <= 30
    )

    recent_cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recently_active_company_ids = {
        row.company_id
        for row in AuditLog.query.filter(AuditLog.company_id.isnot(None), AuditLog.created_at >= recent_cutoff).all()
        if row.company_id is not None
    }
    inactive_companies = sum(
        1 for row in companies if row.account_status == "active" and row.id not in recently_active_company_ids
    )

    return {
        "companies": {
            "total": total_companies,
            "active": active_companies,
            "pending": pending_companies,
            "approved": approved_companies,
            "rejected": rejected_companies,
            "suspended": suspended_companies,
            "expired": expired_companies,
        },
        "subscriptions": {
            "active": active_subscriptions,
            "expired": expired_subscriptions,
            "suspended": suspended_subscriptions,
            "pending": pending_subscriptions,
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "by_type": users_by_type,
            "by_company": users_by_company,
        },
        "registrations_trend": registrations_trend,
        "pending_requests": pending_companies,
        "alerts": {
            "expiring_subscriptions": expiring_subscriptions,
            "inactive_companies": inactive_companies,
            "suspended_companies": suspended_companies,
            "pending_validations": pending_companies,
        },
    }


def list_all_companies() -> list[dict[str, Any]]:
    companies = Company.query.order_by(Company.created_at.desc()).all()
    return [get_company_with_settings(company.id) for company in companies]


def get_company_detail(company_id: int) -> dict[str, Any]:
    return get_company_with_settings(company_id)


def create_company(payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    company = register_company(payload)
    decision = payload.get("initial_review_decision", "approved")

    if decision != "pending":
        review_company(
            company["id"],
            decision,
            note="Company created manually by super admin",
            reviewed_by_user_id=actor_user_id,
        )

    log_audit_event(
        module="admin",
        action="company_created",
        company_id=company["id"],
        actor_user_id=actor_user_id,
        target_type="company",
        target_id=company["id"],
        description="Company created by super admin",
    )
    db.session.commit()
    return get_company_with_settings(company["id"])


def update_company(company_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    company = _get_company(company_id)

    if "legal_name" in payload:
        company.legal_name = payload["legal_name"].strip()
    if "trade_name" in payload:
        company.trade_name = (payload["trade_name"] or "").strip() or None
    if "acronym" in payload:
        company.acronym = (payload["acronym"] or "").strip() or None
    if "registration_number" in payload:
        company.registration_number = payload["registration_number"].strip()
    if "tax_number" in payload:
        company.tax_number = (payload["tax_number"] or "").strip() or None
    if "email" in payload:
        company.email = payload["email"].strip().lower()
    if "phone" in payload:
        company.phone = (payload["phone"] or "").strip() or None
    if "country_code" in payload:
        company.country_code = payload["country_code"].strip().upper()
    if "country_name" in payload:
        company.country_name = (payload["country_name"] or "").strip() or None
    if "city" in payload:
        company.city = (payload["city"] or "").strip() or None
    if "address_line" in payload:
        company.address_line = (payload["address_line"] or "").strip() or None
    if "activity_domain" in payload:
        company.activity_domain = (payload["activity_domain"] or "").strip() or None
    if "logo_url" in payload:
        company.logo_url = (payload["logo_url"] or "").strip() or None
    if "administrative_documents" in payload:
        company.administrative_documents = payload["administrative_documents"] or []

    settings = CompanySetting.query.filter_by(company_id=company_id).first()
    if settings is None:
        settings = CompanySetting(company_id=company_id)
        db.session.add(settings)

    if "contact_person_name" in payload:
        settings.contact_person_name = (payload["contact_person_name"] or "").strip() or None
    if "contact_person_phone" in payload:
        settings.contact_person_phone = (payload["contact_person_phone"] or "").strip() or None
    if "website_url" in payload:
        settings.website_url = (payload["website_url"] or "").strip() or None

    log_audit_event(
        module="admin",
        action="company_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="company",
        target_id=company_id,
        description="Company updated by super admin",
        details={"updated_fields": sorted(list(payload.keys()))},
    )
    db.session.commit()
    return get_company_with_settings(company_id)


def update_company_status(company_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    company = _get_company(company_id)
    status = payload["account_status"].strip().lower()
    note = (payload.get("note") or "").strip() or None

    if status == "active":
        company.account_status = "active"
        company.onboarding_status = "approved"
        company.is_active = True
        company.activated_at = company.activated_at or datetime.now(timezone.utc)
    elif status == "suspended":
        company.account_status = "suspended"
        company.onboarding_status = "suspended"
        company.is_active = False
    elif status == "expired":
        company.account_status = "expired"
        company.is_active = False
        company.subscription_status = "expired"
    elif status == "rejected":
        company.account_status = "rejected"
        company.onboarding_status = "rejected"
        company.is_active = False
    else:
        company.account_status = "pending"
        company.onboarding_status = "pending"
        company.is_active = False

    company.review_notes = note
    log_audit_event(
        module="admin",
        action="company_status_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="company",
        target_id=company_id,
        description="Company account status updated",
        details={"account_status": status, "note": note},
    )
    db.session.commit()
    return get_company_with_settings(company_id)


def list_subscription_plans() -> list[dict[str, Any]]:
    rows = SubscriptionPlan.query.order_by(SubscriptionPlan.price_amount.asc(), SubscriptionPlan.duration_days.asc()).all()
    return [_serialize_plan(row) for row in rows]


def create_subscription_plan(payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    code = payload["code"].strip().lower()
    existing = SubscriptionPlan.query.filter(func.lower(SubscriptionPlan.code) == code).first()
    if existing is not None:
        raise CompanyError("Subscription plan code already exists", status_code=409)

    plan = SubscriptionPlan(
        code=code,
        name=payload["name"].strip(),
        description=(payload.get("description") or "").strip() or None,
        duration_days=payload["duration_days"],
        price_amount=payload["price_amount"],
        currency=payload["currency"].strip().upper(),
        is_active=bool(payload.get("is_active", True)),
    )
    db.session.add(plan)
    db.session.flush()

    log_audit_event(
        module="admin",
        action="subscription_plan_created",
        actor_user_id=actor_user_id,
        target_type="subscription_plan",
        target_id=plan.id,
        description="Subscription plan created",
        details={"code": plan.code},
    )
    db.session.commit()
    return _serialize_plan(plan)


def update_subscription_plan(plan_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    plan = SubscriptionPlan.query.filter_by(id=plan_id).first()
    if plan is None:
        raise CompanyError("Subscription plan not found", status_code=404)

    if "code" in payload:
        next_code = payload["code"].strip().lower()
        exists = SubscriptionPlan.query.filter(func.lower(SubscriptionPlan.code) == next_code, SubscriptionPlan.id != plan.id).first()
        if exists is not None:
            raise CompanyError("Subscription plan code already exists", status_code=409)
        plan.code = next_code
    if "name" in payload:
        plan.name = payload["name"].strip()
    if "description" in payload:
        plan.description = (payload["description"] or "").strip() or None
    if "duration_days" in payload:
        plan.duration_days = payload["duration_days"]
    if "price_amount" in payload:
        plan.price_amount = payload["price_amount"]
    if "currency" in payload:
        plan.currency = payload["currency"].strip().upper()
    if "is_active" in payload:
        plan.is_active = bool(payload["is_active"])

    log_audit_event(
        module="admin",
        action="subscription_plan_updated",
        actor_user_id=actor_user_id,
        target_type="subscription_plan",
        target_id=plan.id,
        description="Subscription plan updated",
        details={"updated_fields": sorted(list(payload.keys()))},
    )
    db.session.commit()
    return _serialize_plan(plan)


def list_company_subscriptions(company_id: int) -> list[dict[str, Any]]:
    _get_company(company_id)
    rows = (
        CompanySubscription.query.filter_by(company_id=company_id)
        .order_by(CompanySubscription.created_at.desc(), CompanySubscription.id.desc())
        .all()
    )
    return [_serialize_subscription(row) for row in rows]


def create_company_subscription(company_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    company = _get_company(company_id)
    plan = SubscriptionPlan.query.filter_by(id=payload["plan_id"]).first()
    if plan is None:
        raise CompanyError("Subscription plan not found", status_code=404)

    row = CompanySubscription(
        company_id=company_id,
        plan_id=plan.id,
        validated_by_user_id=actor_user_id,
        status=payload.get("status", "pending"),
        validation_status=payload.get("validation_status", "pending"),
        start_date=payload.get("start_date"),
        end_date=payload.get("end_date"),
        amount_paid=payload.get("amount_paid") or 0,
        payment_method=(payload.get("payment_method") or "").strip() or None,
        transaction_reference=(payload.get("transaction_reference") or "").strip() or None,
        notes=(payload.get("notes") or "").strip() or None,
    )
    if row.start_date and row.end_date is None:
        row.end_date = row.start_date + timedelta(days=int(plan.duration_days))

    db.session.add(row)
    db.session.flush()
    _sync_company_from_subscription(company, row.status)
    log_audit_event(
        module="admin",
        action="company_subscription_created",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="company_subscription",
        target_id=row.id,
        description="Company subscription created",
        details={"plan_id": plan.id, "status": row.status},
    )
    db.session.commit()
    return _serialize_subscription(row)


def update_company_subscription(subscription_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    row = CompanySubscription.query.filter_by(id=subscription_id).first()
    if row is None:
        raise CompanyError("Subscription not found", status_code=404)

    if "status" in payload:
        row.status = payload["status"]
    if "validation_status" in payload:
        row.validation_status = payload["validation_status"]
    if "start_date" in payload:
        row.start_date = payload.get("start_date")
    if "end_date" in payload:
        row.end_date = payload.get("end_date")
    if "amount_paid" in payload:
        row.amount_paid = payload.get("amount_paid") or 0
    if "payment_method" in payload:
        row.payment_method = (payload.get("payment_method") or "").strip() or None
    if "transaction_reference" in payload:
        row.transaction_reference = (payload.get("transaction_reference") or "").strip() or None
    if "notes" in payload:
        row.notes = (payload.get("notes") or "").strip() or None
    row.validated_by_user_id = actor_user_id

    company = _get_company(row.company_id)
    _sync_company_from_subscription(company, row.status)
    log_audit_event(
        module="admin",
        action="company_subscription_updated",
        company_id=row.company_id,
        actor_user_id=actor_user_id,
        target_type="company_subscription",
        target_id=row.id,
        description="Company subscription updated",
        details={"updated_fields": sorted(list(payload.keys()))},
    )
    db.session.commit()
    return _serialize_subscription(row)


def assign_company_primary_admin(company_id: int, user_id: int, actor_user_id: int | None = None) -> dict[str, Any]:
    _get_company(company_id)
    target_user = User.query.filter_by(id=user_id, company_id=company_id).filter(User.deleted_at.is_(None)).first()
    if target_user is None:
        raise CompanyError("User not found in company", status_code=404)

    if target_user.user_type != "company_admin":
        target_user.user_type = "company_admin"

    for row in User.query.filter_by(company_id=company_id).filter(User.deleted_at.is_(None)).all():
        row.is_primary_admin = row.id == user_id

    log_audit_event(
        module="admin",
        action="primary_admin_assigned",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="user",
        target_id=user_id,
        description="Primary company admin assigned",
    )
    db.session.commit()
    return get_company_with_settings(company_id)


def delete_company(company_id: int, actor_user_id: int | None = None) -> dict[str, Any]:
    company = _get_company(company_id)

    blockers = {
        "projects": Project.query.filter(Project.company_id == company_id, Project.deleted_at.is_(None)).count(),
        "inventory_items": InventoryItem.query.filter(InventoryItem.company_id == company_id, InventoryItem.deleted_at.is_(None)).count(),
        "finance_entries": FinanceEntry.query.filter(FinanceEntry.company_id == company_id, FinanceEntry.deleted_at.is_(None)).count(),
        "invoices": Invoice.query.filter(Invoice.company_id == company_id, Invoice.deleted_at.is_(None)).count(),
        "tenders": PublicTender.query.filter(PublicTender.company_id == company_id, PublicTender.deleted_at.is_(None)).count(),
        "job_offers": JobOffer.query.filter(JobOffer.company_id == company_id, JobOffer.deleted_at.is_(None)).count(),
        "chat_conversations": ChatConversation.query.filter(ChatConversation.company_id == company_id, ChatConversation.deleted_at.is_(None)).count(),
        "call_sessions": CallSession.query.filter(CallSession.company_id == company_id).count(),
    }
    blockers = {key: value for key, value in blockers.items() if value}
    if blockers:
        raise CompanyError(
            "Company cannot be deleted while business records still exist",
            status_code=409,
            details={"blockers": blockers},
        )

    role_ids = [row.id for row in Role.query.filter_by(company_id=company_id).all()]
    UserRole.query.filter_by(company_id=company_id).delete(synchronize_session=False)
    if role_ids:
        from app.models.user import RolePermission  # local import keeps module load light

        RolePermission.query.filter(RolePermission.role_id.in_(role_ids)).delete(synchronize_session=False)
    Role.query.filter_by(company_id=company_id).delete(synchronize_session=False)
    CompanySubscription.query.filter_by(company_id=company_id).delete(synchronize_session=False)
    CompanySetting.query.filter_by(company_id=company_id).delete(synchronize_session=False)
    AuditLog.query.filter_by(company_id=company_id).delete(synchronize_session=False)
    User.query.filter_by(company_id=company_id).delete(synchronize_session=False)
    db.session.delete(company)

    log_audit_event(
        module="admin",
        action="company_deleted",
        actor_user_id=actor_user_id,
        target_type="company",
        target_id=company_id,
        description="Company deleted by super admin",
        details={"legal_name": company.legal_name},
    )
    db.session.commit()
    return {"id": company_id, "deleted": True}


def list_all_users(page: int = 1, per_page: int = 25) -> dict[str, Any]:
    query = User.query.filter(User.deleted_at.is_(None), User.user_type != "super_admin").order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    items = []
    for user in pagination.items:
        company = Company.query.filter_by(id=user.company_id).first() if user.company_id else None
        items.append(
            {
                "id": user.id,
                "email": user.email,
                "login_identifier": user.login_identifier,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "user_type": user.user_type,
                "account_status": user.account_status,
                "is_active": user.is_active,
                "company_id": user.company_id,
                "company_name": company.legal_name if company else None,
                "job_title": user.job_title,
                "department": user.department,
                "preferred_language": user.preferred_language,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "activity_level": _activity_level(user.id),
                "roles": [
                    role.code
                    for role in db.session.query(Role)
                    .join(UserRole, UserRole.role_id == Role.id)
                    .filter(UserRole.user_id == user.id)
                    .all()
                ],
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        )

    return {
        "items": items,
        "pagination": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        },
    }


def list_platform_audit_logs(*, company_id: int | None = None, user_id: int | None = None, limit: int = 100) -> dict[str, Any]:
    query = AuditLog.query
    if company_id is not None:
        query = query.filter(AuditLog.company_id == company_id)
    if user_id is not None:
        query = query.filter(AuditLog.actor_user_id == user_id)

    rows = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit).all()
    return {"items": [serialize_audit_log(row) for row in rows], "count": len(rows)}
