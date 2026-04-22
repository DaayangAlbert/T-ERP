from marshmallow import fields, validate

from app.core.validation import QuerySchema, StrictSchema
from app.models.attendance import ATTENDANCE_SOURCE_VALUES, ATTENDANCE_STATUS_VALUES


ATTENDANCE_STATUSES = list(ATTENDANCE_STATUS_VALUES)
ATTENDANCE_SOURCES = list(ATTENDANCE_SOURCE_VALUES)


class AttendanceListQuerySchema(QuerySchema):
    company_id = fields.Integer(load_default=None, allow_none=True)
    user_id = fields.Integer(load_default=None, allow_none=True)
    project_id = fields.Integer(load_default=None, allow_none=True)
    status = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(ATTENDANCE_STATUSES))
    date_from = fields.Date(load_default=None, allow_none=True)
    date_to = fields.Date(load_default=None, allow_none=True)


class AttendanceCreateSchema(StrictSchema):
    company_id = fields.Integer(load_default=None, allow_none=True)
    user_id = fields.Integer(required=True)
    project_id = fields.Integer(load_default=None, allow_none=True)
    attendance_date = fields.Date(required=True)
    status = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(ATTENDANCE_STATUSES))
    arrival_time = fields.Time(load_default=None, allow_none=True)
    departure_time = fields.Time(load_default=None, allow_none=True)
    notes = fields.String(load_default=None, allow_none=True)
    source = fields.String(load_default="manual", validate=validate.OneOf(ATTENDANCE_SOURCES))


class AttendanceUpdateSchema(StrictSchema):
    company_id = fields.Integer(load_default=None, allow_none=True)
    user_id = fields.Integer(load_default=None, allow_none=True)
    project_id = fields.Integer(load_default=None, allow_none=True)
    attendance_date = fields.Date(load_default=None, allow_none=True)
    status = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(ATTENDANCE_STATUSES))
    arrival_time = fields.Time(load_default=None, allow_none=True)
    departure_time = fields.Time(load_default=None, allow_none=True)
    notes = fields.String(load_default=None, allow_none=True)
    source = fields.String(load_default=None, allow_none=True, validate=validate.OneOf(ATTENDANCE_SOURCES))


class AttendancePolicyUpdateSchema(StrictSchema):
    company_id = fields.Integer(load_default=None, allow_none=True)
    default_start_time = fields.Time(load_default=None, allow_none=True)
    default_end_time = fields.Time(load_default=None, allow_none=True)
    grace_minutes = fields.Integer(load_default=None, allow_none=True, validate=validate.Range(min=0, max=240))
    overtime_threshold_minutes = fields.Integer(load_default=None, allow_none=True, validate=validate.Range(min=0, max=720))
    timezone = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=80))
