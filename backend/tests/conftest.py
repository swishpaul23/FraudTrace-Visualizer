"""
Shared fixture factory for constructing valid TransactionInput data.

A single canonical "everything passes" set of field values lives here so
each test only has to override the one or two fields it cares about,
instead of every test file re-declaring all eighteen required fields.
"""

from datetime import datetime, timezone

from app.models.rules import RuleConfig
from app.models.transaction import TransactionInput

DEFAULT_RULES = RuleConfig()


def valid_transaction_kwargs() -> dict:
    return {
        "transaction_id": "tx_1",
        "account_id": "acct_1",
        "amount": "19.99",
        "currency": "USD",
        "timestamp": datetime.now(timezone.utc),
        "ip_address": "1.2.3.4",
        "ip_country": "US",
        "is_known_proxy": False,
        "is_known_datacenter": False,
        "billing_country": "US",
        "shipping_country": "US",
        "account_home_country": "US",
        "device_id": "dev_1",
        "device_recognized": True,
        "distinct_accounts_on_device_24h": 1,
        "transactions_from_account_1h": 1,
        "transactions_from_account_24h": 2,
        "account_age_days": 400,
        "email_verified": True,
    }


def make_transaction(**overrides) -> TransactionInput:
    kwargs = valid_transaction_kwargs()
    kwargs.update(overrides)
    return TransactionInput(**kwargs)
