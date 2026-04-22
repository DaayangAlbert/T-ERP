from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import disconnect, emit, join_room, leave_room

from app.modules.calls.service import CallError, end_call, is_call_participant, join_call, leave_call
from app.modules.chat.service import ChatError, create_message, is_participant


connected_clients = {}


def _tenant_room(company_id):
    return f"tenant:{company_id}"


def _user_room(company_id, user_id):
    return f"user:{company_id}:{user_id}"


def _conversation_room(company_id, conversation_id):
    return f"chat:{company_id}:{conversation_id}"


def _call_room(company_id, call_session_id):
    return f"call:{company_id}:{call_session_id}"


# Socket event namespace split keeps realtime features modular and testable.
def register_presence_events(socketio):
    @socketio.on("connect")
    def on_connect(auth):
        token = (auth or {}).get("token")
        if not token:
            return False

        try:
            decoded = decode_token(token)
            user_id = int(decoded["sub"])
            company_id = decoded.get("company_id")
            if company_id is None:
                return False

            sid = request.sid
            connected_clients[sid] = {"user_id": user_id, "company_id": int(company_id)}

            join_room(_tenant_room(company_id))
            join_room(_user_room(company_id, user_id))
            emit("presence:ready", {"ok": True, "user_id": user_id, "company_id": int(company_id)})
        except Exception:
            return False

    @socketio.on("disconnect")
    def on_disconnect():
        sid = request.sid
        connected_clients.pop(sid, None)

    @socketio.on("presence:ping")
    def handle_presence_ping(payload):
        emit("presence:pong", {"ok": True, "echo": payload or {}}, broadcast=False)


