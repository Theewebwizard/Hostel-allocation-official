# Hostel Allocation Engine

The Python FastAPI engine that implements the CSP + Bin Packing algorithms for intelligent hostel room allocation. Communicates with the NestJS core API via webhooks — when allocation finishes, it POSTs results back to NestJS rather than waiting to be polled.

Run state is persisted in **Redis** (key `run:{run_id}`, 24 h TTL) rather than an in-process dictionary. This makes the engine stateless and safe to run under multiple worker processes or replicas.

## Prerequisites

- Python 3.10+
- Redis 6+ (local or via Docker)

For local bare-metal development:

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Linux/Mac
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy and configure environment variables:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| --- | --- | --- |
| `CORE_SERVICES_URL` | Base URL of the NestJS API (for fetching allocation data) | `http://localhost:3000` |
| `WEBHOOK_SECRET` | Shared secret sent as `X-Webhook-Secret` header on webhook callbacks. Must match the NestJS env. | *(required)* |
| `ALLOCATION_PORT` | Port the engine listens on | `8000` |
| `REDIS_URL` | Redis connection URL for ephemeral run-state storage. | `redis://localhost:6379/0` |

4. Run the allocation server:

```bash
uvicorn app.main:app --reload --port 8000
```

## Architecture

The allocation engine uses a two-stage algorithm:

1. **Stage 1: Constraint Satisfaction Problem (CSP)** — Filters valid room assignments via priority-ordered rule resolution.
2. **Stage 2: Bin Packing (FFD Heuristic)** — Places atomic roommate units into rooms using a descending-size greedy packing heuristic.

### Redis-backed Run State (`app/queue.py`)

Allocation run lifecycle state (`queued` → `running` → `completed`/`failed`) is stored in Redis under the key `run:{run_id}` with a 24-hour TTL.

- On startup the application eagerly creates the Redis connection pool.
- On shutdown the pool is cleanly drained via the FastAPI lifespan context.
- If the engine restarts (or Redis restarts), keys are gone → `GET /allocation/{run_id}` returns HTTP 404 → NestJS `onModuleInit` reconciliation marks the run `FAILED`.

## Webhook-Based Orchestration

The engine accepts a `callback_url` field in the `POST /allocate` request body. After the background allocation task finishes (success **or** failure), it fires an HTTP POST to that URL with the full results payload and an `X-Webhook-Secret` header for authentication.

```json
POST {callback_url}
Headers: { X-Webhook-Secret: <WEBHOOK_SECRET> }
Body: {
  "run_id": "<uuid>",
  "status": "completed" | "failed",
  "total_students": 120,
  "allocated_students": 118,
  "allocations": [...],
  "decision_logs": [...],
  "metrics": { "unallocated_students": 2, "group_splits": 0 },
  "error": "<message if failed>"
}
```

After a successful webhook delivery, the Redis key is deleted immediately. If the delivery fails, the key remains until its 24-hour TTL expires — the NestJS reconciliation hook will recover the run on the next restart.

If `callback_url` is omitted, the engine still runs normally — results remain queryable via `GET /allocation/{run_id}`.

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/allocate` | Trigger an allocation run. Accepts `callback_url` for webhook push. Returns `{ run_id, status: "queued" }` immediately. |
| `GET` | `/allocation/{run_id}` | Query the Redis-backed status of a run (used for startup reconciliation). Returns 404 if the key is expired or was never created. |
| `GET` | `/health` | Health check. |

## CP-SAT Objective Weight Hierarchy

The `global_optimization` allocation mode uses the Google OR-Tools CP-SAT solver. The objective weights satisfy a strict dominance hierarchy:

```text
W_bed  ≫  W_rule  ≫  W_pref
```

- **`W_bed`** (`W_base`): Securing any bed is worth more than every possible bonus from all other tiers combined.
- **`W_rule`** (1000): One step up in administrative rule priority outweighs the maximum preference bonus any student can earn.
- **`W_pref`** (10): Preference alignment is a tie-breaker only.

A runtime `assert` guards these invariants on every solver invocation. If triggered (e.g., rules with extremely high priority values or very long preference lists), the assertion raises with a clear diagnostic message.
