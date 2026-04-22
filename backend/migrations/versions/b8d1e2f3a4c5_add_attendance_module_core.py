"""add attendance module core

Revision ID: b8d1e2f3a4c5
Revises: a9b8c7d6e5f4
Create Date: 2026-04-08 18:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b8d1e2f3a4c5"
down_revision = "a9b8c7d6e5f4"
branch_labels = None
depends_on = None


ATTENDANCE_READ_ROLES = (
    "company_admin_default",
    "directeur_general",
    "directeur_technique",
    "directeur_administratif",
    "daf",
    "responsable_rh",
    "controleur_gestion",
    "responsable_logistique",
    "rh_recruteur",
    "chef_projet",
    "chef_chantier",
    "conducteur_travaux",
)

ATTENDANCE_MANAGE_ROLES = (
    "company_admin_default",
    "responsable_rh",
    "rh_recruteur",
    "chef_projet",
    "chef_chantier",
    "conducteur_travaux",
)


def _insert_permission(module: str, action: str) -> None:
    code = f"{module}.{action}"
    op.execute(
        sa.text(
            """
            INSERT INTO permissions (module, action, code, description)
            SELECT :module, :action, :code, :description
            WHERE NOT EXISTS (
                SELECT 1 FROM permissions WHERE code = :code
            )
            """
        ).bindparams(
            module=module,
            action=action,
            code=code,
            description=f"{module} {action} permission",
        )
    )


def _assign_permission_to_roles(permission_code: str, role_codes: tuple[str, ...]) -> None:
    if not role_codes:
        return

    quoted_codes = ", ".join(f"'{code}'" for code in role_codes)
    op.execute(
        f"""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT roles.id, permissions.id
        FROM roles
        JOIN permissions ON permissions.code = '{permission_code}'
        WHERE roles.code IN ({quoted_codes})
          AND NOT EXISTS (
              SELECT 1
              FROM role_permissions
              WHERE role_permissions.role_id = roles.id
                AND role_permissions.permission_id = permissions.id
          )
        """
    )


def upgrade() -> None:
    op.create_table(
        "attendance_policies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("default_start_time", sa.Time(), nullable=False),
        sa.Column("default_end_time", sa.Time(), nullable=False),
        sa.Column("grace_minutes", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("overtime_threshold_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("timezone", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", name="uq_attendance_policies_company"),
        sa.CheckConstraint("grace_minutes >= 0", name="ck_attendance_policies_grace_non_negative"),
        sa.CheckConstraint(
            "overtime_threshold_minutes >= 0",
            name="ck_attendance_policies_overtime_threshold_non_negative",
        ),
    )
    op.create_index(op.f("ix_attendance_policies_company_id"), "attendance_policies", ["company_id"], unique=False)

    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("attendance_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="present"),
        sa.Column("arrival_time", sa.Time(), nullable=True),
        sa.Column("departure_time", sa.Time(), nullable=True),
        sa.Column("minutes_late", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overtime_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=False),
        sa.Column("validated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["validated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "user_id",
            "attendance_date",
            name="uq_attendance_records_company_user_date",
        ),
        sa.CheckConstraint(
            "status IN ('present', 'late', 'absent', 'overtime')",
            name="ck_attendance_records_status",
        ),
        sa.CheckConstraint(
            "source IN ('manual', 'manager', 'import')",
            name="ck_attendance_records_source",
        ),
        sa.CheckConstraint("minutes_late >= 0", name="ck_attendance_records_minutes_late_non_negative"),
        sa.CheckConstraint("overtime_minutes >= 0", name="ck_attendance_records_overtime_minutes_non_negative"),
    )
    op.create_index(op.f("ix_attendance_records_company_id"), "attendance_records", ["company_id"], unique=False)
    op.create_index(op.f("ix_attendance_records_user_id"), "attendance_records", ["user_id"], unique=False)
    op.create_index(op.f("ix_attendance_records_project_id"), "attendance_records", ["project_id"], unique=False)
    op.create_index(op.f("ix_attendance_records_attendance_date"), "attendance_records", ["attendance_date"], unique=False)
    op.create_index(op.f("ix_attendance_records_created_by_user_id"), "attendance_records", ["created_by_user_id"], unique=False)
    op.create_index(op.f("ix_attendance_records_updated_by_user_id"), "attendance_records", ["updated_by_user_id"], unique=False)
    op.create_index(op.f("ix_attendance_records_validated_by_user_id"), "attendance_records", ["validated_by_user_id"], unique=False)

    _insert_permission("attendance", "read")
    _insert_permission("attendance", "manage")
    _assign_permission_to_roles("attendance.read", ATTENDANCE_READ_ROLES)
    _assign_permission_to_roles("attendance.manage", ATTENDANCE_MANAGE_ROLES)


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM role_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE code IN ('attendance.read', 'attendance.manage')
        )
        """
    )
    op.execute("DELETE FROM permissions WHERE code IN ('attendance.read', 'attendance.manage')")

    op.drop_index(op.f("ix_attendance_records_validated_by_user_id"), table_name="attendance_records")
    op.drop_index(op.f("ix_attendance_records_updated_by_user_id"), table_name="attendance_records")
    op.drop_index(op.f("ix_attendance_records_created_by_user_id"), table_name="attendance_records")
    op.drop_index(op.f("ix_attendance_records_attendance_date"), table_name="attendance_records")
    op.drop_index(op.f("ix_attendance_records_project_id"), table_name="attendance_records")
    op.drop_index(op.f("ix_attendance_records_user_id"), table_name="attendance_records")
    op.drop_index(op.f("ix_attendance_records_company_id"), table_name="attendance_records")
    op.drop_table("attendance_records")

    op.drop_index(op.f("ix_attendance_policies_company_id"), table_name="attendance_policies")
    op.drop_table("attendance_policies")
