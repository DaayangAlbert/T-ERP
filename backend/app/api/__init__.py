from flask import Blueprint

from app.modules.attendance.routes import attendance_bp
from app.modules.admin.routes import admin_bp
from app.modules.auth.routes import auth_bp
from app.modules.calls.routes import calls_bp
from app.modules.chat.routes import chat_bp
from app.modules.companies.routes import companies_bp
from app.modules.finance.routes import finance_bp
from app.modules.inventory.routes import inventory_bp
from app.modules.payroll.routes import payroll_bp
from app.modules.planning.routes import planning_bp
from app.modules.procurement.routes import procurement_bp
from app.modules.projects.routes import projects_bp
from app.modules.recruitment.routes import recruitment_bp
from app.modules.users.routes import users_bp


def build_api_v1_blueprint() -> Blueprint:
    api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")
    api_v1_bp.register_blueprint(auth_bp)
    api_v1_bp.register_blueprint(attendance_bp)
    api_v1_bp.register_blueprint(companies_bp)
    api_v1_bp.register_blueprint(users_bp)
    api_v1_bp.register_blueprint(projects_bp)
    api_v1_bp.register_blueprint(finance_bp)
    api_v1_bp.register_blueprint(inventory_bp)
    api_v1_bp.register_blueprint(payroll_bp)
    api_v1_bp.register_blueprint(planning_bp)
    api_v1_bp.register_blueprint(procurement_bp)
    api_v1_bp.register_blueprint(chat_bp)
    api_v1_bp.register_blueprint(calls_bp)
    api_v1_bp.register_blueprint(recruitment_bp)
    api_v1_bp.register_blueprint(admin_bp)
    return api_v1_bp


def register_api_blueprints(app):
    app.register_blueprint(build_api_v1_blueprint())
