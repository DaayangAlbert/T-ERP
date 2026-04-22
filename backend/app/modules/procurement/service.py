from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from app.extensions import db
from app.models.procurement import PublicTender, TenderChecklistItem, TenderSubmission
from app.models.user import User


class ProcurementError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _parse_date(raw_value: Any, field_name: str) -> date | None:
    if raw_value in (None, ""):
        return None
    try:
        return date.fromisoformat(str(raw_value))
    except ValueError as exc:
        raise ProcurementError(f"{field_name} must be in YYYY-MM-DD format", status_code=400) from exc


def _serialize_tender(row: PublicTender) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "reference": row.reference,
        "title": row.title,
        "contracting_authority": row.contracting_authority,
        "location": row.location,
        "description": row.description,
        "budget_estimate": float(row.budget_estimate) if row.budget_estimate is not None else None,
        "publication_date": row.publication_date.isoformat() if row.publication_date else None,
        "submission_deadline": row.submission_deadline.isoformat() if row.submission_deadline else None,
        "dao_url": row.dao_url,
        "source_url": row.source_url,
        "status": row.status,
    }


def _serialize_checklist_item(row: TenderChecklistItem) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "tender_id": row.tender_id,
        "label": row.label,
        "is_required": row.is_required,
        "is_completed": row.is_completed,
        "notes": row.notes,
    }


def _serialize_submission(row: TenderSubmission) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "tender_id": row.tender_id,
        "submitted_by_user_id": row.submitted_by_user_id,
        "status": row.status,
        "submission_amount": float(row.submission_amount) if row.submission_amount is not None else None,
        "submitted_at": row.submitted_at.isoformat() if row.submitted_at else None,
        "dao_package_url": row.dao_package_url,
        "notes": row.notes,
    }


def _require_company_user(company_id: int, user_id: int) -> User:
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None or user.deleted_at is not None or not user.is_active:
        raise ProcurementError("User not found in company", status_code=404)
    return user


def _require_tender(company_id: int, tender_id: int) -> PublicTender:
    row = PublicTender.query.filter_by(id=tender_id, company_id=company_id).first()
    if row is None or row.deleted_at is not None:
        raise ProcurementError("Tender not found", status_code=404)
    return row


def _require_submission(company_id: int, submission_id: int) -> TenderSubmission:
    row = TenderSubmission.query.filter_by(id=submission_id, company_id=company_id).first()
    if row is None:
        raise ProcurementError("Submission not found", status_code=404)
    return row


def list_tenders(company_id: int, status: str | None = None, include_archived: bool = False) -> list[dict[str, Any]]:
    query = PublicTender.query.filter(PublicTender.company_id == company_id)
    if not include_archived:
        query = query.filter(PublicTender.deleted_at.is_(None))
    if status:
        query = query.filter(PublicTender.status == status)
    rows = query.order_by(PublicTender.submission_deadline.asc(), PublicTender.created_at.desc()).all()
    return [_serialize_tender(row) for row in rows]


