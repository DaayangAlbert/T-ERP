import mimetypes
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from zipfile import ZIP_DEFLATED, ZipFile

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app.core.file_storage import BACKEND_DIR, FileStorageError, resolve_stored_file
from app.core.multitenancy import resolve_tenant_context
from app.core.responses import error_response, error_response_from_exception
from app.core.rbac import require_permission, require_role
from app.core.validation import load_json
from app.modules.companies.schemas import CompanyRegisterSchema, CompanyReviewSchema, CompanySettingsUpdateSchema
from app.modules.companies.service import (
    CompanyError,
    get_company_with_settings,
    list_pending_companies,
    register_company,
    review_company,
    update_company_settings,
)

companies_bp = Blueprint("companies", __name__, url_prefix="/companies")
COMPANY_WORKSPACE_EDITOR_ROLE_CODES = {"assistant_administratif", "juriste", "directeur_administratif"}
COMPANY_WORKSPACE_UPLOAD_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt",
}
COMPANY_WORKSPACE_UPLOAD_KINDS = {"administrative_documents", "correspondences"}


def _current_role_codes() -> set[str]:
    claims = get_jwt() or {}
    return {str(code).strip().lower() for code in (claims.get("roles") or []) if code}


def _can_write_company_workspace() -> bool:
    claims = get_jwt() or {}
    permissions = {str(code).strip().lower() for code in (claims.get("permissions") or []) if code}
    if "companies.manage" in permissions:
        return True
    return bool(_current_role_codes() & COMPANY_WORKSPACE_EDITOR_ROLE_CODES)


def _store_compressed_company_workspace_file(*, company_id: int, user_id: int, asset_kind: str):
    uploaded_file = request.files.get("file")
    if uploaded_file is None:
        raise FileStorageError("Aucun fichier n'a ete recu.", status_code=400)

    original_name = secure_filename(uploaded_file.filename or "").strip()
    if not original_name:
        raise FileStorageError("Le nom du fichier est invalide.", status_code=400)

    suffix = Path(original_name).suffix.lower()
    if suffix not in COMPANY_WORKSPACE_UPLOAD_EXTENSIONS:
        allowed = ", ".join(sorted(COMPANY_WORKSPACE_UPLOAD_EXTENSIONS))
        raise FileStorageError(f"Type de fichier non autorise. Extensions attendues: {allowed}.", status_code=400)

    file_bytes = uploaded_file.read()
    size_bytes = len(file_bytes)
    if size_bytes > 12 * 1024 * 1024:
        raise FileStorageError("Le fichier depasse la taille maximale autorisee.", status_code=413)

    upload_dir = (BACKEND_DIR / "uploads" / "companies" / str(company_id) / "company-workspace" / asset_kind / str(user_id)).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    archive_path = (upload_dir / f"{uuid4().hex}_{Path(original_name).stem or 'file'}.zip").resolve()
    with ZipFile(archive_path, mode="w", compression=ZIP_DEFLATED) as archive:
        archive.writestr(original_name, file_bytes)

    stored_path = archive_path.relative_to(BACKEND_DIR).as_posix()
    return {
        "stored_path": stored_path,
        "attachment_name": original_name,
        "size_bytes": size_bytes,
        "compressed_size_bytes": archive_path.stat().st_size,
    }


def _send_company_workspace_asset(company_id: int, stored_path: str, *, original_name: str | None = None):
    normalized_path = str(stored_path or "").strip()
    if not normalized_path:
        raise FileStorageError("Fichier introuvable.", status_code=404)

    expected_prefix = f"uploads/companies/{company_id}/company-workspace/"
    if not normalized_path.startswith(expected_prefix):
        raise FileStorageError("Acces au fichier refuse.", status_code=403)

    absolute_path = resolve_stored_file(normalized_path)
    download_name = (original_name or "").strip() or absolute_path.name

    if absolute_path.suffix.lower() == ".zip":
        with ZipFile(absolute_path, mode="r") as archive:
            members = archive.namelist()
            if not members:
                raise FileStorageError("Archive vide.", status_code=404)
            archived_name = members[0]
            payload = archive.read(archived_name)
            mimetype = mimetypes.guess_type(download_name if "." in download_name else archived_name)[0] or "application/octet-stream"
            return send_file(
                BytesIO(payload),
                mimetype=mimetype,
                as_attachment=True,
                download_name=download_name if "." in download_name else archived_name,
                max_age=0,
            )

    mimetype = mimetypes.guess_type(download_name)[0] or "application/octet-stream"
    return send_file(absolute_path, mimetype=mimetype, as_attachment=True, download_name=download_name, max_age=0)


