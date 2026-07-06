from fastapi import APIRouter, Depends, HTTPException, Request

from app.limiter import limiter
from app.middleware.auth import get_current_user, require_admin
from app.models.schemas import EmailSendRequest, EmailBatchRequest, EmailSendResponse
from app.services.email_service import (
    send_email as _send_email,
    send_email_batch as _send_email_batch,
    EmailServiceError,
)

router = APIRouter()


@router.post("/send", response_model=EmailSendResponse)
@limiter.limit("5/minute")
async def send_email(
    request: Request,
    req: EmailSendRequest,
    current_user=Depends(require_admin),
):
    """Send a single email or multiple emails. Admin only, 5/min rate limit."""
    try:
        _send_email(
            to=req.to,
            subject=req.subject,
            html=req.html,
            template_key=req.template_key,
            variables=req.variables,
        )
        return EmailSendResponse(success=True, message="Email sent")
    except EmailServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/batch", response_model=EmailSendResponse)
@limiter.limit("2/minute")
async def send_batch_email(
    request: Request,
    req: EmailBatchRequest,
    current_user=Depends(require_admin),
):
    """Send emails in batches (drip mode) for large recipient lists. Admin only, 2/min rate limit."""
    try:
        _send_email_batch(
            to=req.to,
            subject=req.subject,
            html=req.html,
            template_key=req.template_key,
            variables=req.variables,
            batch_size=req.batch_size,
            batch_interval_minutes=req.batch_interval_minutes,
        )
        return EmailSendResponse(success=True, message=f"Batch started for {len(req.to)} recipients")
    except EmailServiceError as e:
        raise HTTPException(status_code=400, detail=str(e))