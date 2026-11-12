"""
Proxy check: declines transactions originating from a known proxy or
datacenter IP. Both signals are treated as upstream-resolved facts
carried on the transaction, not something this engine derives from the
raw IP address itself.
"""

from app.models.rules import RuleConfig
from app.models.transaction import TransactionInput


def check_proxy(tx: TransactionInput, rules: RuleConfig) -> tuple[bool, str, dict]:
    metadata = {
        "is_known_proxy": tx.is_known_proxy,
        "is_known_datacenter": tx.is_known_datacenter,
        "ip_address": str(tx.ip_address),
    }

    if tx.is_known_proxy:
        return False, "ip address is a known proxy", metadata

    if tx.is_known_datacenter:
        return False, "ip address belongs to a known datacenter", metadata

    return True, "ip address is not a known proxy or datacenter", metadata
