from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from flask import send_file
from sqlalchemy import func, or_

from app.core.audit import log_audit_event, serialize_audit_log
from app.core.operational_profiles import infer_operational_profile_code
from app.core.file_storage import get_stored_file_name, resolve_stored_file
from app.extensions import db
from app.models import (
    AttendanceRecord,
    AuditLog,
    Company,
    CompanySetting,
    EmployeePayrollProfile,
    Permission,
    PayrollLeaveRequest,
    PayrollPeriod,
    PayrollPeriodInput,
    PayrollRun,
    PayrollRunItem,
    Role,
    RolePermission,
    User,
    UserRole,
)

from .data_loader import load_company_info, load_employee_data, load_payroll_config
from .main import DEFAULT_COMPANY_PATH, DEFAULT_CONFIG_PATH, PayrollBatchProcessor
from .models import CompanyInfo, EmployeePayrollData, PayrollLine, PayrollResult
from .utils import format_currency_fr, format_rate_fr, month_label_fr


BACKEND_DIR = Path(__file__).resolve().parents[3]
MODULE_DIR = Path(__file__).resolve().parent
MODULE_OUTPUT_ROOT = MODULE_DIR / "output"
MANAGED_API_OUTPUT_ROOT = MODULE_OUTPUT_ROOT / "companies"
ZERO = Decimal("0")
DATABASE_PAYROLL_USER_TYPES = ("employee", "company_admin")
PAYMENT_METHOD_LABELS = {
    "cash": "EN ESPECE",
    "bank_transfer": "VIREMENT BANCAIRE",
    "mobile_money": "MOBILE MONEY",
    "check": "CHEQUE",
    "other": "AUTRE",
}
PAYROLL_LEAVE_PENDING_STATUSES = {"draft", "submitted", "received", "in_review", "processing"}
PAYROLL_LEAVE_APPROVED_STATUSES = {"approved", "resolved"}
PAYROLL_LEAVE_REJECTED_STATUSES = {"rejected"}
ATTENDANCE_SYNCABLE_LEAVE_TYPES = {"paid_leave", "permission", "sick_leave", "exceptional_leave", "absence_justification"}
ATTENDANCE_LEAVE_NOTE_PREFIX = "payroll_leave_request:"
LEAVE_WORKFLOW_STAGE_LABELS = {
    "manager_review": "Validation manager",
    "hr_review": "Validation RH",
    "direction_review": "Validation direction",
}
LEAVE_WORKFLOW_ACTION_LABELS = {
    "approve": "Approuve",
    "reject": "Rejete",
}
LEAVE_WORKFLOW_STAGE_PROFILE_CODES = {
    "manager_review": {"chef_chantier", "chef_projet", "conducteur_travaux"},
    "hr_review": {"responsable_rh", "rh_recruteur"},
    "direction_review": {"directeur_general", "directeur_administratif", "daf"},
}
LEAVE_WORKFLOW_FULL_ACCESS_PROFILE_CODES = {"company_admin", "daf", "responsable_rh", "rh_recruteur", "super_admin"}
LEAVE_WORKFLOW_AUDIT_ACTIONS = {
    "leave_request_submitted",
    "leave_request_status_updated",
    "leave_request_workflow_decision",
}


class PayrollServiceError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "payroll_error",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def payroll_status_payload(company_id: int | None = None) -> dict[str, Any]:
    config = load_payroll_config(DEFAULT_CONFIG_PATH)
    return {
        "module": "payroll",
        "status": "ready",
        "tenant_id": company_id,
        "managed_output_root": _backend_relative(MANAGED_API_OUTPUT_ROOT),
        "default_company_path": _backend_relative(DEFAULT_COMPANY_PATH),
        "default_config_path": _backend_relative(DEFAULT_CONFIG_PATH),
        "supported_source_types": ["file", "inline"],
        "supported_generation_modes": ["file_batch", "inline_batch", "database_period"],
        "supported_file_formats": [".xlsx", ".csv", ".json"],
        "cnps_ceiling": _decimal_to_float(config.cnps_ceiling),
    }


