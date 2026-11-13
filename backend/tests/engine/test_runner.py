"""
Tests for run_decision() against a small set of canonical paths:
all-pass, and a failure injected at each of four different points in
the registry (ingress, geo, amount_risk, velocity). These are the paths
that would catch a chain-ordering or short-circuit regression; the full
combinatorial space of check outcomes is deliberately not covered.
"""

from datetime import datetime, timedelta, timezone

from app.engine.runner import run_decision
from app.models.trace import Decision, NodeStatus

from tests.conftest import DEFAULT_RULES, make_transaction

_SKIPPED_REASON = "skipped after an earlier check failed"


def test_all_checks_pass_yields_approve():
    tx = make_transaction()

    trace = run_decision(tx, DEFAULT_RULES)

    assert trace.decision == Decision.APPROVE
    assert [node.status for node in trace.nodes] == [NodeStatus.PASSED] * 6


def test_fail_at_ingress_skips_every_downstream_node():
    stale = datetime.now(timezone.utc) - timedelta(minutes=30)
    tx = make_transaction(timestamp=stale)

    trace = run_decision(tx, DEFAULT_RULES)
    nodes = {node.node_id: node for node in trace.nodes}

    assert trace.decision == Decision.DECLINE

    assert nodes["ingress"].status == NodeStatus.FAILED
    assert nodes["ingress"].reason == (
        "transaction timestamp is older than the allowed staleness window"
    )

    for node_id in ("geo", "proxy", "amount_risk", "velocity", "resolution"):
        assert nodes[node_id].status == NodeStatus.SKIPPED
        assert nodes[node_id].reason == _SKIPPED_REASON


def test_fail_at_geo_leaves_ingress_passed_and_skips_downstream():
    tx = make_transaction(ip_country="RU", billing_country="US", shipping_country="CA")

    trace = run_decision(tx, DEFAULT_RULES)
    nodes = {node.node_id: node for node in trace.nodes}

    assert trace.decision == Decision.DECLINE
    assert nodes["ingress"].status == NodeStatus.PASSED

    assert nodes["geo"].status == NodeStatus.FAILED
    assert nodes["geo"].reason == "ip, billing, and shipping countries all disagree"

    for node_id in ("proxy", "amount_risk", "velocity", "resolution"):
        assert nodes[node_id].status == NodeStatus.SKIPPED
        assert nodes[node_id].reason == _SKIPPED_REASON


def test_fail_at_amount_risk_leaves_earlier_nodes_passed_and_skips_downstream():
    tx = make_transaction(amount="5000.01")

    trace = run_decision(tx, DEFAULT_RULES)
    nodes = {node.node_id: node for node in trace.nodes}

    assert trace.decision == Decision.DECLINE
    assert nodes["ingress"].status == NodeStatus.PASSED
    assert nodes["geo"].status == NodeStatus.PASSED
    assert nodes["proxy"].status == NodeStatus.PASSED

    assert nodes["amount_risk"].status == NodeStatus.FAILED
    assert nodes["amount_risk"].reason == "transaction amount exceeds the high-value threshold"

    for node_id in ("velocity", "resolution"):
        assert nodes[node_id].status == NodeStatus.SKIPPED
        assert nodes[node_id].reason == _SKIPPED_REASON


def test_fail_at_velocity_leaves_earlier_nodes_passed_and_skips_resolution():
    tx = make_transaction(transactions_from_account_1h=6)

    trace = run_decision(tx, DEFAULT_RULES)
    nodes = {node.node_id: node for node in trace.nodes}

    assert trace.decision == Decision.DECLINE
    assert nodes["ingress"].status == NodeStatus.PASSED
    assert nodes["geo"].status == NodeStatus.PASSED
    assert nodes["proxy"].status == NodeStatus.PASSED
    assert nodes["amount_risk"].status == NodeStatus.PASSED

    assert nodes["velocity"].status == NodeStatus.FAILED
    assert nodes["velocity"].reason == "account exceeded max transactions in the last hour"

    assert nodes["resolution"].status == NodeStatus.SKIPPED
    assert nodes["resolution"].reason == _SKIPPED_REASON
