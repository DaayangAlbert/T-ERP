from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import TenantScopedMixin, TimestampMixin


ATTENDANCE_STATUS_VALUES = ("present", "late", "absent", "overtime")
ATTENDANCE_SOURCE_VALUES = ("manual", "manager", "import")


class AttendancePolicy(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "attendance_policies"

    id = db.Column(db.Integer, primary_key=True)
    default_start_time = db.Column(db.Time, nullable=False)
    default_end_time = db.Column(db.Time, nullable=False)
    grace_minutes = db.Column(db.Integer, nullable=False, default=10)
    overtime_threshold_minutes = db.Column(db.Integer, nullable=False, default=60)
    timezone = db.Column(db.String(80), nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", name="uq_attendance_policies_company"),
        CheckConstraint("grace_minutes >= 0", name="ck_attendance_policies_grace_non_negative"),
        CheckConstraint(
            "overtime_threshold_minutes >= 0",
            name="ck_attendance_policies_overtime_threshold_non_negative",
        ),
    )


class AttendanceRecord(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "attendance_records"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    attendance_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="present")
    arrival_time = db.Column(db.Time, nullable=True)
    departure_time = db.Column(db.Time, nullable=True)
    minutes_late = db.Column(db.Integer, nullable=False, default=0)
    overtime_minutes = db.Column(db.Integer, nullable=False, default=0)
    notes = db.Column(db.Text, nullable=True)
    source = db.Column(db.String(20), nullable=False, default="manual")
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    updated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    validated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    validated_at = db.Column(db.DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "user_id",
            "attendance_date",
            name="uq_attendance_records_company_user_date",
        ),
        CheckConstraint(
            "status IN ('present', 'late', 'absent', 'overtime')",
            name="ck_attendance_records_status",
        ),
        CheckConstraint(
            "source IN ('manual', 'manager', 'import')",
            name="ck_attendance_records_source",
        ),
        CheckConstraint(
            "minutes_late >= 0",
            name="ck_attendance_records_minutes_late_non_negative",
        ),
        CheckConstraint(
            "overtime_minutes >= 0",
            name="ck_attendance_records_overtime_minutes_non_negative",
        ),
    )
