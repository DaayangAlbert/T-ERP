from marshmallow import fields, validate

from app.core.validation import StrictSchema


class CompanyRegisterSchema(StrictSchema):
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
    currency = fields.String(load_default="EUR", validate=validate.Length(equal=3))
    timezone = fields.String(load_default="Europe/Paris", validate=validate.Length(min=1))
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
    subscription_plan_code = fields.String(required=False, allow_none=True)
    subscription_status = fields.String(required=False, allow_none=True)
    subscription_validation_status = fields.String(required=False, allow_none=True)
    subscription_start_date = fields.Date(required=False, allow_none=True)
    subscription_end_date = fields.Date(required=False, allow_none=True)
    subscription_amount_paid = fields.Decimal(required=False, allow_none=True, as_string=True)
    subscription_payment_method = fields.String(required=False, allow_none=True)
    subscription_transaction_reference = fields.String(required=False, allow_none=True)
    subscription_notes = fields.String(required=False, allow_none=True)


class CompanyReviewSchema(StrictSchema):
    decision = fields.String(
        required=True,
        validate=validate.OneOf(["approved", "rejected", "pending", "under_review", "info_requested", "suspended"]),
    )
    note = fields.String(required=False, allow_none=True)
    rejection_reason = fields.String(required=False, allow_none=True)
    requested_information = fields.String(required=False, allow_none=True)


class CompanySettingsUpdateSchema(StrictSchema):
    email = fields.Email(required=False)
    phone = fields.String(required=False, allow_none=True)
    city = fields.String(required=False, allow_none=True)
    address_line = fields.String(required=False, allow_none=True)
    trade_name = fields.String(required=False, allow_none=True)
    acronym = fields.String(required=False, allow_none=True)
    country_name = fields.String(required=False, allow_none=True)
    activity_domain = fields.String(required=False, allow_none=True)
    logo_url = fields.String(required=False, allow_none=True)
    administrative_documents = fields.Raw(required=False, allow_none=True)
    currency = fields.String(required=False, validate=validate.Length(equal=3))
    timezone = fields.String(required=False, validate=validate.Length(min=1))
    default_language = fields.String(required=False, validate=validate.OneOf(["fr", "en"]))
    date_format = fields.String(required=False, validate=validate.Length(min=1))
    contact_person_name = fields.String(required=False, allow_none=True)
    contact_person_phone = fields.String(required=False, allow_none=True)
    website_url = fields.String(required=False, allow_none=True)
