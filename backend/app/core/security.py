import threading
import time
import uuid
from collections import defaultdict, deque
from functools import wraps

from flask import current_app, g, request

from app.core.responses import error_response


_request_buckets = defaultdict(deque)
_request_buckets_lock = threading.Lock()


def _rate_key(scope):
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    return f"{scope}:{client_ip}:{request.endpoint}"


def rate_limit(max_requests=60, window_seconds=60, scope="global"):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if current_app.config.get("TESTING"):
                return fn(*args, **kwargs)

            now = time.time()
            key = _rate_key(scope)

            with _request_buckets_lock:
                bucket = _request_buckets[key]
                while bucket and bucket[0] <= now - window_seconds:
                    bucket.popleft()

                if len(bucket) >= max_requests:
                    retry_after = max(1, int(window_seconds - (now - bucket[0])))
                    return error_response(
                        "Too many requests",
                        status_code=429,
                        code="rate_limit_exceeded",
                        details={"retry_after_seconds": retry_after},
                    )

                bucket.append(now)

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def register_request_context_handlers(app):
    @app.before_request
    def attach_request_context():
        g.request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        g.request_started_at = time.perf_counter()

    @app.after_request
    def append_request_headers(response):
        response.headers["X-Request-ID"] = getattr(g, "request_id", "")

        started = getattr(g, "request_started_at", None)
        if started is not None:
            duration_ms = (time.perf_counter() - started) * 1000
            response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"

        return response


def _is_origin_allowed(origin: str, allowed_origins: list[str]) -> bool:
    normalized_origin = (origin or "").rstrip("/")
    normalized_allowed = {(value or "").rstrip("/") for value in allowed_origins}

    return normalized_origin in normalized_allowed or "*" in normalized_allowed


def _append_vary_header(response, value: str) -> None:
    existing = response.headers.get("Vary")
    if not existing:
        response.headers["Vary"] = value
        return

    parts = [item.strip() for item in existing.split(",") if item.strip()]
    if value not in parts:
        parts.append(value)
        response.headers["Vary"] = ", ".join(parts)


def apply_cors_policy(app):
    @app.before_request
    def handle_cors_preflight():
        origin = request.headers.get("Origin")
        allowed_origins = app.config.get("CORS_ALLOWED_ORIGINS") or []

        if request.method != "OPTIONS":
            return None

        if not origin or not allowed_origins or not _is_origin_allowed(origin, allowed_origins):
            return None

        response = app.make_response(("", 204))
        allow_origin = "*" if "*" in allowed_origins else origin.rstrip("/")
        response.headers["Access-Control-Allow-Origin"] = allow_origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Tenant-ID, X-Request-ID"
        response.headers["Access-Control-Max-Age"] = "3600"
        _append_vary_header(response, "Origin")
        return response

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        allowed_origins = app.config.get("CORS_ALLOWED_ORIGINS") or []

        if not origin or not allowed_origins or not _is_origin_allowed(origin, allowed_origins):
            return response

        allow_origin = "*" if "*" in allowed_origins else origin.rstrip("/")
        response.headers["Access-Control-Allow-Origin"] = allow_origin
        response.headers.setdefault("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        response.headers.setdefault(
            "Access-Control-Allow-Headers",
            "Authorization, Content-Type, X-Tenant-ID, X-Request-ID",
        )
        response.headers.setdefault("Access-Control-Max-Age", "3600")
        _append_vary_header(response, "Origin")
        return response


def apply_security_headers(app):
    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cache-Control", "no-store")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        )
        return response
