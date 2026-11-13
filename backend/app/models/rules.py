"""
Tunable thresholds for the decision engine, sent with every request.

This model is the single source of truth for every threshold and its
default value. Checks read their limits from here — none hard-code a
number — and the frontend loads the defaults from GET /api/v1/rules/defaults
instead of copying them.

Frozen for the same reason as TransactionInput: no check can change the
limits another check reads later in the same run.
"""

from pydantic import BaseModel, ConfigDict, Field


class RuleConfig(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    # --- ingress ------------------------------------------------------
    max_future_skew_minutes: int = Field(default=5, ge=0, le=1440)
    max_staleness_minutes: int = Field(default=15, ge=1, le=525_600)

    # --- amount_risk --------------------------------------------------
    # Whole units of the transaction currency (no FX conversion; see
    # app/engine/checks/amount_risk.py).
    max_amount: int = Field(default=5000, ge=1)

    # --- velocity -----------------------------------------------------
    max_transactions_per_hour: int = Field(default=5, ge=0)
    max_transactions_per_day: int = Field(default=20, ge=0)
    max_accounts_per_device_per_day: int = Field(default=3, ge=0)

    # --- resolution ---------------------------------------------------
    min_trusted_account_age_days: int = Field(default=30, ge=0)
