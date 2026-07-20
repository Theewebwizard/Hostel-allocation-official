"""
Redis-backed run state store for the Allocation Engine.

Replaces the in-memory ``allocation_runs`` dictionary with a Redis key-value
store so that state survives horizontal scaling and process restarts.

Key schema:
  run:{run_id}  →  JSON-encoded run state dict (TTL: 24 hours)

Public API:
  get_redis_client()         → singleton async Redis connection
  set_run_state(run_id, d)   → persist (or overwrite) run state with 24h TTL
  get_run_state(run_id)      → return state dict or None if key missing/expired
  delete_run_state(run_id)   → remove key (called after successful webhook push)
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

import redis.asyncio as aioredis

from .config import get_settings

logger = logging.getLogger(__name__)

# Default TTL: 24 hours.  Once a run reaches a terminal state and the webhook
# has been delivered to NestJS, the key can be deleted immediately; the TTL is
# a safety net for orphaned runs (e.g. webhook delivery failed).
_RUN_TTL_SECONDS: int = 86_400


def _run_key(run_id: str) -> str:
    """Canonical Redis key for an allocation run's ephemeral state."""
    return f"run:{run_id}"


# ─── Singleton client ────────────────────────────────────────────────────────

_redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> aioredis.Redis:
    """
    Return (or lazily create) the singleton async Redis client.

    The client uses a connection pool internally; it is safe to share across
    concurrent coroutines.  Call ``close_redis_client()`` during application
    shutdown to cleanly drain the pool.
    """
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30,
        )
        logger.info("[Queue] Redis client initialised → %s", settings.redis_url)
    return _redis_client


async def close_redis_client() -> None:
    """Drain the connection pool on application shutdown."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("[Queue] Redis client closed.")


# ─── Public helpers ──────────────────────────────────────────────────────────


async def set_run_state(
    run_id: str,
    state: Dict[str, Any],
    ttl: int = _RUN_TTL_SECONDS,
) -> None:
    """
    Persist run state to Redis with an expiry.

    The *state* dict must be JSON-serialisable.  ``AllocationResult`` and
    ``AllocationDecisionLog`` objects should be converted to plain dicts with
    ``.model_dump()`` before calling this function.

    Args:
        run_id: UUID of the allocation run.
        state:  Serialisable state dict.
        ttl:    Key TTL in seconds (default 24 h).
    """
    client = await get_redis_client()
    payload = json.dumps(state, default=str)
    await client.setex(_run_key(run_id), ttl, payload)


async def get_run_state(run_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve run state from Redis.

    Returns:
        The state dict, or ``None`` if the key does not exist (expired or
        never created).  A ``None`` return causes ``GET /allocation/{run_id}``
        to respond with HTTP 404, which NestJS treats as a lost run during
        reconciliation.
    """
    client = await get_redis_client()
    raw = await client.get(_run_key(run_id))
    if raw is None:
        return None
    return json.loads(raw)


async def update_run_state(run_id: str, updates: Dict[str, Any]) -> None:
    """
    Atomically merge *updates* into the existing run state.

    If the key does not exist the update is a no-op (this should not happen
    in normal operation; the run is created with ``set_run_state`` in the
    ``/allocate`` endpoint before the background task starts).
    """
    current = await get_run_state(run_id)
    if current is None:
        logger.warning(
            "[Queue] update_run_state called for unknown run_id=%s — ignoring.", run_id
        )
        return
    current.update(updates)
    await set_run_state(run_id, current)


async def delete_run_state(run_id: str) -> None:
    """
    Remove a run's state key from Redis.

    Called after the webhook has been successfully delivered to NestJS so we
    don't leave stale keys around until the 24-hour TTL expires.
    """
    client = await get_redis_client()
    await client.delete(_run_key(run_id))
    logger.debug("[Queue] Deleted Redis key for run_id=%s", run_id)
