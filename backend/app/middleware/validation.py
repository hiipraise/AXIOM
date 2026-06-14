from bson import ObjectId

from app.utils.errors import bad_request


def valid_object_id(id: str) -> str:
    """Validate MongoDB ObjectId format. Raises 400 on invalid. Returns string."""
    if not ObjectId.is_valid(id):
        raise bad_request("Invalid ID format")
    return id