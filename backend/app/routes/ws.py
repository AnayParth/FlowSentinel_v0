"""WebSocket real-time telemetry streaming endpoint."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set, Dict, Any
import asyncio
import json

from ..services.simulation_service import get_simulation_service
from ..services.hardware_service import get_hardware_service
from ..services.ml_engine import get_ml_engine
from ..services.data_service import get_data_service
from ..services.app_state import get_app_state

router = APIRouter(tags=["WebSocket Stream"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_json(self, data: Dict[str, Any]):
        if not self.active_connections:
            return
        payload = json.dumps(data)
        disconnected = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.add(connection)
        for dead in disconnected:
            self.active_connections.discard(dead)


manager = ConnectionManager()


def _on_telemetry_update(telemetry: Dict[str, Any]):
    """Sync callback from SimulationService or HardwareService."""
    app_state = get_app_state()
    current_mode = app_state.mode
    sample_mode = telemetry.get("mode", "simulation")

    # Filter out packets that don't match the current authoritative mode
    if sample_mode != current_mode:
        return

    hw_service = get_hardware_service()
    sim_service = get_simulation_service()

    telemetry["app_mode"] = current_mode
    telemetry["hardware_connected"] = hw_service.is_connected
    telemetry["hardware_port"] = hw_service.port
    telemetry["simulation_running"] = sim_service.running

    # Data recording tap
    data_svc = get_data_service()
    if data_svc.recording_active:
        data_svc.record_sample(telemetry.get("raw_sensors", {}))

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.broadcast_json(telemetry))
    except Exception:
        pass


# Register global listeners
get_simulation_service().subscribe(_on_telemetry_update)
get_hardware_service().subscribe(_on_telemetry_update)


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    sim_service = get_simulation_service()
    hw_service = get_hardware_service()
    ml_engine = get_ml_engine()
    app_state = get_app_state()

    # Send initial snapshot immediately upon connect based on authoritative mode
    if app_state.mode == "hardware":
        initial = hw_service.last_telemetry or ml_engine.manual_predict(vibration_g=1.0, level=0.0, load_kg=0.0)
        initial["mode"] = "hardware"
    else:
        initial = sim_service.last_telemetry or (
            ml_engine.telemetry_history[-1] if ml_engine.telemetry_history else
            ml_engine.manual_predict(vibration_g=1.0, level=15.0, load_kg=25.0)
        )
        initial["mode"] = "simulation"

    initial["app_mode"] = app_state.mode
    initial["hardware_connected"] = hw_service.is_connected
    initial["hardware_port"] = hw_service.port
    initial["simulation_running"] = sim_service.running

    try:
        await websocket.send_text(json.dumps(initial))
    except Exception:
        pass

    try:
        while True:
            # Handle inbound commands if frontend sends control messages over WS
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                cmd = msg.get("command")
                if cmd == "set_mode":
                    target_mode = msg.get("mode")
                    if target_mode in ("simulation", "hardware", "manual"):
                        app_state.set_mode(target_mode)
                        if target_mode == "simulation" and not sim_service.running:
                            sim_service.start()
                elif cmd == "start_simulation":
                    app_state.set_mode("simulation")
                    sim_service.start()
                elif cmd == "stop_simulation":
                    sim_service.stop()
                elif cmd == "reset_simulation":
                    sim_service.reset()
                elif cmd == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "app_mode": app_state.mode,
                        "hardware_connected": hw_service.is_connected,
                        "hardware_port": hw_service.port,
                    }))
            except Exception:
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
