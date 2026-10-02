"""ESP32 Serial & Hardware Management API endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List

from ..schemas import SerialConnectionRequest
from ..services.hardware_service import HardwareService, get_hardware_service

router = APIRouter(prefix="/api/hardware", tags=["Hardware & ESP32"])


@router.get("/ports")
async def list_available_ports(
    hw_service: HardwareService = Depends(get_hardware_service),
) -> List[Dict[str, str]]:
    """Scan and return available USB Serial COM ports."""
    return hw_service.list_ports()


@router.post("/connect")
async def connect_serial(
    req: SerialConnectionRequest,
    hw_service: HardwareService = Depends(get_hardware_service),
) -> Dict[str, Any]:
    """Connect to ESP32 microcontroller over USB Serial."""
    try:
        hw_service.connect(req.port, req.baudrate, req.timeout)
        return {
            "status": "connected",
            "port": req.port,
            "baudrate": req.baudrate,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disconnect")
async def disconnect_serial(
    hw_service: HardwareService = Depends(get_hardware_service),
) -> Dict[str, Any]:
    """Disconnect from ESP32."""
    hw_service.disconnect()
    return {"status": "disconnected"}


@router.get("/diagnostics")
async def get_diagnostics(
    hw_service: HardwareService = Depends(get_hardware_service),
) -> Dict[str, Any]:
    """Get connection health diagnostics, error logs, and throughput stats."""
    return hw_service.get_diagnostics()