def _iter_inclusive_dates(start_date: date, end_date: date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def _build_leave_attendance_note(row: PayrollLeaveRequest) -> str:
    prefix = f"{ATTENDANCE_LEAVE_NOTE_PREFIX}{row.id}"
    details = [row.type, _clean_string(row.title), _clean_string(row.reason)]
    suffix = " | ".join(part for part in details if part)
    return f"{prefix} | {suffix}" if suffix else prefix


def _is_leave_synced_attendance_record(notes: str | None, *, leave_request_id: int | None = None) -> bool:
    prefix = ATTENDANCE_LEAVE_NOTE_PREFIX if leave_request_id is None else f"{ATTENDANCE_LEAVE_NOTE_PREFIX}{leave_request_id}"
    return str(notes or "").startswith(prefix)


def _sync_attendance_for_leave_request(
    company_id: int,
    *,
    row: PayrollLeaveRequest,
    actor_user_id: int | None,
) -> dict[str, Any]:
    result = {
        "eligible": row.type in ATTENDANCE_SYNCABLE_LEAVE_TYPES,
        "mode": "absent_records" if row.type in ATTENDANCE_SYNCABLE_LEAVE_TYPES else "none",
        "applied_days": 0,
        "removed_days": 0,
        "conflict_days": 0,
        "conflict_dates": [],
    }
    if row.type not in ATTENDANCE_SYNCABLE_LEAVE_TYPES:
        return result

    note_prefix = f"{ATTENDANCE_LEAVE_NOTE_PREFIX}{row.id}"
    synced_rows = (
        AttendanceRecord.query.filter(
            AttendanceRecord.company_id == company_id,
            AttendanceRecord.user_id == row.user_id,
            AttendanceRecord.notes.like(f"{note_prefix}%"),
        )
        .order_by(AttendanceRecord.attendance_date.asc(), AttendanceRecord.id.asc())
        .all()
    )
    synced_rows_by_date = {record.attendance_date: record for record in synced_rows}

    if row.status in PAYROLL_LEAVE_APPROVED_STATUSES:
        note = _build_leave_attendance_note(row)
        touched_ids: set[int] = set()
        validated_at = datetime.now(UTC)

        for current_date in _iter_inclusive_dates(row.start_date, row.end_date):
            existing_row = AttendanceRecord.query.filter_by(
                company_id=company_id,
                user_id=row.user_id,
                attendance_date=current_date,
            ).first()
            if existing_row is not None and not _is_leave_synced_attendance_record(existing_row.notes, leave_request_id=row.id):
                result["conflict_days"] += 1
                result["conflict_dates"].append(current_date.isoformat())
                continue

            if existing_row is None:
                existing_row = AttendanceRecord(
                    company_id=company_id,
                    user_id=row.user_id,
                    attendance_date=current_date,
                    status="absent",
                    arrival_time=None,
                    departure_time=None,
                    minutes_late=0,
                    overtime_minutes=0,
                    notes=note,
                    source="manager",
                    created_by_user_id=actor_user_id or row.reviewed_by_user_id or row.user_id,
                    updated_by_user_id=actor_user_id or row.reviewed_by_user_id or row.user_id,
                    validated_by_user_id=actor_user_id or row.reviewed_by_user_id,
                    validated_at=validated_at,
                )
                db.session.add(existing_row)
            else:
                existing_row.status = "absent"
                existing_row.arrival_time = None
                existing_row.departure_time = None
                existing_row.minutes_late = 0
                existing_row.overtime_minutes = 0
                existing_row.notes = note
                existing_row.source = "manager"
                existing_row.updated_by_user_id = actor_user_id or row.reviewed_by_user_id or existing_row.updated_by_user_id
                existing_row.validated_by_user_id = actor_user_id or row.reviewed_by_user_id or existing_row.validated_by_user_id
                existing_row.validated_at = validated_at
            db.session.flush()
            touched_ids.add(existing_row.id)
            result["applied_days"] += 1

        for synced_row in synced_rows:
            if synced_row.id in touched_ids:
                continue
            db.session.delete(synced_row)
            result["removed_days"] += 1
        return result

    for synced_row in synced_rows:
        db.session.delete(synced_row)
        result["removed_days"] += 1
    return result


def _resolve_payroll_summary_period(
    company_id: int,
    *,
    user_id: int,
) -> tuple[PayrollPeriodInput | None, PayrollPeriod | None, date, date, str, str | None]:
    latest_input_row = (
        db.session.query(PayrollPeriodInput, PayrollPeriod)
        .join(PayrollPeriod, PayrollPeriod.id == PayrollPeriodInput.payroll_period_id)
        .filter(
            PayrollPeriodInput.company_id == company_id,
            PayrollPeriodInput.user_id == user_id,
            PayrollPeriod.company_id == company_id,
        )
        .order_by(PayrollPeriod.end_date.desc(), PayrollPeriod.id.desc())
        .first()
    )
    if latest_input_row is not None:
        period_input, payroll_period = latest_input_row
        period_label = payroll_period.label or f"{month_label_fr(payroll_period.end_date)} {payroll_period.end_date.year}"
        return period_input, payroll_period, payroll_period.start_date, payroll_period.end_date, payroll_period.period_key, period_label

    today = datetime.now(UTC).date()
    start_date = today.replace(day=1)
    if today.month == 12:
        next_month = date(today.year + 1, 1, 1)
    else:
        next_month = date(today.year, today.month + 1, 1)
    end_date = next_month - timedelta(days=1)
    period_key = f"{today.year}-{today.month:02d}"
    period_label = f"{month_label_fr(today)} {today.year}"
    return None, None, start_date, end_date, period_key, period_label


def _build_attendance_summary_payload(
    company_id: int,
    *,
    user_id: int,
    start_date: date,
    end_date: date,
    period_key: str,
    period_label: str | None,
    period_input: PayrollPeriodInput | None = None,
) -> dict[str, Any]:
    rows = (
        AttendanceRecord.query.filter(
            AttendanceRecord.company_id == company_id,
            AttendanceRecord.user_id == user_id,
            AttendanceRecord.attendance_date >= start_date,
            AttendanceRecord.attendance_date <= end_date,
        )
        .order_by(AttendanceRecord.attendance_date.asc(), AttendanceRecord.id.asc())
        .all()
    )

    counts = {"present": 0, "late": 0, "absent": 0, "overtime": 0}
    late_minutes_total = 0
    overtime_minutes_total = 0
    approved_leave_days = 0
    unjustified_absence_days = 0

    for row in rows:
        counts[row.status] = counts.get(row.status, 0) + 1
        late_minutes_total += int(row.minutes_late or 0)
        overtime_minutes_total += int(row.overtime_minutes or 0)
        if row.status == "absent":
            if _is_leave_synced_attendance_record(row.notes):
                approved_leave_days += 1
            else:
                unjustified_absence_days += 1

    period_days = max((end_date - start_date).days + 1, 0)
    late_hours = round(late_minutes_total / 60, 2) if late_minutes_total else 0.0
    overtime_hours = round(overtime_minutes_total / 60, 2) if overtime_minutes_total else 0.0

    return {
        "source": "attendance_records",
        "period_key": period_key,
        "period_label": period_label,
        "period_start_date": start_date.isoformat(),
        "period_end_date": end_date.isoformat(),
        "period_days": period_days,
        "tracked_days": len(rows),
        "days_paid": _decimal_to_float(period_input.days_paid) if period_input is not None else None,
        "absence_days": counts["absent"],
        "approved_leave_days": approved_leave_days,
        "unjustified_absence_days": unjustified_absence_days,
        "present_days": counts["present"],
        "late_days": counts["late"],
        "overtime_days": counts["overtime"],
        "late_minutes_total": late_minutes_total,
        "late_hours": late_hours,
        "overtime_minutes_total": overtime_minutes_total,
        "overtime_hours": overtime_hours,
        "observation": period_input.observation if period_input is not None else None,
    }


def _build_payroll_period_attendance_summary(
    company_id: int,
    *,
    user_id: int,
    start_date: date,
    end_date: date,
    period_key: str,
    period_label: str | None,
) -> dict[str, Any]:
    attendance = _build_attendance_summary_payload(
        company_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        period_key=period_key,
        period_label=period_label,
        period_input=None,
    )

    tracked_presence_days = int(
        (attendance.get("present_days") or 0)
        + (attendance.get("late_days") or 0)
        + (attendance.get("overtime_days") or 0)
    )
    approved_leave_days = int(attendance.get("approved_leave_days") or 0)
    unjustified_absence_days = int(attendance.get("unjustified_absence_days") or 0)
    tracked_days = int(attendance.get("tracked_days") or 0)
    period_days = int(attendance.get("period_days") or 0)
    recommended_days_paid = min(period_days, tracked_presence_days + approved_leave_days) if tracked_days else period_days
    recommended_late_hours = float(attendance.get("late_hours") or 0.0)
    overtime_hours = float(attendance.get("overtime_hours") or 0.0)

    observation_parts: list[str] = []
    if tracked_days:
        observation_parts.append(
            f"Attendance: {tracked_presence_days} jour(s) travailles, {approved_leave_days} jour(s) de conge approuve(s)"
        )
        if unjustified_absence_days:
            observation_parts.append(f"{unjustified_absence_days} absence(s) non couverte(s)")
        if recommended_late_hours:
            observation_parts.append(f"{recommended_late_hours:.2f} h de retard")
        if overtime_hours:
            observation_parts.append(f"{overtime_hours:.2f} h supplementaires")

    return {
        **attendance,
        "tracked_presence_days": tracked_presence_days,
        "recommended_days_paid": float(recommended_days_paid),
        "recommended_late_hours": recommended_late_hours,
        "recommended_observation": " | ".join(observation_parts) if observation_parts else None,
    }


def _serialize_workflow_actor(user: User | None, *, fallback_email: str | None = None, profile_code: str | None = None) -> dict[str, Any] | None:
    if user is None and not fallback_email:
        return None
    if user is None:
        return {
            "id": None,
            "full_name": fallback_email,
            "email": fallback_email,
            "operational_profile_code": profile_code,
        }
    return {
        "id": user.id,
        "full_name": f"{user.first_name} {user.last_name}".strip() or user.email,
        "email": user.email,
        "operational_profile_code": profile_code,
    }


def _load_user_role_codes(company_id: int, *, user_id: int) -> list[str]:
    rows = (
        db.session.query(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(
            UserRole.user_id == user_id,
            Role.code.isnot(None),
            or_(Role.company_id == company_id, Role.company_id.is_(None)),
        )
        .distinct()
        .all()
    )
    return sorted({str(code or "").strip().lower() for (code,) in rows if code})


def _load_user_permission_codes(company_id: int, *, user_id: int) -> set[str]:
    rows = (
        db.session.query(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(
            UserRole.user_id == user_id,
            Permission.code.isnot(None),
            or_(Role.company_id == company_id, Role.company_id.is_(None)),
        )
        .distinct()
        .all()
    )
    return {str(code or "").strip() for (code,) in rows if code}


def _build_leave_workflow_actor_context(company_id: int, *, actor_user_id: int) -> dict[str, Any]:
    actor = User.query.filter(
        User.id == actor_user_id,
        User.company_id == company_id,
        User.deleted_at.is_(None),
    ).first()
    if actor is None:
        raise PayrollServiceError("Utilisateur approbateur introuvable.", status_code=404, code="leave_workflow_actor_not_found")

    role_codes = _load_user_role_codes(company_id, user_id=actor_user_id)
    permission_codes = _load_user_permission_codes(company_id, user_id=actor_user_id)
    profile_code = infer_operational_profile_code(
        role_codes=role_codes,
        job_title=actor.job_title,
        department=actor.department,
    )
    if not profile_code and actor.user_type == "company_admin":
        profile_code = "company_admin"
    if not profile_code and actor.user_type == "super_admin":
        profile_code = "super_admin"

    stage_codes = {
        stage_code
        for stage_code, profile_codes in LEAVE_WORKFLOW_STAGE_PROFILE_CODES.items()
        if profile_code in profile_codes
    }
    full_access = (
        actor.user_type in {"super_admin", "company_admin"}
        or profile_code in LEAVE_WORKFLOW_FULL_ACCESS_PROFILE_CODES
        or "payroll.manage" in permission_codes
    )
    if full_access:
        stage_codes.update(LEAVE_WORKFLOW_STAGE_LABELS.keys())

    return {
        "user": actor,
        "role_codes": role_codes,
        "permission_codes": permission_codes,
        "profile_code": profile_code,
        "stage_codes": stage_codes,
        "full_access": full_access,
    }


def _required_leave_workflow_stage_codes(row: PayrollLeaveRequest) -> list[str]:
    days_requested = float(row.days_requested or 0)
    stages = ["manager_review", "hr_review"]
    requires_direction = (
        (row.type in {"paid_leave", "sick_leave"} and days_requested >= 5)
        or (row.type == "exceptional_leave" and days_requested >= 3)
        or (row.type == "permission" and days_requested >= 3)
    )
    if requires_direction:
        stages.append("direction_review")
    return stages


def _legacy_completed_leave_workflow_stages(row: PayrollLeaveRequest, required_stage_codes: list[str]) -> list[str]:
    if row.status in PAYROLL_LEAVE_APPROVED_STATUSES:
        return list(required_stage_codes)
    if row.status == "processing":
        return list(required_stage_codes[:2])
    if row.status in {"received", "in_review"}:
        return list(required_stage_codes[:1])
    return []


def _serialize_leave_workflow_history_entry(row: AuditLog, *, actor_user: User | None = None, actor_profile_code: str | None = None) -> dict[str, Any]:
    details = row.details or {}
    payload = serialize_audit_log(row)
    decision = details.get("decision")
    workflow_stage = details.get("workflow_stage")
    label = row.description or LEAVE_WORKFLOW_ACTION_LABELS.get(str(decision or "").strip().lower()) or row.action
    return {
        "id": row.id,
        "action": row.action,
        "label": label,
        "decision": decision,
        "workflow_stage": workflow_stage,
        "workflow_stage_label": LEAVE_WORKFLOW_STAGE_LABELS.get(workflow_stage),
        "decision_note": details.get("decision_note"),
        "resulting_status": details.get("resulting_status"),
        "next_stage": details.get("next_stage"),
        "next_stage_label": LEAVE_WORKFLOW_STAGE_LABELS.get(details.get("next_stage")),
        "actor": _serialize_workflow_actor(actor_user, fallback_email=row.actor_email, profile_code=actor_profile_code),
        "created_at": payload["created_at"],
    }


def _load_leave_workflow_history_map(company_id: int, *, leave_request_ids: list[int]) -> dict[int, list[dict[str, Any]]]:
    if not leave_request_ids:
        return {}

    rows = (
        AuditLog.query.filter(
            AuditLog.company_id == company_id,
            AuditLog.module == "payroll",
            AuditLog.target_type == "payroll_leave_request",
            AuditLog.target_id.in_(leave_request_ids),
            AuditLog.action.in_(LEAVE_WORKFLOW_AUDIT_ACTIONS),
        )
        .order_by(AuditLog.created_at.asc(), AuditLog.id.asc())
        .all()
    )
    actor_user_ids = sorted({row.actor_user_id for row in rows if row.actor_user_id is not None})
    actors_by_id = (
        {row.id: row for row in User.query.filter(User.id.in_(actor_user_ids)).all()}
        if actor_user_ids
        else {}
    )
    actor_profile_codes = {
        user_id: infer_operational_profile_code(
            role_codes=_load_user_role_codes(company_id, user_id=user_id),
            job_title=actors_by_id[user_id].job_title,
            department=actors_by_id[user_id].department,
        )
        for user_id in actor_user_ids
        if user_id in actors_by_id
    }
    history_map: dict[int, list[dict[str, Any]]] = {leave_request_id: [] for leave_request_id in leave_request_ids}
    for row in rows:
        history_map.setdefault(row.target_id, []).append(
            _serialize_leave_workflow_history_entry(
                row,
                actor_user=actors_by_id.get(row.actor_user_id),
                actor_profile_code=actor_profile_codes.get(row.actor_user_id),
            )
        )
    return history_map


def _build_leave_workflow(
    row: PayrollLeaveRequest,
    *,
    history: list[dict[str, Any]] | None = None,
    actor_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    history = history or []
    required_stage_codes = _required_leave_workflow_stage_codes(row)
    completed_stage_codes: list[str] = []
    for entry in history:
        if str(entry.get("decision") or "").strip().lower() == "approve":
            stage_code = str(entry.get("workflow_stage") or "").strip()
            if stage_code and stage_code in required_stage_codes and stage_code not in completed_stage_codes:
                completed_stage_codes.append(stage_code)

    if not completed_stage_codes:
        completed_stage_codes = _legacy_completed_leave_workflow_stages(row, required_stage_codes)

    if row.status in PAYROLL_LEAVE_APPROVED_STATUSES:
        completed_stage_codes = list(required_stage_codes)

    current_stage_code = None
    if row.status not in PAYROLL_LEAVE_APPROVED_STATUSES and row.status not in PAYROLL_LEAVE_REJECTED_STATUSES:
        current_stage_code = next((stage for stage in required_stage_codes if stage not in completed_stage_codes), None)

    available_actions: list[str] = []
    if actor_context is not None and current_stage_code:
        can_act = actor_context["full_access"] or current_stage_code in actor_context["stage_codes"]
        if can_act:
            available_actions = ["approve", "reject"]

    stages = []
    for stage_code in required_stage_codes:
        if row.status in PAYROLL_LEAVE_REJECTED_STATUSES:
            stage_status = "completed" if stage_code in completed_stage_codes else "cancelled"
        elif stage_code in completed_stage_codes:
            stage_status = "completed"
        elif current_stage_code == stage_code:
            stage_status = "current"
        else:
            stage_status = "pending"
        stages.append(
            {
                "code": stage_code,
                "label": LEAVE_WORKFLOW_STAGE_LABELS.get(stage_code, stage_code),
                "status": stage_status,
            }
        )

    return {
        "required_stage_codes": required_stage_codes,
        "completed_stage_codes": completed_stage_codes,
        "current_stage_code": current_stage_code,
        "current_stage_label": LEAVE_WORKFLOW_STAGE_LABELS.get(current_stage_code) if current_stage_code else None,
        "available_actions": available_actions,
        "is_final": row.status in PAYROLL_LEAVE_APPROVED_STATUSES,
        "is_rejected": row.status in PAYROLL_LEAVE_REJECTED_STATUSES,
        "stages": stages,
        "history": history,
    }


def _actor_can_view_leave_request(actor_context: dict[str, Any], workflow: dict[str, Any]) -> bool:
    if actor_context["full_access"]:
        return True
    current_stage_code = workflow.get("current_stage_code")
    return bool(current_stage_code and current_stage_code in actor_context["stage_codes"])


def payroll_employees_payload(
    company_id: int,
    *,
    include_disabled: bool = False,
    include_inactive: bool = False,
    search: str | None = None,
) -> dict[str, Any]:
    rows = _load_payroll_users(
        company_id,
        include_disabled=include_disabled,
        include_inactive=include_inactive,
        search=search,
    )
    leave_summaries = _load_leave_summaries_map(company_id=company_id, user_ids=[user.id for user, _ in rows])
    items = [
        _serialize_payroll_employee(user=user, profile=profile, leave_summary=leave_summaries.get(user.id))
        for user, profile in rows
    ]
    return {
        "company_id": company_id,
        "count": len(items),
        "include_disabled": include_disabled,
        "include_inactive": include_inactive,
        "items": items,
    }


def payroll_employee_profile_payload(company_id: int, *, user_id: int) -> dict[str, Any]:
    user = _get_payroll_user_or_raise(company_id, user_id=user_id)
    profile = EmployeePayrollProfile.query.filter_by(company_id=company_id, user_id=user.id).first()
    return _serialize_payroll_employee_profile(user=user, profile=profile)


def upsert_payroll_employee_profile(
    company_id: int,
    *,
    user_id: int,
    payload: dict[str, Any],
    actor_user_id: int | None,
) -> dict[str, Any]:
    user = _get_payroll_user_or_raise(company_id, user_id=user_id)
    profile = EmployeePayrollProfile.query.filter_by(company_id=company_id, user_id=user.id).first()
    created = False
    if profile is None:
        profile = EmployeePayrollProfile(company_id=company_id, user_id=user.id)
        db.session.add(profile)
        created = True

    if "category" in payload:
        profile.category = _clean_string(payload.get("category"))
    if "echelon" in payload:
        profile.echelon = _clean_string(payload.get("echelon"))
    if "cnps_number" in payload:
        profile.cnps_number = _clean_string(payload.get("cnps_number"))
    if "convention_collective" in payload:
        profile.convention_collective = _clean_string(payload.get("convention_collective"))
    if "employment_label" in payload:
        profile.employment_label = _clean_string(payload.get("employment_label"))
    if "hours_schedule" in payload:
        profile.hours_schedule = _clean_string(payload.get("hours_schedule"))
    if "family_status" in payload:
        profile.family_status = _clean_string(payload.get("family_status"))
    if "bank_account_number" in payload:
        profile.bank_account_number = _clean_string(payload.get("bank_account_number"))
    if "bank_domiciliation" in payload:
        profile.bank_domiciliation = _clean_string(payload.get("bank_domiciliation"))
    if "payment_method" in payload:
        profile.payment_method = _clean_string(payload.get("payment_method")) or "bank_transfer"
    if "transport_allowance" in payload:
        profile.transport_allowance = payload.get("transport_allowance") or ZERO
    if "other_fixed_gains" in payload:
        profile.other_fixed_gains = payload.get("other_fixed_gains") or ZERO
    if "payroll_notes" in payload:
        profile.payroll_notes = _clean_string(payload.get("payroll_notes"))
    if "is_payroll_enabled" in payload and payload.get("is_payroll_enabled") is not None:
        profile.is_payroll_enabled = bool(payload.get("is_payroll_enabled"))

    db.session.flush()
    log_audit_event(
        module="payroll",
        action="employee_profile_created" if created else "employee_profile_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="employee_payroll_profile",
        target_id=profile.id,
        description="Profil paie employe enregistre",
        details={"user_id": user.id, "created": created, "updated_fields": sorted(payload.keys())},
    )
    db.session.commit()
    return _serialize_payroll_employee_profile(user=user, profile=profile)


def delete_payroll_employee_profile(company_id: int, *, user_id: int, actor_user_id: int | None) -> dict[str, Any]:
    user = _get_payroll_user_or_raise(company_id, user_id=user_id)
    profile = EmployeePayrollProfile.query.filter_by(company_id=company_id, user_id=user.id).first()
    if profile is not None:
        profile_id = profile.id
        db.session.delete(profile)
        db.session.flush()
        log_audit_event(
            module="payroll",
            action="employee_profile_deleted",
            company_id=company_id,
            actor_user_id=actor_user_id,
            target_type="employee_payroll_profile",
            target_id=profile_id,
            description="Profil paie employe supprime",
            details={"user_id": user.id},
        )
        db.session.commit()
    return _serialize_payroll_employee_profile(user=user, profile=None)


def payroll_periods_payload(company_id: int, *, limit: int = 24, status: str | None = None) -> dict[str, Any]:
    query = PayrollPeriod.query.filter_by(company_id=company_id)
    if status:
        query = query.filter(PayrollPeriod.status == status)
    periods = (
        query.order_by(PayrollPeriod.end_date.desc(), PayrollPeriod.id.desc())
        .limit(limit)
        .all()
    )
    items = [_serialize_payroll_period_with_stats(period) for period in periods]
    return {
        "company_id": company_id,
        "count": len(items),
        "items": items,
    }


def create_payroll_period_draft(
    company_id: int,
    *,
    payload: dict[str, Any],
    actor_user_id: int | None,
) -> dict[str, Any]:
    payroll_period = _upsert_payroll_period(company_id=company_id, actor_user_id=actor_user_id, payload=payload)
    payroll_period.status = "draft"
    db.session.flush()
    log_audit_event(
        module="payroll",
        action="period_draft_saved",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="payroll_period",
        target_id=payroll_period.id,
        description="Periode de paie enregistree",
        details={"period_key": payroll_period.period_key},
    )
    db.session.commit()
    return _serialize_payroll_period_with_stats(payroll_period)


def update_payroll_period_draft(
    company_id: int,
    *,
    period_id: int,
    payload: dict[str, Any],
    actor_user_id: int | None,
) -> dict[str, Any]:
    period = _get_payroll_period_or_raise(company_id=company_id, payroll_period_id=period_id)
    merged_payload = {
        "period_id": period.id,
        "period_key": payload.get("period_key") or period.period_key,
        "label": payload.get("label", period.label),
        "notes": payload.get("notes", period.notes),
        "start_date": payload.get("start_date", period.start_date),
        "end_date": payload.get("end_date", period.end_date),
        "payment_date": payload.get("payment_date", period.payment_date),
    }
    payroll_period = _upsert_payroll_period(company_id=company_id, actor_user_id=actor_user_id, payload=merged_payload)
    payroll_period.status = "draft" if payroll_period.status != "archived" else payroll_period.status
    db.session.flush()
    log_audit_event(
        module="payroll",
        action="period_draft_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="payroll_period",
        target_id=payroll_period.id,
        description="Periode de paie mise a jour",
        details={"period_key": payroll_period.period_key, "updated_fields": sorted(payload.keys())},
    )
    db.session.commit()
    return _serialize_payroll_period_with_stats(payroll_period)


def payroll_period_inputs_payload(company_id: int, *, period_id: int) -> dict[str, Any]:
    payroll_period = _get_payroll_period_or_raise(company_id=company_id, payroll_period_id=period_id)
    rows = _load_payroll_users(company_id, include_disabled=True, include_inactive=True)
    period_inputs = _load_period_inputs_map(company_id=company_id, payroll_period_id=payroll_period.id)
    items = [
        _serialize_payroll_period_input_row(
            user=user,
            profile=profile,
            payroll_period=payroll_period,
            period_input=period_inputs.get(user.id),
        )
        for user, profile in rows
    ]
    return {
        "company_id": company_id,
        "period": _serialize_payroll_period_with_stats(payroll_period),
        "count": len(items),
        "items": items,
    }


def upsert_payroll_period_inputs(
    company_id: int,
    *,
    period_id: int,
    payload: dict[str, Any],
    actor_user_id: int | None,
) -> dict[str, Any]:
    payroll_period = _get_payroll_period_or_raise(company_id=company_id, payroll_period_id=period_id)
    employee_inputs = payload.get("employee_inputs") or []
    _upsert_period_inputs(
        company_id=company_id,
        payroll_period=payroll_period,
        employee_inputs=employee_inputs,
    )
    db.session.flush()
    log_audit_event(
        module="payroll",
        action="period_inputs_saved",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="payroll_period",
        target_id=payroll_period.id,
        description="Preparation mensuelle de paie enregistree",
        details={"period_key": payroll_period.period_key, "count": len(employee_inputs)},
    )
    db.session.commit()
    return payroll_period_inputs_payload(company_id, period_id=payroll_period.id)


def delete_payroll_period_input(
    company_id: int,
    *,
    period_id: int,
    user_id: int,
    actor_user_id: int | None,
) -> dict[str, Any]:
    payroll_period = _get_payroll_period_or_raise(company_id=company_id, payroll_period_id=period_id)
    row = PayrollPeriodInput.query.filter_by(
        company_id=company_id,
        payroll_period_id=payroll_period.id,
        user_id=user_id,
    ).first()
    if row is not None:
        row_id = row.id
        db.session.delete(row)
        db.session.flush()
        log_audit_event(
            module="payroll",
            action="period_input_deleted",
            company_id=company_id,
            actor_user_id=actor_user_id,
            target_type="payroll_period_input",
            target_id=row_id,
            description="Preparation individuelle supprimee",
            details={"period_key": payroll_period.period_key, "user_id": user_id},
        )
        db.session.commit()
    return payroll_period_inputs_payload(company_id, period_id=payroll_period.id)


def payroll_runs_payload(company_id: int, *, limit: int = 20) -> dict[str, Any]:
    runs = (
        PayrollRun.query.filter_by(company_id=company_id)
        .order_by(PayrollRun.created_at.desc(), PayrollRun.id.desc())
        .limit(limit)
        .all()
    )
    items = [_serialize_payroll_run(run) for run in runs]
    return {
        "company_id": company_id,
        "count": len(items),
        "items": items,
    }


def payroll_my_leave_requests_payload(company_id: int, *, user_id: int) -> dict[str, Any]:
    _get_payroll_user_or_raise(company_id, user_id=user_id)
    rows = (
        PayrollLeaveRequest.query.filter_by(company_id=company_id, user_id=user_id)
        .order_by(PayrollLeaveRequest.created_at.desc(), PayrollLeaveRequest.id.desc())
        .all()
    )
    summary = _build_leave_summary_from_rows(rows)
    history_map = _load_leave_workflow_history_map(company_id, leave_request_ids=[row.id for row in rows])
    items = [
        _serialize_payroll_leave_request(
            row,
            leave_summary=summary,
            workflow=_build_leave_workflow(row, history=history_map.get(row.id)),
        )
        for row in rows
    ]
    return {
        "company_id": company_id,
        "count": len(items),
        "summary": summary,
        "items": items,
    }


def create_payroll_my_leave_request(
    company_id: int,
    *,
    user_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    user = _get_payroll_user_or_raise(company_id, user_id=user_id)
    client_request_id = _clean_string(payload.get("client_request_id"))
    if client_request_id:
        existing = PayrollLeaveRequest.query.filter_by(
            company_id=company_id,
            user_id=user.id,
            client_request_id=client_request_id,
        ).first()
        if existing is not None:
            history_map = _load_leave_workflow_history_map(company_id, leave_request_ids=[existing.id])
            return _serialize_payroll_leave_request(
                existing,
                workflow=_build_leave_workflow(existing, history=history_map.get(existing.id)),
            )

    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    if start_date is None or end_date is None:
        raise PayrollServiceError(
            "start_date et end_date sont requis pour une demande de conge.",
            status_code=400,
            code="missing_leave_request_dates",
        )
    if start_date > end_date:
        raise PayrollServiceError(
            "start_date doit etre inferieure ou egale a end_date.",
            status_code=400,
            code="invalid_leave_request_dates",
        )

    leave_request = PayrollLeaveRequest(
        company_id=company_id,
        user_id=user.id,
        client_request_id=client_request_id,
        type=payload.get("type") or "paid_leave",
        title=_clean_string(payload.get("title")) or f"Demande de conge du {start_date.isoformat()}",
        start_date=start_date,
        end_date=end_date,
        days_requested=payload.get("days_requested") if payload.get("days_requested") is not None else _compute_leave_days(start_date, end_date),
        reason=_clean_string(payload.get("reason")),
        contact=_clean_string(payload.get("contact")),
        handover_note=_clean_string(payload.get("handover_note")),
        supporting_document_url=_clean_string(payload.get("supporting_document_url")),
        supporting_document_name=_clean_string(payload.get("supporting_document_name")),
        status="submitted",
    )
    db.session.add(leave_request)
    db.session.flush()
    log_audit_event(
        module="payroll",
        action="leave_request_submitted",
        company_id=company_id,
        actor_user_id=user.id,
        target_type="payroll_leave_request",
        target_id=leave_request.id,
        description="Demande de conge employee enregistree",
        details={
            "user_id": user.id,
            "type": leave_request.type,
            "status": leave_request.status,
            "client_request_id": leave_request.client_request_id,
        },
    )
    db.session.commit()
    history_map = _load_leave_workflow_history_map(company_id, leave_request_ids=[leave_request.id])
    return _serialize_payroll_leave_request(
        leave_request,
        workflow=_build_leave_workflow(leave_request, history=history_map.get(leave_request.id)),
    )


def payroll_leave_requests_payload(company_id: int, *, actor_user_id: int) -> dict[str, Any]:
    actor_context = _build_leave_workflow_actor_context(company_id, actor_user_id=actor_user_id)
    if not actor_context["full_access"] and not actor_context["stage_codes"]:
        raise PayrollServiceError(
            "Vous n'etes pas autorise a consulter ce circuit d'approbation.",
            status_code=403,
            code="leave_workflow_forbidden",
        )

    rows = (
        PayrollLeaveRequest.query.filter_by(company_id=company_id)
        .order_by(PayrollLeaveRequest.created_at.desc(), PayrollLeaveRequest.id.desc())
        .all()
    )
    users = User.query.filter(
        User.company_id == company_id,
        User.deleted_at.is_(None),
    ).all()
    users_by_id = {user.id: user for user in users}
    leave_summaries = _load_leave_summaries_map(company_id=company_id, user_ids=[user.id for user in users])
    history_map = _load_leave_workflow_history_map(company_id, leave_request_ids=[row.id for row in rows])
    filtered_rows: list[PayrollLeaveRequest] = []
    items = []
    for row in rows:
        workflow = _build_leave_workflow(row, history=history_map.get(row.id), actor_context=actor_context)
        if not _actor_can_view_leave_request(actor_context, workflow):
            continue
        filtered_rows.append(row)
        items.append(
            _serialize_payroll_leave_request(
                row,
                user=users_by_id.get(row.user_id),
                leave_summary=leave_summaries.get(row.user_id),
                workflow=workflow,
            )
        )
    return {
        "company_id": company_id,
        "count": len(items),
        "summary": _build_leave_summary_from_rows(filtered_rows),
        "items": items,
        "workflow_actor": {
            "id": actor_context["user"].id,
            "full_name": f"{actor_context['user'].first_name} {actor_context['user'].last_name}".strip(),
            "operational_profile_code": actor_context["profile_code"],
            "stage_codes": sorted(actor_context["stage_codes"]),
            "full_access": actor_context["full_access"],
        },
    }


def update_payroll_leave_request_status(
    company_id: int,
    *,
    leave_request_id: int,
    payload: dict[str, Any],
    actor_user_id: int | None,
) -> dict[str, Any]:
    if actor_user_id is None:
        raise PayrollServiceError("Acteur de workflow introuvable.", status_code=401, code="leave_workflow_actor_required")

    row = PayrollLeaveRequest.query.filter_by(company_id=company_id, id=leave_request_id).first()
    if row is None:
        raise PayrollServiceError(
            "Demande de conge introuvable.",
            status_code=404,
            code="leave_request_not_found",
        )

    actor_context = _build_leave_workflow_actor_context(company_id, actor_user_id=actor_user_id)
    history_map = _load_leave_workflow_history_map(company_id, leave_request_ids=[row.id])
    workflow = _build_leave_workflow(row, history=history_map.get(row.id), actor_context=actor_context)

    requested_action = str(payload.get("action") or "").strip().lower()
    next_status = str(payload.get("status") or "").strip().lower()
    decision_note = _clean_string(payload.get("decision_note") or payload.get("review_note") or payload.get("reason"))

    if not requested_action and actor_context["full_access"] and next_status:
        row.status = next_status
        row.reviewed_by_user_id = actor_user_id
        row.reviewed_at = datetime.now(UTC)
        db.session.flush()
        attendance_sync = _sync_attendance_for_leave_request(company_id, row=row, actor_user_id=actor_user_id)
        log_audit_event(
            module="payroll",
            action="leave_request_status_updated",
            company_id=company_id,
            actor_user_id=actor_user_id,
            target_type="payroll_leave_request",
            target_id=row.id,
            description="Statut de demande de conge mis a jour",
            details={"user_id": row.user_id, "status": row.status, "attendance_sync": attendance_sync, "decision_note": decision_note},
        )
        db.session.commit()
        user = User.query.filter_by(id=row.user_id).first()
        leave_summary = _load_leave_summaries_map(company_id=company_id, user_ids=[row.user_id]).get(row.user_id)
        history_map = _load_leave_workflow_history_map(company_id, leave_request_ids=[row.id])
        return _serialize_payroll_leave_request(
            row,
            user=user,
            leave_summary=leave_summary,
            attendance_sync=attendance_sync,
            workflow=_build_leave_workflow(row, history=history_map.get(row.id), actor_context=actor_context),
        )

    if not requested_action and next_status in PAYROLL_LEAVE_APPROVED_STATUSES:
        requested_action = "approve"
    elif not requested_action and next_status in PAYROLL_LEAVE_REJECTED_STATUSES:
        requested_action = "reject"

    if requested_action not in {"approve", "reject"}:
        raise PayrollServiceError(
            "Une action approve ou reject est requise.",
            status_code=400,
            code="missing_leave_workflow_action",
        )

    current_stage_code = workflow.get("current_stage_code")
    if current_stage_code is None:
        raise PayrollServiceError(
            "Cette demande n'attend plus de validation.",
            status_code=409,
            code="leave_workflow_closed",
        )
    if not actor_context["full_access"] and current_stage_code not in actor_context["stage_codes"]:
        raise PayrollServiceError(
            "Vous ne pouvez pas agir sur cette etape du workflow.",
            status_code=403,
            code="leave_workflow_stage_forbidden",
        )
    if requested_action == "reject" and not decision_note:
        raise PayrollServiceError(
            "Un motif est requis pour rejeter la demande.",
            status_code=400,
            code="leave_workflow_reject_note_required",
        )

    completed_stage_codes = list(workflow.get("completed_stage_codes") or [])
    if requested_action == "approve" and current_stage_code not in completed_stage_codes:
        completed_stage_codes.append(current_stage_code)
    next_stage = next((stage for stage in workflow["required_stage_codes"] if stage not in completed_stage_codes), None)

    if requested_action == "approve":
        if next_stage == "hr_review":
            row.status = "received"
        elif next_stage == "direction_review":
            row.status = "processing"
        else:
            row.status = "approved"
    else:
        row.status = "rejected"

    row.reviewed_by_user_id = actor_user_id
    row.reviewed_at = datetime.now(UTC)
    db.session.flush()
    attendance_sync = _sync_attendance_for_leave_request(company_id, row=row, actor_user_id=actor_user_id)
    actor_role_codes = actor_context["role_codes"]
    log_audit_event(
        module="payroll",
        action="leave_request_workflow_decision",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="payroll_leave_request",
        target_id=row.id,
        description="Decision de workflow sur une demande de conge",
        details={
            "user_id": row.user_id,
            "workflow_stage": current_stage_code,
            "decision": requested_action,
            "decision_note": decision_note,
            "resulting_status": row.status,
            "next_stage": next_stage,
            "actor_profile_code": actor_context["profile_code"],
            "actor_role_codes": actor_role_codes,
            "attendance_sync": attendance_sync,
        },
    )
    db.session.commit()

    user = User.query.filter_by(id=row.user_id).first()
    leave_summary = _load_leave_summaries_map(company_id=company_id, user_ids=[row.user_id]).get(row.user_id)
    history_map = _load_leave_workflow_history_map(company_id, leave_request_ids=[row.id])
    return _serialize_payroll_leave_request(
        row,
        user=user,
        leave_summary=leave_summary,
        attendance_sync=attendance_sync,
        workflow=_build_leave_workflow(row, history=history_map.get(row.id), actor_context=actor_context),
    )


def payroll_my_summary_payload(company_id: int, *, user_id: int) -> dict[str, Any]:
    user = _get_payroll_user_or_raise(company_id, user_id=user_id)
    profile = EmployeePayrollProfile.query.filter_by(company_id=company_id, user_id=user_id).first()
    leave_rows = (
        PayrollLeaveRequest.query.filter_by(company_id=company_id, user_id=user_id)
        .order_by(PayrollLeaveRequest.created_at.desc(), PayrollLeaveRequest.id.desc())
        .all()
    )
    leave_summary = _build_leave_summary_from_rows(leave_rows)

    period_input, _payroll_period, start_date, end_date, period_key, period_label = _resolve_payroll_summary_period(
        company_id,
        user_id=user_id,
    )
    attendance = _build_attendance_summary_payload(
        company_id,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        period_key=period_key,
        period_label=period_label,
        period_input=period_input,
    )

    payslips_count = PayrollRunItem.query.filter(
        PayrollRunItem.company_id == company_id,
        PayrollRunItem.user_id == user_id,
        PayrollRunItem.pdf_path.isnot(None),
    ).count()

    return {
        "company_id": company_id,
        "employee": {
            "id": user.id,
            "full_name": f"{user.first_name} {user.last_name}".strip(),
            "employee_number": user.employee_number,
            "job_title": user.job_title,
            "department": user.department,
            "base_salary": _decimal_to_float(user.base_salary),
        },
        "payroll_profile": {
            "hours_schedule": profile.hours_schedule if profile else None,
            "payment_method": profile.payment_method if profile and profile.payment_method else "bank_transfer",
        },
        "attendance": attendance,
        "leave_summary": leave_summary,
        "payslips_count": payslips_count,
    }


def payroll_my_payslips_payload(
    company_id: int,
    *,
    user_id: int,
    limit: int = 24,
    month: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[str, Any]:
    _get_payroll_user_or_raise(company_id, user_id=user_id)

    query = PayrollRunItem.query.filter(
        PayrollRunItem.company_id == company_id,
        PayrollRunItem.user_id == user_id,
        PayrollRunItem.pdf_path.isnot(None),
    )
    normalized_month = str(month or "").strip() or None
    if normalized_month:
        query = query.filter(PayrollRunItem.period_key == normalized_month)
    if date_from is not None:
        query = query.filter(func.date(PayrollRunItem.created_at) >= date_from)
    if date_to is not None:
        query = query.filter(func.date(PayrollRunItem.created_at) <= date_to)

    rows = query.order_by(PayrollRunItem.created_at.desc(), PayrollRunItem.id.desc()).limit(limit).all()

    items = []
    for row in rows:
        output_path = (BACKEND_DIR / row.pdf_path).resolve() if row.pdf_path else None
        download_path = _managed_download_path(output_path)
        run = PayrollRun.query.filter_by(id=row.payroll_run_id).first()
        items.append(
            {
                "id": row.id,
                "period_key": row.period_key,
                "employee_name": row.employee_name,
                "net_a_payer": _decimal_to_float(row.net_a_payer),
                "total_retenues": _decimal_to_float(row.total_retenues),
                "total_patronal": _decimal_to_float(row.total_patronal),
                "run_reference": run.run_reference if run is not None else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "download_path": download_path,
                "can_download": bool(download_path),
            }
        )

    return {
        "company_id": company_id,
        "count": len(items),
        "filters": {
            "month": normalized_month,
            "date_from": date_from.isoformat() if date_from else None,
            "date_to": date_to.isoformat() if date_to else None,
        },
        "items": items,
    }


def user_can_access_generated_payslip(company_id: int, *, user_id: int, period_key: str, filename: str) -> bool:
    expected_pdf_path = _backend_relative(MANAGED_API_OUTPUT_ROOT / str(company_id) / "bulletins" / period_key / filename)
    row = PayrollRunItem.query.filter_by(
        company_id=company_id,
        user_id=user_id,
        period_key=period_key,
        pdf_path=expected_pdf_path,
    ).first()
    return row is not None


def generate_payslips_via_api(
    *,
    company_id: int,
    actor_user_id: int | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    company = load_company_info(payload["company_data"]) if payload.get("company_data") else load_company_info(
        _resolve_existing_file(payload.get("company_path"), DEFAULT_COMPANY_PATH, label="company_path")
    )
    config = load_payroll_config(payload["config_data"]) if payload.get("config_data") else load_payroll_config(
        _resolve_existing_file(payload.get("config_path"), DEFAULT_CONFIG_PATH, label="config_path")
    )

    source_type = payload.get("source_type", "file")
    employees_source: Any
    source_path: Path | None = None
    if source_type == "inline":
        employees_source = payload.get("employees") or []
    else:
        source_path = _resolve_existing_file(payload.get("source_path"), None, label="source_path")
        employees_source = source_path

    employees = load_employee_data(employees_source)
    requested_count = len(payload.get("employees") or []) if source_type == "inline" else len(employees)

    employee_filter = payload.get("employee_id")
    if employee_filter:
        employees = [
            employee
            for employee in employees
            if employee.employee_id == employee_filter or employee.matricule == employee_filter
        ]
        if not employees:
            raise PayrollServiceError(
                "Aucun employe correspondant a employee_id n'a ete trouve.",
                status_code=404,
                code="employee_not_found",
            )

    if not employees:
        raise PayrollServiceError(
            "Aucun employe valide a traiter pour cette generation.",
            status_code=400,
            code="no_valid_employees",
        )

    output_root = _resolve_output_root(payload.get("output_dir"), company_id=company_id)
    dry_run = bool(payload.get("dry_run", False))
    include_lines = bool(payload.get("include_lines", False))
    allow_override = payload.get("allow_override")

    processor = PayrollBatchProcessor(company=company, config=config, output_root=output_root)
    results = processor.generate_all_payslips(
        employees,
        create_pdf=not dry_run,
        allow_override=allow_override,
    )

    db.session.flush()
    log_audit_event(
        module="payroll",
        action="payslips_generated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="payroll_batch",
        description="Generation de bulletins de paie via API",
        details={
            "dry_run": dry_run,
            "source_type": source_type,
            "employee_filter": employee_filter,
            "processed_count": len(results),
            "requested_count": requested_count,
            "output_root": _backend_relative(output_root),
        },
    )
    db.session.commit()

    items = [_serialize_payroll_result(result, include_lines=include_lines, dry_run=dry_run) for result in results]

    return {
        "message": "Payslips generated" if not dry_run else "Payslip preview generated",
        "company_id": company_id,
        "source_type": source_type,
        "source_path": _backend_relative(source_path) if source_path else None,
        "output_root": _backend_relative(output_root),
        "dry_run": dry_run,
        "allow_override": allow_override,
        "count": len(items),
        "items": items,
    }


def generate_monthly_payslips_via_db(
    *,
    company_id: int,
    actor_user_id: int | None,
    payload: dict[str, Any],
) -> dict[str, Any]:
    company = _resolve_company_info_from_payload(company_id=company_id, payload=payload)
    config = _resolve_config_from_payload(payload)
    payroll_period_id = payload.get("payroll_period_id")
    if payroll_period_id is not None:
        payroll_period = _get_payroll_period_or_raise(company_id=company_id, payroll_period_id=int(payroll_period_id))
        if any(payload.get(key) is not None for key in ("start_date", "end_date", "payment_date", "label", "notes", "period_key")):
            merged_payload = {
                "period_id": payroll_period.id,
                "period_key": payload.get("period_key") or payroll_period.period_key,
                "label": payload.get("label", payroll_period.label),
                "notes": payload.get("notes", payroll_period.notes),
                "start_date": payload.get("start_date", payroll_period.start_date),
                "end_date": payload.get("end_date", payroll_period.end_date),
                "payment_date": payload.get("payment_date", payroll_period.payment_date),
            }
            payroll_period = _upsert_payroll_period(company_id=company_id, actor_user_id=actor_user_id, payload=merged_payload)
    else:
        payroll_period = _upsert_payroll_period(company_id=company_id, actor_user_id=actor_user_id, payload=payload)
    employee_ids = [int(user_id) for user_id in payload.get("employee_ids") or []]

    _upsert_period_inputs(
        company_id=company_id,
        payroll_period=payroll_period,
        employee_inputs=payload.get("employee_inputs") or [],
    )

    rows = _load_payroll_users(
        company_id,
        include_disabled=False,
        include_inactive=bool(payload.get("include_inactive", False)),
        employee_ids=employee_ids or None,
    )
    if not rows:
        raise PayrollServiceError(
            "Aucun employe en base n'est disponible pour cette periode.",
            status_code=404,
            code="no_database_employees",
        )

    period_inputs = _load_period_inputs_map(company_id=company_id, payroll_period_id=payroll_period.id)
    employees = [
        _build_employee_from_database(
            user=user,
            profile=profile,
            company_id=company_id,
            payroll_period=payroll_period,
            period_input=period_inputs.get(user.id),
        )
        for user, profile in rows
    ]

    output_root = _resolve_output_root(payload.get("output_dir"), company_id=company_id)
    dry_run = bool(payload.get("dry_run", False))
    include_lines = bool(payload.get("include_lines", False))
    allow_override = payload.get("allow_override")

    processor = PayrollBatchProcessor(company=company, config=config, output_root=output_root)
    results = processor.generate_all_payslips(
        employees,
        create_pdf=not dry_run,
        allow_override=allow_override,
    )
    if not results:
        raise PayrollServiceError(
            "Aucun bulletin n'a pu etre genere pour cette periode.",
            status_code=400,
            code="no_generated_results",
        )

    run = None
    if dry_run:
        payroll_period.status = "draft"
    else:
        run = _persist_payroll_run(
            company_id=company_id,
            actor_user_id=actor_user_id,
            payroll_period=payroll_period,
            results=results,
            output_root=output_root,
        )
        payroll_period.status = "generated"

    db.session.flush()
    log_audit_event(
        module="payroll",
        action="period_generation_requested",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="payroll_period",
        target_id=payroll_period.id,
        description="Generation mensuelle de bulletins depuis la base de donnees",
        details={
            "period_key": payroll_period.period_key,
            "dry_run": dry_run,
            "employee_count": len(results),
            "run_id": run.id if run is not None else None,
            "output_root": _backend_relative(output_root),
        },
    )
    db.session.commit()

    items = [_serialize_payroll_result(result, include_lines=include_lines, dry_run=dry_run) for result in results]
    return {
        "message": "Monthly payroll generated" if not dry_run else "Monthly payroll preview generated",
        "company_id": company_id,
        "dry_run": dry_run,
        "allow_override": allow_override,
        "output_root": _backend_relative(output_root),
        "period": _serialize_payroll_period(payroll_period),
        "run": _serialize_payroll_run(run) if run is not None else None,
        "count": len(items),
        "items": items,
    }


def download_generated_payslip(company_id: int, period_key: str, filename: str):
    base_dir = (MANAGED_API_OUTPUT_ROOT / str(company_id) / "bulletins").resolve()
    target = (base_dir / period_key / filename).resolve()
    if not target.is_relative_to(base_dir):
        raise PayrollServiceError("Chemin de fichier non autorise.", status_code=403, code="invalid_file_path")
    if not target.exists() or not target.is_file():
        raise PayrollServiceError("Bulletin introuvable.", status_code=404, code="payslip_not_found")
    if target.suffix.lower() != ".pdf":
        raise PayrollServiceError("Type de fichier non autorise.", status_code=400, code="invalid_file_type")
    return send_file(target, mimetype="application/pdf", as_attachment=True, download_name=target.name)


def _serialize_payroll_result(result: PayrollResult, *, include_lines: bool, dry_run: bool) -> dict[str, Any]:
    output_path = result.output_path.resolve() if result.output_path else None
    managed_output_path = _managed_download_path(output_path)
    item = {
        "employee_id": result.employee.employee_id,
        "matricule": result.employee.matricule,
        "employee_name": result.employee.full_name,
        "period_key": result.period_key,
        "salaire_brut": _decimal_to_float(result.salaire_brut),
        "brut_imposable": _decimal_to_float(result.brut_imposable),
        "base_cnps": _decimal_to_float(result.base_cnps),
        "total_retenues": _decimal_to_float(result.total_retenues),
        "total_patronal": _decimal_to_float(result.total_patronal),
        "net_a_payer": _decimal_to_float(result.net_a_payer),
        "montant_en_lettres": result.montant_en_lettres,
        "net_a_payer_formatted": format_currency_fr(result.net_a_payer, result.config.devise, include_currency=True),
        "output_path": _backend_relative(output_path) if output_path else None,
        "pdf_generated": bool(output_path and output_path.exists() and not dry_run),
        "download_path": managed_output_path,
    }
    if include_lines:
        item["lines"] = [_serialize_payroll_line(line) for line in result.lines]
    return item


def _serialize_payroll_line(line: PayrollLine) -> dict[str, Any]:
    return {
        "code": line.code,
        "libelle": line.libelle,
        "nombre": _value_to_api(line.nombre),
        "base": _value_to_api(line.base),
        "taux": _value_to_api(line.taux),
        "taux_formatted": format_rate_fr(line.taux),
        "montant_plus": _decimal_to_float(line.montant_plus),
        "montant_minus": _decimal_to_float(line.montant_minus),
        "retenue_patronale": _decimal_to_float(line.retenue_patronale),
    }


def _serialize_payroll_employee(
    *,
    user: User,
    profile: EmployeePayrollProfile | None,
    leave_summary: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payment_method = (profile.payment_method if profile else None) or "bank_transfer"
    return {
        "id": user.id,
        "company_id": user.company_id,
        "employee_number": user.employee_number,
        "full_name": f"{user.first_name} {user.last_name}".strip(),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "job_title": user.job_title,
        "department": user.department,
        "hire_date": user.hire_date.isoformat() if user.hire_date else None,
        "base_salary": _decimal_to_float(user.base_salary),
        "account_status": user.account_status,
        "is_active": user.is_active,
        "payroll_enabled": bool(profile.is_payroll_enabled) if profile is not None else True,
        "payment_method": payment_method,
        "payment_method_label": PAYMENT_METHOD_LABELS.get(payment_method, str(payment_method or "").upper()),
        "leave_summary": leave_summary or _empty_leave_summary(),
        "profile": {
            "category": profile.category if profile else None,
            "echelon": profile.echelon if profile else None,
            "cnps_number": profile.cnps_number if profile else None,
            "convention_collective": profile.convention_collective if profile else None,
            "employment_label": profile.employment_label if profile else None,
            "hours_schedule": profile.hours_schedule if profile else None,
            "family_status": profile.family_status if profile else None,
            "bank_account_number": profile.bank_account_number if profile else None,
            "bank_domiciliation": profile.bank_domiciliation if profile else None,
            "transport_allowance": _decimal_to_float(profile.transport_allowance) if profile else 0.0,
            "other_fixed_gains": _decimal_to_float(profile.other_fixed_gains) if profile else 0.0,
            "payroll_notes": profile.payroll_notes if profile else None,
        },
    }


def _serialize_payroll_employee_profile(*, user: User, profile: EmployeePayrollProfile | None) -> dict[str, Any]:
    payment_method = (profile.payment_method if profile else None) or "bank_transfer"
    return {
        "company_id": user.company_id,
        "user_id": user.id,
        "exists": profile is not None,
        "employee": {
            "id": user.id,
            "full_name": f"{user.first_name} {user.last_name}".strip(),
            "employee_number": user.employee_number,
            "email": user.email,
            "job_title": user.job_title,
            "department": user.department,
            "hire_date": user.hire_date.isoformat() if user.hire_date else None,
            "base_salary": _decimal_to_float(user.base_salary),
        },
        "profile": {
            "id": profile.id if profile is not None else None,
            "category": profile.category if profile else None,
            "echelon": profile.echelon if profile else None,
            "cnps_number": profile.cnps_number if profile else None,
            "convention_collective": profile.convention_collective if profile else None,
            "employment_label": profile.employment_label if profile else None,
            "hours_schedule": profile.hours_schedule if profile else None,
            "family_status": profile.family_status if profile else None,
            "bank_account_number": profile.bank_account_number if profile else None,
            "bank_domiciliation": profile.bank_domiciliation if profile else None,
            "payment_method": payment_method,
            "payment_method_label": PAYMENT_METHOD_LABELS.get(payment_method, str(payment_method or "").upper()),
            "transport_allowance": _decimal_to_float(profile.transport_allowance) if profile else 0.0,
            "other_fixed_gains": _decimal_to_float(profile.other_fixed_gains) if profile else 0.0,
            "payroll_notes": profile.payroll_notes if profile else None,
            "is_payroll_enabled": bool(profile.is_payroll_enabled) if profile is not None else True,
            "created_at": profile.created_at.isoformat() if profile and profile.created_at else None,
            "updated_at": profile.updated_at.isoformat() if profile and profile.updated_at else None,
        },
    }


def _serialize_payroll_period(payroll_period: PayrollPeriod) -> dict[str, Any]:
    return {
        "id": payroll_period.id,
        "company_id": payroll_period.company_id,
        "period_key": payroll_period.period_key,
        "label": payroll_period.label,
        "status": payroll_period.status,
        "notes": payroll_period.notes,
        "start_date": payroll_period.start_date.isoformat() if payroll_period.start_date else None,
        "end_date": payroll_period.end_date.isoformat() if payroll_period.end_date else None,
        "payment_date": payroll_period.payment_date.isoformat() if payroll_period.payment_date else None,
        "created_by_user_id": payroll_period.created_by_user_id,
        "created_at": payroll_period.created_at.isoformat() if payroll_period.created_at else None,
        "updated_at": payroll_period.updated_at.isoformat() if payroll_period.updated_at else None,
    }


def _serialize_payroll_period_with_stats(payroll_period: PayrollPeriod) -> dict[str, Any]:
    payload = _serialize_payroll_period(payroll_period)
    inputs_count = PayrollPeriodInput.query.filter_by(
        company_id=payroll_period.company_id,
        payroll_period_id=payroll_period.id,
    ).count()
    runs_count = PayrollRun.query.filter_by(
        company_id=payroll_period.company_id,
        payroll_period_id=payroll_period.id,
    ).count()
    payload["inputs_count"] = inputs_count
    payload["runs_count"] = runs_count
    return payload


def _serialize_payroll_period_input(period_input: PayrollPeriodInput | None) -> dict[str, Any]:
    payment_method = period_input.payment_method if period_input and period_input.payment_method else None
    return {
        "id": period_input.id if period_input is not None else None,
        "exists": period_input is not None,
        "user_id": period_input.user_id if period_input is not None else None,
        "days_paid": _decimal_to_float(period_input.days_paid) if period_input is not None else None,
        "late_hours": _decimal_to_float(period_input.late_hours) if period_input is not None else None,
        "salary_base_override": _decimal_to_float(period_input.salary_base_override) if period_input is not None else None,
        "transport_allowance": _decimal_to_float(period_input.transport_allowance) if period_input is not None else None,
        "other_gains": _decimal_to_float(period_input.other_gains) if period_input is not None else None,
        "brut_imposable": _decimal_to_float(period_input.brut_imposable) if period_input is not None else None,
        "irpp": _decimal_to_float(period_input.irpp) if period_input is not None else None,
        "cac": _decimal_to_float(period_input.cac) if period_input is not None else None,
        "tc": _decimal_to_float(period_input.tc) if period_input is not None else None,
        "rav": _decimal_to_float(period_input.rav) if period_input is not None else None,
        "cfs": _decimal_to_float(period_input.cfs) if period_input is not None else None,
        "payment_method": payment_method,
        "payment_method_label": PAYMENT_METHOD_LABELS.get(payment_method, str(payment_method or "").upper()) if payment_method else None,
        "observation": period_input.observation if period_input is not None else None,
        "created_at": period_input.created_at.isoformat() if period_input and period_input.created_at else None,
        "updated_at": period_input.updated_at.isoformat() if period_input and period_input.updated_at else None,
    }


def _serialize_payroll_period_input_row(
    *,
    user: User,
    profile: EmployeePayrollProfile | None,
    payroll_period: PayrollPeriod,
    period_input: PayrollPeriodInput | None,
) -> dict[str, Any]:
    employee_payload = _serialize_payroll_employee(user=user, profile=profile)
    input_payload = _serialize_payroll_period_input(period_input)
    attendance_summary = _build_payroll_period_attendance_summary(
        payroll_period.company_id,
        user_id=user.id,
        start_date=payroll_period.start_date,
        end_date=payroll_period.end_date,
        period_key=payroll_period.period_key,
        period_label=payroll_period.label,
    )
    input_payload["defaults"] = {
        "days_paid": attendance_summary["recommended_days_paid"],
        "late_hours": attendance_summary["recommended_late_hours"],
        "salary_base_override": _decimal_to_float(user.base_salary),
        "transport_allowance": _decimal_to_float(profile.transport_allowance) if profile else 0.0,
        "other_gains": _decimal_to_float(profile.other_fixed_gains) if profile else 0.0,
        "payment_method": (profile.payment_method if profile and profile.payment_method else "bank_transfer"),
        "observation": attendance_summary["recommended_observation"],
    }
    input_payload["attendance_summary"] = attendance_summary
    return {
        "employee": employee_payload,
        "input": input_payload,
    }


def _serialize_payroll_run(run: PayrollRun | None) -> dict[str, Any] | None:
    if run is None:
        return None
    payroll_period = PayrollPeriod.query.filter_by(id=run.payroll_period_id).first()
    item_count = PayrollRunItem.query.filter_by(payroll_run_id=run.id).count()
    return {
        "id": run.id,
        "company_id": run.company_id,
        "payroll_period_id": run.payroll_period_id,
        "generated_by_user_id": run.generated_by_user_id,
        "run_reference": run.run_reference,
        "output_root": run.output_root,
        "employee_count": run.employee_count,
        "total_brut": _decimal_to_float(run.total_brut),
        "total_net": _decimal_to_float(run.total_net),
        "total_patronal": _decimal_to_float(run.total_patronal),
        "status": run.status,
        "error_message": run.error_message,
        "items_count": item_count,
        "period": _serialize_payroll_period(payroll_period) if payroll_period is not None else None,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "updated_at": run.updated_at.isoformat() if run.updated_at else None,
    }


def _serialize_payroll_leave_request(
    row: PayrollLeaveRequest,
    *,
    user: User | None = None,
    leave_summary: dict[str, Any] | None = None,
    attendance_sync: dict[str, Any] | None = None,
    workflow: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = {
        "id": row.id,
        "company_id": row.company_id,
        "user_id": row.user_id,
        "client_request_id": row.client_request_id,
        "type": row.type,
        "title": row.title,
        "start_date": row.start_date.isoformat() if row.start_date else None,
        "end_date": row.end_date.isoformat() if row.end_date else None,
        "days_requested": _decimal_to_float(row.days_requested),
        "reason": row.reason,
        "description": row.reason,
        "contact": row.contact,
        "backup_contact": row.contact,
        "handover_note": row.handover_note,
        "supporting_document_name": row.supporting_document_name or get_stored_file_name(row.supporting_document_url),
        "supporting_document_url": f"/api/v1/payroll/leave-requests/{row.id}/attachment" if row.supporting_document_url else None,
        "status": row.status,
        "source": "api",
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "reviewed_at": row.reviewed_at.isoformat() if row.reviewed_at else None,
        "reviewed_by_user_id": row.reviewed_by_user_id,
    }
    if user is not None:
        payload["employee"] = {
            "id": user.id,
            "full_name": f"{user.first_name} {user.last_name}".strip(),
            "employee_number": user.employee_number,
            "job_title": user.job_title,
            "department": user.department,
        }
    if leave_summary is not None:
        payload["employee_leave_summary"] = leave_summary
    if attendance_sync is not None:
        payload["attendance_sync"] = attendance_sync
    if workflow is not None:
        payload["workflow"] = workflow
    return payload


def download_leave_request_attachment(
    company_id: int,
    *,
    leave_request_id: int,
    user_id: int,
    can_manage: bool = False,
):
    row = PayrollLeaveRequest.query.filter_by(company_id=company_id, id=leave_request_id).first()
    if row is None:
        raise PayrollServiceError(
            "Demande de conge introuvable.",
            status_code=404,
            code="leave_request_not_found",
        )
    if not can_manage and row.user_id != user_id:
        raise PayrollServiceError(
            "Acces refuse a ce justificatif.",
            status_code=403,
            code="leave_request_attachment_forbidden",
        )

    target = resolve_stored_file(row.supporting_document_url)
    filename = row.supporting_document_name or get_stored_file_name(row.supporting_document_url) or target.name
    return send_file(
        target,
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=filename,
        max_age=0,
    )


def _empty_leave_summary() -> dict[str, Any]:
    return {
        "total_requests": 0,
        "approved_requests": 0,
        "pending_requests": 0,
        "rejected_requests": 0,
        "requested_days_total": 0.0,
        "approved_days_total": 0.0,
        "pending_days_total": 0.0,
        "last_request_at": None,
        "last_approved_at": None,
    }


def _build_leave_summary_from_rows(rows: list[PayrollLeaveRequest]) -> dict[str, Any]:
    summary = _empty_leave_summary()
    approved_days = ZERO
    pending_days = ZERO
    requested_days = ZERO

    for row in rows:
        days = _coalesce_decimal(row.days_requested, ZERO)
        requested_days += days
        summary["total_requests"] += 1

        if row.status in PAYROLL_LEAVE_APPROVED_STATUSES:
            summary["approved_requests"] += 1
            approved_days += days
            if row.reviewed_at is not None:
                reviewed_at = row.reviewed_at.isoformat()
                if summary["last_approved_at"] is None or reviewed_at > summary["last_approved_at"]:
                    summary["last_approved_at"] = reviewed_at
        elif row.status in PAYROLL_LEAVE_PENDING_STATUSES:
            summary["pending_requests"] += 1
            pending_days += days
        elif row.status in PAYROLL_LEAVE_REJECTED_STATUSES:
            summary["rejected_requests"] += 1

        if row.created_at is not None:
            created_at = row.created_at.isoformat()
            if summary["last_request_at"] is None or created_at > summary["last_request_at"]:
                summary["last_request_at"] = created_at

    summary["requested_days_total"] = _decimal_to_float(requested_days) or 0.0
    summary["approved_days_total"] = _decimal_to_float(approved_days) or 0.0
    summary["pending_days_total"] = _decimal_to_float(pending_days) or 0.0
    return summary


def _load_leave_summaries_map(company_id: int, *, user_ids: list[int]) -> dict[int, dict[str, Any]]:
    if not user_ids:
        return {}

    rows = (
        PayrollLeaveRequest.query.filter(
            PayrollLeaveRequest.company_id == company_id,
            PayrollLeaveRequest.user_id.in_(user_ids),
        )
        .order_by(PayrollLeaveRequest.created_at.desc(), PayrollLeaveRequest.id.desc())
        .all()
    )
    rows_by_user_id: dict[int, list[PayrollLeaveRequest]] = {user_id: [] for user_id in user_ids}
    for row in rows:
        rows_by_user_id.setdefault(row.user_id, []).append(row)

    return {
        user_id: _build_leave_summary_from_rows(user_rows)
        for user_id, user_rows in rows_by_user_id.items()
    }


def _resolve_company_info_from_payload(*, company_id: int, payload: dict[str, Any]) -> CompanyInfo:
    if payload.get("company_data"):
        return load_company_info(payload["company_data"])
    if payload.get("company_path"):
        return load_company_info(
            _resolve_existing_file(payload.get("company_path"), DEFAULT_COMPANY_PATH, label="company_path")
        )
    return _build_company_info_from_db(company_id)


def _resolve_config_from_payload(payload: dict[str, Any]):
    if payload.get("config_data"):
        return load_payroll_config(payload["config_data"])
    return load_payroll_config(
        _resolve_existing_file(payload.get("config_path"), DEFAULT_CONFIG_PATH, label="config_path")
    )


def _build_company_info_from_db(company_id: int) -> CompanyInfo:
    company = Company.query.filter_by(id=company_id).first()
    if company is None:
        raise PayrollServiceError("Entreprise introuvable pour le contexte paie.", status_code=404, code="company_not_found")
    settings = CompanySetting.query.filter_by(company_id=company_id).first()
    return CompanyInfo(
        name=(company.trade_name or company.legal_name or "").strip(),
        taxpayer_number=(company.tax_number or "").strip(),
        postal_box="",
        city=(company.city or "").strip(),
        phone=(company.phone or (settings.contact_person_phone if settings else "") or "").strip(),
        email=(company.email or "").strip(),
        country=(company.country_name or company.country_code or "").strip(),
        logo_path=None,
    )


def _get_payroll_user_or_raise(company_id: int, *, user_id: int) -> User:
    user = User.query.filter(
        User.company_id == company_id,
        User.id == user_id,
        User.deleted_at.is_(None),
        User.user_type.in_(DATABASE_PAYROLL_USER_TYPES),
    ).first()
    if user is None:
        raise PayrollServiceError(
            "Employe introuvable pour le profil paie.",
            status_code=404,
            code="employee_not_found",
        )
    return user


def _get_payroll_period_or_raise(company_id: int, *, payroll_period_id: int) -> PayrollPeriod:
    payroll_period = PayrollPeriod.query.filter_by(company_id=company_id, id=payroll_period_id).first()
    if payroll_period is None:
        raise PayrollServiceError(
            "Periode de paie introuvable.",
            status_code=404,
            code="payroll_period_not_found",
        )
    return payroll_period


def _load_payroll_users(
    company_id: int,
    *,
    include_disabled: bool = False,
    include_inactive: bool = False,
    search: str | None = None,
    employee_ids: list[int] | None = None,
) -> list[tuple[User, EmployeePayrollProfile | None]]:
    query = User.query.filter(
        User.company_id == company_id,
        User.deleted_at.is_(None),
        User.user_type.in_(DATABASE_PAYROLL_USER_TYPES),
    )
    if not include_inactive:
        query = query.filter(User.account_status == "active", User.is_active.is_(True))
    if employee_ids:
        query = query.filter(User.id.in_(employee_ids))

    normalized_search = str(search or "").strip().lower()
    if normalized_search:
        pattern = f"%{normalized_search}%"
        query = query.filter(
            or_(
                func.lower(User.first_name).like(pattern),
                func.lower(User.last_name).like(pattern),
                func.lower(func.coalesce(User.employee_number, "")).like(pattern),
                func.lower(func.coalesce(User.job_title, "")).like(pattern),
                func.lower(func.coalesce(User.department, "")).like(pattern),
            )
        )

    users = (
        query.order_by(
            User.is_primary_admin.desc(),
            func.lower(User.last_name),
            func.lower(User.first_name),
        ).all()
    )
    if employee_ids:
        found_ids = {user.id for user in users}
        missing_ids = [user_id for user_id in employee_ids if user_id not in found_ids]
        if missing_ids:
            raise PayrollServiceError(
                "Certains employes demandes sont introuvables dans cette entreprise.",
                status_code=404,
                code="employee_not_found",
                details={"missing_employee_ids": missing_ids},
            )

    profiles = _load_payroll_profiles_map(company_id=company_id, user_ids=[user.id for user in users])
    rows: list[tuple[User, EmployeePayrollProfile | None]] = []
    for user in users:
        profile = profiles.get(user.id)
        if not include_disabled and profile is not None and profile.is_payroll_enabled is False:
            continue
        rows.append((user, profile))
    return rows


def _load_payroll_profiles_map(company_id: int, *, user_ids: list[int]) -> dict[int, EmployeePayrollProfile]:
    if not user_ids:
        return {}
    rows = EmployeePayrollProfile.query.filter(
        EmployeePayrollProfile.company_id == company_id,
        EmployeePayrollProfile.user_id.in_(user_ids),
    ).all()
    return {row.user_id: row for row in rows}


def _load_period_inputs_map(company_id: int, *, payroll_period_id: int) -> dict[int, PayrollPeriodInput]:
    rows = PayrollPeriodInput.query.filter_by(company_id=company_id, payroll_period_id=payroll_period_id).all()
    return {row.user_id: row for row in rows}


def _upsert_payroll_period(company_id: int, actor_user_id: int | None, payload: dict[str, Any]) -> PayrollPeriod:
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    payment_date = payload.get("payment_date")
    if start_date is None or end_date is None or payment_date is None:
        raise PayrollServiceError(
            "start_date, end_date et payment_date sont requis pour une generation mensuelle.",
            status_code=400,
            code="missing_period_dates",
        )
    if start_date > end_date:
        raise PayrollServiceError(
            "start_date doit etre inferieure ou egale a end_date.",
            status_code=400,
            code="invalid_period_dates",
        )

    period_key = payload.get("period_key") or end_date.strftime("%Y-%m")
    period_id = payload.get("period_id")
    row = _get_payroll_period_or_raise(company_id=company_id, payroll_period_id=int(period_id)) if period_id is not None else None
    if row is None:
        row = PayrollPeriod.query.filter_by(company_id=company_id, period_key=period_key).first()
    elif row.period_key != period_key:
        existing = PayrollPeriod.query.filter_by(company_id=company_id, period_key=period_key).first()
        if existing is not None and existing.id != row.id:
            raise PayrollServiceError(
                "Une autre periode utilise deja ce period_key.",
                status_code=409,
                code="period_key_conflict",
            )

    if row is None:
        row = PayrollPeriod(company_id=company_id, period_key=period_key, created_by_user_id=actor_user_id)
        db.session.add(row)

    row.period_key = period_key
    row.start_date = start_date
    row.end_date = end_date
    row.payment_date = payment_date
    row.label = payload.get("label") or _default_period_label(end_date)
    row.notes = payload.get("notes")
    if row.status not in {"generated", "archived"}:
        row.status = "draft"
    db.session.flush()
    return row


def _upsert_period_inputs(
    *,
    company_id: int,
    payroll_period: PayrollPeriod,
    employee_inputs: list[dict[str, Any]],
) -> None:
    if not employee_inputs:
        return

    requested_user_ids = [int(item["user_id"]) for item in employee_inputs]
    users = User.query.filter(
        User.company_id == company_id,
        User.id.in_(requested_user_ids),
        User.deleted_at.is_(None),
    ).all()
    users_by_id = {row.id: row for row in users}
    missing_ids = [user_id for user_id in requested_user_ids if user_id not in users_by_id]
    if missing_ids:
        raise PayrollServiceError(
            "Certains employes des entrees mensuelles sont introuvables.",
            status_code=404,
            code="employee_not_found",
            details={"missing_employee_ids": missing_ids},
        )

    existing_rows = _load_period_inputs_map(company_id=company_id, payroll_period_id=payroll_period.id)
    for item in employee_inputs:
        user_id = int(item["user_id"])
        row = existing_rows.get(user_id)
        if row is None:
            row = PayrollPeriodInput(
                company_id=company_id,
                payroll_period_id=payroll_period.id,
                user_id=user_id,
            )
            db.session.add(row)
            existing_rows[user_id] = row

        row.days_paid = item.get("days_paid")
        row.late_hours = item.get("late_hours")
        row.salary_base_override = item.get("salary_base_override")
        row.transport_allowance = item.get("transport_allowance")
        row.other_gains = item.get("other_gains")
        row.brut_imposable = item.get("brut_imposable")
        row.irpp = item.get("irpp")
        row.cac = item.get("cac")
        row.tc = item.get("tc")
        row.rav = item.get("rav")
        row.cfs = item.get("cfs")
        row.payment_method = item.get("payment_method")
        row.observation = item.get("observation")

    db.session.flush()


def _build_employee_from_database(
    *,
    user: User,
    profile: EmployeePayrollProfile | None,
    company_id: int,
    payroll_period: PayrollPeriod,
    period_input: PayrollPeriodInput | None,
) -> EmployeePayrollData:
    salary_base = period_input.salary_base_override if period_input and period_input.salary_base_override is not None else user.base_salary
    indemn_transport = (
        period_input.transport_allowance
        if period_input and period_input.transport_allowance is not None
        else profile.transport_allowance if profile is not None else ZERO
    )
    other_gains = (
        period_input.other_gains
        if period_input and period_input.other_gains is not None
        else profile.other_fixed_gains if profile is not None else ZERO
    )
    payment_method = (
        period_input.payment_method
        if period_input and period_input.payment_method
        else profile.payment_method if profile and profile.payment_method else "bank_transfer"
    )
    attendance_summary = _build_payroll_period_attendance_summary(
        company_id,
        user_id=user.id,
        start_date=payroll_period.start_date,
        end_date=payroll_period.end_date,
        period_key=payroll_period.period_key,
        period_label=payroll_period.label,
    )
    period_days = Decimal(str(attendance_summary["period_days"]))
    attendance_days_paid = attendance_summary.get("recommended_days_paid")
    attendance_days_paid_decimal = Decimal(str(attendance_days_paid)) if attendance_days_paid is not None else None
    observation = ((period_input.observation if period_input else None) or (profile.payroll_notes if profile else "") or "").strip()
    if not observation and attendance_summary.get("recommended_observation"):
        observation = str(attendance_summary["recommended_observation"]).strip()

    return EmployeePayrollData(
        employee_id=str(user.id),
        nom=(user.last_name or "").strip(),
        prenom=(user.first_name or "").strip(),
        matricule=(user.employee_number or f"USR-{user.id}").strip(),
        categorie=(profile.category if profile else "") or "",
        echelon=(profile.echelon if profile else "") or "",
        anciennete_mois=_compute_seniority_months(user.hire_date, payroll_period.end_date),
        cnps_number=(profile.cnps_number if profile else "") or "",
        convention_collective=(profile.convention_collective if profile else "") or "",
        emploi=((profile.employment_label if profile else None) or user.job_title or "").strip(),
        departement=(user.department or "").strip(),
        date_embauche=user.hire_date,
        horaire=(profile.hours_schedule if profile else "") or "",
        situation_famille=(profile.family_status if profile else "") or "",
        numero_compte=(profile.bank_account_number if profile else "") or "",
        domiciliation=(profile.bank_domiciliation if profile else "") or "",
        jours_payes=(
            Decimal(period_input.days_paid)
            if period_input and period_input.days_paid is not None
            else attendance_days_paid_decimal if attendance_days_paid_decimal is not None
            else period_days
        ),
        salaire_base_mensuel=_coalesce_decimal(salary_base, ZERO),
        indemn_transport=_coalesce_decimal(indemn_transport, ZERO),
        autres_gains=_coalesce_decimal(other_gains, ZERO),
        mode_paiement=PAYMENT_METHOD_LABELS.get(payment_method, str(payment_method or "").upper()),
        date_debut_periode=payroll_period.start_date,
        date_fin_periode=payroll_period.end_date,
        date_paiement=payroll_period.payment_date,
        brut_imposable=period_input.brut_imposable if period_input else None,
        irpp=period_input.irpp if period_input else None,
        cac=period_input.cac if period_input else None,
        tc=period_input.tc if period_input else None,
        rav=period_input.rav if period_input else None,
        cfs=period_input.cfs if period_input else None,
        observation=observation,
        source_values={
            "attendance_recommended_days_paid": attendance_summary.get("recommended_days_paid"),
            "attendance_recommended_late_hours": attendance_summary.get("recommended_late_hours"),
            "attendance_unjustified_absence_days": attendance_summary.get("unjustified_absence_days"),
            "attendance_approved_leave_days": attendance_summary.get("approved_leave_days"),
        },
        source_row_number=None,
    )


def _persist_payroll_run(
    *,
    company_id: int,
    actor_user_id: int | None,
    payroll_period: PayrollPeriod,
    results: list[PayrollResult],
    output_root: Path,
) -> PayrollRun:
    run_reference = f"PAY-{payroll_period.period_key}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"
    run = PayrollRun(
        company_id=company_id,
        payroll_period_id=payroll_period.id,
        generated_by_user_id=actor_user_id,
        run_reference=run_reference,
        output_root=_backend_relative(output_root),
        employee_count=len(results),
        total_brut=sum((result.salaire_brut for result in results), ZERO),
        total_net=sum((result.net_a_payer for result in results), ZERO),
        total_patronal=sum((result.total_patronal for result in results), ZERO),
        status="generated",
    )
    db.session.add(run)
    db.session.flush()

    for result in results:
        db.session.add(
            PayrollRunItem(
                company_id=company_id,
                payroll_run_id=run.id,
                user_id=int(result.employee.employee_id),
                employee_number=result.employee.matricule,
                employee_name=result.employee.full_name,
                period_key=result.period_key,
                salaire_brut=result.salaire_brut,
                total_retenues=result.total_retenues,
                total_patronal=result.total_patronal,
                net_a_payer=result.net_a_payer,
                pdf_path=_backend_relative(result.output_path) if result.output_path else None,
                payload_snapshot=_serialize_payroll_result(result, include_lines=True, dry_run=False),
            )
        )

    db.session.flush()
    return run


def _compute_seniority_months(hire_date: date | None, reference_date: date | None) -> int:
    if hire_date is None or reference_date is None or hire_date > reference_date:
        return 0
    months = (reference_date.year - hire_date.year) * 12 + (reference_date.month - hire_date.month)
    if reference_date.day < hire_date.day:
        months -= 1
    return max(months, 0)


def _compute_leave_days(start_date: date, end_date: date) -> Decimal:
    return Decimal(str(max((end_date - start_date).days + 1, 0)))


def _default_period_label(reference_date: date | None) -> str:
    if reference_date is None:
        return ""
    return f"{month_label_fr(reference_date).title()} {reference_date.year}".strip()


def _coalesce_decimal(value: Decimal | None, default: Decimal) -> Decimal:
    if value is None:
        return default
    return Decimal(value)


def _clean_string(value: str | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _value_to_api(value: Any) -> Any:
    if isinstance(value, Decimal):
        return _decimal_to_float(value)
    return value


def _decimal_to_float(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _resolve_existing_file(raw_path: str | None, default_path: Path | None, *, label: str) -> Path:
    candidate = _resolve_backend_path(raw_path, default_path=default_path, label=label)
    if not candidate.exists() or not candidate.is_file():
        raise PayrollServiceError(
            f"{label} est introuvable: {candidate}",
            status_code=404,
            code="file_not_found",
        )
    return candidate


def _resolve_output_root(raw_path: str | None, *, company_id: int) -> Path:
    default_root = MANAGED_API_OUTPUT_ROOT / str(company_id)
    output_root = _resolve_backend_path(raw_path, default_path=default_root, label="output_dir", must_exist=False)
    output_root.mkdir(parents=True, exist_ok=True)
    return output_root


def _resolve_backend_path(
    raw_path: str | None,
    *,
    default_path: Path | None,
    label: str,
    must_exist: bool = True,
) -> Path:
    if raw_path:
        candidate = Path(raw_path)
        if not candidate.is_absolute():
            candidate = BACKEND_DIR / candidate
    elif default_path is not None:
        candidate = Path(default_path)
    else:
        raise PayrollServiceError(
            f"{label} est requis.",
            status_code=400,
            code="missing_path",
        )

    resolved = candidate.resolve()
    if not resolved.is_relative_to(BACKEND_DIR.resolve()):
        raise PayrollServiceError(
            f"{label} doit rester dans le repertoire backend.",
            status_code=403,
            code="path_outside_backend",
        )
    if must_exist and not resolved.exists():
        raise PayrollServiceError(
            f"{label} est introuvable: {resolved}",
            status_code=404,
            code="file_not_found",
        )
    return resolved


def _backend_relative(path: Path | None) -> str | None:
    if path is None:
        return None
    return path.resolve().relative_to(BACKEND_DIR.resolve()).as_posix()


def _managed_download_path(path: Path | None) -> str | None:
    if path is None:
        return None
    company_root = MANAGED_API_OUTPUT_ROOT.resolve()
    resolved = path.resolve()
    if not resolved.is_relative_to(company_root):
        return None
    relative = resolved.relative_to(company_root)
    parts = relative.parts
    if len(parts) < 4 or parts[1] != "bulletins":
        return None
    company_id, _, period_key, filename = parts[0], parts[1], parts[2], parts[3]
    return f"/api/v1/payroll/payslips/download/{period_key}/{filename}?company_id={company_id}"
