"""Operating Mode Management API router."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, Dict, Any, Optional

from ..services.app_state import AppStateManager, get_app_state, AppMode
from ..services.hardware_service import HardwareService, get_hardware_service
from ..services.simulation_service import SimulationService, get_simulation_service


router = APIRouter(prefix="/api/mode", tags=["Operating Mode"])


class SetModeRequest(BaseModel):
    mode: Literal["simulation", "hardware", "manual"] = Field(..., description="Target operating mode")


class SetFallbackRequest(BaseModel):
    enabled: bool = Field(..., description="Enable or disable auto fallback to simulation")


@router.get("")
async def get_current_mode(
    app_state: AppStateManager = Depends(get_app_state),
    hw_service: HardwareService = Depends(get_hardware_service),
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    """Get the authoritative application operating mode and connection states."""
    return {
        "mode": app_state.mode,
        "hardware_connected": hw_service.is_connected,
        "simulation_running": sim_service.running,
        "port": hw_service.port,
        "fallback_to_simulation": app_state.fallback_to_simulation,
    }


@router.post("")
async def set_current_mode(
    req: SetModeRequest,
    app_state: AppStateManager = Depends(get_app_state),
    hw_service: HardwareService = Depends(get_hardware_service),
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    """Set authoritative operating mode."""
    target_mode = req.mode
    app_state.set_mode(target_mode)

    if target_mode == "simulation":
        if not sim_service.running:
            sim_service.start()
    elif target_mode == "hardware":
        # Keep simulation background loop from broadcasting while in hardware mode
        pass

    return {
        "status": "success",
        "mode": app_state.mode,
        "hardware_connected": hw_service.is_connected,
        "simulation_running": sim_service.running,
        "port": hw_service.port,
    }


@router.post("/fallback")
async def set_fallback(
    req: SetFallbackRequest,
    app_state: AppStateManager = Depends(get_app_state),
) -> Dict[str, Any]:
    """Configure explicit fallback policy."""
    app_state.set_fallback(req.enabled)
    return {"status": "success", "fallback_to_simulation": app_state.fallback_to_simulation}
