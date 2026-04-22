from marshmallow import ValidationError, fields, validate, validates_schema

from app.core.validation import StrictSchema, TenantBodySchema, TenantQuerySchema


SOURCE_TYPES = ["file", "inline"]
PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "check", "other"]
LEAVE_REQUEST_TYPES = ["paid_leave", "permission", "sick_leave", "exceptional_leave", "absence_justification", "late_arrival"]
LEAVE_REQUEST_STATUSES = ["draft", "submitted", "received", "in_review", "processing", "approved", "rejected", "resolved"]


class PayrollGenerateRequestSchema(TenantBodySchema):
    source_type = fields.String(load_default="file", validate=validate.OneOf(SOURCE_TYPES))
    source_path = fields.String(required=False, allow_none=True)
    employee_id = fields.String(required=False, allow_none=True)
    dry_run = fields.Boolean(load_default=False)
    allow_override = fields.Boolean(load_default=True)
    include_lines = fields.Boolean(load_default=False)
    output_dir = fields.String(required=False, allow_none=True)
    company_path = fields.String(required=False, allow_none=True)
    config_path = fields.String(required=False, allow_none=True)
    company_data = fields.Dict(required=False, allow_none=True)
    config_data = fields.Dict(required=False, allow_none=True)
    employees = fields.List(fields.Dict(), load_default=list)

    @validates_schema
    def validate_source(self, data, **kwargs):
        source_type = data.get("source_type", "file")
        source_path = data.get("source_path")
        employees = data.get("employees") or []

        if source_type == "file" and not source_path:
            raise ValidationError({"source_path": ["source_path is required when source_type is 'file'."]})

        if source_type == "inline" and not employees:
            raise ValidationError({"employees": ["employees is required when source_type is 'inline'."]})


class PayrollEmployeesListQuerySchema(TenantQuerySchema):
    include_disabled = fields.Boolean(load_default=False)
    include_inactive = fields.Boolean(load_default=False)
    search = fields.String(required=False, allow_none=True)


class PayrollEmployeeProfileUpsertSchema(TenantBodySchema):
    category = fields.String(required=False, allow_none=True)
    echelon = fields.String(required=False, allow_none=True)
    cnps_number = fields.String(required=False, allow_none=True)
    convention_collective = fields.String(required=False, allow_none=True)
    employment_label = fields.String(required=False, allow_none=True)
    hours_schedule = fields.String(required=False, allow_none=True)
    family_status = fields.String(required=False, allow_none=True)
    bank_account_number = fields.String(required=False, allow_none=True)
    bank_domiciliation = fields.String(required=False, allow_none=True)
    payment_method = fields.String(required=False, allow_none=True, validate=validate.OneOf(PAYMENT_METHODS))
    transport_allowance = fields.Decimal(required=False, allow_none=True, as_string=False)
    other_fixed_gains = fields.Decimal(required=False, allow_none=True, as_string=False)
    payroll_notes = fields.String(required=False, allow_none=True)
    is_payroll_enabled = fields.Boolean(required=False, allow_none=True)


class PayrollLeaveRequestCreateSchema(TenantBodySchema):
    client_request_id = fields.String(required=False, allow_none=True, validate=validate.Length(max=120))
    type = fields.String(load_default="paid_leave", validate=validate.OneOf(LEAVE_REQUEST_TYPES))
    title = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    days_requested = fields.Decimal(required=False, allow_none=True, as_string=False, validate=validate.Range(min=0))
    reason = fields.String(required=False, allow_none=True)
    contact = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))
    handover_note = fields.String(required=False, allow_none=True)
    supporting_document_url = fields.String(required=False, allow_none=True, validate=validate.Length(max=500))
    supporting_document_name = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))

    @validates_schema
    def validate_leave_period(self, data, **kwargs):
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise ValidationError({"end_date": ["end_date must be greater than or equal to start_date."]})


class PayrollLeaveRequestStatusUpdateSchema(TenantBodySchema):
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(LEAVE_REQUEST_STATUSES))
    action = fields.String(required=False, allow_none=True, validate=validate.OneOf(["approve", "reject"]))
    decision_note = fields.String(required=False, allow_none=True)

    @validates_schema
    def validate_update_action(self, data, **kwargs):
        if not data.get("status") and not data.get("action"):
            raise ValidationError({"action": ["action or status is required."]})


class PayrollRunListQuerySchema(TenantQuerySchema):
    limit = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))


class PayrollPeriodListQuerySchema(TenantQuerySchema):
    limit = fields.Integer(load_default=24, validate=validate.Range(min=1, max=120))
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(["draft", "generated", "archived"]))


