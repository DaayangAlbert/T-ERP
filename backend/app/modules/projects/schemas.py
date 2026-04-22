from marshmallow import fields, validate

from app.core.validation import TenantBodySchema, TenantQuerySchema


PROJECT_STATUSES = [
    "draft",
    "preparation",
    "submitted",
    "awarded",
    "in_progress",
    "suspended",
    "completed",
    "provisional_acceptance",
    "final_acceptance",
    "archived",
    "planned",
    "on_hold",
    "cancelled",
]
PROJECT_TYPES = ["public_market", "private_market", "internal_project", "project_preparation"]
TASK_STATUSES = ["todo", "not_started", "in_progress", "blocked", "done", "completed"]
TASK_PRIORITIES = ["low", "medium", "high", "urgent"]
TASK_TYPES = ["phase", "task", "subtask"]
REPORT_TYPES = ["daily", "weekly", "monthly", "final"]
ASSIGNMENT_MODES = ["immediate", "deferred"]
RISK_SEVERITIES = ["low", "medium", "high", "critical"]
RISK_STATUSES = ["open", "monitoring", "mitigated", "closed"]
DOCUMENT_CATEGORIES = ["dao", "contract", "plan", "invoice", "report", "pv", "decompte", "photo", "other"]
CHANGE_ORDER_STATUSES = ["draft", "submitted", "approved", "rejected", "implemented"]
PROJECT_ROLES = [
    "dg",
    "directeur_technique",
    "chef_projet",
    "conducteur_travaux",
    "comptable",
    "magasinier",
    "ouvrier",
]


class ProjectsListQuerySchema(TenantQuerySchema):
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(PROJECT_STATUSES))
    project_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(PROJECT_TYPES))
    include_archived = fields.Boolean(load_default=False)


class ProjectCreateSchema(TenantBodySchema):
    code = fields.String(required=True, validate=validate.Length(min=2))
    name = fields.String(required=True, validate=validate.Length(min=1))
    market_reference = fields.String(required=False, allow_none=True)
    project_type = fields.String(load_default="internal_project", validate=validate.OneOf(PROJECT_TYPES))
    description = fields.String(required=False, allow_none=True)
    location = fields.String(required=False, allow_none=True)
    client_name = fields.String(required=False, allow_none=True)
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    estimated_duration_days = fields.Integer(required=False, allow_none=True)
    status = fields.String(load_default="draft", validate=validate.OneOf(PROJECT_STATUSES))
    budget_amount = fields.Decimal(required=False, allow_none=True, as_string=False)
    contract_amount = fields.Decimal(required=False, allow_none=True, as_string=False)
    progress_percent = fields.Decimal(required=False, allow_none=True, as_string=False)
    physical_progress_percent = fields.Decimal(required=False, allow_none=True, as_string=False)
    financial_progress_percent = fields.Decimal(required=False, allow_none=True, as_string=False)
    document_url = fields.String(required=False, allow_none=True)
    dao_number = fields.String(required=False, allow_none=True)
    contracting_authority = fields.String(required=False, allow_none=True)
    publication_date = fields.Date(required=False, allow_none=True)
    submission_date = fields.Date(required=False, allow_none=True)
    award_date = fields.Date(required=False, allow_none=True)
    contract_duration_days = fields.Integer(required=False, allow_none=True)
    funding_source = fields.String(required=False, allow_none=True)
    site_latitude = fields.Decimal(required=False, allow_none=True, as_string=False)
    site_longitude = fields.Decimal(required=False, allow_none=True, as_string=False)
    final_cost_amount = fields.Decimal(required=False, allow_none=True, as_string=False)
    actual_duration_days = fields.Integer(required=False, allow_none=True)
    closing_observations = fields.String(required=False, allow_none=True)


