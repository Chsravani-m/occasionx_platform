from fastapi import APIRouter

from app.schemas.ai_proposal import (
    AIProposalRequest,
    AIProposalResponse,
)
from app.services.ai_proposal import AIProposalService

router = APIRouter(
    prefix="/ai",
    tags=["AI Proposal"],
)


@router.post(
    "/proposal",
    response_model=AIProposalResponse,
)
def generate_package_proposal(payload: AIProposalRequest):
    available, proposal = AIProposalService.generate_proposal(payload)

    return AIProposalResponse(
        available=available,
        proposal=proposal,
    )
