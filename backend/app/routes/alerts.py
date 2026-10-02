"""Alerts and Event Log API endpoints."""
from fastapi import APIRouter, Depends
from typing import Dict, Any, List

from ..services.alert_service import AlertService, get_alert_service

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Events"])


@router.get("")
async def get_alerts(
    limit: int = 50,
    alert_service: AlertService = Depends(get_alert_service),
) -> List[Dict[str, Any]]:
    """Get active and historical alert events."""
    return alert_service.get_alerts(limit=limit)


@router.post("/clear")
async def clear_alerts(
    alert_service: AlertService = Depends(get_alert_service),
) -> Dict[str, Any]:
    """Clear all logged alerts."""
    alert_service.clear_alerts()
    return {"status": "cleared"}
