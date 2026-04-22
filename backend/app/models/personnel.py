from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import TimestampMixin


ORGANIZATION_UNIT_TYPES = ("directorate", "department", "service", "team")


class OrganizationUnit(db.Model, TimestampMixin):
    __tablename__ = "organization_units"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    parent_unit_id = db.Column(db.Integer, db.ForeignKey("organization_units.id"), nullable=True, index=True)
    manager_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    code = db.Column(db.String(80), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    unit_type = db.Column(db.String(30), nullable=False, default="service")
    description = db.Column(db.Text, nullable=True)
    hierarchy_level = db.Column(db.Integer, nullable=False, default=1)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_organization_units_company_code"),
        UniqueConstraint("company_id", "parent_unit_id", "name", name="uq_organization_units_company_parent_name"),
        CheckConstraint(
            "unit_type IN ('directorate', 'department', 'service', 'team')",
            name="ck_organization_units_unit_type",
        ),
        CheckConstraint("hierarchy_level >= 1", name="ck_organization_units_hierarchy_level_positive"),
    )


class OrganizationUnitAssignment(db.Model, TimestampMixin):
    __tablename__ = "organization_unit_assignments"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    organization_unit_id = db.Column(db.Integer, db.ForeignKey("organization_units.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    assignment_title = db.Column(db.String(120), nullable=True)
    is_primary = db.Column(db.Boolean, nullable=False, default=True)
    starts_on = db.Column(db.Date, nullable=True)
    ends_on = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "organization_unit_id",
            "user_id",
            name="uq_organization_unit_assignments_company_unit_user",
        ),
    )
