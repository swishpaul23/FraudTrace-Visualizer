"""
Executes the registry against one transaction and produces the full
DecisionTrace. Recording stops discriminating after the first failure —
every remaining node is marked SKIPPED without being called. Checks are
called directly; if one raises, that propagates as an unhandled
exception, because a raising check is a bug in the check, not a
condition this runner should paper over — it is logged (see
app/logging_config.py) and then re-raised unchanged, never swallowed.
"""

from app.engine.registry import CHECKS
from app.logging_config import log_engine_error, log_node_result
from app.models.rules import RuleConfig
from app.models.trace import Decision, DecisionTrace, NodeResult, NodeStatus
from app.models.transaction import TransactionInput


def run_decision(tx: TransactionInput, rules: RuleConfig) -> DecisionTrace:
    nodes: list[NodeResult] = []
    failed = False
    current_node_id: str | None = None

    try:
        for node_id, check in CHECKS:
            current_node_id = node_id
            if failed:
                status = NodeStatus.SKIPPED
                nodes.append(
                    NodeResult(
                        node_id=node_id,
                        status=status,
                        reason="skipped after an earlier check failed",
                        metadata={},
                    )
                )
                log_node_result(trace_id=tx.transaction_id, node_id=node_id, status=status.value)
                continue

            passed, reason, metadata = check(tx, rules)
            status = NodeStatus.PASSED if passed else NodeStatus.FAILED
            nodes.append(
                NodeResult(
                    node_id=node_id,
                    status=status,
                    reason=reason,
                    metadata=metadata,
                )
            )
            log_node_result(trace_id=tx.transaction_id, node_id=node_id, status=status.value)
            if not passed:
                failed = True

        decision = Decision.DECLINE if failed else Decision.APPROVE

        return DecisionTrace(transaction_id=tx.transaction_id, decision=decision, nodes=tuple(nodes))
    except Exception as exc:
        log_engine_error(trace_id=tx.transaction_id, node_id=current_node_id, exc=exc)
        raise
