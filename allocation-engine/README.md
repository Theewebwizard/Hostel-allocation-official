# Hostel Allocation Engine

The Python FastAPI engine that implements the CSP + Bin Packing algorithms for intelligent hostel room allocation. Communicates with the NestJS core API via webhooks — when allocation finishes, it POSTs results back to NestJS rather than waiting to be polled.

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
|---|---|---|
| `CORE_SERVICES_URL` | Base URL of the NestJS API (for fetching allocation data) | `http://localhost:3000` |
| `WEBHOOK_SECRET` | Shared secret sent as `X-Webhook-Secret` header on webhook callbacks. Must match the NestJS env. | *(required)* |
| `ALLOCATION_PORT` | Port the engine listens on | `8000` |

4. Run the allocation server:

```bash
uvicorn app.main:app --reload --port 8000
```

## Architecture

The allocation engine uses a two-stage algorithm:

1. **Stage 1: Constraint Satisfaction Problem (CSP)** — Filters valid room assignments via priority-ordered rule resolution.
2. **Stage 2: Bin Packing (FFD Heuristic)** — Places atomic roommate units into rooms using a descending-size greedy packing heuristic.

## Webhook-Based Orchestration

The engine accepts a `callback_url` field in the `POST /allocate` request body. After the background allocation task finishes (success **or** failure), it fires an HTTP POST to that URL with the full results payload and an `X-Webhook-Secret` header for authentication.

```
POST {callback_url}
Headers: { X-Webhook-Secret: <WEBHOOK_SECRET> }
Body: {
  "run_id": "<uuid>",
  "status": "completed" | "failed",
  "total_students": 120,
  "allocated_students": 118,
  "allocations": [...],
  "decision_logs": [...],
  "error": "<message if failed>"
}
```

If `callback_url` is omitted, the engine still runs normally — results remain queryable via `GET /allocation/{run_id}` (used by the NestJS startup reconciliation hook).

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/allocate` | Trigger an allocation run. Accepts `callback_url` for webhook push. Returns `{ run_id, status: "queued" }` immediately. |
| `GET` | `/allocation/{run_id}` | Query the in-memory status of a run (used for startup reconciliation). Returns 404 if the engine has restarted and lost the run. |
| `GET` | `/health` | Health check. |
