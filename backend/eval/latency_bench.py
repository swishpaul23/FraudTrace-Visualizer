"""
Latency benchmark for the fraud decision engine's run_decision().

Generates one representative synthetic transaction with a fixed seed via
generate_transaction() from synthetic_eval.py — not hand-built here, so
this script can never drift out of sync with what a valid TransactionInput
actually looks like — then repeatedly runs it through the engine,
reporting p50/p95/p99/mean latency in milliseconds.

USAGE
    python latency_bench.py
"""

import random
import statistics
import time

# Importing synthetic_eval (a sibling module in this directory, which
# Python puts on sys.path automatically when this script is run directly)
# also inserts backend/ onto sys.path as an import-time side effect, so
# app.engine.runner resolves below without repeating that setup here.
from synthetic_eval import generate_transaction

from app.engine.runner import run_decision
from app.models.rules import RuleConfig

txn = generate_transaction(random.Random(42), 0)

# warmup
for _ in range(100):
    run_decision(txn, RuleConfig())

times = []
for _ in range(5000):
    start = time.perf_counter()
    run_decision(txn, RuleConfig())
    times.append((time.perf_counter() - start) * 1000)

times.sort()
p50 = times[len(times) // 2]
p95 = times[int(len(times) * 0.95)]
p99 = times[int(len(times) * 0.99)]
print(f"p50: {p50:.3f}ms  p95: {p95:.3f}ms  p99: {p99:.3f}ms  mean: {statistics.mean(times):.3f}ms")
