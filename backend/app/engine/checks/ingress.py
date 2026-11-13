"""
Ingress check: rejects transactions whose timestamp isn't plausibly
"now" — too far in the future (clock skew) or too far in the past
(a stale or replayed payload). This is the only check concerned with
the integrity of the payload itself rather than the transaction's risk.
"""

from datetime import datetime, timedelta, timezone

from app.models.rules import RuleConfig
from app.models.transaction import TransactionInput


def check_ingress(tx: TransactionInput, rules: RuleConfig) -> tuple[bool, str, dict]:
    now = datetime.now(timezone.utc)
    ts = tx.timestamp if tx.timestamp.tzinfo else tx.timestamp.replace(tzinfo=timezone.utc)
    age = now - ts
    max_future_skew = timedelta(minutes=rules.max_future_skew_minutes)
    max_staleness = timedelta(minutes=rules.max_staleness_minutes)

    metadata = {
        "timestamp": tx.timestamp.isoformat(),
        "age_seconds": age.total_seconds(),
        "max_age_seconds": max_staleness.total_seconds(),
        "max_future_skew_seconds": max_future_skew.total_seconds(),
    }

    if age < -max_future_skew:
        return False, "transaction timestamp is further in the future than the allowed skew", metadata

    if age > max_staleness:
        return False, "transaction timestamp is older than the allowed staleness window", metadata

    return True, "transaction timestamp is within the accepted freshness window", metadata
