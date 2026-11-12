"""
Geo check: a legitimate transaction should have at least one point of
geographic corroboration among billing country, shipping country, and
IP-resolved country. If all three disagree, that's a strong signal that
either the buyer or the payment method has been compromised.
"""

from app.models.rules import RuleConfig
from app.models.transaction import TransactionInput


def check_geo(tx: TransactionInput, rules: RuleConfig) -> tuple[bool, str, dict]:
    corroborated = (
        tx.ip_country == tx.billing_country
        or tx.shipping_country == tx.billing_country
        or tx.ip_country == tx.shipping_country
    )

    metadata = {
        "ip_country": tx.ip_country,
        "billing_country": tx.billing_country,
        "shipping_country": tx.shipping_country,
    }

    if not corroborated:
        return False, "ip, billing, and shipping countries all disagree", metadata

    return True, "at least two of ip/billing/shipping countries agree", metadata
