from .events import register_call_events, register_chat_events, register_presence_events


def register_socket_handlers(socketio):
    register_presence_events(socketio)
    register_chat_events(socketio)
    register_call_events(socketio)
