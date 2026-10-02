"""ESP32 Serial & WiFi Hardware Gateway Service."""
from __future__ import annotations
from typing import Optional, Dict, Any, List, Callable
import time
import json
import asyncio

try:
    import serial
    from serial import SerialException
    import serial.tools.list_ports as list_ports
except ImportError:
    serial = None
    SerialException = Exception
    list_ports = None

from .ml_engine import MLEngine, get_ml_engine
from .alert_service import AlertService, get_alert_service
from .app_state import get_app_state


class HardwareService:
    def __init__(self, ml_engine: Optional[MLEngine] = None, alert_service: Optional[AlertService] = None):
        self.ml_engine = ml_engine or get_ml_engine()
        self.alert_service = alert_service or get_alert_service()
        
        self.port: Optional[str] = None
        self.baudrate: int = 115200
        self.ser: Optional[Any] = None
        self.running: bool = False
        self._task: Optional[asyncio.Task] = None
        
        # Diagnostics & Last Telemetry
        self.valid_count: int = 0
        self.malformed_count: int = 0
        self.last_valid_timestamp: Optional[float] = None
        self.last_error: Optional[str] = None
        self.last_sample_raw: Optional[Dict[str, Any]] = None
        self.last_telemetry: Optional[Dict[str, Any]] = None
        
        self._subscribers: List[Callable[[Dict[str, Any]], None]] = []

    @property
    def is_connected(self) -> bool:
        return self.ser is not None and bool(getattr(self.ser, "is_open", False))

    def list_ports(self) -> List[Dict[str, str]]:
        if list_ports is None:
            return []
        try:
            return [{"port": p.device, "description": p.description} for p in list_ports.comports()]
        except Exception:
            return []

    def connect(self, port: str, baudrate: int = 115200, timeout: float = 0.5) -> bool:
        if self.is_connected:
            self.disconnect()

        if serial is None:
            raise RuntimeError("pyserial is not installed.")

        try:
            self.port = port
            self.baudrate = int(baudrate)
            self.ser = serial.Serial(self.port, self.baudrate, timeout=timeout)
            time.sleep(1.5)  # Allow ESP32 reset
            self.ser.reset_input_buffer()
            self.valid_count = 0
            self.malformed_count = 0
            self.last_error = None
            self.start_background_reader()
            # Set authoritative operating mode to hardware
            get_app_state().set_mode("hardware")
            print(f"[HardwareService] Connected to ESP32 on {port} @ {baudrate}")
            return True
        except Exception as e:
            self.last_error = str(e)
            self.disconnect()
            raise RuntimeError(f"Could not open serial port {port}: {e}")


    def disconnect(self):
        self.running = False
        if self._task:
            self._task.cancel()
            self._task = None
        if self.ser is not None:
            try:
                self.ser.close()
            except Exception:
                pass
            finally:
                self.ser = None
        print("[HardwareService] Disconnected from ESP32.")

    def parse_line(self, line: str) -> Dict[str, Any]:
        line = line.strip()
        if not line:
            raise ValueError("Empty serial line")

        if line.startswith("{"):
            obj = json.loads(line)
            return {
                "timestamp": float(obj.get("timestamp", time.time())),
                "distance_cm": float(obj["distance_cm"]),
                "load_kg": float(obj.get("load_kg", obj.get("load", 0.0))),
                "ax_g": float(obj.get("ax_g", obj.get("ax", 0.0))),
                "ay_g": float(obj.get("ay_g", obj.get("ay", 0.0))),
                "az_g": float(obj.get("az_g", obj.get("az", 1.0))),
                "motor_current_a": float(obj["motor_current_a"]) if "motor_current_a" in obj else None,
            }

        parts = [p.strip() for p in line.split(",")]
        if parts and parts[0].lower() in ("timestamp", "time", "t"):
            raise ValueError("CSV header line")

        # Check if first token is a string key (key-value CSV mode)
        try:
            float(parts[0])
            is_kv = False
        except ValueError:
            is_kv = True

        if is_kv:
            kv = {}
            for i in range(0, len(parts) - 1, 2):
                kv[parts[i]] = parts[i + 1]
            dist_val = kv.get("ultrasonic_median_cm", kv.get("distance_cm", "0.0"))
            load_val = kv.get("load_kg", None)
            if load_val is None and "load_g" in kv:
                load_val = float(kv["load_g"]) / 1000.0
            elif load_val is None:
                load_val = kv.get("load", 0.0)

            return {
                "timestamp": float(kv.get("timestamp", time.time())),
                "distance_cm": float(dist_val),
                "load_kg": float(load_val),
                "ax_g": float(kv.get("mpu_ax_g", kv.get("ax_g", 0.0))),
                "ay_g": float(kv.get("mpu_ay_g", kv.get("ay_g", 0.0))),
                "az_g": float(kv.get("mpu_az_g", kv.get("az_g", 1.0))),
                "motor_current_a": float(kv["motor_current_a"]) if "motor_current_a" in kv else None,
            }

        if len(parts) < 6:
            raise ValueError(f"Expected at least 6 fields (timestamp,distance,load,ax,ay,az), got {len(parts)}")

        return {
            "timestamp": float(parts[0]),
            "distance_cm": float(parts[1]),
            "load_kg": float(parts[2]),
            "ax_g": float(parts[3]),
            "ay_g": float(parts[4]),
            "az_g": float(parts[5]),
            "motor_current_a": float(parts[6]) if len(parts) >= 7 and parts[6] else None,
        }


    async def _reader_loop(self):
        while self.running and self.is_connected:
            try:
                raw_bytes = await asyncio.to_thread(self.ser.readline)
                if not raw_bytes:
                    await asyncio.sleep(0.05)
                    continue

                line = raw_bytes.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                try:
                    sample = self.parse_line(line)
                    vibration = float((sample["ax_g"]**2 + sample["ay_g"]**2 + sample["az_g"]**2)**0.5)
                    sample["vibration_g"] = vibration

                    telemetry = self.ml_engine.process_raw_sample(sample, stream="hardware")
                    self.alert_service.evaluate_telemetry(telemetry)
                    telemetry["active_alerts"] = self.alert_service.get_alerts(limit=5)
                    
                    self.valid_count += 1
                    self.last_valid_timestamp = time.time()
                    self.last_sample_raw = sample
                    self.last_telemetry = telemetry
                    self.last_error = None

                    for sub in list(self._subscribers):
                        try:
                            sub(telemetry)
                        except Exception as e:
                            print(f"[HardwareService] Subscriber error: {e}")

                except (ValueError, json.JSONDecodeError) as err:
                    self.malformed_count += 1
                    self.last_error = str(err)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                self.last_error = str(exc)
                await asyncio.sleep(0.5)

    def start_background_reader(self):
        if not self.running and self.is_connected:
            self.running = True
            self._task = asyncio.create_task(self._reader_loop())

    def ingest_wifi_sample(self, sample_data: Dict[str, Any]) -> Dict[str, Any]:
        """Direct push from WiFi ESP32 via REST or WebSocket."""
        vibration = float((sample_data.get("ax_g", 0.0)**2 + sample_data.get("ay_g", 0.0)**2 + sample_data.get("az_g", 1.0)**2)**0.5)
        sample_data["vibration_g"] = vibration
        
        telemetry = self.ml_engine.process_raw_sample(sample_data, stream="hardware")
        self.alert_service.evaluate_telemetry(telemetry)
        telemetry["active_alerts"] = self.alert_service.get_alerts(limit=5)
        
        self.valid_count += 1
        self.last_valid_timestamp = time.time()
        self.last_sample_raw = sample_data
        self.last_telemetry = telemetry
        get_app_state().set_mode("hardware")

        
        for sub in list(self._subscribers):
            try:
                sub(telemetry)
            except Exception as e:
                print(f"[HardwareService] Subscriber error: {e}")
                
        return telemetry

    def subscribe(self, callback: Callable[[Dict[str, Any]], None]):
        if callback not in self._subscribers:
            self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable[[Dict[str, Any]], None]):
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    def get_diagnostics(self) -> Dict[str, Any]:
        last_sec = (round(time.time() - self.last_valid_timestamp, 1)
                    if self.last_valid_timestamp else None)
        return {
            "connected": self.is_connected,
            "port": self.port,
            "baudrate": self.baudrate,
            "valid_samples": self.valid_count,
            "malformed_samples": self.malformed_count,
            "seconds_since_last_valid": last_sec,
            "last_error": self.last_error,
        }


_hardware_service: Optional[HardwareService] = None


def get_hardware_service() -> HardwareService:
    global _hardware_service
    if _hardware_service is None:
        _hardware_service = HardwareService()
    return _hardware_service
