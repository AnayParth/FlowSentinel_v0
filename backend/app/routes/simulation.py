"""Simulation Control API endpoints."""
from fastapi import APIRouter, Depends
from typing import Dict, Any

from ..schemas import SimulationConfig
from ..services.simulation_service import SimulationService, get_simulation_service

router = APIRouter(prefix="/api/simulation", tags=["Simulation Control"])


@router.post("/start")
async def start_simulation(
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    """Start background live simulation."""
    sim_service.start()
    return {"status": "started", "running": True}


@router.post("/stop")
async def stop_simulation(
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    """Pause background live simulation."""
    sim_service.stop()
    return {"status": "stopped", "running": False}


@router.post("/reset")
async def reset_simulation(
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    """Reset simulation step counter and sensor state."""
    sim_service.reset()
    return {"status": "reset", "telemetry": sim_service.last_telemetry}


@router.post("/step")
async def step_simulation(
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    """Execute single simulation step tick."""
    telemetry = sim_service.step_once()
    return {"status": "stepped", "telemetry": telemetry}


@router.post("/config")
async def configure_simulation(
    cfg: SimulationConfig,
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    """Update live simulation scenario mode, fault injection, material, or speed."""
    faults = {
        "vibration": cfg.fault_vibration,
        "level": cfg.fault_level,
        "load": cfg.fault_load,
        "motor_current": cfg.fault_motor_current,
    }
    sim_service.configure(
        mode=cfg.mode,
        material=cfg.material,
        enable_motor_current=cfg.enable_motor_current,
        ramp_seconds=cfg.ramp_seconds,
        noise_level=cfg.noise_level,
        tick_delay=cfg.tick_delay,
        manual_severity=cfg.manual_severity,
        faults=faults,
    )
    return {
        "status": "configured",
        "mode": cfg.mode,
        "material": cfg.material,
        "running": sim_service.running,
    }


@router.get("/status")
async def get_simulation_status(
    sim_service: SimulationService = Depends(get_simulation_service),
) -> Dict[str, Any]:
    """Get current simulation state."""
    return {
        "running": sim_service.running,
        "mode": sim_service.simulator.mode,
        "material": sim_service.simulator.material,
        "t": sim_service.simulator.t,
        "severity": round(sim_service.simulator.severity, 3),
        "faults": sim_service.simulator.sensor_faults,
        "tick_delay": sim_service.tick_delay,
    }