def register_chat_events(socketio):
    @socketio.on("chat:join")
    def handle_chat_join(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("chat:error", {"message": "Not authenticated"})
            disconnect()
            return

        conversation_id = (payload or {}).get("conversation_id")
        if conversation_id is None:
            emit("chat:error", {"message": "conversation_id is required"})
            return

        try:
            parsed_conversation_id = int(conversation_id)
            if not is_participant(client["company_id"], parsed_conversation_id, client["user_id"]):
                emit("chat:error", {"message": "Not a participant"})
                return

            room = _conversation_room(client["company_id"], parsed_conversation_id)
            join_room(room)
            emit("chat:joined", {"conversation_id": parsed_conversation_id, "room": room})
        except ValueError:
            emit("chat:error", {"message": "conversation_id must be integer"})

    @socketio.on("chat:leave")
    def handle_chat_leave(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("chat:error", {"message": "Not authenticated"})
            return

        conversation_id = (payload or {}).get("conversation_id")
        if conversation_id is None:
            emit("chat:error", {"message": "conversation_id is required"})
            return

        try:
            parsed_conversation_id = int(conversation_id)
            room = _conversation_room(client["company_id"], parsed_conversation_id)
            leave_room(room)
            emit("chat:left", {"conversation_id": parsed_conversation_id})
        except ValueError:
            emit("chat:error", {"message": "conversation_id must be integer"})

    @socketio.on("chat:typing")
    def handle_chat_typing(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("chat:error", {"message": "Not authenticated"})
            return

        conversation_id = (payload or {}).get("conversation_id")
        is_typing = bool((payload or {}).get("is_typing", True))
        if conversation_id is None:
            emit("chat:error", {"message": "conversation_id is required"})
            return

        try:
            parsed_conversation_id = int(conversation_id)
            if not is_participant(client["company_id"], parsed_conversation_id, client["user_id"]):
                emit("chat:error", {"message": "Not a participant"})
                return

            emit(
                "chat:typing",
                {
                    "conversation_id": parsed_conversation_id,
                    "user_id": client["user_id"],
                    "is_typing": is_typing,
                },
                room=_conversation_room(client["company_id"], parsed_conversation_id),
                include_self=False,
            )
        except ValueError:
            emit("chat:error", {"message": "conversation_id must be integer"})

    @socketio.on("chat:send")
    def handle_chat_send(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("chat:error", {"message": "Not authenticated"})
            disconnect()
            return

        conversation_id = (payload or {}).get("conversation_id")
        if conversation_id is None:
            emit("chat:error", {"message": "conversation_id is required"})
            return

        try:
            message = create_message(
                company_id=client["company_id"],
                conversation_id=int(conversation_id),
                sender_user_id=client["user_id"],
                payload=payload or {},
                emit_events=True,
            )
            emit("chat:sent", {"ok": True, "message": message})
        except ValueError:
            emit("chat:error", {"message": "conversation_id must be integer"})
        except ChatError as exc:
            emit("chat:error", {"message": exc.message})


def register_call_events(socketio):
    @socketio.on("call:join")
    def handle_call_join(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("call:error", {"message": "Not authenticated"})
            disconnect()
            return

        call_session_id = (payload or {}).get("call_session_id")
        if call_session_id is None:
            emit("call:error", {"message": "call_session_id is required"})
            return

        try:
            parsed_call_id = int(call_session_id)
            session = join_call(client["company_id"], parsed_call_id, client["user_id"], emit_events=True)
            room = _call_room(client["company_id"], parsed_call_id)
            join_room(room)
            emit("call:joined", {"call_session_id": parsed_call_id, "call": session})
        except ValueError:
            emit("call:error", {"message": "call_session_id must be integer"})
        except CallError as exc:
            emit("call:error", {"message": exc.message})

    @socketio.on("call:leave")
    def handle_call_leave(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("call:error", {"message": "Not authenticated"})
            return

        call_session_id = (payload or {}).get("call_session_id")
        if call_session_id is None:
            emit("call:error", {"message": "call_session_id is required"})
            return

        try:
            parsed_call_id = int(call_session_id)
            session = leave_call(client["company_id"], parsed_call_id, client["user_id"], emit_events=True)
            leave_room(_call_room(client["company_id"], parsed_call_id))
            emit("call:left", {"call_session_id": parsed_call_id, "call": session})
        except ValueError:
            emit("call:error", {"message": "call_session_id must be integer"})
        except CallError as exc:
            emit("call:error", {"message": exc.message})

    @socketio.on("call:end")
    def handle_call_end(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("call:error", {"message": "Not authenticated"})
            return

        call_session_id = (payload or {}).get("call_session_id")
        if call_session_id is None:
            emit("call:error", {"message": "call_session_id is required"})
            return

        try:
            parsed_call_id = int(call_session_id)
            session = end_call(client["company_id"], parsed_call_id, client["user_id"], emit_events=True)
            emit("call:end:ack", {"call_session_id": parsed_call_id, "call": session})
        except ValueError:
            emit("call:error", {"message": "call_session_id must be integer"})
        except CallError as exc:
            emit("call:error", {"message": exc.message})

    @socketio.on("call:offer")
    def handle_call_offer(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("call:error", {"message": "Not authenticated"})
            return

        call_session_id = (payload or {}).get("call_session_id")
        to_user_id = (payload or {}).get("to_user_id")
        sdp = (payload or {}).get("sdp")

        if call_session_id is None or to_user_id is None or sdp is None:
            emit("call:error", {"message": "call_session_id, to_user_id and sdp are required"})
            return

        try:
            parsed_call_id = int(call_session_id)
            parsed_to_user_id = int(to_user_id)
            if not is_call_participant(client["company_id"], parsed_call_id, client["user_id"]):
                emit("call:error", {"message": "Sender is not call participant"})
                return
            if not is_call_participant(client["company_id"], parsed_call_id, parsed_to_user_id):
                emit("call:error", {"message": "Target user is not call participant"})
                return

            emit(
                "call:offer",
                {
                    "call_session_id": parsed_call_id,
                    "from_user_id": client["user_id"],
                    "sdp": sdp,
                },
                room=_user_room(client["company_id"], parsed_to_user_id),
            )
        except ValueError:
            emit("call:error", {"message": "call_session_id and to_user_id must be integers"})

    @socketio.on("call:answer")
    def handle_call_answer(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("call:error", {"message": "Not authenticated"})
            return

        call_session_id = (payload or {}).get("call_session_id")
        to_user_id = (payload or {}).get("to_user_id")
        sdp = (payload or {}).get("sdp")

        if call_session_id is None or to_user_id is None or sdp is None:
            emit("call:error", {"message": "call_session_id, to_user_id and sdp are required"})
            return

        try:
            parsed_call_id = int(call_session_id)
            parsed_to_user_id = int(to_user_id)
            if not is_call_participant(client["company_id"], parsed_call_id, client["user_id"]):
                emit("call:error", {"message": "Sender is not call participant"})
                return
            if not is_call_participant(client["company_id"], parsed_call_id, parsed_to_user_id):
                emit("call:error", {"message": "Target user is not call participant"})
                return

            emit(
                "call:answer",
                {
                    "call_session_id": parsed_call_id,
                    "from_user_id": client["user_id"],
                    "sdp": sdp,
                },
                room=_user_room(client["company_id"], parsed_to_user_id),
            )
        except ValueError:
            emit("call:error", {"message": "call_session_id and to_user_id must be integers"})

    @socketio.on("call:ice-candidate")
    def handle_call_ice_candidate(payload):
        sid = request.sid
        client = connected_clients.get(sid)
        if not client:
            emit("call:error", {"message": "Not authenticated"})
            return

        call_session_id = (payload or {}).get("call_session_id")
        to_user_id = (payload or {}).get("to_user_id")
        candidate = (payload or {}).get("candidate")

        if call_session_id is None or to_user_id is None or candidate is None:
            emit("call:error", {"message": "call_session_id, to_user_id and candidate are required"})
            return

        try:
            parsed_call_id = int(call_session_id)
            parsed_to_user_id = int(to_user_id)
            if not is_call_participant(client["company_id"], parsed_call_id, client["user_id"]):
                emit("call:error", {"message": "Sender is not call participant"})
                return
            if not is_call_participant(client["company_id"], parsed_call_id, parsed_to_user_id):
                emit("call:error", {"message": "Target user is not call participant"})
                return

            emit(
                "call:ice-candidate",
                {
                    "call_session_id": parsed_call_id,
                    "from_user_id": client["user_id"],
                    "candidate": candidate,
                },
                room=_user_room(client["company_id"], parsed_to_user_id),
            )
        except ValueError:
            emit("call:error", {"message": "call_session_id and to_user_id must be integers"})
