from __future__ import annotations

from typing import Any

from flask import has_request_context, request

from app.extensions import db
from app.models.admin import AuditLog


def log_audit_event(
    *,
    module: str,
    action: str,
    description: str | None = None,
    company_id: int | None = None,
    actor_user_id: int | None = None,
    actor_email: str | None = None,
    target_type: str | None = None,
    target_id: int | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    ip_address = None
    user_agent = None

    if has_request_context():
        ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
        user_agent = request.headers.get("User-Agent")

    row = AuditLog(
        company_id=company_id,
        actor_user_id=actor_user_id,
        actor_email=actor_email,
        module=module,
        action=action,
        target_type=target_type,
        target_id=target_id,
        description=description,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.session.add(row)
    return row


def serialize_audit_log(row: AuditLog) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "actor_user_id": row.actor_user_id,
        "actor_email": row.actor_email,
        "module": row.module,
        "action": row.action,
        "target_type": row.target_type,
        "target_id": row.target_id,
        "description": row.description,
        "details": row.details or {},
        "ip_address": row.ip_address,
        "user_agent": row.user_agent,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
