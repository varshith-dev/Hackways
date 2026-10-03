import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
try:
    import nats
    from nats.js.errors import NotFoundError
    HAS_NATS = True
except ImportError:
    HAS_NATS = False
    nats = None

from app.config import settings
from app.analytics import analytics_engine
from app.notifications import dispatcher

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("insights.main")

nats_connection = None
consumer_task = None

async def run_nats_consumer():
    global nats_connection
    if not HAS_NATS:
        logger.info("NATS driver not installed locally; running insights service in standalone telemetry mode.")
        return
    try:
        logger.info(f"Connecting to NATS JetStream at {settings.NATS_URL}...")
        nc = await nats.connect(settings.NATS_URL, reconnect_time_wait=2, max_reconnect_attempts=-1)
        nats_connection = nc
        js = nc.jetstream()

        # Subscribe to all eventflow events
        async def event_handler(msg):
            try:
                data = json.loads(msg.data.decode())
                subject = msg.subject
                logger.info(f"[NATS Consumer] Received event on {subject}: {data.get('event_id')}")

                event_id = data.get("event_id", "")
                status = data.get("status", "")

                # 1. Update analytics sliding-window velocity
                analytics_engine.record_event(subject, event_id, status)

                # 2. Fan-out asynchronous notification with backoff
                asyncio.create_task(dispatcher.dispatch(subject, data))

                await msg.ack()
            except Exception as ex:
                logger.error(f"Error handling NATS event: {ex}")

        # Subscribe with durable consumer queue group for horizontal scale
        await js.subscribe("eventflow.>", cb=event_handler, queue="insights-workers")
        logger.info("NATS JetStream consumer successfully registered for 'eventflow.>'")

    except Exception as e:
        logger.warning(f"Could not connect to NATS ({e}). Running in standalone mock mode.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting EventFlow Insights & Orchestration service...")
    task = asyncio.create_task(run_nats_consumer())
    yield
    # Shutdown
    task.cancel()
    if nats_connection and not nats_connection.is_closed:
        await nats_connection.close()
    logger.info("Insights service stopped cleanly.")

app = FastAPI(
    title="EventFlow Insights & Notification Orchestration API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    nats_connected = nats_connection is not None and not nats_connection.is_closed
    return {
        "status": "healthy",
        "service": "insights-and-orchestration",
        "nats_connected": nats_connected,
        "processed_notifications": len(dispatcher.delivery_log),
    }

@app.get("/api/v1/analytics/events/{event_id}/velocity")
async def get_velocity(event_id: str, window: int = Query(60, ge=5, le=3600)):
    """Returns real-time RSVP velocity and flash-crowd detection status."""
    return analytics_engine.get_velocity(event_id, window_seconds=window)

@app.get("/api/v1/analytics/events/{event_id}/metrics")
async def get_metrics(event_id: str):
    """Returns aggregated event registration totals, velocity, and attendance forecast."""
    return analytics_engine.get_metrics(event_id)

@app.get("/api/v1/notifications/logs")
async def get_notification_logs(limit: int = Query(50, ge=1, le=200)):
    """Returns recent notification delivery audit logs and delivery attempts."""
    logs = list(reversed(dispatcher.delivery_log))[:limit]
    return {
        "count": len(logs),
        "total_dispatched": len(dispatcher.delivery_log),
        "logs": logs,
    }

@app.post("/api/v1/mock/simulate-rsvp")
async def simulate_rsvp_event(payload: Dict[str, Any]):
    """Helper endpoint to inject simulated event payloads for testing without external bus."""
    event_type = payload.get("event_type", "eventflow.rsvp.created")
    event_id = payload.get("event_id", "demo-event")
    status = payload.get("status", "CONFIRMED")
    analytics_engine.record_event(event_type, event_id, status)
    await dispatcher.dispatch(event_type, payload)
    return {"status": "dispatched", "event_id": event_id}
