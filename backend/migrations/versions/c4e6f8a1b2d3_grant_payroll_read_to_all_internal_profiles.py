"""grant payroll read to all internal profiles

Revision ID: c4e6f8a1b2d3
Revises: b2d4f6a8c9e1
Create Date: 2026-04-04 10:35:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "c4e6f8a1b2d3"
down_revision = "b2d4f6a8c9e1"
branch_labels = None
depends_on = None


ROLE_CODES_TO_ENABLE = (
    "pca",
    "directeur_technique",
    "chef_projet",
    "chef_chantier",
    "conducteur_travaux",
    "informaticien",
    "acheteur",
    "assistant_administratif",
    "juriste",
    "responsable_logistique",
    "rh_recruteur",
    "ouvrier",
    "collaborateur_terrain",
)


def upgrade():
    quoted_codes = ", ".join(f"'{code}'" for code in ROLE_CODES_TO_ENABLE)
    op.execute(
        f"""
        INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
        SELECT roles.id, permissions.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM roles
        JOIN permissions ON permissions.code = 'payroll.read'
        WHERE roles.company_id IS NULL
          AND roles.code IN ({quoted_codes})
          AND NOT EXISTS (
              SELECT 1
              FROM role_permissions
              WHERE role_permissions.role_id = roles.id
                AND role_permissions.permission_id = permissions.id
          )
        """
    )


def downgrade():
    quoted_codes = ", ".join(f"'{code}'" for code in ROLE_CODES_TO_ENABLE)
    op.execute(
        f"""
        DELETE FROM role_permissions
        WHERE permission_id = (SELECT id FROM permissions WHERE code = 'payroll.read')
          AND role_id IN (
              SELECT id
              FROM roles
              WHERE company_id IS NULL
                AND code IN ({quoted_codes})
          )
        """
    )
