import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


DEFAULT_DEV_DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/terp_dev"
DEFAULT_DEV_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def _get_str_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _get_csv_env(name: str) -> list[str]:
    raw_value = os.getenv(name, "")
    if not raw_value.strip():
        return []

    values = []
    for item in raw_value.split(","):
        normalized = item.strip().rstrip("/")
        if normalized and normalized not in values:
            values.append(normalized)

    return values


class BaseConfig:
    APP_NAME = "T-ERP API"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_TYPE = "Bearer"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=14)
    JWT_ERROR_MESSAGE_KEY = "message"
    LANGUAGES = ["fr", "en"]
    DEFAULT_LANGUAGE = "fr"
    ENV_NAME = "base"
    CORS_ALLOWED_ORIGINS = _get_csv_env("CORS_ALLOWED_ORIGINS")
    SOCKETIO_CORS_ALLOWED_ORIGINS = _get_csv_env("SOCKETIO_CORS_ALLOWED_ORIGINS")


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    ENV_NAME = "development"
    SQLALCHEMY_DATABASE_URI = _get_str_env("DATABASE_URL", DEFAULT_DEV_DATABASE_URL)
    JWT_SECRET_KEY = _get_str_env("JWT_SECRET_KEY")
    CORS_ALLOWED_ORIGINS = BaseConfig.CORS_ALLOWED_ORIGINS or DEFAULT_DEV_ALLOWED_ORIGINS
    SOCKETIO_CORS_ALLOWED_ORIGINS = BaseConfig.SOCKETIO_CORS_ALLOWED_ORIGINS or CORS_ALLOWED_ORIGINS


class ProductionConfig(BaseConfig):
    DEBUG = False
    ENV_NAME = "production"
    SQLALCHEMY_DATABASE_URI = _get_str_env("DATABASE_URL")
    JWT_SECRET_KEY = _get_str_env("JWT_SECRET_KEY")
    CORS_ALLOWED_ORIGINS = BaseConfig.CORS_ALLOWED_ORIGINS
    SOCKETIO_CORS_ALLOWED_ORIGINS = BaseConfig.SOCKETIO_CORS_ALLOWED_ORIGINS or CORS_ALLOWED_ORIGINS


CONFIG_BY_ENV = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}


def build_runtime_config(environment: str) -> dict[str, object]:
    cors_allowed_origins = _get_csv_env("CORS_ALLOWED_ORIGINS")
    socketio_allowed_origins = _get_csv_env("SOCKETIO_CORS_ALLOWED_ORIGINS")

    runtime_config: dict[str, object] = {
        "JWT_SECRET_KEY": _get_str_env("JWT_SECRET_KEY"),
    }

    if environment == "development":
        resolved_cors_origins = cors_allowed_origins or DEFAULT_DEV_ALLOWED_ORIGINS
        runtime_config.update(
            SQLALCHEMY_DATABASE_URI=_get_str_env("DATABASE_URL", DEFAULT_DEV_DATABASE_URL),
            CORS_ALLOWED_ORIGINS=resolved_cors_origins,
            SOCKETIO_CORS_ALLOWED_ORIGINS=socketio_allowed_origins or resolved_cors_origins,
        )
        return runtime_config

    if environment == "production":
        runtime_config.update(
            SQLALCHEMY_DATABASE_URI=_get_str_env("DATABASE_URL"),
            CORS_ALLOWED_ORIGINS=cors_allowed_origins,
            SOCKETIO_CORS_ALLOWED_ORIGINS=socketio_allowed_origins or cors_allowed_origins,
        )
        return runtime_config

    raise RuntimeError(f"Unsupported configuration environment '{environment}'.")


def validate_runtime_config(app) -> None:
    environment = app.config.get("ENV_NAME", "development")
    missing = []

    if not app.config.get("JWT_SECRET_KEY"):
        missing.append("JWT_SECRET_KEY")

    if environment == "production" and not app.config.get("SQLALCHEMY_DATABASE_URI"):
        missing.append("DATABASE_URL")

    if missing:
        raise RuntimeError(f"Missing required configuration for {environment}: {', '.join(missing)}")

    if environment == "production":
        cors_origins = set(app.config.get("CORS_ALLOWED_ORIGINS") or [])
        socketio_origins = set(app.config.get("SOCKETIO_CORS_ALLOWED_ORIGINS") or [])

        if "*" in cors_origins:
            raise RuntimeError("CORS_ALLOWED_ORIGINS cannot contain '*' in production.")

        if "*" in socketio_origins:
            raise RuntimeError("SOCKETIO_CORS_ALLOWED_ORIGINS cannot contain '*' in production.")
