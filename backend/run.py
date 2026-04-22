import sys
from app import create_app
from app.extensions import socketio

app = create_app()

if __name__ == "__main__":
    try:
        socketio.run(app, host="0.0.0.0", port=5000, use_reloader=False, debug=True)
    except OSError as exc:
        if "10048" in str(exc) or "Address already in use" in str(exc):
            print("\n[ERROR] Port 5000 is already in use. Stop the existing process and retry.\n", file=sys.stderr)
        else:
            raise
