from marshmallow import fields, pre_load, validate

from app.core.operational_profiles import OPERATIONAL_PROFILE_TEMPLATES
from app.core.validation import TenantBodySchema, TenantQuerySchema


USER_TYPE_CHOICES = ["company_admin", "employee", "external_controller", "job_seeker"]
USER_ACCOUNT_STATUS_CHOICES = ["active", "inactive", "suspended", "archived", "locked", "exited"]
OPERATIONAL_PROFILE_CODES = [template["code"] for template in OPERATIONAL_PROFILE_TEMPLATES]
ORGANIZATION_UNIT_TYPE_CHOICES = ["directorate", "department", "service", "team"]
IDENTITY_DOCUMENT_TYPE_CHOICES = ["cni", "passport", "other"]
NOTIFICATION_CATEGORY_CHOICES = ["payslips"]


def _normalize_optional_blank_strings(data, field_names):
    if not isinstance(data, dict):
        return data

    normalized = dict(data)
    for field_name in field_names:
        value = normalized.get(field_name)
        if isinstance(value, str) and value.strip() == "":
            normalized[field_name] = None

    return normalized


class UsersListQuerySchema(TenantQuerySchema):
    include_inactive = fields.Boolean(load_default=False)
    search = fields.String(load_default=None, allow_none=True)
    department = fields.String(load_default=None, allow_none=True)
    contract_type = fields.String(load_default=None, allow_none=True)
    account_status = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(USER_ACCOUNT_STATUS_CHOICES))
    user_type = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(USER_TYPE_CHOICES))
    hierarchy_level = fields.Integer(load_default=None, allow_none=True, validate=validate.Range(min=1, max=4))
    organization_unit_id = fields.Integer(load_default=None, allow_none=True)


class UserCreateSchema(TenantBodySchema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    first_name = fields.String(required=True, validate=validate.Length(min=1))
    last_name = fields.String(required=True, validate=validate.Length(min=1))
    login_identifier = fields.String(required=False, allow_none=True)
    phone = fields.String(required=False, allow_none=True)
    preferred_language = fields.String(load_default="fr", validate=validate.OneOf(["fr", "en"]))
    user_type = fields.String(required=True, validate=validate.OneOf(USER_TYPE_CHOICES))
    gender = fields.String(required=False, allow_none=True, validate=validate.OneOf(["male", "female", "other"]))
    birth_date = fields.Date(required=False, allow_none=True)
    address_line = fields.String(required=False, allow_none=True)
    job_title = fields.String(required=False, allow_none=True)
    department = fields.String(required=False, allow_none=True)
    employee_number = fields.String(required=False, allow_none=True)
    hire_date = fields.Date(required=False, allow_none=True)
    contract_type = fields.String(required=False, allow_none=True)
    base_salary = fields.Decimal(required=False, allow_none=True, as_string=True)
    profile_photo_url = fields.String(required=False, allow_none=True)
    identity_document_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(IDENTITY_DOCUMENT_TYPE_CHOICES))
    identity_document_number = fields.String(required=False, allow_none=True)
    identity_issue_date = fields.Date(required=False, allow_none=True)
    identity_document_url = fields.String(required=False, allow_none=True)
    taxpayer_number = fields.String(required=False, allow_none=True)
    cv_url = fields.String(required=False, allow_none=True)
    hierarchy_level = fields.Integer(required=False, allow_none=True, validate=validate.Range(min=1, max=4))
    employment_end_date = fields.Date(required=False, allow_none=True)
    exit_reason = fields.String(required=False, allow_none=True)
    account_status = fields.String(load_default="active", validate=validate.OneOf(USER_ACCOUNT_STATUS_CHOICES))
    is_active = fields.Boolean(load_default=True)
    must_change_password = fields.Boolean(load_default=False)
    is_primary_admin = fields.Boolean(load_default=False)
    chat_notifications_enabled = fields.Boolean(load_default=True)
    payslip_notifications_enabled = fields.Boolean(load_default=True)
    operational_profile_code = fields.String(required=False, validate=validate.OneOf(OPERATIONAL_PROFILE_CODES))
    organization_unit_id = fields.Integer(required=False, allow_none=True)
    role_ids = fields.List(fields.Integer(), load_default=list)


