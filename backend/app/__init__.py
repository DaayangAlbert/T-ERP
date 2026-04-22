import os


def create_app(env_name=None):
    from flask import Flask, jsonify
    from marshmallow import ValidationError
    from sqlalchemy.exc import OperationalError

    from app.api import register_api_blueprints
    from app.config import CONFIG_BY_ENV, build_runtime_config, validate_runtime_config
    from app.core.jwt_handlers import register_jwt_callbacks
    from app.core.multitenancy import TenantContextError
    from app.core.responses import error_response
    from app.core.security import apply_cors_policy, apply_security_headers, register_request_context_handlers
    from app.core.validation import RequestValidationError
    from app.extensions import db, jwt, migrate, socketio
    from app import models as _models  # noqa: F401
    from app.realtime import register_socket_handlers

    app = Flask(__name__)

    environment = env_name or os.getenv("FLASK_ENV", "development")
    if environment not in CONFIG_BY_ENV:
        raise RuntimeError(f"Unsupported FLASK_ENV '{environment}'. Expected one of: {', '.join(CONFIG_BY_ENV)}")

    app.config.from_object(CONFIG_BY_ENV[environment])
    app.config.update(build_runtime_config(environment))
    validate_runtime_config(app)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    register_jwt_callbacks(jwt)
    register_request_context_handlers(app)
    apply_cors_policy(app)
    apply_security_headers(app)

    socketio_kwargs = {}
    socketio_origins = app.config.get("SOCKETIO_CORS_ALLOWED_ORIGINS") or []
    if socketio_origins:
        socketio_kwargs["cors_allowed_origins"] = socketio_origins
    socketio.init_app(app, **socketio_kwargs)

    register_api_blueprints(app)
    register_socket_handlers(socketio)

    @app.errorhandler(RequestValidationError)
    def handle_request_validation_error(error):
        return error_response(
            error.message,
            status_code=error.status_code,
            code=error.code,
            details=error.details,
        )

    @app.errorhandler(ValidationError)
    def handle_marshmallow_validation_error(error):
        return error_response(
            "Request validation failed",
            status_code=400,
            code="validation_error",
            details=error.messages,
        )

    @app.errorhandler(TenantContextError)
    def handle_tenant_context_error(error):
        return error_response(
            error.message,
            status_code=error.status_code,
            code=error.code,
            details=None,
        )

    @app.errorhandler(OperationalError)
    def handle_operational_error(error):
        details = None
        if app.debug and getattr(error, "orig", None) is not None:
            details = {"detail": str(error.orig)}

        return error_response(
            "Database unavailable. Check DATABASE_URL and PostgreSQL credentials.",
            status_code=503,
            code="database_unavailable",
            details=details,
        )

    @app.get("/health")
    def health_check():
        return jsonify({"status": "ok", "service": app.config["APP_NAME"]}), 200

    return app
