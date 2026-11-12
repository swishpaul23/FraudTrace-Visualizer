"""
Velocity check: caps how many transactions an account can make in a
short window and how many distinct accounts can share a single device
in a day. Limits come from the request's RuleConfig.
"""

from app.models.rules import RuleConfig
from app.models.transaction import TransactionInput


def check_velocity(tx: TransactionInput, rules: RuleConfig) -> tuple[bool, str, dict]:
    metadata = {
        "transactions_from_account_1h": tx.transactions_from_account_1h,
        "max_transactions_from_account_1h": rules.max_transactions_per_hour,
        "transactions_from_account_24h": tx.transactions_from_account_24h,
        "max_transactions_from_account_24h": rules.max_transactions_per_day,
        "distinct_accounts_on_device_24h": tx.distinct_accounts_on_device_24h,
        "max_distinct_accounts_on_device_24h": rules.max_accounts_per_device_per_day,
    }

    if tx.transactions_from_account_1h > rules.max_transactions_per_hour:
        return False, "account exceeded max transactions in the last hour", metadata

    if tx.transactions_from_account_24h > rules.max_transactions_per_day:
        return False, "account exceeded max transactions in the last 24 hours", metadata

    if tx.distinct_accounts_on_device_24h > rules.max_accounts_per_device_per_day:
        return False, "device shared by too many distinct accounts in the last 24 hours", metadata

    return True, "account and device velocity within accepted limits", metadata
