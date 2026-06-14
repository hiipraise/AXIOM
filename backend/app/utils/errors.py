"""Standardized error-raising utilities."""
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def not_found(resource: str = "Resource") -> HTTPException:
    """Raise a standardized 404 not found error."""
    return HTTPException(status_code=404, detail=f"{resource} not found")


def forbidden(resource: str = "Access denied") -> HTTPException:
    """Raise a standardized 403 forbidden error."""
    return HTTPException(status_code=403, detail=resource)


def bad_request(message: str) -> HTTPException:
    """Raise a standardized 400 bad request error."""
    return HTTPException(status_code=400, detail=message)


def unauthorized(message: str = "Not authenticated") -> HTTPException:
    """Raise a standardized 401 unauthorized error."""
    return HTTPException(status_code=401, detail=message)


def conflict(message: str) -> HTTPException:
    """Raise a standardized 409 conflict error."""
    return HTTPException(status_code=409, detail=message)


def gone(message: str) -> HTTPException:
    """Raise a standardized 410 gone error."""
    return HTTPException(status_code=410, detail=message)


def too_large(message: str) -> HTTPException:
    """Raise a standardized 413 payload too large error."""
    return HTTPException(status_code=413, detail=message)


def service_unavailable(message: str = "Service temporarily unavailable") -> HTTPException:
    """Raise a standardized 503 service unavailable error."""
    return HTTPException(status_code=503, detail=message)