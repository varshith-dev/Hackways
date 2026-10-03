import unittest
import asyncio
import time
from app.analytics import AnalyticsEngine
from app.notifications import NotificationDispatcher

class TestInsightsEngine(unittest.TestCase):
    def test_analytics_velocity_calculation(self):
        engine = AnalyticsEngine()
        event_id = "test-event-1"

        # Record 30 RSVPs
        for _ in range(30):
            engine.record_event("eventflow.rsvp.created", event_id, "CONFIRMED")

        vel = engine.get_velocity(event_id, window_seconds=60)
        self.assertEqual(vel["rsvps_in_window"], 30)
        self.assertEqual(vel["velocity_per_minute"], 30.0)
        self.assertFalse(vel["is_flash_crowd"])

    def test_analytics_flash_crowd_trigger(self):
        engine = AnalyticsEngine()
        event_id = "viral-drop-100"

        # Record 60 RSVPs (exceeds 50/min threshold)
        for _ in range(60):
            engine.record_event("eventflow.rsvp.created", event_id, "CONFIRMED")

        vel = engine.get_velocity(event_id, window_seconds=60)
        self.assertEqual(vel["rsvps_in_window"], 60)
        self.assertTrue(vel["is_flash_crowd"])

    def test_analytics_totals_and_conversion(self):
        engine = AnalyticsEngine()
        event_id = "event-summary-test"

        # 10 confirmed, 5 waitlisted
        for _ in range(10):
            engine.record_event("eventflow.rsvp.created", event_id, "CONFIRMED")
        for _ in range(5):
            engine.record_event("eventflow.rsvp.created", event_id, "WAITLIST")

        # 1 promoted from waitlist
        engine.record_event("eventflow.waitlist.promoted", event_id, "CONFIRMED")

        metrics = engine.get_metrics(event_id)
        totals = metrics["totals"]
        self.assertEqual(totals["confirmed"], 11)
        self.assertEqual(totals["waitlist"], 4)
        self.assertEqual(totals["promoted"], 1)
        self.assertIn("estimated_actual_attendance", metrics["forecast"])

    def test_notification_dispatcher(self):
        async def run_async():
            dispatcher = NotificationDispatcher()
            payload = {
                "event_id": "ev_notif_test",
                "user_email": "attendee@example.com",
                "user_name": "Jane Doe",
                "status": "CONFIRMED",
            }
            await dispatcher.dispatch("eventflow.rsvp.created", payload)

            self.assertEqual(len(dispatcher.delivery_log), 1)
            last_log = dispatcher.delivery_log[0]
            self.assertEqual(last_log["status"], "DELIVERED")
            self.assertEqual(last_log["recipient"], "attendee@example.com")
            self.assertIn("Confirmed", last_log["subject"])

        asyncio.run(run_async())

if __name__ == "__main__":
    unittest.main()
