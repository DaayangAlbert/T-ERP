from marshmallow import fields, validate

from app.core.validation import QuerySchema, StrictSchema


class AdminCompanyReviewSchema(StrictSchema):
    action = fields.String(
        required=True,
        validate=validate.OneOf(["approve", "reject", "pending", "under_review", "info_requested", "suspend"]),
    )
    note = fields.String(required=False, allow_none=True)
    rejection_reason = fields.String(required=False, allow_none=True)
    requested_information = fields.String(required=False, allow_none=True)


class AdminCompanyCreateSchema(StrictSchema):
    legal_name = fields.String(required=True, validate=validate.Length(min=1))
    trade_name = fields.String(required=False, allow_none=True)
    acronym = fields.String(required=False, allow_none=True)
    registration_number = fields.String(required=True, validate=validate.Length(min=1))
    tax_number = fields.String(required=False, allow_none=True)
    email = fields.Email(required=True)
    phone = fields.String(required=False, allow_none=True)
    country_code = fields.String(required=True, validate=validate.Length(equal=2))
    country_name = fields.String(required=False, allow_none=True)
    city = fields.String(required=False, allow_none=True)
    address_line = fields.String(required=False, allow_none=True)
    activity_domain = fields.String(required=False, allow_none=True)
    logo_url = fields.String(required=False, allow_none=True)
    administrative_documents = fields.Raw(required=False, allow_none=True)
    currency = fields.String(load_default="XAF", validate=validate.Length(equal=3))
    timezone = fields.String(load_default="Africa/Douala", validate=validate.Length(min=1))
    default_language = fields.String(load_default="fr", validate=validate.OneOf(["fr", "en"]))
    date_format = fields.String(load_default="DD/MM/YYYY", validate=validate.Length(min=1))
    contact_person_name = fields.String(required=False, allow_none=True)
    contact_person_phone = fields.String(required=False, allow_none=True)
    website_url = fields.String(required=False, allow_none=True)
    admin_first_name = fields.String(required=True, validate=validate.Length(min=1))
    admin_last_name = fields.String(required=True, validate=validate.Length(min=1))
    admin_email = fields.Email(required=True)
    admin_password = fields.String(required=True, validate=validate.Length(min=8))
    admin_login_identifier = fields.String(required=False, allow_none=True)
    admin_phone = fields.String(required=False, allow_none=True)
    admin_job_title = fields.String(required=False, allow_none=True)
    admin_department = fields.String(required=False, allow_none=True)
    admin_must_change_password = fields.Boolean(load_default=False)
    subscription_plan_id = fields.Integer(required=False, allow_none=True)
    subscription_status = fields.String(required=False, allow_none=True)
    subscription_validation_status = fields.String(required=False, allow_none=True)
    subscription_start_date = fields.Date(required=False, allow_none=True)
    subscription_end_date = fields.Date(required=False, allow_none=True)
    subscription_amount_paid = fields.Decimal(required=False, allow_none=True, as_string=True)
    subscription_payment_method = fields.String(required=False, allow_none=True)
    subscription_transaction_reference = fields.String(required=False, allow_none=True)
    subscription_notes = fields.String(required=False, allow_none=True)
    initial_review_decision = fields.String(
        load_default="approved",
        validate=validate.OneOf(["approved", "pending", "under_review", "info_requested", "suspended", "rejected"]),
    )


class AdminCompanyUpdateSchema(StrictSchema):
    legal_name = fields.String(required=False, validate=validate.Length(min=1))
    trade_name = fields.String(required=False, allow_none=True)
    acronym = fields.String(required=False, allow_none=True)
    registration_number = fields.String(required=False, validate=validate.Length(min=1))
    tax_number = fields.String(required=False, allow_none=True)
    email = fields.Email(required=False)
    phone = fields.String(required=False, allow_none=True)
    country_code = fields.String(required=False, validate=validate.Length(equal=2))
    country_name = fields.String(required=False, allow_none=True)
    city = fields.String(required=False, allow_none=True)
    address_line = fields.String(required=False, allow_none=True)
    activity_domain = fields.String(required=False, allow_none=True)
    logo_url = fields.String(required=False, allow_none=True)
    administrative_documents = fields.Raw(required=False, allow_none=True)
    contact_person_name = fields.String(required=False, allow_none=True)
    contact_person_phone = fields.String(required=False, allow_none=True)
    website_url = fields.String(required=False, allow_none=True)


class AdminCompanyStatusSchema(StrictSchema):
    account_status = fields.String(
        required=True,
        validate=validate.OneOf(["pending", "active", "suspended", "expired", "rejected"]),
    )
    note = fields.String(required=False, allow_none=True)


class SubscriptionPlanSchema(StrictSchema):
    code = fields.String(required=True, validate=validate.Length(min=1))
    name = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    duration_days = fields.Integer(required=True, validate=validate.Range(min=1))
    price_amount = fields.Decimal(required=True, as_string=True, validate=validate.Range(min=0))
    currency = fields.String(required=True, validate=validate.Length(equal=3))
    is_active = fields.Boolean(load_default=True)


class SubscriptionPlanUpdateSchema(StrictSchema):
    code = fields.String(required=False, validate=validate.Length(min=1))
    name = fields.String(required=False, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    duration_days = fields.Integer(required=False, validate=validate.Range(min=1))
    price_amount = fields.Decimal(required=False, as_string=True, validate=validate.Range(min=0))
    currency = fields.String(required=False, validate=validate.Length(equal=3))
    is_active = fields.Boolean(required=False)


class CompanySubscriptionCreateSchema(StrictSchema):
    plan_id = fields.Integer(required=True)
    status = fields.String(
        load_default="pending",
        validate=validate.OneOf(["pending", "in_validation", "active", "expired", "suspended", "rejected", "cancelled"]),
    )
    validation_status = fields.String(
        load_default="pending",
        validate=validate.OneOf(["pending", "in_validation", "validated", "rejected", "on_hold"]),
    )
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    amount_paid = fields.Decimal(required=False, allow_none=True, as_string=True)
    payment_method = fields.String(required=False, allow_none=True)
    transaction_reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class CompanySubscriptionUpdateSchema(StrictSchema):
    status = fields.String(
        required=False,
        validate=validate.OneOf(["pending", "in_validation", "active", "expired", "suspended", "rejected", "cancelled"]),
    )
    validation_status = fields.String(
        required=False,
        validate=validate.OneOf(["pending", "in_validation", "validated", "rejected", "on_hold"]),
    )
    start_date = fields.Date(required=False, allow_none=True)
    end_date = fields.Date(required=False, allow_none=True)
    amount_paid = fields.Decimal(required=False, allow_none=True, as_string=True)
    payment_method = fields.String(required=False, allow_none=True)
    transaction_reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class AdminPrimaryAdminAssignSchema(StrictSchema):
    user_id = fields.Integer(required=True)


class AdminUsersListQuerySchema(QuerySchema):
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=25, validate=validate.Range(min=1, max=100))


class AdminAuditLogQuerySchema(QuerySchema):
    company_id = fields.Integer(required=False, allow_none=True)
    user_id = fields.Integer(required=False, allow_none=True)
    limit = fields.Integer(load_default=100, validate=validate.Range(min=1, max=500))
