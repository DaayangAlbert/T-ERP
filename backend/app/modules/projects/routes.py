from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.pagination import get_pagination_params, paginate_query
from app.core.responses import error_response_from_exception
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.core.validation import TenantBodySchema, load_json, load_query
from app.modules.projects.schemas import (
    ProjectAssignmentCreateSchema,
    ProjectAssignmentUpdateSchema,
    ProjectAssignmentsListQuerySchema,
    ProjectBudgetCreateSchema,
    ProjectBudgetLineCreateSchema,
    ProjectChangeOrderCreateSchema,
    ProjectChangeOrderUpdateSchema,
    ProjectCreateSchema,
    ProjectDocumentCreateSchema,
    ProjectDocumentUpdateSchema,
    ProjectPresenceCreateSchema,
    ProjectPresenceUpdateSchema,
    ProjectReportCreateSchema,
    ProjectRiskCreateSchema,
    ProjectRiskUpdateSchema,
    ProjectTaskCreateSchema,
    ProjectTaskUpdateSchema,
    ProjectTasksListQuerySchema,
    ProjectsListQuerySchema,
    ProjectTeamCreateSchema,
    ProjectTeamMemberSchema,
    ProjectUpdateSchema,
)
from app.modules.projects.service import (
    ProjectManagementError,
    add_team_member,
    archive_project,
    build_projects_query,
    create_project,
    create_project_assignment,
    create_project_budget,
    create_project_budget_line,
    create_project_change_order,
    create_project_document,
    create_project_presence_entry,
        delete_project_change_order,
        delete_project_presence_entry,
        delete_project_document,
    create_project_report,
    create_project_risk,
    create_project_task,
    create_team,
    get_project,
    get_project_workspace,
    list_project_assignments,
    list_project_budgets,
    list_project_change_orders,
    list_project_documents,
    list_project_presence_entries,
    list_project_reports,
    list_project_risks,
    list_project_tasks,
    list_teams,
    project_dashboard,
    serialize_project,
    update_project,
    update_project_assignment,
    update_project_change_order,
    update_project_document,
    update_project_presence_entry,
    update_project_risk,
    update_project_task,
)

projects_bp = Blueprint("projects", __name__, url_prefix="/projects")


def _resolve_scope_context() -> tuple[int, list[str]]:
    user_id = int(get_jwt_identity())
    claims = get_jwt() or {}
    role_codes = [str(code).strip().lower() for code in (claims.get("roles") or []) if code]
    return user_id, role_codes


@projects_bp.get("/status")
@jwt_required()
@require_permission("projects.read")
def projects_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "projects", "status": "ready", "tenant_id": tenant_id}), 200


@projects_bp.get("/dashboard")
@jwt_required()
@require_permission("projects.read")
def projects_dashboard():
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        user_id, role_codes = _resolve_scope_context()
        return jsonify(project_dashboard(company_id=company_id, user_id=user_id, role_codes=role_codes)), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("")
@jwt_required()
@require_permission("projects.read")
@rate_limit(max_requests=90, window_seconds=60, scope="projects-list")
def projects_list():
    params = load_query(ProjectsListQuerySchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, params)
        user_id, role_codes = _resolve_scope_context()
        query = build_projects_query(
            company_id=company_id,
            status=params.get("status"),
            include_archived=params["include_archived"],
            user_id=user_id,
            role_codes=role_codes,
        )
        page, page_size = get_pagination_params()
        paginated = paginate_query(query, page, page_size, serialize_project)
        return jsonify(paginated), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("")
