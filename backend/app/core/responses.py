from flask import g, jsonify


DEFAULT_ERROR_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    409: "conflict",
    429: "rate_limit_exceeded",
    500: "internal_server_error",
    503: "database_unavailable",
}


def error_response(message: str, *, status_code: int = 400, code: str | None = None, details=None):
    payload = {
        "message": message,
        "code": code or DEFAULT_ERROR_CODES.get(status_code, "error"),
        "details": details,
    }

    request_id = getattr(g, "request_id", None)
    if request_id:
        payload["request_id"] = request_id

    return jsonify(payload), status_code


def error_response_from_exception(exc, *, default_status_code: int = 400, default_code: str | None = None):
    message = getattr(exc, "message", None) or str(exc) or "Unexpected error"
    status_code = getattr(exc, "status_code", default_status_code)
    code = getattr(exc, "code", None) or default_code
    details = getattr(exc, "details", None)
    return error_response(message, status_code=status_code, code=code, details=details)
