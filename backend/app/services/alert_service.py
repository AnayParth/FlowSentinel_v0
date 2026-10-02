"""Alert management service for ChuteGuard AI."""
from __future__ import annotations
from typing import List, Dict, Any, Optional
import time
import uuid


class AlertService:
    def __init__(self):
        self.alerts: List[Dict[str, Any]] = []
        self.max_alerts: int = 200
        self._last_status: str = "NORMAL"
        self._last_alert_time: float = 0.0

    def evaluate_telemetry(self, telemetry: Dict[str, Any]) -> List[Dict[str, Any]]:
        new_alerts = []
        now = time.time()
        risk_result = telemetry.get("risk_result", {})
        status = risk_result.get("status", "NORMAL")
        risk = risk_result.get("risk", 0.0)
        confidence = risk_result.get("confidence", 100.0)
        sensor_health = telemetry.get("sensor_health", {})

        # Status transition alerts
        if status != self._last_status:
            if status == "CRITICAL":
                new_alerts.append(self._create_alert(
                    severity="critical",
                    title="Critical Chute Blockage Imminent",
                    message=f"Blockage risk escalated to {risk:.1f}%. Immediate intervention required to prevent line shutdown.",
                    category="blockage",
                ))
            elif status == "DEVELOPING BLOCKAGE":
                new_alerts.append(self._create_alert(
                    severity="warning",
                    title="Developing Blockage Detected",
                    message=f"Material accumulation detected. Blockage risk elevated to {risk:.1f}%.",
                    category="blockage",
                ))
            elif status == "EARLY ANOMALY":
                new_alerts.append(self._create_alert(
                    severity="info",
                    title="Early Sensor Anomaly Flagged",
                    message=f"Behavioral deviation detected by Isolation Forest. Risk: {risk:.1f}%.",
                    category="anomaly",
                ))
            elif status == "NORMAL" and self._last_status in ("CRITICAL", "DEVELOPING BLOCKAGE"):
                new_alerts.append(self._create_alert(
                    severity="success",
                    title="Chute Flow Cleared",
                    message="Sensor measurements returned to normal operating parameters.",
                    category="system",
                ))
            self._last_status = status

        # Sensor health degradation alerts
        for sensor_name, health_state in sensor_health.items():
            if health_state == "FAILED":
                # Rate limit sensor alerts to once every 10s
                if now - self._last_alert_time > 10.0:
                    new_alerts.append(self._create_alert(
                        severity="error",
                        title=f"{sensor_name.replace('_', ' ').title()} Sensor Failure",
                        message=f"{sensor_name.title()} sensor signal lost/stuck. System confidence downgraded to {confidence:.0f}%.",
                        category="sensor",
                    ))
                    self._last_alert_time = now

        for alert in new_alerts:
            self.alerts.insert(0, alert)
        if len(self.alerts) > self.max_alerts:
            self.alerts = self.alerts[:self.max_alerts]

        return new_alerts

    def _create_alert(self, severity: str, title: str, message: str, category: str) -> Dict[str, Any]:
        return {
            "id": str(uuid.uuid4())[:8],
            "timestamp": time.time(),
            "time_str": time.strftime("%H:%M:%S"),
            "severity": severity,
            "title": title,
            "message": message,
            "category": category,
            "acknowledged": False,
        }

    def get_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.alerts[:limit]

    def clear_alerts(self):
        self.alerts.clear()
        self._last_status = "NORMAL"


_alert_service: Optional[AlertService] = None


def get_alert_service() -> AlertService:
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService()
    return _alert_service
