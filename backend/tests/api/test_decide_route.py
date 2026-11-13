"""
Integration tests for the decision routes via FastAPI's TestClient.
Exercises the full HTTP -> route -> engine -> response path: single and
batch decisions, caller-supplied rule thresholds, the defaults endpoint,
and client-input validation failures.
"""

from app.main import app
from app.models.requests import MAX_BATCH_SIZE
from fastapi.testclient import TestClient

from tests.conftest import valid_transaction_kwargs

client = TestClient(app)


def _tx_payload(**overrides) -> dict:
    kwargs = valid_transaction_kwargs()
    kwargs.update(overrides)
    kwargs["timestamp"] = kwargs["timestamp"].isoformat()
    kwargs["ip_address"] = str(kwargs["ip_address"])
    return kwargs


def _default_rules() -> dict:
    return client.get("/api/v1/rules/defaults").json()


def test_rules_defaults_route_returns_every_threshold():
    response = client.get("/api/v1/rules/defaults")

    assert response.status_code == 200
    assert response.json()["max_amount"] == 5000
    assert response.json()["max_transactions_per_hour"] == 5


def test_decisions_route_happy_path_returns_approve():
    response = client.post(
        "/api/v1/decisions", json={"transaction": _tx_payload(), "rules": _default_rules()}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "APPROVE"
    assert len(body["nodes"]) == 6


def test_decisions_route_applies_caller_supplied_threshold():
    rules = {**_default_rules(), "max_amount": 10}

    response = client.post(
        "/api/v1/decisions", json={"transaction": _tx_payload(amount="19.99"), "rules": rules}
    )

    body = response.json()
    amount_node = next(node for node in body["nodes"] if node["node_id"] == "amount_risk")
    assert body["decision"] == "DECLINE"
    assert amount_node["status"] == "FAILED"
    assert amount_node["metadata"]["max_amount"] == 10


def test_decisions_route_rejects_negative_amount_with_422():
    response = client.post(
        "/api/v1/decisions",
        json={"transaction": _tx_payload(amount="-5.00"), "rules": _default_rules()},
    )

    assert response.status_code == 422
    assert response.json()["error"] == "invalid_transaction_input"


def test_batch_route_returns_one_trace_per_transaction_in_order():
    transactions = [
        _tx_payload(transaction_id="tx_ok"),
        _tx_payload(transaction_id="tx_proxy", is_known_proxy=True),
    ]

    response = client.post(
        "/api/v1/decisions/batch", json={"transactions": transactions, "rules": _default_rules()}
    )

    assert response.status_code == 200
    results = response.json()["results"]
    assert [r["transaction_id"] for r in results] == ["tx_ok", "tx_proxy"]
    assert [r["decision"] for r in results] == ["APPROVE", "DECLINE"]


def test_batch_route_rejects_oversized_batch_with_422():
    transactions = [_tx_payload(transaction_id=f"tx_{i}") for i in range(MAX_BATCH_SIZE + 1)]

    response = client.post(
        "/api/v1/decisions/batch", json={"transactions": transactions, "rules": _default_rules()}
    )

    assert response.status_code == 422
