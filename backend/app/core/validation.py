from flask import request
from marshmallow import EXCLUDE, RAISE, Schema, ValidationError, fields


class StrictSchema(Schema):
    class Meta:
        unknown = RAISE


class QuerySchema(Schema):
    class Meta:
        unknown = EXCLUDE


class TenantBodySchema(StrictSchema):
    company_id = fields.Integer(load_default=None, allow_none=True)


class TenantQuerySchema(QuerySchema):
    company_id = fields.Integer(load_default=None, allow_none=True)


class RequestValidationError(Exception):
    def __init__(
        self,
        message: str = "Request validation failed",
        *,
        details=None,
        status_code: int = 400,
        code: str = "validation_error",
    ):
        super().__init__(message)
        self.message = message
        self.details = details
        self.status_code = status_code
        self.code = code


def _load_data(schema: Schema, data, *, partial: bool = False):
    try:
        return schema.load(data or {}, partial=partial)
    except ValidationError as exc:
        raise RequestValidationError(details=exc.messages) from exc


def load_json(schema: Schema, *, partial: bool = False):
    return _load_data(schema, request.get_json(silent=True) or {}, partial=partial)


def load_query(schema: Schema):
    return _load_data(schema, request.args.to_dict(flat=True))
