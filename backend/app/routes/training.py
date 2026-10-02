"""Dataset Recording and Model Retraining API endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any

from ..schemas import RecordSessionStart, TrainRequest
from ..services.data_service import DataService, get_data_service

router = APIRouter(prefix="/api/training", tags=["Training & Datasets"])


@router.get("/dataset")
async def get_dataset_summary(
    data_service: DataService = Depends(get_data_service),
) -> Dict[str, Any]:
    """Get statistics on saved real dataset samples and classes."""
    return data_service.get_dataset_summary()


@router.post("/record/start")
async def start_recording(
    req: RecordSessionStart,
    data_service: DataService = Depends(get_data_service),
) -> Dict[str, Any]:
    """Begin a new labelled sensor recording session."""
    session_id = data_service.start_recording(label=req.label)
    return {
        "status": "recording",
        "session_id": session_id,
        "label": req.label,
    }


@router.post("/record/stop")
async def stop_recording(
    data_service: DataService = Depends(get_data_service),
) -> Dict[str, Any]:
    """Stop recording session and append samples to CSV."""
    saved_count = data_service.stop_recording()
    return {
        "status": "saved",
        "samples_saved": saved_count,
    }


@router.post("/record/discard")
async def discard_recording(
    data_service: DataService = Depends(get_data_service),
) -> Dict[str, Any]:
    """Discard current recording buffer without saving."""
    data_service.discard_recording()
    return {"status": "discarded"}


@router.post("/train")
async def train_models(
    req: TrainRequest,
    data_service: DataService = Depends(get_data_service),
) -> Dict[str, Any]:
    """Train Random Forest and Isolation Forest models on recorded data."""
    try:
        res = data_service.train_models_on_real_data(
            window=req.window,
            enable_motor_current=req.enable_motor_current,
            random_state=req.random_state,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