class ProjectUpdateSchema(TenantBodySchema):
    name = fields.String(required=False, validate=validate.Length(min=1))
    market_reference = fields.String(required=False, allow_none=True)
    project_type = fields.String(required=False, validate=validate.OneOf(PROJECT_TYPES))
    description = fields.String(required=False, allow_none=True)
    location = fields.String(required=False, allow_none=True)
    client_name = fields.String(required=False, allow_none=True)
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    estimated_duration_days = fields.Integer(required=False, allow_none=True)
    status = fields.String(required=False, validate=validate.OneOf(PROJECT_STATUSES))
    budget_amount = fields.Decimal(required=False, allow_none=True, as_string=False)
    contract_amount = fields.Decimal(required=False, allow_none=True, as_string=False)
    progress_percent = fields.Decimal(required=False, allow_none=True, as_string=False)
    physical_progress_percent = fields.Decimal(required=False, allow_none=True, as_string=False)
    financial_progress_percent = fields.Decimal(required=False, allow_none=True, as_string=False)
    document_url = fields.String(required=False, allow_none=True)
    dao_number = fields.String(required=False, allow_none=True)
    contracting_authority = fields.String(required=False, allow_none=True)
    publication_date = fields.Date(required=False, allow_none=True)
    submission_date = fields.Date(required=False, allow_none=True)
    award_date = fields.Date(required=False, allow_none=True)
    contract_duration_days = fields.Integer(required=False, allow_none=True)
    funding_source = fields.String(required=False, allow_none=True)
    site_latitude = fields.Decimal(required=False, allow_none=True, as_string=False)
    site_longitude = fields.Decimal(required=False, allow_none=True, as_string=False)
    final_cost_amount = fields.Decimal(required=False, allow_none=True, as_string=False)
    actual_duration_days = fields.Integer(required=False, allow_none=True)
    closing_observations = fields.String(required=False, allow_none=True)


class ProjectTeamCreateSchema(TenantBodySchema):
    name = fields.String(required=True, validate=validate.Length(min=1))
    supervisor_user_id = fields.Integer(required=False, allow_none=True)


class ProjectTeamMemberSchema(TenantBodySchema):
    user_id = fields.Integer(required=True)
    role_on_team = fields.String(required=False, allow_none=True)


class ProjectAssignmentsListQuerySchema(TenantQuerySchema):
    active_only = fields.Boolean(load_default=False)


class ProjectAssignmentCreateSchema(TenantBodySchema):
    user_id = fields.Integer(required=True)
    project_role = fields.String(required=True, validate=validate.Length(min=1))
    assignment_mode = fields.String(load_default="immediate", validate=validate.OneOf(ASSIGNMENT_MODES))
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    responsibility = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
    is_active = fields.Boolean(load_default=True)


class ProjectAssignmentUpdateSchema(TenantBodySchema):
    project_role = fields.String(required=False, validate=validate.Length(min=1))
    assignment_mode = fields.String(required=False, validate=validate.OneOf(ASSIGNMENT_MODES))
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    responsibility = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
    is_active = fields.Boolean(required=False)


class ProjectTasksListQuerySchema(TenantQuerySchema):
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(TASK_STATUSES))


class ProjectTaskCreateSchema(TenantBodySchema):
    parent_task_id = fields.Integer(required=False, allow_none=True)
    task_type = fields.String(load_default="task", validate=validate.OneOf(TASK_TYPES))
    title = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    assigned_to_user_id = fields.Integer(required=False, allow_none=True)
    responsible_user_id = fields.Integer(required=False, allow_none=True)
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    due_date = fields.Date(required=False, allow_none=True)
    priority = fields.String(load_default="medium", validate=validate.OneOf(TASK_PRIORITIES))
    status = fields.String(load_default="not_started", validate=validate.OneOf(TASK_STATUSES))
    progress_percent = fields.Decimal(required=False, allow_none=True, as_string=False)
    responsibility = fields.String(required=False, allow_none=True)


