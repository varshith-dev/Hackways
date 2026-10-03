import asyncio
import logging
import time
from typing import Dict, Any, List

logger = logging.getLogger("insights.notifications")

class NotificationDispatcher:
    def __init__(self):
        self.delivery_log: List[Dict[str, Any]] = []
        self.max_retries = 3

    async def dispatch(self, event_type: str, payload: Dict[str, Any]):
        """Dispatches an asynchronous notification with exponential backoff retry."""
        user_email = payload.get("user_email")
        user_name = payload.get("user_name", "Attendee")
        event_id = payload.get("event_id")
        status = payload.get("status")

        if not user_email and event_type != "eventflow.capacity.reached":
            logger.warning(f"Skipping notification for event {event_id}: missing recipient email")
            return

        message = self._compose_message(event_type, user_name, event_id, status, payload)

        for attempt in range(1, self.max_retries + 1):
            try:
                # Simulated network I/O with email/SMS provider (SendGrid / Twilio)
                await asyncio.sleep(0.05) # 50ms async network hop

                log_entry = {
                    "id": f"notif_{int(time.time()*1000)}_{len(self.delivery_log)}",
                    "event_type": event_type,
                    "recipient": user_email or "organizer",
                    "subject": message["subject"],
                    "body": message["body"],
                    "status": "DELIVERED",
                    "attempts": attempt,
                    "timestamp": time.time(),
                }
                self.delivery_log.append(log_entry)
                if len(self.delivery_log) > 500:
                    self.delivery_log.pop(0)

                logger.info(f"[Notification] Delivered {event_type} to {user_email or 'organizer'} on attempt {attempt}")
                return
            except Exception as e:
                backoff = 0.1 * (2 ** (attempt - 1))
                logger.warning(f"[Notification] Attempt {attempt} failed for {user_email}: {e}. Retrying in {backoff}s...")
                await asyncio.sleep(backoff)

        # Dead Letter Queue (DLQ) logging
        dlq_entry = {
            "event_type": event_type,
            "recipient": user_email,
            "payload": payload,
            "status": "DEAD_LETTER",
            "timestamp": time.time(),
        }
        self.delivery_log.append(dlq_entry)
        logger.error(f"[Notification DLQ] Failed to deliver {event_type} to {user_email} after {self.max_retries} attempts")

    def _compose_message(self, event_type: str, user_name: str, event_id: str, status: str, payload: Dict[str, Any]) -> Dict[str, str]:
        if event_type == "eventflow.rsvp.created":
            if status == "CONFIRMED":
                return {
                    "subject": "Your RSVP is Confirmed",
                    "body": f"Hello {user_name}, you're officially on the guestlist for event {event_id}. See you there!",
                }
            elif status == "WAITLIST":
                pos = payload.get("payload", {}).get("waitlist_position", "in line")
                return {
                    "subject": f"You're on the Waitlist (Position #{pos})",
                    "body": f"Hello {user_name}, tickets are currently at capacity. You are #{pos} on the priority waitlist.",
                }
        elif event_type == "eventflow.waitlist.promoted":
            return {
                "subject": "A spot opened up — your RSVP is Confirmed",
                "body": f"Hello {user_name}, a ticket became available and you have been promoted from the waitlist to Confirmed!",
            }
        elif event_type == "eventflow.capacity.reached":
            return {
                "subject": "Event Capacity Alert: Event is Sold Out",
                "body": f"Organizer Notice: Event {event_id} has reached maximum ticket tier capacity. All subsequent attendees will be directed to the waitlist.",
            }
        elif event_type == "eventflow.rsvp.cancelled":
            return {
                "subject": "Your RSVP has been cancelled",
                "body": f"Hello {user_name}, your RSVP for event {event_id} has been cancelled.",
            }
        return {
            "subject": f"Update regarding event {event_id}",
            "body": f"Hello {user_name}, there is a new update regarding your registration.",
        }

dispatcher = NotificationDispatcher()
