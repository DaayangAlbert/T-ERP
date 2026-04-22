import shutil
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from flask_migrate import upgrade


ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from app.extensions import db


TEST_TMP_ROOT = BACKEND_DIR / ".smoke-tmp" / "pytest-runs"
TEST_TMP_ROOT.mkdir(parents=True, exist_ok=True)


@pytest.fixture()
def app(monkeypatch):
    run_dir = (TEST_TMP_ROOT / f"case-{uuid4().hex}").resolve()
    run_dir.mkdir(parents=True, exist_ok=False)
    db_path = (run_dir / "backend-test.sqlite3").resolve()

    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("JWT_SECRET_KEY", "pytest-backend-secret-key-2026-safe")

    app = create_app("development")
    app.config.update(TESTING=True)

    with app.app_context():
        upgrade()

    yield app

    with app.app_context():
        db.session.remove()
        db.engine.dispose()

    shutil.rmtree(run_dir, ignore_errors=True)


@pytest.fixture()
def client(app):
    return app.test_client()
