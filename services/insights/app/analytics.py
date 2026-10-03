import time
from collections import deque
from typing import Dict, Any, List

class AnalyticsEngine:
    def __init__(self):
        # event_id -> deque of timestamps (epoch seconds) of RSVPs
        self.rsvp_timestamps: Dict[str, deque] = {}
        self.event_totals: Dict[str, Dict[str, int]] = {}

    def record_event(self, event_type: str, event_id: str, status: str):
        now = time.time()
        if event_id not in self.rsvp_timestamps:
            self.rsvp_timestamps[event_id] = deque()
            self.event_totals[event_id] = {
                "confirmed": 0,
                "waitlist": 0,
                "cancelled": 0,
                "promoted": 0,
            }

        if event_type == "eventflow.rsvp.created":
            self.rsvp_timestamps[event_id].append(now)
            if status == "CONFIRMED":
                self.event_totals[event_id]["confirmed"] += 1
            elif status == "WAITLIST":
                self.event_totals[event_id]["waitlist"] += 1
        elif event_type == "eventflow.waitlist.promoted":
            self.event_totals[event_id]["waitlist"] = max(0, self.event_totals[event_id]["waitlist"] - 1)
            self.event_totals[event_id]["confirmed"] += 1
            self.event_totals[event_id]["promoted"] += 1
        elif event_type == "eventflow.rsvp.cancelled":
            self.event_totals[event_id]["cancelled"] += 1
            if status == "CONFIRMED":
                self.event_totals[event_id]["confirmed"] = max(0, self.event_totals[event_id]["confirmed"] - 1)

    def get_velocity(self, event_id: str, window_seconds: int = 60) -> Dict[str, Any]:
        """Calculates current RSVP velocity (rate per minute) using a sliding time window."""
        now = time.time()
        timestamps = self.rsvp_timestamps.get(event_id, deque())

        # Evict timestamps older than sliding window
        while timestamps and (now - timestamps[0]) > window_seconds:
            timestamps.popleft()

        rsvps_in_window = len(timestamps)
        rate_per_minute = (rsvps_in_window / max(window_seconds, 1)) * 60.0
        is_flash_crowd = rate_per_minute >= 50.0 # Trigger flash-crowd threshold

        return {
            "event_id": event_id,
            "window_seconds": window_seconds,
            "rsvps_in_window": rsvps_in_window,
            "velocity_per_minute": round(rate_per_minute, 2),
            "is_flash_crowd": is_flash_crowd,
            "timestamp": now,
        }

    def get_metrics(self, event_id: str) -> Dict[str, Any]:
        velocity = self.get_velocity(event_id)
        totals = self.event_totals.get(event_id, {"confirmed": 0, "waitlist": 0, "cancelled": 0, "promoted": 0})

        # Predicted attendance conversion forecast (industry heuristic: confirmed - 15% drop-off + promoted)
        total_registered = totals["confirmed"] + totals["cancelled"]
        drop_off_rate = 0.12 if total_registered > 0 else 0.0
        forecasted_attendees = int(totals["confirmed"] * (1.0 - drop_off_rate))

        return {
            "event_id": event_id,
            "velocity": velocity,
            "totals": totals,
            "forecast": {
                "estimated_actual_attendance": forecasted_attendees,
                "projected_no_show_rate": f"{int(drop_off_rate * 100)}%",
                "waitlist_conversion_count": totals["promoted"],
            },
        }

analytics_engine = AnalyticsEngine()
