# STEP 8 - Real-time Chat Module

Implemented capabilities:

- private and group conversations
- participant-based access control
- message persistence
- unread counters and read receipts
- room-based realtime notifications via Socket.IO

REST endpoints:

- `GET /api/v1/chat/conversations`
- `POST /api/v1/chat/conversations`
- `GET /api/v1/chat/conversations/{conversation_id}/messages`
- `POST /api/v1/chat/conversations/{conversation_id}/messages`
- `POST /api/v1/chat/conversations/{conversation_id}/read`
- `GET /api/v1/chat/unread`

Socket events:

- client to server: `chat:join`, `chat:leave`, `chat:typing`, `chat:send`
- server to client: `chat:joined`, `chat:left`, `chat:typing`, `chat:message`, `chat:notification`, `chat:read`, `chat:sent`, `chat:error`

Security:

- REST endpoints protected with JWT + RBAC (`chat.read` / `chat.manage`)
- socket connection requires JWT token in connect auth payload
- conversation join/send requires participant membership
