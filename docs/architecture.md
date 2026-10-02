# ChuteGuard AI — Hardware-Ready Architecture

```text
 Ultrasonic ─┐
 Load cell ──┼──> ESP32 ── USB Serial ──> backend/app/services/hardware_service.py
 Accelerometer┘                               │
                                               ▼
                                      distance/load/accel values
                                               │
                              ┌────────────────┴───────────────┐
                              │                                │
                         Simulation                     Real hardware
                              │                                │
                              └────────────────┬───────────────┘
                                               ▼
                                    RollingWindowBuffer
                                               │
                                               ▼
                                      Feature extraction
                                               │
                              ┌────────────────┴───────────────┐
                              ▼                                ▼
                       Isolation Forest                 Random Forest
                         anomaly score                 state probabilities
                              │                                │
                              └────────────────┬───────────────┘
                                               ▼
                                          Fusion layer
                                               │
                                               ▼
                                  Risk score 0–100 + confidence
                                               │
                                               ▼
                                        React dashboard (via FastAPI + WebSocket)
```

## Hardware protocol

ESP32 sends one line per sample at 115200 baud:

`timestamp,distance_cm,load_kg,ax_g,ay_g,az_g[,motor_current_a]`

The Python gateway parses the line. The ultrasonic reading is converted to material level with:

`level_percent = clip((empty_distance - distance) / (empty_distance - full_distance) * 100, 0, 100)`

The accelerometer is currently converted to total acceleration magnitude:

`vibration_g = sqrt(ax_g^2 + ay_g^2 + az_g^2)`

The current POC retains this representation to remain compatible with the existing synthetic model feature space. A production vibration implementation should calibrate the accelerometer and separate dynamic vibration from the gravity component.

## Load-cell calibration

If the ESP32 uses an HX711, calibrate on the microcontroller and send kilograms to the laptop. The conversion is:

`load_kg = (raw - tare_raw) / counts_per_kg`

The helper `load_from_hx711()` and `calibrate_hx711()` in `backend/app/ml/sensors.py` implement the same calculation if calibration is performed in Python instead.

## ML boundary

The hardware layer must not contain blockage logic. It only converts and transports measurements. This preserves the pipeline:

`Sensors -> ESP32 -> serial -> hardware.py -> rolling window -> features -> anomaly/classifier -> fusion -> UI`

The supplied model files are still synthetic-data models. Real sensor connection is an input-path change, not model validation.
