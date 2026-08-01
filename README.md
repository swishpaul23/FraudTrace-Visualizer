# Fraud Decision Visualizer

A full-stack demonstration of backend decision-engine design and interactive data visualization: a sequential, rule-based fraud detection engine that produces immutable, auditable execution traces, rendered as an interactive node graph.

**Live demo:** [https://fraud-visualizer.vercel.app](https://fraud-trace-visualizer.vercel.app/)

---

## Overview

Fraud Decision Visualizer models how a production fraud-scoring pipeline evaluates a transaction: as a deterministic sequence of checks, each of which can pass, fail, or be skipped based on the outcome of the checks before it. Every evaluation produces a complete, immutable trace of what ran, in what order, and why — which the frontend renders as an interactive graph so the decision path can be inspected step by step.

The project is built to be defensible in a technical interview: every metric quoted below is derived from a reproducible evaluation harness against real code paths, not estimated or projected.

## Architecture

### Decision Engine (Backend)

The engine runs six sequential checks per transaction:

1. `ingress_parse` — validate and normalize the incoming payload
2. `geo_mapping` — resolve transaction origin
3. `proxy_vpn` — detect anonymization/proxy signals
4. `amount_risk` — evaluate transaction amount against risk thresholds
5. `velocity` — evaluate transaction frequency/rate signals
6. `final_resolution` — aggregate prior results into a final decision

Checks run in strict order. A failing check can trigger an early exit, in which case downstream checks are recorded as `SKIPPED` rather than silently omitted — the trace always accounts for all six steps, regardless of outcome. Trace objects are built from frozen Pydantic models, so a completed trace cannot be mutated after the fact.

### Visualization (Frontend)

The frontend consumes a trace and renders it as a directed graph using React Flow: one node per check, edges representing execution order, and visual state (passed / failed / skipped) applied per node. React Query keeps the graph in sync with engine parameter changes without manual refetch logic.

### Deployment

Backend and frontend are deployed together from a single repository as one Vercel project, exposed behind one URL.

```
┌─────────────┐      POST /api/v1/decisions      ┌──────────────────┐
│   Frontend   │ ───────────────────────────────► │  FastAPI backend  │
│ React + Flow │ ◄─────────────────────────────── │  (decision trace) │
└─────────────┘         immutable trace           └──────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Pydantic (frozen models) |
| Frontend | React, TypeScript, React Flow, React Query |
| Deployment | Vercel (single combined project) |
| Evaluation | Custom synthetic harness (`eval/`) |

## API

```
POST /api/v1/decisions
```

Accepts a transaction payload and returns a complete, immutable execution trace covering all six checks (with `SKIPPED` status recorded for any check bypassed by an early exit).

## Evaluation & Metrics

All figures below are produced by `eval/synthetic_eval.py` (1,000 synthetic transactions) and `eval/latency_bench.py`, and are reproducible by running those scripts directly.

| Metric | Result |
|---|---|
| Precision | 83.2% → 84.5% |
| False negatives | 12 → 9 (25% reduction, no recall regression) |
| Decision engine latency (p95) | 0.042ms *(in-process compute only, not end-to-end HTTP latency)* |

**On methodology and honesty:** the evaluation harness scores against an independently defined 8-signal synthetic heuristic that intentionally uses different thresholds than the engine itself, to avoid circular validation (grading the engine against its own logic). These are not real-world fraud labels — there is no ground-truth fraud dataset here — so the metrics describe engine behavior against a controlled synthetic benchmark, not real-world fraud-catching performance. The measured false-positive rate is also partly an artifact of a narrow synthetic country pool in the generator and should be read with that limitation in mind.

## Key Engineering Notes

- **Boundary-coincidence bugs are silent.** An early version of the synthetic data generator capped transaction amounts at exactly $5,000.00, which coincided with the engine's `amount > 5000` (strict) threshold — making the `amount_risk` check mathematically inert across the entire synthetic dataset. Aggregate metrics looked fine; only row-level trace inspection surfaced the bug. This is the main reason the visualizer traces every check individually rather than only reporting a final verdict.
- **Immutability by construction.** Trace models are frozen at the Pydantic level, so a trace cannot be altered after the engine produces it — the audit trail is structurally guaranteed, not just conventionally respected.
- **Deterministic, sequential evaluation.** No parallel or reorderable checks — the engine's behavior is fully explained by "run these six steps in this order," which is part of what makes the trace auditable.

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Evaluation
python eval/synthetic_eval.py
python eval/latency_bench.py
```

## Deployment Notes

- Vercel auto-detects this repo as a FastAPI project; the framework preset must be manually set to **Other** so `vercel.json` is respected.
- The serverless entrypoint is `backend/index.py`, which patches `sys.path` before import — without it, the deployed function fails with `ModuleNotFoundError: No module named 'app'`.
- Vercel project names must be lowercase.
- The decisions endpoint is plural: `/api/v1/decisions`, not `/api/v1/decision`.

## Known Limitations

- Evaluation metrics are benchmarked against a synthetic heuristic, not real fraud outcomes.
- Latency figures measure in-process engine compute only, not end-to-end request latency (network, serialization, cold starts excluded).
- The synthetic dataset's country pool is narrow enough to bias the measured false-positive rate; it should not be read as representative of real-world traffic.

## Project Status

Core engine, interactive visualization, and production deployment are complete. A UI polish pass (background styling, side panel depth, hover states, and a viewport-reset bug on parameter change) is in progress.

## License

MIT
