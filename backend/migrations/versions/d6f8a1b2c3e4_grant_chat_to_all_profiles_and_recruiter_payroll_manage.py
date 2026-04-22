"""grant chat to all profiles and recruiter payroll manage

Revision ID: d6f8a1b2c3e4
Revises: c4e6f8a1b2d3
Create Date: 2026-04-04 12:10:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "d6f8a1b2c3e4"
down_revision = "c4e6f8a1b2d3"
branch_labels = None
depends_on = None


PROFILE_ROLE_CODES = (
    "pca",
    "directeur_general",
    "directeur_technique",
    "directeur_administratif",
    "daf",
    "responsable_rh",
    "controleur_gestion",
    "chef_projet",
    "chef_chantier",
    "conducteur_travaux",
    "magasinier",
    "comptable",
    "informaticien",
    "acheteur",
    "assistant_administratif",
    "juriste",
    "logisticien",
    "responsable_logistique",
    "rh_recruteur",
    "ouvrier",
    "controleur_externe",
    "collaborateur_terrain",
    "candidat_job_seeker",
)
CHAT_ENABLED_ROLE_CODES = (*PROFILE_ROLE_CODES, "company_admin_default")


def _quoted_codes(role_codes):
    return ", ".join(f"'{code}'" for code in role_codes)


def _insert_permission(permission_code, role_codes):
    quoted_codes = _quoted_codes(role_codes)
    op.execute(
        f"""
        INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
        SELECT roles.id, permissions.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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


def _delete_permission(permission_code, role_codes):
    quoted_codes = _quoted_codes(role_codes)
    op.execute(
        f"""
        DELETE FROM role_permissions
        WHERE permission_id = (SELECT id FROM permissions WHERE code = '{permission_code}')
          AND role_id IN (
              SELECT id
              FROM roles
              WHERE code IN ({quoted_codes})
          )
        """
    )


def upgrade():
    _insert_permission("chat.read", CHAT_ENABLED_ROLE_CODES)
    _insert_permission("chat.manage", CHAT_ENABLED_ROLE_CODES)
    _insert_permission("payroll.manage", ("rh_recruteur",))


def downgrade():
    _delete_permission("payroll.manage", ("rh_recruteur",))
    _delete_permission("chat.manage", CHAT_ENABLED_ROLE_CODES)
    _delete_permission("chat.read", CHAT_ENABLED_ROLE_CODES)
