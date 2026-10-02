"""FastAPI Route endpoints for ChuteGuard AI."""
from .telemetry import router as telemetry_router
from .simulation import router as simulation_router
from .hardware import router as hardware_router
from .training import router as training_router
from .analytics import router as analytics_router
from .alerts import router as alerts_router
from .mode import router as mode_router
from .ws import router as ws_router

__all__ = [
    "telemetry_router",
    "simulation_router",
    "hardware_router",
    "training_router",
    "analytics_router",
    "alerts_router",
    "mode_router",
    "ws_router",
]