class UserUpdateSchema(TenantBodySchema):
    email = fields.Email(required=False)
    first_name = fields.String(required=False, validate=validate.Length(min=1))
    last_name = fields.String(required=False, validate=validate.Length(min=1))
    login_identifier = fields.String(required=False, allow_none=True)
    phone = fields.String(required=False, allow_none=True)
    preferred_language = fields.String(required=False, validate=validate.OneOf(["fr", "en"]))
    user_type = fields.String(required=False, validate=validate.OneOf(USER_TYPE_CHOICES))
    gender = fields.String(required=False, allow_none=True, validate=validate.OneOf(["male", "female", "other"]))
    birth_date = fields.Date(required=False, allow_none=True)
    address_line = fields.String(required=False, allow_none=True)
    job_title = fields.String(required=False, allow_none=True)
    department = fields.String(required=False, allow_none=True)
    employee_number = fields.String(required=False, allow_none=True)
    hire_date = fields.Date(required=False, allow_none=True)
    contract_type = fields.String(required=False, allow_none=True)
    base_salary = fields.Decimal(required=False, allow_none=True, as_string=True)
    profile_photo_url = fields.String(required=False, allow_none=True)
    identity_document_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(IDENTITY_DOCUMENT_TYPE_CHOICES))
    identity_document_number = fields.String(required=False, allow_none=True)
    identity_issue_date = fields.Date(required=False, allow_none=True)
    identity_document_url = fields.String(required=False, allow_none=True)
    taxpayer_number = fields.String(required=False, allow_none=True)
    cv_url = fields.String(required=False, allow_none=True)
    hierarchy_level = fields.Integer(required=False, allow_none=True, validate=validate.Range(min=1, max=4))
    employment_end_date = fields.Date(required=False, allow_none=True)
    exit_reason = fields.String(required=False, allow_none=True)
    account_status = fields.String(required=False, validate=validate.OneOf(USER_ACCOUNT_STATUS_CHOICES))
    must_change_password = fields.Boolean(required=False)
    is_primary_admin = fields.Boolean(required=False)
    chat_notifications_enabled = fields.Boolean(required=False)
    payslip_notifications_enabled = fields.Boolean(required=False)
    operational_profile_code = fields.String(required=False, validate=validate.OneOf(OPERATIONAL_PROFILE_CODES))
    organization_unit_id = fields.Integer(required=False, allow_none=True)
    role_ids = fields.List(fields.Integer(), required=False)


class RoleCreateSchema(TenantBodySchema):
    name = fields.String(required=True, validate=validate.Length(min=1))
    code = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(required=False, allow_none=True)
    permissions = fields.List(
        fields.String(validate=validate.Length(min=1)),
        required=True,
        validate=validate.Length(min=1),
    )


class AssignRolesSchema(TenantBodySchema):
    role_ids = fields.List(fields.Integer(), required=True, validate=validate.Length(min=1))
    replace = fields.Boolean(load_default=True)


class UpdateLanguageSchema(TenantBodySchema):
    preferred_language = fields.String(required=True, validate=validate.OneOf(["fr", "en"]))


