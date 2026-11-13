"""
Thin HTTP adapter over the decision engine. Parses request bodies into
models, calls run_decision, and returns its traces. No decisioning logic
lives here — that belongs entirely to the engine.
"""

from fastapi import APIRouter

from app.engine.runner import run_decision
from app.models.requests import BatchDecisionRequest, BatchDecisionResponse, DecisionRequest
from app.models.rules import RuleConfig
from app.models.trace import DecisionTrace

router = APIRouter()


@router.post("/decisions", response_model=DecisionTrace)
async def create_decision(request: DecisionRequest) -> DecisionTrace:
    return run_decision(request.transaction, request.rules)


@router.post("/decisions/batch", response_model=BatchDecisionResponse)
async def create_decisions_batch(request: BatchDecisionRequest) -> BatchDecisionResponse:
    return BatchDecisionResponse(
        results=tuple(run_decision(tx, request.rules) for tx in request.transactions)
    )


@router.get("/rules/defaults", response_model=RuleConfig)
async def get_default_rules() -> RuleConfig:
    return RuleConfig()