class ProjectTaskUpdateSchema(TenantBodySchema):
    parent_task_id = fields.Integer(required=False, allow_none=True)
    task_type = fields.String(required=False, validate=validate.OneOf(TASK_TYPES))
    title = fields.String(required=False, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    assigned_to_user_id = fields.Integer(required=False, allow_none=True)
    responsible_user_id = fields.Integer(required=False, allow_none=True)
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    due_date = fields.Date(required=False, allow_none=True)
    priority = fields.String(required=False, validate=validate.OneOf(TASK_PRIORITIES))
    status = fields.String(required=False, validate=validate.OneOf(TASK_STATUSES))
    progress_percent = fields.Decimal(required=False, allow_none=True, as_string=False)
    responsibility = fields.String(required=False, allow_none=True)


class ProjectReportCreateSchema(TenantBodySchema):
    report_date = fields.Date(required=True)
    report_type = fields.String(load_default="daily", validate=validate.OneOf(REPORT_TYPES))
    weather = fields.String(required=False, allow_none=True)
    summary = fields.String(required=True, validate=validate.Length(min=1))
    activities_summary = fields.String(required=False, allow_none=True)
    personnel_present = fields.Integer(required=False, allow_none=True)
    incidents = fields.String(required=False, allow_none=True)
    observations = fields.String(required=False, allow_none=True)
    photo_urls = fields.List(fields.String(validate=validate.Length(min=1)), required=False, allow_none=True)
    blockers = fields.String(required=False, allow_none=True)
    attachment_url = fields.String(required=False, allow_none=True)


class ProjectDocumentCreateSchema(TenantBodySchema):
    category = fields.String(load_default="other", validate=validate.OneOf(DOCUMENT_CATEGORIES))
    title = fields.String(required=True, validate=validate.Length(min=1))
    file_url = fields.String(required=True, validate=validate.Length(min=1))
    document_date = fields.Date(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class ProjectDocumentUpdateSchema(TenantBodySchema):
    category = fields.String(required=False, validate=validate.OneOf(DOCUMENT_CATEGORIES))
    title = fields.String(required=False, validate=validate.Length(min=1))
    file_url = fields.String(required=False, validate=validate.Length(min=1))
    document_date = fields.Date(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class ProjectRiskCreateSchema(TenantBodySchema):
    owner_user_id = fields.Integer(required=False, allow_none=True)
    title = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    severity = fields.String(load_default="medium", validate=validate.OneOf(RISK_SEVERITIES))
    status = fields.String(load_default="open", validate=validate.OneOf(RISK_STATUSES))
    mitigation_plan = fields.String(required=False, allow_none=True)
    due_date = fields.Date(required=False, allow_none=True)


class ProjectRiskUpdateSchema(TenantBodySchema):
    owner_user_id = fields.Integer(required=False, allow_none=True)
    title = fields.String(required=False, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    severity = fields.String(required=False, validate=validate.OneOf(RISK_SEVERITIES))
    status = fields.String(required=False, validate=validate.OneOf(RISK_STATUSES))
    mitigation_plan = fields.String(required=False, allow_none=True)
    due_date = fields.Date(required=False, allow_none=True)


class ProjectChangeOrderCreateSchema(TenantBodySchema):
    reference = fields.String(required=True, validate=validate.Length(min=1))
    title = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    amount_delta = fields.Decimal(required=False, allow_none=True, as_string=False)
    delay_delta_days = fields.Integer(required=False, allow_none=True)
    status = fields.String(load_default="draft", validate=validate.OneOf(CHANGE_ORDER_STATUSES))
    effective_date = fields.Date(required=False, allow_none=True)


class ProjectChangeOrderUpdateSchema(TenantBodySchema):
    reference = fields.String(required=False, validate=validate.Length(min=1))
    title = fields.String(required=False, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    amount_delta = fields.Decimal(required=False, allow_none=True, as_string=False)
    delay_delta_days = fields.Integer(required=False, allow_none=True)
    status = fields.String(required=False, validate=validate.OneOf(CHANGE_ORDER_STATUSES))
    effective_date = fields.Date(required=False, allow_none=True)


class ProjectBudgetCreateSchema(TenantBodySchema):
    version_label = fields.String(required=True, validate=validate.Length(min=1))
    status = fields.String(load_default="draft", validate=validate.OneOf(["draft", "approved", "archived"]))
    total_budget = fields.Decimal(required=False, allow_none=True, as_string=False)
    notes = fields.String(required=False, allow_none=True)


class ProjectBudgetLineCreateSchema(TenantBodySchema):
    account_id = fields.Integer(required=False, allow_none=True)
    category = fields.String(required=True, validate=validate.Length(min=1))
    label = fields.String(required=True, validate=validate.Length(min=1))
    planned_amount = fields.Decimal(required=True, as_string=False)
    committed_amount = fields.Decimal(required=False, allow_none=True, as_string=False)
    actual_amount = fields.Decimal(required=False, allow_none=True, as_string=False)


class ProjectPresenceCreateSchema(TenantBodySchema):
    worker_user_id = fields.Integer(required=False, allow_none=True)
    user_id = fields.Integer(required=False, allow_none=True)
    work_date = fields.Date(required=False, allow_none=True)
    attendance_date = fields.Date(required=False, allow_none=True)
    entry_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(["presence", "absence", "overtime"]))
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(["present", "absent", "overtime", "late"]))
    arrival_time = fields.Time(required=False, allow_none=True)
    departure_time = fields.Time(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class ProjectPresenceUpdateSchema(TenantBodySchema):
    worker_user_id = fields.Integer(required=False, allow_none=True)
    user_id = fields.Integer(required=False, allow_none=True)
    work_date = fields.Date(required=False, allow_none=True)
    attendance_date = fields.Date(required=False, allow_none=True)
    entry_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(["presence", "absence", "overtime"]))
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(["present", "absent", "overtime", "late"]))
    arrival_time = fields.Time(required=False, allow_none=True)
    departure_time = fields.Time(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
