"""Telemetry and Prediction API endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List

from ..schemas import (
    ManualPredictionRequest,
    HardwareSampleInput,
    FusionWeightsConfig,
    UltrasonicCalibration,
)
from ..services.ml_engine import MLEngine, get_ml_engine
from ..services.simulation_service import SimulationService, get_simulation_service
from ..services.hardware_service import HardwareService, get_hardware_service
from ..services.data_service import DataService, get_data_service
from ..services.app_state import AppStateManager, get_app_state

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry & Prediction"])


@router.get("/current")
async def get_current_telemetry(
    ml_engine: MLEngine = Depends(get_ml_engine),
    sim_service: SimulationService = Depends(get_simulation_service),
    hw_service: HardwareService = Depends(get_hardware_service),
    app_state: AppStateManager = Depends(get_app_state),
) -> Dict[str, Any]:
    """Get the latest system telemetry snapshot based on authoritative mode."""
    if app_state.mode == "hardware":
        if hw_service.last_telemetry:
            res = dict(hw_service.last_telemetry)
        else:
            # Fallback to last hardware sample or clean baseline tagged as hardware
            hw_history = [t for t in ml_engine.telemetry_history if t.get("mode") == "hardware"]
            if hw_history:
                res = dict(hw_history[-1])
            else:
                res = dict(ml_engine.manual_predict(vibration_g=1.0, level=0.0, load_kg=0.0))
        res["mode"] = "hardware"
        res["app_mode"] = "hardware"
        res["hardware_connected"] = hw_service.is_connected
        res["hardware_port"] = hw_service.port
        return res

    # Simulation mode
    if sim_service.last_telemetry:
        res = dict(sim_service.last_telemetry)
    elif ml_engine.telemetry_history:
        res = dict(ml_engine.telemetry_history[-1])
    else:
        res = dict(ml_engine.manual_predict(vibration_g=1.0, level=15.0, load_kg=25.0))
    
    res["mode"] = "simulation"
    res["app_mode"] = "simulation"
    res["hardware_connected"] = hw_service.is_connected
    res["hardware_port"] = hw_service.port
    return res


@router.get("/history")
async def get_telemetry_history(
    limit: int = 100,
    ml_engine: MLEngine = Depends(get_ml_engine),
    app_state: AppStateManager = Depends(get_app_state),
) -> List[Dict[str, Any]]:
    """Get recent time-series telemetry history for charting."""
    current_mode = app_state.mode
    # Filter history matching current mode if available, or return recent history
    matching = [t for t in ml_engine.telemetry_history if t.get("mode") == current_mode]
    if matching:
        return matching[-limit:]
    return ml_engine.telemetry_history[-limit:]



@router.post("/manual")
async def manual_prediction(
    req: ManualPredictionRequest,
    ml_engine: MLEngine = Depends(get_ml_engine),
) -> Dict[str, Any]:
    """Perform instant what-if analysis with interactive parameters."""
    faults = {
        "vibration": req.fault_vibration,
        "level": req.fault_level,
        "load": req.fault_load,
        "motor_current": req.fault_motor_current,
    }
    level_val = req.material_level
    if req.distance_cm is not None:
        try:
            level_val = (ml_engine.empty_distance_cm - req.distance_cm) / (ml_engine.empty_distance_cm - ml_engine.full_distance_cm) * 100.0
            level_val = max(0.0, min(100.0, level_val))
        except ZeroDivisionError:
            pass

    return ml_engine.manual_predict(
        vibration_g=req.vibration_g,
        level=level_val,
        load_kg=req.load_kg,
        motor_current_a=req.motor_current_a,
        noise=req.sensor_noise,
        faults=faults,
    )


@router.post("/weights")
async def update_fusion_weights(
    cfg: FusionWeightsConfig,
    ml_engine: MLEngine = Depends(get_ml_engine),
) -> Dict[str, Any]:
    """Update risk fusion weight distribution."""
    ml_engine.set_fusion_weights(cfg.w_classification, cfg.w_anomaly, cfg.w_trend)
    return {
        "status": "updated",
        "w_classification": ml_engine.fusion_config.w_classification,
        "w_anomaly": ml_engine.fusion_config.w_anomaly,
        "w_trend": ml_engine.fusion_config.w_trend,
    }


@router.post("/calibrate")
async def update_calibration(
    cal: UltrasonicCalibration,
    ml_engine: MLEngine = Depends(get_ml_engine),
) -> Dict[str, Any]:
    """Update HC-SR04 empty and 100% reference distance calibration."""
    try:
        ml_engine.set_calibration(cal.empty_distance_cm, cal.full_distance_cm)
        return {"status": "success", "empty_distance_cm": cal.empty_distance_cm, "full_distance_cm": cal.full_distance_cm}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/esp32/push")
async def ingest_esp32_sample(
    sample: HardwareSampleInput,
    hw_service: HardwareService = Depends(get_hardware_service),
    data_service: DataService = Depends(get_data_service),
) -> Dict[str, Any]:
    """Ingest live wireless sample from ESP32 via HTTP POST."""
    sample_dict = sample.model_dump()
    telemetry = hw_service.ingest_wifi_sample(sample_dict)
    if data_service.recording_active:
        data_service.record_sample(sample_dict)
    return {"status": "ok", "telemetry": telemetry}
