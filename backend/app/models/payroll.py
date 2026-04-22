from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import TimestampMixin


PAYMENT_METHODS = ("cash", "bank_transfer", "mobile_money", "check", "other")
PAYROLL_PERIOD_STATUSES = ("draft", "generated", "archived")
PAYROLL_RUN_STATUSES = ("generated", "failed")
PAYROLL_LEAVE_REQUEST_TYPES = (
    "paid_leave",
    "permission",
    "sick_leave",
    "exceptional_leave",
    "absence_justification",
    "late_arrival",
)
PAYROLL_LEAVE_REQUEST_STATUSES = ("draft", "submitted", "received", "in_review", "processing", "approved", "rejected", "resolved")


class EmployeePayrollProfile(db.Model, TimestampMixin):
    __tablename__ = "employee_payroll_profiles"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    category = db.Column(db.String(80), nullable=True)
    echelon = db.Column(db.String(80), nullable=True)
    cnps_number = db.Column(db.String(120), nullable=True)
    convention_collective = db.Column(db.String(255), nullable=True)
    employment_label = db.Column(db.String(120), nullable=True)
    hours_schedule = db.Column(db.String(120), nullable=True)
    family_status = db.Column(db.String(120), nullable=True)
    bank_account_number = db.Column(db.String(120), nullable=True)
    bank_domiciliation = db.Column(db.String(255), nullable=True)
    payment_method = db.Column(db.String(30), nullable=True, default="bank_transfer")
    transport_allowance = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    other_fixed_gains = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    payroll_notes = db.Column(db.Text, nullable=True)
    is_payroll_enabled = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("company_id", "user_id", name="uq_employee_payroll_profiles_company_user"),
        CheckConstraint(
            "payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'check', 'other')",
            name="ck_employee_payroll_profiles_payment_method",
        ),
    )


class PayrollPeriod(db.Model, TimestampMixin):
    __tablename__ = "payroll_periods"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    period_key = db.Column(db.String(7), nullable=False)
    label = db.Column(db.String(120), nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="draft")
    notes = db.Column(db.Text, nullable=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("company_id", "period_key", name="uq_payroll_periods_company_period_key"),
        CheckConstraint(
            "status IN ('draft', 'generated', 'archived')",
            name="ck_payroll_periods_status",
        ),
    )


class PayrollPeriodInput(db.Model, TimestampMixin):
    __tablename__ = "payroll_period_inputs"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    payroll_period_id = db.Column(db.Integer, db.ForeignKey("payroll_periods.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    days_paid = db.Column(db.Numeric(8, 2), nullable=True)
    late_hours = db.Column(db.Numeric(8, 2), nullable=True)
    salary_base_override = db.Column(db.Numeric(14, 2), nullable=True)
    transport_allowance = db.Column(db.Numeric(14, 2), nullable=True)
    other_gains = db.Column(db.Numeric(14, 2), nullable=True)
    brut_imposable = db.Column(db.Numeric(14, 2), nullable=True)
    irpp = db.Column(db.Numeric(14, 2), nullable=True)
    cac = db.Column(db.Numeric(14, 2), nullable=True)
    tc = db.Column(db.Numeric(14, 2), nullable=True)
    rav = db.Column(db.Numeric(14, 2), nullable=True)
    cfs = db.Column(db.Numeric(14, 2), nullable=True)
    payment_method = db.Column(db.String(30), nullable=True)
    observation = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "payroll_period_id",
            "user_id",
            name="uq_payroll_period_inputs_company_period_user",
        ),
        CheckConstraint(
            "payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'check', 'other')",
            name="ck_payroll_period_inputs_payment_method",
        ),
    )


class PayrollRun(db.Model, TimestampMixin):
    __tablename__ = "payroll_runs"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    payroll_period_id = db.Column(db.Integer, db.ForeignKey("payroll_periods.id"), nullable=False, index=True)
    generated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    run_reference = db.Column(db.String(120), nullable=False)
    output_root = db.Column(db.String(500), nullable=True)
    employee_count = db.Column(db.Integer, nullable=False, default=0)
    total_brut = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    total_net = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    total_patronal = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="generated")
    error_message = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "run_reference", name="uq_payroll_runs_company_reference"),
        CheckConstraint(
            "status IN ('generated', 'failed')",
            name="ck_payroll_runs_status",
        ),
    )


class PayrollRunItem(db.Model, TimestampMixin):
    __tablename__ = "payroll_run_items"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    payroll_run_id = db.Column(db.Integer, db.ForeignKey("payroll_runs.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    employee_number = db.Column(db.String(120), nullable=True)
    employee_name = db.Column(db.String(255), nullable=False)
    period_key = db.Column(db.String(7), nullable=False)
    salaire_brut = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    total_retenues = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    total_patronal = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    net_a_payer = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    pdf_path = db.Column(db.String(500), nullable=True)
    payload_snapshot = db.Column(db.JSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "payroll_run_id", "user_id", name="uq_payroll_run_items_company_run_user"),
    )


class PayrollLeaveRequest(db.Model, TimestampMixin):
    __tablename__ = "payroll_leave_requests"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    client_request_id = db.Column(db.String(120), nullable=True)
    type = db.Column(db.String(40), nullable=False, default="paid_leave")
    title = db.Column(db.String(255), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    days_requested = db.Column(db.Numeric(8, 2), nullable=False, default=0)
    reason = db.Column(db.Text, nullable=True)
    contact = db.Column(db.String(255), nullable=True)
    handover_note = db.Column(db.Text, nullable=True)
    supporting_document_url = db.Column(db.String(500), nullable=True)
    supporting_document_name = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="submitted")
    reviewed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "user_id",
            "client_request_id",
            name="uq_payroll_leave_requests_company_user_client_request",
        ),
        CheckConstraint(
            "type IN ('paid_leave', 'permission', 'sick_leave', 'exceptional_leave', 'absence_justification', 'late_arrival')",
            name="ck_payroll_leave_requests_type",
        ),
        CheckConstraint(
            "status IN ('draft', 'submitted', 'received', 'in_review', 'processing', 'approved', 'rejected', 'resolved')",
            name="ck_payroll_leave_requests_status",
        ),
    )
