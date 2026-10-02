"""Background Live Simulation Service for ChuteGuard AI."""
from __future__ import annotations
from typing import Optional, Callable, Dict, Any, List
import asyncio

from ..ml.simulator import LiveSimulator
from .ml_engine import MLEngine, get_ml_engine
from .alert_service import AlertService, get_alert_service
from .app_state import get_app_state



class SimulationService:
    def __init__(self, ml_engine: Optional[MLEngine] = None, alert_service: Optional[AlertService] = None):
        self.ml_engine = ml_engine or get_ml_engine()
        self.alert_service = alert_service or get_alert_service()
        
        self.simulator = LiveSimulator(
            mode="progressive",
            noise_level=0.35,
            material="generic",
            enable_motor_current=False,
            ramp_seconds=90,
            seed=42,
        )
        self.running: bool = False
        self.tick_delay: float = 0.25
        self._task: Optional[asyncio.Task] = None
        self._subscribers: List[Callable[[Dict[str, Any]], None]] = []
        self.last_telemetry: Optional[Dict[str, Any]] = None

    def configure(self, mode: str = "progressive", material: str = "generic",
                  enable_motor_current: bool = False, ramp_seconds: int = 90,
                  noise_level: float = 0.35, tick_delay: float = 0.25,
                  manual_severity: Optional[float] = None,
                  faults: Optional[Dict[str, Optional[str]]] = None):
        self.tick_delay = max(0.05, float(tick_delay))
        self.simulator.mode = mode
        self.simulator.material = material
        self.simulator.enable_motor_current = enable_motor_current
        self.simulator.ramp_seconds = max(10, ramp_seconds)
        self.simulator.noise_level = float(noise_level)
        
        if manual_severity is not None:
            self.simulator.set_manual_severity(manual_severity)
        
        if faults:
            for s, f in faults.items():
                self.simulator.set_sensor_fault(s, f)

    def subscribe(self, callback: Callable[[Dict[str, Any]], None]):
        if callback not in self._subscribers:
            self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable[[Dict[str, Any]], None]):
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    async def _run_loop(self):
        while self.running:
            try:
                # Do not step or broadcast simulation when authoritative mode is hardware
                if get_app_state().mode == "hardware":
                    await asyncio.sleep(0.5)
                    continue

                sample = self.simulator.step()
                telemetry = self.ml_engine.process_raw_sample(sample, stream="simulation")
                
                # Check for new alerts
                new_alerts = self.alert_service.evaluate_telemetry(telemetry)
                telemetry["active_alerts"] = self.alert_service.get_alerts(limit=5)
                
                self.last_telemetry = telemetry

                # Dispatch to all subscribers
                for sub in list(self._subscribers):
                    try:
                        sub(telemetry)
                    except Exception as e:
                        print(f"[SimulationService] Subscriber error: {e}")

                await asyncio.sleep(self.tick_delay)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[SimulationService] Loop error: {e}")
                await asyncio.sleep(1.0)


    def start(self):
        if not self.running:
            self.running = True
            self._task = asyncio.create_task(self._run_loop())
            print("[SimulationService] Live simulation started.")

    def stop(self):
        if self.running:
            self.running = False
            if self._task:
                self._task.cancel()
                self._task = None
            print("[SimulationService] Live simulation stopped.")

    def reset(self):
        self.simulator.reset()
        self.ml_engine.sim_buffer.clear()
        # Step once to refresh state
        sample = self.simulator.step()
        self.last_telemetry = self.ml_engine.process_raw_sample(sample, stream="simulation")
        print("[SimulationService] Live simulation reset.")

    def step_once(self) -> Dict[str, Any]:
        sample = self.simulator.step()
        telemetry = self.ml_engine.process_raw_sample(sample, stream="simulation")
        self.alert_service.evaluate_telemetry(telemetry)
        telemetry["active_alerts"] = self.alert_service.get_alerts(limit=5)
        self.last_telemetry = telemetry
        return telemetry


_simulation_service: Optional[SimulationService] = None


def get_simulation_service() -> SimulationService:
    global _simulation_service
    if _simulation_service is None:
        _simulation_service = SimulationService()
    return _simulation_service