@jwt_required()
@require_permission("projects.manage")
@rate_limit(max_requests=40, window_seconds=60, scope="projects-create")
def projects_create():
    payload = load_json(ProjectCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        project = create_project(company_id=company_id, payload=payload)
        return jsonify({"message": "Project created", "project": project}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>")
@jwt_required()
@require_permission("projects.read")
def projects_get(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        user_id, role_codes = _resolve_scope_context()
        project = get_project(company_id=company_id, project_id=project_id, user_id=user_id, role_codes=role_codes)
        return jsonify(project), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/workspace")
@jwt_required()
@require_permission("projects.read")
def projects_workspace(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        user_id, role_codes = _resolve_scope_context()
        workspace = get_project_workspace(company_id=company_id, project_id=project_id, user_id=user_id, role_codes=role_codes)
        return jsonify(workspace), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.patch("/<int:project_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_update(project_id):
    payload = load_json(ProjectUpdateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        project = update_project(company_id=company_id, project_id=project_id, payload=payload)
        return jsonify({"message": "Project updated", "project": project}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.delete("/<int:project_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_archive(project_id):
    payload = load_json(TenantBodySchema())
    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        archive_project(company_id=company_id, project_id=project_id)
        return jsonify({"message": "Project archived"}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/teams")
@jwt_required()
@require_permission("projects.read")
def projects_list_teams(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        rows = list_teams(company_id=company_id, project_id=project_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/teams")
@jwt_required()
@require_permission("projects.manage")
def projects_create_team(project_id):
    payload = load_json(ProjectTeamCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        team = create_team(company_id=company_id, project_id=project_id, payload=payload)
        return jsonify({"message": "Team created", "team": team}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/teams/<int:team_id>/members")
@jwt_required()
@require_permission("projects.manage")
def projects_add_team_member(team_id):
    payload = load_json(ProjectTeamMemberSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        result = add_team_member(company_id=company_id, team_id=team_id, payload=payload)
        return jsonify({"message": "Team member added", "member": result}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/assignments")
@jwt_required()
@require_permission("projects.read")
def projects_list_assignments(project_id):
    params = load_query(ProjectAssignmentsListQuerySchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, params)
        rows = list_project_assignments(company_id=company_id, project_id=project_id, active_only=params["active_only"])
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/assignments")
@jwt_required()
@require_permission("projects.manage")
def projects_create_assignment(project_id):
    payload = load_json(ProjectAssignmentCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        assignment = create_project_assignment(company_id=company_id, project_id=project_id, payload=payload)
        return jsonify({"message": "Assignment created", "assignment": assignment}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.patch("/assignments/<int:assignment_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_update_assignment(assignment_id):
    payload = load_json(ProjectAssignmentUpdateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        assignment = update_project_assignment(company_id=company_id, assignment_id=assignment_id, payload=payload)
        return jsonify({"message": "Assignment updated", "assignment": assignment}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/presence")
@jwt_required()
@require_permission("projects.read")
def projects_list_presence(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        rows = list_project_presence_entries(company_id=company_id, project_id=project_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/presence")
@jwt_required()
@require_permission("projects.manage")
def projects_create_presence(project_id):
    payload = load_json(ProjectPresenceCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        user_id = int(get_jwt_identity())
        row = create_project_presence_entry(company_id=company_id, project_id=project_id, actor_user_id=user_id, payload=payload)
        return jsonify({"message": "Presence entry created", "entry": row}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.patch("/presence/<int:presence_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_update_presence(presence_id):
    payload = load_json(ProjectPresenceUpdateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        user_id = int(get_jwt_identity())
        row = update_project_presence_entry(company_id=company_id, presence_id=presence_id, actor_user_id=user_id, payload=payload)
        return jsonify({"message": "Presence entry updated", "entry": row}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.delete("/presence/<int:presence_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_delete_presence(presence_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        delete_project_presence_entry(company_id=company_id, presence_id=presence_id)
        return jsonify({"message": "Presence entry deleted"}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/tasks")
@jwt_required()
@require_permission("projects.read")
def projects_list_tasks(project_id):
    params = load_query(ProjectTasksListQuerySchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, params)
        rows = list_project_tasks(company_id=company_id, project_id=project_id, status=params.get("status"))
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/tasks")
@jwt_required()
@require_permission("projects.manage")
def projects_create_task(project_id):
    payload = load_json(ProjectTaskCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        task = create_project_task(company_id=company_id, project_id=project_id, payload=payload)
        return jsonify({"message": "Task created", "task": task}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.patch("/tasks/<int:task_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_update_task(task_id):
    payload = load_json(ProjectTaskUpdateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        task = update_project_task(company_id=company_id, task_id=task_id, payload=payload)
        return jsonify({"message": "Task updated", "task": task}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/reports")
@jwt_required()
@require_permission("projects.read")
def projects_list_reports(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        rows = list_project_reports(company_id=company_id, project_id=project_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/reports")
@jwt_required()
@require_permission("projects.manage")
def projects_create_report(project_id):
    payload = load_json(ProjectReportCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        author_user_id = int(get_jwt_identity())
        report = create_project_report(
            company_id=company_id,
            project_id=project_id,
            author_user_id=author_user_id,
            payload=payload,
        )
        return jsonify({"message": "Report created", "report": report}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/documents")
@jwt_required()
@require_permission("projects.read")
def projects_list_documents(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        rows = list_project_documents(company_id=company_id, project_id=project_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/documents")
@jwt_required()
@require_permission("projects.manage")
def projects_create_document(project_id):
    payload = load_json(ProjectDocumentCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        user_id = int(get_jwt_identity())
        document = create_project_document(
            company_id=company_id,
            project_id=project_id,
            uploaded_by_user_id=user_id,
            payload=payload,
        )
        return jsonify({"message": "Document created", "document": document}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.patch("/documents/<int:document_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_update_document(document_id):
    payload = load_json(ProjectDocumentUpdateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        document = update_project_document(company_id=company_id, document_id=document_id, payload=payload)
        return jsonify({"message": "Document updated", "document": document}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.delete("/documents/<int:document_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_delete_document(document_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        delete_project_document(company_id=company_id, document_id=document_id)
        return jsonify({"message": "Document deleted"}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/risks")
@jwt_required()
@require_permission("projects.read")
def projects_list_risks(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        rows = list_project_risks(company_id=company_id, project_id=project_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/risks")
@jwt_required()
@require_permission("projects.manage")
def projects_create_risk(project_id):
    payload = load_json(ProjectRiskCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        risk = create_project_risk(company_id=company_id, project_id=project_id, payload=payload)
        return jsonify({"message": "Risk created", "risk": risk}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.patch("/risks/<int:risk_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_update_risk(risk_id):
    payload = load_json(ProjectRiskUpdateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        risk = update_project_risk(company_id=company_id, risk_id=risk_id, payload=payload)
        return jsonify({"message": "Risk updated", "risk": risk}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/change-orders")
@jwt_required()
@require_permission("projects.read")
def projects_list_change_orders(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        rows = list_project_change_orders(company_id=company_id, project_id=project_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/change-orders")
@jwt_required()
@require_permission("projects.manage")
def projects_create_change_order(project_id):
    payload = load_json(ProjectChangeOrderCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        user_id = int(get_jwt_identity())
        change_order = create_project_change_order(
            company_id=company_id,
            project_id=project_id,
            requested_by_user_id=user_id,
            payload=payload,
        )
        return jsonify({"message": "Change order created", "change_order": change_order}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.patch("/change-orders/<int:change_order_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_update_change_order(change_order_id):
    payload = load_json(ProjectChangeOrderUpdateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        change_order = update_project_change_order(company_id=company_id, change_order_id=change_order_id, payload=payload)
        return jsonify({"message": "Change order updated", "change_order": change_order}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.delete("/change-orders/<int:change_order_id>")
@jwt_required()
@require_permission("projects.manage")
def projects_delete_change_order(change_order_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        delete_project_change_order(company_id=company_id, change_order_id=change_order_id)
        return jsonify({"message": "Change order deleted"}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.get("/<int:project_id>/budgets")
@jwt_required()
@require_permission("projects.read")
def projects_list_budgets(project_id):
    try:
        company_id = resolve_company_scope(ProjectManagementError)
        rows = list_project_budgets(company_id=company_id, project_id=project_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/<int:project_id>/budgets")
@jwt_required()
@require_permission("projects.manage")
def projects_create_budget(project_id):
    payload = load_json(ProjectBudgetCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        budget = create_project_budget(company_id=company_id, project_id=project_id, payload=payload)
        return jsonify({"message": "Budget created", "budget": budget}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)


@projects_bp.post("/budgets/<int:budget_id>/lines")
@jwt_required()
@require_permission("projects.manage")
def projects_create_budget_line(budget_id):
    payload = load_json(ProjectBudgetLineCreateSchema())

    try:
        company_id = resolve_company_scope(ProjectManagementError, payload)
        budget_line = create_project_budget_line(company_id=company_id, budget_id=budget_id, payload=payload)
        return jsonify({"message": "Budget line created", "budget_line": budget_line}), 201
    except ProjectManagementError as exc:
        return error_response_from_exception(exc)
