# FlowSentinel — Hardware & Sensor Guide

## Multi-Sensor Hardware Architecture

FlowSentinel integrates three complementary industrial-grade sensors connected to an **ESP32 microcontroller**:

| Sensor | Parameter Measured | Engineering Unit | Interface | Pin Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **HC-SR04** | Ultrasonic Surface Distance | `cm` (0.5 – 400 cm) | GPIO Digital Pulse | `TRIG = GPIO 25`, `ECHO = GPIO 26` |
| **HX711** | Chute Material Load / Weight | `kg` (calibrated) | 2-Wire Serial | `DOUT = GPIO 32`, `SCK = GPIO 33` |
| **MPU6050** | Tri-Axial Vibration & Accel | `g` (±2g range) | I2C Protocol | `SDA = GPIO 21`, `SCL = GPIO 22` |

---

## Wiring Diagram

```text
                  ┌───────────────────────────────┐
                  │       ESP32 Microcontroller   │
                  │                               │
                  │  3V3 ───► MPU6050 VCC         │
                  │  GND ───► Common Ground       │
                  │  5V  ───► HC-SR04 VCC         │
                  │                               │
                  │  GPIO 21 ◄──► MPU6050 SDA     │
                  │  GPIO 22 ◄──► MPU6050 SCL     │
                  │                               │
                  │  GPIO 25 ────► HC-SR04 TRIG   │
                  │  GPIO 26 ◄──── HC-SR04 ECHO   │
                  │                               │
                  │  GPIO 32 ◄──── HX711 DOUT     │
                  │  GPIO 33 ────► HX711 SCK      │
                  └───────────────────────────────┘
```

---

## Telemetry Protocol

### 1. High-Speed USB Serial (Default)
- **Baud Rate**: `115200`
- **Output Line Format (CSV)**:
  `timestamp,distance_cm,load_kg,ax_g,ay_g,az_g[,motor_current_a]`
- **Example Sample**:
  `124.500,4.20,18.4500,0.0210,-0.0150,0.9850`

### 2. Wireless WiFi HTTP REST (Optional)
- Set `#define ENABLE_WIFI true` in `esp32_FlowSentinel_v2.ino`.
- ESP32 POSTs JSON directly to:
  `POST http://<SERVER_IP>:8000/api/telemetry/esp32/push`
- Payload:
  ```json
  {
    "timestamp": 124.500,
    "distance_cm": 4.20,
    "load_kg": 18.45,
    "ax_g": 0.021,
    "ay_g": -0.015,
    "az_g": 0.985
  }
  ```
