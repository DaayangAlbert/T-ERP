"""align payroll access all profiles except pca

Revision ID: e7b4c1d9a2f5
Revises: a7d3e2c4f9b1
Create Date: 2026-04-05 09:35:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "e7b4c1d9a2f5"
down_revision = "a7d3e2c4f9b1"
branch_labels = None
depends_on = None


def _insert_payroll_read(role_codes: tuple[str, ...]) -> None:
    quoted_codes = ", ".join(f"'{code}'" for code in role_codes)
    op.execute(
        f"""
        INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
        SELECT roles.id, permissions.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM roles
        JOIN permissions ON permissions.code = 'payroll.read'
        WHERE roles.code IN ({quoted_codes})
          AND NOT EXISTS (
              SELECT 1
              FROM role_permissions
              WHERE role_permissions.role_id = roles.id
                AND role_permissions.permission_id = permissions.id
          )
        """
    )


def _delete_payroll_read(role_codes: tuple[str, ...]) -> None:
    quoted_codes = ", ".join(f"'{code}'" for code in role_codes)
    op.execute(
        f"""
        DELETE FROM role_permissions
        WHERE permission_id = (SELECT id FROM permissions WHERE code = 'payroll.read')
          AND role_id IN (
              SELECT id
              FROM roles
              WHERE code IN ({quoted_codes})
          )
        """
    )


def upgrade() -> None:
    _insert_payroll_read(("candidat_job_seeker",))
    _delete_payroll_read(("pca",))


def downgrade() -> None:
    _insert_payroll_read(("pca",))
    _delete_payroll_read(("candidat_job_seeker",))
