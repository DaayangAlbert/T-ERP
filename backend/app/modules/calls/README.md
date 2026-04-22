# STEP 9 - Audio/Video Calls Module

Implemented capabilities:

- call session lifecycle (start, join, leave, reject, end)
- participant validation and tracking
- call history listing for current user
- WebRTC signaling over Socket.IO (offer/answer/ICE)

REST endpoints:

- `GET /api/v1/calls`
- `POST /api/v1/calls`
- `GET /api/v1/calls/{call_session_id}`
- `POST /api/v1/calls/{call_session_id}/join`
- `POST /api/v1/calls/{call_session_id}/leave`
- `POST /api/v1/calls/{call_session_id}/reject`
- `POST /api/v1/calls/{call_session_id}/end`

Socket events:

- client to server: `call:join`, `call:leave`, `call:end`, `call:offer`, `call:answer`, `call:ice-candidate`
- server to client: `call:incoming`, `call:joined`, `call:left`, `call:end:ack`, `call:ended`, `call:participant-joined`, `call:participant-left`, `call:offer`, `call:answer`, `call:ice-candidate`, `call:error`

Security:

- REST endpoints protected with JWT + RBAC (`calls.read` / `calls.manage`)
- socket events require authenticated connection and participant membership checks
- per-company room isolation for user and call routing
