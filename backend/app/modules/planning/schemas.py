from marshmallow import fields, validate

from app.core.validation import QuerySchema, StrictSchema
from app.models.planning import AGENDA_CATEGORY_VALUES


AGENDA_CATEGORIES = list(AGENDA_CATEGORY_VALUES)
PLANNING_TASK_SELF_SERVICE_STATUSES = ["not_started", "in_progress", "completed"]


class PlanningOverviewQuerySchema(QuerySchema):
    lookahead_days = fields.Integer(load_default=21, validate=validate.Range(min=1, max=90))


class AgendaListQuerySchema(QuerySchema):
    date_from = fields.DateTime(load_default=None, allow_none=True)
    date_to = fields.DateTime(load_default=None, allow_none=True)
    include_completed = fields.Boolean(load_default=True)


class AgendaCreateSchema(StrictSchema):
    company_id = fields.Integer(load_default=None, allow_none=True)
    project_id = fields.Integer(load_default=None, allow_none=True)
    title = fields.String(required=True, validate=validate.Length(min=1, max=255))
    description = fields.String(load_default=None, allow_none=True)
    location = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=255))
    category = fields.String(load_default="personal", validate=validate.OneOf(AGENDA_CATEGORIES))
    start_at = fields.DateTime(required=True)
    end_at = fields.DateTime(load_default=None, allow_none=True)
    all_day = fields.Boolean(load_default=False)
    is_completed = fields.Boolean(load_default=False)


class AgendaUpdateSchema(StrictSchema):
    company_id = fields.Integer(allow_none=True)
    project_id = fields.Integer(allow_none=True)
    title = fields.String(allow_none=True, validate=validate.Length(min=1, max=255))
    description = fields.String(allow_none=True)
    location = fields.String(allow_none=True, validate=validate.Length(max=255))
    category = fields.String(allow_none=True, validate=validate.OneOf(AGENDA_CATEGORIES))
    start_at = fields.DateTime(allow_none=True)
    end_at = fields.DateTime(allow_none=True)
    all_day = fields.Boolean(allow_none=True)
    is_completed = fields.Boolean(allow_none=True)


class PlanningTaskStatusUpdateSchema(StrictSchema):
    company_id = fields.Integer(load_default=None, allow_none=True)
    status = fields.String(required=True, validate=validate.OneOf(PLANNING_TASK_SELF_SERVICE_STATUSES))
    progress_percent = fields.Float(load_default=None, allow_none=True, validate=validate.Range(min=0, max=100))
