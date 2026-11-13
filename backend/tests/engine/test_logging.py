"""
Regression guard for app/logging_config.py: the decision engine must
never log user_id, amount_cents, or a NodeResult's raw metadata dict.
Neither user_id nor amount_cents is even a field in this codebase today
(it's account_id / amount) — this test exists so that if someone later
logs the wrong object (e.g. tx.__dict__, or a NodeResult's metadata),
it fails loudly instead of leaking silently into logs.

Every log call is captured by patching logging.Logger._log — the one
method every public logging call (.info/.warning/.error/.log) funnels
through — rather than trusting handler/propagation configuration.
"""

from unittest.mock import patch

import pytest
from app.engine import runner
from app.engine.runner import run_decision

from tests.conftest import DEFAULT_RULES, make_transaction

FORBIDDEN_KEYS = {"user_id", "amount_cents"}
ALLOWED_KEYS = {"trace_id", "node_id", "status", "evaluated_at_ms"}


def _capture_logged_extras(action):
    payloads: list[dict] = []

    def fake_log(self, level, msg, args, exc_info=None, extra=None, **kwargs):
        payloads.append(extra or {})

    with patch("logging.Logger._log", new=fake_log):
        action()

    return payloads


def test_logging_never_includes_forbidden_keys_on_all_pass():
    payloads = _capture_logged_extras(lambda: run_decision(make_transaction(), DEFAULT_RULES))

    assert payloads, "expected at least one log call"
    for payload in payloads:
        assert not (FORBIDDEN_KEYS & payload.keys())
        assert set(payload.keys()) <= ALLOWED_KEYS


def test_logging_never_includes_forbidden_keys_on_failure_and_skip():
    tx = make_transaction(is_known_proxy=True)

    payloads = _capture_logged_extras(lambda: run_decision(tx, DEFAULT_RULES))

    assert payloads
    for payload in payloads:
        assert not (FORBIDDEN_KEYS & payload.keys())
        assert set(payload.keys()) <= ALLOWED_KEYS


def test_logging_never_includes_forbidden_keys_when_a_check_raises(monkeypatch):
    def exploding_check(tx, rules):
        raise RuntimeError("boom")

    monkeypatch.setattr(runner, "CHECKS", (("ingress", exploding_check),))

    def action():
        with pytest.raises(RuntimeError):
            run_decision(make_transaction(), DEFAULT_RULES)

    payloads = _capture_logged_extras(action)

    assert payloads
    for payload in payloads:
        assert not (FORBIDDEN_KEYS & payload.keys())
        assert set(payload.keys()) <= ALLOWED_KEYS
