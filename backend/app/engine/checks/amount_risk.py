"""
Amount risk check: flags transactions above the configured high-value
limit. Purely a magnitude check on this one transaction — it does not
know anything about the account, device, or network it came from.
"""

from app.models.rules import RuleConfig
from app.models.transaction import TransactionInput

# Known simplification: no FX conversion. `amount` is compared to a
# single flat limit regardless of `currency`, so e.g. 5001 EUR and
# 5001 CAD are treated identically even though they aren't the same
# real value. Fine for the currencies currently in use (USD/EUR/GBP/CAD
# are all similar order-of-magnitude per unit) — revisit with real FX
# conversion if the engine ever needs to support currencies with very
# different unit values (e.g. JPY).


def check_amount_risk(tx: TransactionInput, rules: RuleConfig) -> tuple[bool, str, dict]:
    metadata = {"amount": str(tx.amount), "max_amount": rules.max_amount, "currency": tx.currency}

    if tx.amount > rules.max_amount:
        return False, "transaction amount exceeds the high-value threshold", metadata

    return True, "transaction amount is within accepted limits", metadata