def create_tender(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    reference = str(payload.get("reference") or "").strip().upper()
    title = str(payload.get("title") or "").strip()
    authority = str(payload.get("contracting_authority") or "").strip()
    if not reference:
        raise ProcurementError("Missing field: reference", status_code=400)
    if not title:
        raise ProcurementError("Missing field: title", status_code=400)
    if not authority:
        raise ProcurementError("Missing field: contracting_authority", status_code=400)

    exists = PublicTender.query.filter_by(company_id=company_id, reference=reference).first()
    if exists and exists.deleted_at is None:
        raise ProcurementError("reference already exists", status_code=409)

    status = str(payload.get("status") or "monitoring").strip().lower()
    if status not in {"draft", "monitoring", "preparing", "submitted", "awarded", "lost", "cancelled"}:
        raise ProcurementError("Invalid tender status", status_code=400)

    budget_estimate = payload.get("budget_estimate")
    parsed_budget = None
    if budget_estimate not in (None, ""):
        parsed_budget = Decimal(str(budget_estimate))
        if parsed_budget < 0:
            raise ProcurementError("budget_estimate cannot be negative", status_code=400)

    publication_date = _parse_date(payload.get("publication_date"), "publication_date")
    submission_deadline = _parse_date(payload.get("submission_deadline"), "submission_deadline")
    if publication_date and submission_deadline and submission_deadline < publication_date:
        raise ProcurementError("submission_deadline cannot be before publication_date", status_code=400)

    row = PublicTender(
        company_id=company_id,
        reference=reference,
        title=title,
        contracting_authority=authority,
        location=(payload.get("location") or "").strip() or None,
        description=(payload.get("description") or "").strip() or None,
        budget_estimate=parsed_budget,
        publication_date=publication_date,
        submission_deadline=submission_deadline,
        dao_url=(payload.get("dao_url") or "").strip() or None,
        source_url=(payload.get("source_url") or "").strip() or None,
        status=status,
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_tender(row)


def update_tender(company_id: int, tender_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _require_tender(company_id=company_id, tender_id=tender_id)

    if "title" in payload:
        title = str(payload["title"]).strip()
        if not title:
            raise ProcurementError("title cannot be empty", status_code=400)
        row.title = title

    if "contracting_authority" in payload:
        authority = str(payload["contracting_authority"]).strip()
        if not authority:
            raise ProcurementError("contracting_authority cannot be empty", status_code=400)
        row.contracting_authority = authority

    if "location" in payload:
        row.location = (payload["location"] or "").strip() or None
    if "description" in payload:
        row.description = (payload["description"] or "").strip() or None
    if "dao_url" in payload:
        row.dao_url = (payload["dao_url"] or "").strip() or None
    if "source_url" in payload:
        row.source_url = (payload["source_url"] or "").strip() or None
    if "publication_date" in payload:
        row.publication_date = _parse_date(payload.get("publication_date"), "publication_date")
    if "submission_deadline" in payload:
        row.submission_deadline = _parse_date(payload.get("submission_deadline"), "submission_deadline")

    if row.publication_date and row.submission_deadline and row.submission_deadline < row.publication_date:
        raise ProcurementError("submission_deadline cannot be before publication_date", status_code=400)

    if "budget_estimate" in payload:
        budget_estimate = payload.get("budget_estimate")
        if budget_estimate in (None, ""):
            row.budget_estimate = None
        else:
            parsed_budget = Decimal(str(budget_estimate))
            if parsed_budget < 0:
                raise ProcurementError("budget_estimate cannot be negative", status_code=400)
            row.budget_estimate = parsed_budget

    if "status" in payload:
        status = str(payload["status"]).strip().lower()
        if status not in {"draft", "monitoring", "preparing", "submitted", "awarded", "lost", "cancelled"}:
            raise ProcurementError("Invalid tender status", status_code=400)
        row.status = status

    db.session.commit()
    return _serialize_tender(row)


def list_checklist_items(company_id: int, tender_id: int) -> list[dict[str, Any]]:
    _require_tender(company_id=company_id, tender_id=tender_id)
    rows = TenderChecklistItem.query.filter_by(company_id=company_id, tender_id=tender_id).order_by(TenderChecklistItem.id.asc()).all()
    return [_serialize_checklist_item(row) for row in rows]


def create_checklist_item(company_id: int, tender_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _require_tender(company_id=company_id, tender_id=tender_id)
    label = str(payload.get("label") or "").strip()
    if not label:
        raise ProcurementError("Missing field: label", status_code=400)
    row = TenderChecklistItem(
        company_id=company_id,
        tender_id=tender_id,
        label=label,
        is_required=bool(payload.get("is_required", True)),
        is_completed=bool(payload.get("is_completed", False)),
        notes=(payload.get("notes") or "").strip() or None,
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_checklist_item(row)


def list_submissions(company_id: int, tender_id: int | None = None, status: str | None = None) -> list[dict[str, Any]]:
    query = TenderSubmission.query.filter(TenderSubmission.company_id == company_id)
    if tender_id is not None:
        query = query.filter(TenderSubmission.tender_id == tender_id)
    if status:
        query = query.filter(TenderSubmission.status == status)
    rows = query.order_by(TenderSubmission.created_at.desc()).all()
    return [_serialize_submission(row) for row in rows]


def create_submission(
    company_id: int,
    tender_id: int,
    submitted_by_user_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    tender = _require_tender(company_id=company_id, tender_id=tender_id)
    _require_company_user(company_id=company_id, user_id=submitted_by_user_id)

    existing = TenderSubmission.query.filter_by(company_id=company_id, tender_id=tender_id).first()
    if existing:
        raise ProcurementError("Submission already exists for this tender", status_code=409)

    status = str(payload.get("status") or "draft").strip().lower()
    if status not in {"draft", "submitted", "under_review", "awarded", "lost", "cancelled"}:
        raise ProcurementError("Invalid submission status", status_code=400)

    submission_amount = payload.get("submission_amount")
    parsed_amount = None
    if submission_amount not in (None, ""):
        parsed_amount = Decimal(str(submission_amount))
        if parsed_amount < 0:
            raise ProcurementError("submission_amount cannot be negative", status_code=400)

    row = TenderSubmission(
        company_id=company_id,
        tender_id=tender.id,
        submitted_by_user_id=submitted_by_user_id,
        status=status,
        submission_amount=parsed_amount,
        submitted_at=datetime.now(timezone.utc) if status != "draft" else None,
        dao_package_url=(payload.get("dao_package_url") or "").strip() or None,
        notes=(payload.get("notes") or "").strip() or None,
    )
    if status in {"submitted", "under_review"}:
        tender.status = "submitted"
    db.session.add(row)
    db.session.commit()
    return _serialize_submission(row)


def update_submission(company_id: int, submission_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _require_submission(company_id=company_id, submission_id=submission_id)
    tender = _require_tender(company_id=company_id, tender_id=row.tender_id)

    if "status" in payload:
        status = str(payload["status"]).strip().lower()
        if status not in {"draft", "submitted", "under_review", "awarded", "lost", "cancelled"}:
            raise ProcurementError("Invalid submission status", status_code=400)
        row.status = status
        if status == "submitted" and row.submitted_at is None:
            row.submitted_at = datetime.now(timezone.utc)
        if status == "awarded":
            tender.status = "awarded"
        elif status == "lost":
            tender.status = "lost"
        elif status in {"submitted", "under_review"}:
            tender.status = "submitted"

    if "submission_amount" in payload:
        submission_amount = payload.get("submission_amount")
        if submission_amount in (None, ""):
            row.submission_amount = None
        else:
            parsed_amount = Decimal(str(submission_amount))
            if parsed_amount < 0:
                raise ProcurementError("submission_amount cannot be negative", status_code=400)
            row.submission_amount = parsed_amount

    if "dao_package_url" in payload:
        row.dao_package_url = (payload.get("dao_package_url") or "").strip() or None
    if "notes" in payload:
        row.notes = (payload.get("notes") or "").strip() or None

    db.session.commit()
    return _serialize_submission(row)


def procurement_summary(company_id: int) -> dict[str, Any]:
    tenders = PublicTender.query.filter(
        PublicTender.company_id == company_id,
        PublicTender.deleted_at.is_(None),
    ).all()
    submissions = TenderSubmission.query.filter(TenderSubmission.company_id == company_id).all()
    checklist_items = TenderChecklistItem.query.filter(TenderChecklistItem.company_id == company_id).all()

    return {
        "company_id": company_id,
        "counts": {
            "tenders": len(tenders),
            "submissions": len(submissions),
            "awarded": len([row for row in submissions if row.status == "awarded"]),
            "lost": len([row for row in submissions if row.status == "lost"]),
            "checklist_items": len(checklist_items),
            "completed_checklist_items": len([row for row in checklist_items if row.is_completed]),
        },
    }