@companies_bp.post("/register")
def companies_register():
    payload = load_json(CompanyRegisterSchema())

    try:
        company = register_company(payload)
        return jsonify({"message": "Company registration submitted", "company": company}), 201
    except CompanyError as exc:
        return error_response_from_exception(exc)


@companies_bp.get("/status")
@jwt_required()
@require_permission("companies.read")
def companies_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "companies", "status": "ready", "tenant_id": tenant_id}), 200


@companies_bp.get("/pending")
@jwt_required()
@require_role("platform_super_admin")
def companies_pending():
    rows = list_pending_companies()
    return jsonify({"items": rows, "count": len(rows)}), 200


@companies_bp.patch("/<int:company_id>/review")
@jwt_required()
@require_role("platform_super_admin")
def companies_review(company_id):
    payload = load_json(CompanyReviewSchema())

    try:
        result = review_company(
            company_id=company_id,
            decision=payload["decision"],
            note=payload.get("note"),
            rejection_reason=payload.get("rejection_reason"),
            requested_information=payload.get("requested_information"),
            reviewed_by_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Company review updated", "company": result}), 200
    except CompanyError as exc:
        return error_response_from_exception(exc)


@companies_bp.get("/me")
@jwt_required()
@require_permission("companies.read")
def my_company():
    company_id = resolve_tenant_context(optional=False)

    if company_id is None:
        return error_response("No tenant company selected", status_code=400, code="tenant_required")

    try:
        result = get_company_with_settings(int(company_id))
        return jsonify(result), 200
    except CompanyError as exc:
        return error_response_from_exception(exc)


@companies_bp.get("/me/settings")
@jwt_required()
@require_permission("companies.read")
def my_company_settings():
    tenant_id = resolve_tenant_context(optional=False)
    if tenant_id is None:
        return error_response("No tenant company selected", status_code=400, code="tenant_required")

    try:
        result = get_company_with_settings(int(tenant_id))
        return jsonify(result.get("settings", {})), 200
    except CompanyError as exc:
        return error_response_from_exception(exc)


@companies_bp.put("/me/settings")
@jwt_required()
@require_permission("companies.read")
def update_my_company_settings():
    tenant_id = resolve_tenant_context(optional=False)
    if tenant_id is None:
        return error_response("No tenant company selected", status_code=400, code="tenant_required")

    if not _can_write_company_workspace():
        return error_response("Insufficient permissions to update company workspace", status_code=403, code="forbidden")

    payload = load_json(CompanySettingsUpdateSchema())
    try:
        result = update_company_settings(int(tenant_id), payload, actor_user_id=int(get_jwt_identity()))
        return jsonify({"message": "Company settings updated", "data": result}), 200
    except CompanyError as exc:
        return error_response_from_exception(exc)


@companies_bp.post("/me/uploads/<string:asset_kind>")
@jwt_required()
@require_permission("companies.read")
def upload_company_workspace_asset(asset_kind):
    tenant_id = resolve_tenant_context(optional=False)
    if tenant_id is None:
        return error_response("No tenant company selected", status_code=400, code="tenant_required")

    normalized_kind = str(asset_kind or "").strip().lower()
    if normalized_kind not in COMPANY_WORKSPACE_UPLOAD_KINDS:
        return error_response("Unsupported upload kind", status_code=400, code="invalid_upload_kind")
    if not _can_write_company_workspace():
        return error_response("Insufficient permissions to upload company assets", status_code=403, code="forbidden")

    try:
        payload = _store_compressed_company_workspace_file(
            company_id=int(tenant_id),
            user_id=int(get_jwt_identity()),
            asset_kind=normalized_kind,
        )
        return jsonify({"message": "Company workspace file uploaded", "data": payload}), 201
    except FileStorageError as exc:
        return error_response(exc.message, status_code=exc.status_code, code="file_error")


@companies_bp.get("/me/assets")
@jwt_required()
@require_permission("companies.read")
def download_company_workspace_asset():
    tenant_id = resolve_tenant_context(optional=False)
    if tenant_id is None:
        return error_response("No tenant company selected", status_code=400, code="tenant_required")

    stored_path = request.args.get("path")
    original_name = request.args.get("name")
    try:
        return _send_company_workspace_asset(int(tenant_id), stored_path, original_name=original_name)
    except FileStorageError as exc:
        return error_response(exc.message, status_code=exc.status_code, code="file_error")
