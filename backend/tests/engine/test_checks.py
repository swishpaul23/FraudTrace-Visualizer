"""
Unit tests for individual check functions. Each check is called
directly against a constructed TransactionInput — no registry, no
runner, no HTTP layer involved.
"""

from datetime import datetime, timedelta, timezone

from app.engine.checks.amount_risk import check_amount_risk
from app.engine.checks.geo import check_geo
from app.engine.checks.ingress import check_ingress
from app.engine.checks.proxy import check_proxy
from app.engine.checks.resolution import check_resolution
from app.engine.checks.velocity import check_velocity

from tests.conftest import DEFAULT_RULES, make_transaction


# --- ingress ----------------------------------------------------------------

def test_ingress_passes_for_fresh_timestamp():
    tx = make_transaction(timestamp=datetime.now(timezone.utc))

    passed, reason, metadata = check_ingress(tx, DEFAULT_RULES)

    assert passed is True
    assert reason == "transaction timestamp is within the accepted freshness window"
    assert "age_seconds" in metadata


def test_ingress_fails_for_stale_timestamp():
    stale = datetime.now(timezone.utc) - timedelta(minutes=30)
    tx = make_transaction(timestamp=stale)

    passed, reason, metadata = check_ingress(tx, DEFAULT_RULES)

    assert passed is False
    assert reason == "transaction timestamp is older than the allowed staleness window"
    assert metadata["age_seconds"] > 0


# --- geo ----------------------------------------------------------------------

def test_geo_passes_when_billing_matches_ip_country():
    tx = make_transaction(ip_country="US", billing_country="US", shipping_country="CA")

    passed, reason, metadata = check_geo(tx, DEFAULT_RULES)

    assert passed is True
    assert reason == "at least two of ip/billing/shipping countries agree"


def test_geo_fails_when_all_three_countries_disagree():
    tx = make_transaction(ip_country="RU", billing_country="US", shipping_country="CA")

    passed, reason, metadata = check_geo(tx, DEFAULT_RULES)

    assert passed is False
    assert reason == "ip, billing, and shipping countries all disagree"


# --- proxy ----------------------------------------------------------------------

def test_proxy_passes_for_clean_ip():
    tx = make_transaction(is_known_proxy=False, is_known_datacenter=False)

    passed, reason, metadata = check_proxy(tx, DEFAULT_RULES)

    assert passed is True
    assert reason == "ip address is not a known proxy or datacenter"


def test_proxy_fails_for_known_proxy_ip():
    tx = make_transaction(is_known_proxy=True)

    passed, reason, metadata = check_proxy(tx, DEFAULT_RULES)

    assert passed is False
    assert reason == "ip address is a known proxy"


# --- velocity ----------------------------------------------------------------

def test_velocity_passes_within_limits():
    tx = make_transaction(
        transactions_from_account_1h=1,
        transactions_from_account_24h=2,
        distinct_accounts_on_device_24h=1,
    )

    passed, reason, metadata = check_velocity(tx, DEFAULT_RULES)

    assert passed is True
    assert reason == "account and device velocity within accepted limits"


def test_velocity_fails_when_hourly_transaction_count_exceeded():
    tx = make_transaction(transactions_from_account_1h=6)

    passed, reason, metadata = check_velocity(tx, DEFAULT_RULES)

    assert passed is False
    assert reason == "account exceeded max transactions in the last hour"


# --- amount_risk ----------------------------------------------------------------

def test_amount_risk_passes_within_limits():
    tx = make_transaction(amount="19.99")

    passed, reason, metadata = check_amount_risk(tx, DEFAULT_RULES)

    assert passed is True
    assert reason == "transaction amount is within accepted limits"


def test_amount_risk_fails_above_threshold():
    tx = make_transaction(amount="5000.01")

    passed, reason, metadata = check_amount_risk(tx, DEFAULT_RULES)

    assert passed is False
    assert reason == "transaction amount exceeds the high-value threshold"


# --- resolution ----------------------------------------------------------------

def test_resolution_passes_for_recognized_device():
    tx = make_transaction(device_recognized=True, email_verified=False, account_age_days=1)

    passed, reason, metadata = check_resolution(tx, DEFAULT_RULES)

    assert passed is True
    assert reason == "account has at least one trusted identity signal"


def test_resolution_fails_with_no_trusted_identity_signal():
    tx = make_transaction(device_recognized=False, email_verified=False, account_age_days=1)

    passed, reason, metadata = check_resolution(tx, DEFAULT_RULES)

    assert passed is False
    assert reason == "account has no recognized device, verified email, or sufficient age"


# --- rule thresholds come from RuleConfig, not hard-coded constants -----------

def test_amount_risk_uses_configured_limit():
    tx = make_transaction(amount="19.99")

    passed, _, metadata = check_amount_risk(tx, DEFAULT_RULES.model_copy(update={"max_amount": 10}))

    assert passed is False
    assert metadata["max_amount"] == 10


def test_ingress_accepts_older_timestamp_under_wider_staleness_window():
    stale = datetime.now(timezone.utc) - timedelta(minutes=30)
    tx = make_transaction(timestamp=stale)

    passed, _, _ = check_ingress(tx, DEFAULT_RULES.model_copy(update={"max_staleness_minutes": 60}))

    assert passed is True