class PayrollPeriodDraftSchema(TenantBodySchema):
    period_key = fields.String(required=False, allow_none=True, validate=validate.Regexp(r"^\d{4}-\d{2}$"))
    label = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    payment_date = fields.Date(required=True)

    @validates_schema
    def validate_period(self, data, **kwargs):
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        payment_date = data.get("payment_date")
        if start_date and end_date and start_date > end_date:
            raise ValidationError({"end_date": ["end_date must be greater than or equal to start_date."]})
        if start_date and payment_date and payment_date < start_date:
            raise ValidationError({"payment_date": ["payment_date must be within or after the payroll period."]})


class PayrollPeriodEmployeeInputSchema(StrictSchema):
    user_id = fields.Integer(required=True, validate=validate.Range(min=1))
    days_paid = fields.Decimal(required=False, allow_none=True, as_string=False)
    late_hours = fields.Decimal(required=False, allow_none=True, as_string=False)
    salary_base_override = fields.Decimal(required=False, allow_none=True, as_string=False)
    transport_allowance = fields.Decimal(required=False, allow_none=True, as_string=False)
    other_gains = fields.Decimal(required=False, allow_none=True, as_string=False)
    brut_imposable = fields.Decimal(required=False, allow_none=True, as_string=False)
    irpp = fields.Decimal(required=False, allow_none=True, as_string=False)
    cac = fields.Decimal(required=False, allow_none=True, as_string=False)
    tc = fields.Decimal(required=False, allow_none=True, as_string=False)
    rav = fields.Decimal(required=False, allow_none=True, as_string=False)
    cfs = fields.Decimal(required=False, allow_none=True, as_string=False)
    payment_method = fields.String(required=False, allow_none=True, validate=validate.OneOf(PAYMENT_METHODS))
    observation = fields.String(required=False, allow_none=True)


class PayrollPeriodInputsBulkSchema(TenantBodySchema):
    employee_inputs = fields.List(fields.Nested(PayrollPeriodEmployeeInputSchema), load_default=list)

    @validates_schema
    def validate_items(self, data, **kwargs):
        employee_inputs = data.get("employee_inputs") or []
        input_ids = [row["user_id"] for row in employee_inputs]
        if len(input_ids) != len(set(input_ids)):
            raise ValidationError({"employee_inputs": ["employee_inputs must not contain duplicate user_id values."]})


class PayrollMonthlyGenerateRequestSchema(TenantBodySchema):
    payroll_period_id = fields.Integer(required=False, allow_none=True, validate=validate.Range(min=1))
    period_key = fields.String(required=False, allow_none=True, validate=validate.Regexp(r"^\d{4}-\d{2}$"))
    label = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    payment_date = fields.Date(required=False, allow_none=True)
    employee_ids = fields.List(fields.Integer(validate=validate.Range(min=1)), load_default=list)
    employee_inputs = fields.List(fields.Nested(PayrollPeriodEmployeeInputSchema), load_default=list)
    include_inactive = fields.Boolean(load_default=False)
    dry_run = fields.Boolean(load_default=False)
    allow_override = fields.Boolean(load_default=True)
    include_lines = fields.Boolean(load_default=False)
    output_dir = fields.String(required=False, allow_none=True)
    company_path = fields.String(required=False, allow_none=True)
    config_path = fields.String(required=False, allow_none=True)
    company_data = fields.Dict(required=False, allow_none=True)
    config_data = fields.Dict(required=False, allow_none=True)

    @validates_schema
    def validate_period(self, data, **kwargs):
        payroll_period_id = data.get("payroll_period_id")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        payment_date = data.get("payment_date")
        if payroll_period_id is None:
            required_fields = {}
            if start_date is None:
                required_fields["start_date"] = ["start_date is required when payroll_period_id is not provided."]
            if end_date is None:
                required_fields["end_date"] = ["end_date is required when payroll_period_id is not provided."]
            if payment_date is None:
                required_fields["payment_date"] = ["payment_date is required when payroll_period_id is not provided."]
            if required_fields:
                raise ValidationError(required_fields)

        if start_date and end_date and start_date > end_date:
            raise ValidationError({"end_date": ["end_date must be greater than or equal to start_date."]})
        if start_date and payment_date and payment_date < start_date:
            raise ValidationError({"payment_date": ["payment_date must be within or after the payroll period."]})

        employee_ids = data.get("employee_ids") or []
        if len(employee_ids) != len(set(employee_ids)):
            raise ValidationError({"employee_ids": ["employee_ids must not contain duplicates."]})

        employee_inputs = data.get("employee_inputs") or []
        input_ids = [row["user_id"] for row in employee_inputs]
        if len(input_ids) != len(set(input_ids)):
            raise ValidationError({"employee_inputs": ["employee_inputs must not contain duplicate user_id values."]})
