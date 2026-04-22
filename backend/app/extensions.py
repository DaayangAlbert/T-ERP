from pathlib import Path

from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
migrate = Migrate(directory=str(Path(__file__).resolve().parents[1] / "migrations"))
jwt = JWTManager()
socketio = SocketIO()