class UserSelfServiceProfileUpdateSchema(TenantBodySchema):
    first_name = fields.String(required=False, validate=validate.Length(min=1))
    last_name = fields.String(required=False, validate=validate.Length(min=1))
    phone = fields.String(required=False, allow_none=True)
    gender = fields.String(required=False, allow_none=True, validate=validate.OneOf(["male", "female", "other"]))
    birth_date = fields.Date(required=False, allow_none=True)
    address_line = fields.String(required=False, allow_none=True)
    preferred_language = fields.String(required=False, validate=validate.OneOf(["fr", "en"]))
    profile_photo_url = fields.String(required=False, allow_none=True)
    identity_document_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(IDENTITY_DOCUMENT_TYPE_CHOICES))
    identity_document_number = fields.String(required=False, allow_none=True)
    identity_issue_date = fields.Date(required=False, allow_none=True)
    identity_document_url = fields.String(required=False, allow_none=True)
    taxpayer_number = fields.String(required=False, allow_none=True)
    cv_url = fields.String(required=False, allow_none=True)
    chat_notifications_enabled = fields.Boolean(required=False)
    payslip_notifications_enabled = fields.Boolean(required=False)
    cnps_number = fields.String(required=False, allow_none=True)
    bank_account_number = fields.String(required=False, allow_none=True)
    bank_name = fields.String(required=False, allow_none=True)
    payment_method = fields.String(
        required=False,
        allow_none=True,
        validate=validate.OneOf(["cash", "bank_transfer", "mobile_money", "check", "other"]),
    )

    @pre_load
    def normalize_blank_optional_values(self, data, **kwargs):
        return _normalize_optional_blank_strings(
            data,
            {
                "company_id",
                "phone",
                "gender",
                "birth_date",
                "address_line",
                "profile_photo_url",
                "identity_document_type",
                "identity_document_number",
                "identity_issue_date",
                "identity_document_url",
                "taxpayer_number",
                "cv_url",
                "cnps_number",
                "bank_account_number",
                "bank_name",
                "payment_method",
            },
        )


class NotificationMarkSeenSchema(TenantBodySchema):
    categories = fields.List(
        fields.String(validate=validate.OneOf(NOTIFICATION_CATEGORY_CHOICES)),
        load_default=lambda: ["payslips"],
        validate=validate.Length(min=1),
    )


class UserStatusUpdateSchema(TenantBodySchema):
    account_status = fields.String(required=True, validate=validate.OneOf(USER_ACCOUNT_STATUS_CHOICES))
    reason = fields.String(required=False, allow_none=True)
    employment_end_date = fields.Date(required=False, allow_none=True)
    locked_until = fields.DateTime(required=False, allow_none=True)


class UserResetPasswordSchema(TenantBodySchema):
    new_password = fields.String(required=True, validate=validate.Length(min=8))
    must_change_password = fields.Boolean(load_default=True)


class UserActivityLogQuerySchema(TenantQuerySchema):
    user_id = fields.Integer(required=False, allow_none=True)
    limit = fields.Integer(load_default=50, validate=validate.Range(min=1, max=200))


class OrganizationUnitListQuerySchema(TenantQuerySchema):
    active_only = fields.Boolean(load_default=False)


class OrganizationUnitCreateSchema(TenantBodySchema):
    code = fields.String(required=True, validate=validate.Length(min=2))
    name = fields.String(required=True, validate=validate.Length(min=1))
    unit_type = fields.String(load_default="service", validate=validate.OneOf(ORGANIZATION_UNIT_TYPE_CHOICES))
    description = fields.String(required=False, allow_none=True)
    parent_unit_id = fields.Integer(required=False, allow_none=True)
    manager_user_id = fields.Integer(required=False, allow_none=True)
    hierarchy_level = fields.Integer(required=False, allow_none=True, validate=validate.Range(min=1, max=20))
    sort_order = fields.Integer(load_default=0)
    is_active = fields.Boolean(load_default=True)


class OrganizationUnitUpdateSchema(TenantBodySchema):
    code = fields.String(required=False, validate=validate.Length(min=2))
    name = fields.String(required=False, validate=validate.Length(min=1))
    unit_type = fields.String(required=False, validate=validate.OneOf(ORGANIZATION_UNIT_TYPE_CHOICES))
    description = fields.String(required=False, allow_none=True)
    parent_unit_id = fields.Integer(required=False, allow_none=True)
    manager_user_id = fields.Integer(required=False, allow_none=True)
    hierarchy_level = fields.Integer(required=False, allow_none=True, validate=validate.Range(min=1, max=20))
    sort_order = fields.Integer(required=False)
    is_active = fields.Boolean(required=False)
