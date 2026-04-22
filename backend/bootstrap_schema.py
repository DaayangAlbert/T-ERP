from sqlalchemy import inspect

from app import create_app
from flask_migrate import stamp, upgrade


INITIAL_REVISION = "68bdcda40e83"
INITIAL_SCHEMA_TABLES = {
    "companies",
    "permissions",
    "company_settings",
    "inventory_items",
    "projects",
    "public_tenders",
    "roles",
    "users",
    "candidate_profiles",
    "chat_conversations",
    "finance_entries",
    "invoice_payments",
    "invoices",
    "job_applications",
    "job_offers",
    "project_reports",
    "project_stock_allocations",
    "project_tasks",
    "role_permissions",
    "stock_locations",
    "stock_movements",
    "team_members",
    "teams",
    "tender_checklist_items",
    "tender_submissions",
    "user_roles",
    "call_sessions",
    "call_participants",
    "candidate_matches",
    "chat_message_reads",
    "chat_messages",
    "chat_participants",
}


def _looks_like_untracked_initial_schema(engine) -> bool:
    inspector = inspect(engine)

    if inspector.has_table("alembic_version"):
        return False

    existing_tables = set(inspector.get_table_names())
    if not INITIAL_SCHEMA_TABLES.issubset(existing_tables):
        return False

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    company_columns = {column["name"] for column in inspector.get_columns("companies")}

    # The initial schema predates Alembic tracking and the newer auth/admin fields.
    return (
        {"email", "password_hash", "first_name", "last_name"}.issubset(user_columns)
        and "login_identifier" not in user_columns
        and "account_status" not in user_columns
        and "auth_token_version" not in user_columns
        and "account_status" not in company_columns
    )


def main():
    app = create_app()
    with app.app_context():
        if _looks_like_untracked_initial_schema(app.extensions["migrate"].db.engine):
            stamp(revision=INITIAL_REVISION)
            print(f"[bootstrap] Detected legacy schema without Alembic history. Stamped revision {INITIAL_REVISION}.")

        upgrade()
        print("[bootstrap] Database upgraded to the latest migration successfully.")


if __name__ == "__main__":
    main()
