from marshmallow import fields, validate

from app.core.validation import StrictSchema


class LoginSchema(StrictSchema):
    email = fields.String(required=True, validate=validate.Length(min=1))
    password = fields.String(required=True, validate=validate.Length(min=1))
    company_id = fields.Integer(load_default=None, allow_none=True)


class BootstrapSuperAdminSchema(StrictSchema):
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    first_name = fields.String(required=True, validate=validate.Length(min=1))
    last_name = fields.String(required=True, validate=validate.Length(min=1))
    preferred_language = fields.String(load_default="fr", validate=validate.OneOf(["fr", "en"]))
