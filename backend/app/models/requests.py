"""
Request/response envelopes for the decision routes. Each pairs the
transaction(s) with the RuleConfig to evaluate them under, so a caller
always states which thresholds produced a trace.
"""

from pydantic import BaseModel, ConfigDict, Field

from app.models.rules import RuleConfig
from app.models.trace import DecisionTrace
from app.models.transaction import TransactionInput

# One uploaded file per request. Keeps a batch comfortably under
# Vercel's 4.5 MB serverless request body limit.
MAX_BATCH_SIZE = 1000


class DecisionRequest(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    transaction: TransactionInput
    rules: RuleConfig


class BatchDecisionRequest(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    transactions: tuple[TransactionInput, ...] = Field(min_length=1, max_length=MAX_BATCH_SIZE)
    rules: RuleConfig


class BatchDecisionResponse(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    results: tuple[DecisionTrace, ...]
