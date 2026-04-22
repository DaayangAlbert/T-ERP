from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import SoftDeleteMixin, TenantScopedMixin, TimestampMixin


PROJECT_STATUS_VALUES = (
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
)
PROJECT_TYPE_VALUES = ("public_market", "private_market", "internal_project", "project_preparation")
TASK_STATUS_VALUES = ("todo", "not_started", "in_progress", "blocked", "done", "completed")
TASK_TYPE_VALUES = ("phase", "task", "subtask")
REPORT_TYPE_VALUES = ("daily", "weekly", "monthly", "final")
ASSIGNMENT_MODE_VALUES = ("immediate", "deferred")
RISK_SEVERITY_VALUES = ("low", "medium", "high", "critical")
RISK_STATUS_VALUES = ("open", "monitoring", "mitigated", "closed")
CHANGE_ORDER_STATUS_VALUES = ("draft", "submitted", "approved", "rejected", "implemented")
DOCUMENT_CATEGORY_VALUES = ("dao", "contract", "plan", "invoice", "report", "pv", "decompte", "photo", "other")


class Project(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(80), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    market_reference = db.Column(db.String(120), nullable=True)
    project_type = db.Column(db.String(30), nullable=False, default="internal_project")
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(255), nullable=True)
    client_name = db.Column(db.String(255), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    estimated_duration_days = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(30), nullable=False, default="planned")
    budget_amount = db.Column(db.Numeric(14, 2), nullable=True)
    contract_amount = db.Column(db.Numeric(14, 2), nullable=True)
    progress_percent = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    physical_progress_percent = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    financial_progress_percent = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    document_url = db.Column(db.String(500), nullable=True)
    dao_number = db.Column(db.String(120), nullable=True)
    contracting_authority = db.Column(db.String(255), nullable=True)
    publication_date = db.Column(db.Date, nullable=True)
    submission_date = db.Column(db.Date, nullable=True)
    award_date = db.Column(db.Date, nullable=True)
    contract_duration_days = db.Column(db.Integer, nullable=True)
    funding_source = db.Column(db.String(255), nullable=True)
    site_latitude = db.Column(db.Numeric(10, 6), nullable=True)
    site_longitude = db.Column(db.Numeric(10, 6), nullable=True)
    final_cost_amount = db.Column(db.Numeric(14, 2), nullable=True)
    actual_duration_days = db.Column(db.Integer, nullable=True)
    closing_observations = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_projects_company_code"),
        CheckConstraint(
            "status IN ('draft', 'preparation', 'submitted', 'awarded', 'in_progress', 'suspended', "
            "'completed', 'provisional_acceptance', 'final_acceptance', 'archived', 'planned', 'on_hold', 'cancelled')",
            name="ck_projects_status",
        ),
        CheckConstraint(
            "project_type IN ('public_market', 'private_market', 'internal_project', 'project_preparation')",
            name="ck_projects_project_type",
        ),
        CheckConstraint("progress_percent >= 0 AND progress_percent <= 100", name="ck_projects_progress_percent"),
        CheckConstraint(
            "physical_progress_percent >= 0 AND physical_progress_percent <= 100",
            name="ck_projects_physical_progress_percent",
        ),
        CheckConstraint(
            "financial_progress_percent >= 0 AND financial_progress_percent <= 100",
            name="ck_projects_financial_progress_percent",
        ),
    )


class Team(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "teams"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    supervisor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("company_id", "project_id", "name", name="uq_teams_company_project_name"),
    )


class TeamMember(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "team_members"

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    role_on_team = db.Column(db.String(100), nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "team_id", "user_id", name="uq_team_members_company_team_user"),
    )


class ProjectTask(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "project_tasks"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    parent_task_id = db.Column(db.Integer, db.ForeignKey("project_tasks.id"), nullable=True, index=True)
    task_type = db.Column(db.String(20), nullable=False, default="task")
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    assigned_to_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    responsible_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    priority = db.Column(db.String(20), nullable=False, default="medium")
    status = db.Column(db.String(20), nullable=False, default="todo")
    progress_percent = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    responsibility = db.Column(db.String(255), nullable=True)

    __table_args__ = (
        CheckConstraint("task_type IN ('phase', 'task', 'subtask')", name="ck_project_tasks_task_type"),
        CheckConstraint("priority IN ('low', 'medium', 'high', 'urgent')", name="ck_project_tasks_priority"),
        CheckConstraint(
            "status IN ('todo', 'not_started', 'in_progress', 'blocked', 'done', 'completed')",
            name="ck_project_tasks_status",
        ),
        CheckConstraint("progress_percent >= 0 AND progress_percent <= 100", name="ck_project_tasks_progress_percent"),
    )


class ProjectReport(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "project_reports"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    author_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    report_date = db.Column(db.Date, nullable=False)
    report_type = db.Column(db.String(20), nullable=False, default="daily")
    weather = db.Column(db.String(100), nullable=True)
    summary = db.Column(db.Text, nullable=False)
    activities_summary = db.Column(db.Text, nullable=True)
    personnel_present = db.Column(db.Integer, nullable=False, default=0)
    incidents = db.Column(db.Text, nullable=True)
    observations = db.Column(db.Text, nullable=True)
    photo_urls = db.Column(db.JSON, nullable=True)
    blockers = db.Column(db.Text, nullable=True)
    attachment_url = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "project_id", "report_date", name="uq_project_reports_company_project_date"),
        CheckConstraint("report_type IN ('daily', 'weekly', 'monthly', 'final')", name="ck_project_reports_type"),
        CheckConstraint("personnel_present >= 0", name="ck_project_reports_personnel_present_non_negative"),
    )


class ProjectAssignment(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "project_assignments"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    project_role = db.Column(db.String(120), nullable=False)
    assignment_mode = db.Column(db.String(20), nullable=False, default="immediate")
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    responsibility = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        CheckConstraint("assignment_mode IN ('immediate', 'deferred')", name="ck_project_assignments_mode"),
    )


class ProjectDocument(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "project_documents"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    uploaded_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    category = db.Column(db.String(20), nullable=False, default="other")
    title = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    document_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "category IN ('dao', 'contract', 'plan', 'invoice', 'report', 'pv', 'decompte', 'photo', 'other')",
            name="ck_project_documents_category",
        ),
    )


class ProjectRisk(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "project_risks"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    owner_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(20), nullable=False, default="medium")
    status = db.Column(db.String(20), nullable=False, default="open")
    mitigation_plan = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.Date, nullable=True)

    __table_args__ = (
        CheckConstraint("severity IN ('low', 'medium', 'high', 'critical')", name="ck_project_risks_severity"),
        CheckConstraint("status IN ('open', 'monitoring', 'mitigated', 'closed')", name="ck_project_risks_status"),
    )


class ProjectChangeOrder(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "project_change_orders"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    requested_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    reference = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    amount_delta = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    delay_delta_days = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="draft")
    effective_date = db.Column(db.Date, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "project_id", "reference", name="uq_project_change_orders_project_reference"),
        CheckConstraint(
            "status IN ('draft', 'submitted', 'approved', 'rejected', 'implemented')",
            name="ck_project_change_orders_status",
        ),
    )
