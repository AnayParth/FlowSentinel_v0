/*
 * ==============================================================================
 * FlowSentinel — ESP32 MULTI-SENSOR HARDWARE FIRMWARE (v2.0)
 * ==============================================================================
 * 
 * Hardware Sensors:
 *   1. HC-SR04 Ultrasonic Sensor (Surface Distance to Material)
 *   2. HX711 Load Cell Amplifier (Material Load / Weight)
 *   3. MPU6050 / MPU6500 6-DOF IMU (Chute Vibration & Tri-Axial Acceleration)
 * 
 * Communication Modes:
 *   - Mode A: USB High-Speed Serial (115200 baud) -> Sends standard CSV
 *   - Mode B: WiFi HTTP REST Push -> POSTs JSON to /api/telemetry/esp32/push
 * 
 * Pinout Wiring:
 *   - HC-SR04:   TRIG = GPIO 25, ECHO = GPIO 26
 *   - HX711:     DOUT = GPIO 32, SCK = GPIO 33
 *   - MPU6050:   SDA = GPIO 21,  SCL = GPIO 22, VCC = 3.3V, GND = GND
 * ==============================================================================
 */

#include <Wire.h>
#include "HX711.h"
#include <WiFi.h>
#include <HTTPClient.h>

// ========================== CONFIGURATION ==========================
#define ENABLE_WIFI       false             // Set to true to enable WiFi HTTP POST
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL   = "http://192.168.1.100:8000/api/telemetry/esp32/push";

// ============================ PIN MAPPING ==========================
#define TRIG_PIN 25
#define ECHO_PIN 26
#define HX_DOUT  32
#define HX_SCK   33
#define SDA_PIN  21
#define SCL_PIN  22

// ======================== MPU6050 REGISTERS ========================
#define MPU_ADDR     0x68
#define PWR_MGMT_1   0x6B
#define ACCEL_XOUT_H 0x3B

// ========================== SENSOR OBJECTS =========================
HX711 scale;
float calibrationFactor = -74.0; // Calibrate with known weight

// ============================= SETUP ===============================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[FlowSentinel] Initializing ESP32 Hardware...");

  // 1. HC-SR04 Ultrasonic Setup
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  // 2. MPU6050 I2C Setup
  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100);
  Wire.beginTransmission(MPU_ADDR);
  byte mpuErr = Wire.endTransmission();
  if (mpuErr == 0) {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(PWR_MGMT_1);
    Wire.write(0x00); // Wake up MPU
    Wire.endTransmission();
    Serial.println("[FlowSentinel] MPU6050 Online.");
  } else {
    Serial.println("[FlowSentinel] Warning: MPU6050 not detected on I2C.");
  }

  // 3. HX711 Load Cell Setup
  scale.begin(HX_DOUT, HX_SCK);
  if (scale.wait_ready_timeout(2000)) {
    scale.set_scale(calibrationFactor);
    scale.tare(10);
    Serial.println("[FlowSentinel] HX711 Load Cell Online.");
  } else {
    Serial.println("[FlowSentinel] Warning: HX711 not responding.");
  }

  // 4. WiFi Connection (Optional)
  if (ENABLE_WIFI) {
    Serial.print("[FlowSentinel] Connecting to WiFi: ");
    Serial.println(WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 20) {
      delay(500);
      Serial.print(".");
      retries++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("\n[FlowSentinel] WiFi Connected! IP: ");
      Serial.println(WiFi.localIP());
    } else {
      Serial.println("\n[FlowSentinel] WiFi connection failed. Continuing in Serial-only mode.");
    }
  }

  Serial.println("[FlowSentinel] Telemetry stream active.");
  Serial.println("timestamp,distance_cm,load_kg,ax_g,ay_g,az_g");
}

// ======================== HELPER FUNCTIONS =========================
float readUltrasonicMedian() {
  const int samples = 5;
  float readings[samples];
  int count = 0;

  for (int i = 0; i < samples; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    unsigned long duration = pulseIn(ECHO_PIN, HIGH, 25000);
    if (duration > 0) {
      float distance = (duration * 0.0343) / 2.0;
      if (distance >= 0.5 && distance <= 400.0) {
        readings[count++] = distance;
      }
    }
    delay(15);
  }

  if (count == 0) return 0.0; // Fault indicator

  // Bubble sort
  for (int i = 0; i < count - 1; i++) {
    for (int j = i + 1; j < count; j++) {
      if (readings[i] > readings[j]) {
        float temp = readings[i];
        readings[i] = readings[j];
        readings[j] = temp;
      }
    }
  }
  return readings[count / 2];
}

bool readMPU(float &ax, float &ay, float &az) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;

  Wire.requestFrom((uint8_t)MPU_ADDR, (size_t)6);
  if (Wire.available() < 6) return false;

  int16_t rawX = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawY = ((int16_t)Wire.read() << 8) | Wire.read();
  int16_t rawZ = ((int16_t)Wire.read() << 8) | Wire.read();

  // Configured for ±2g sensitivity (16384 LSB/g)
  ax = rawX / 16384.0;
  ay = rawY / 16384.0;
  az = rawZ / 16384.0;
  return true;
}

// ============================ MAIN LOOP ============================
void loop() {
  float timestamp = millis() / 1000.0;

  // 1. Read Ultrasonic
  float distance_cm = readUltrasonicMedian();

  // 2. Read MPU6050 Accel
  float ax = 0.0, ay = 0.0, az = 1.0;
  bool mpuOK = readMPU(ax, ay, az);
  if (!mpuOK) { ax = 0.0; ay = 0.0; az = 0.0; }

  // 3. Read HX711 Load
  float load_kg = 0.0;
  if (scale.wait_ready_timeout(100)) {
    float rawGrams = scale.get_units(3);
    if (abs(rawGrams) < 2.0) rawGrams = 0.0;
    load_kg = rawGrams / 1000.0; // Grams to kg
    if (load_kg < 0.0) load_kg = 0.0;
  }

  // 4. Output CSV via USB Serial (Format: timestamp,distance_cm,load_kg,ax_g,ay_g,az_g)
  Serial.print(timestamp, 3);
  Serial.print(",");
  Serial.print(distance_cm, 2);
  Serial.print(",");
  Serial.print(load_kg, 4);
  Serial.print(",");
  Serial.print(ax, 4);
  Serial.print(",");
  Serial.print(ay, 4);
  Serial.print(",");
  Serial.println(az, 4);

  // 5. Optional WiFi HTTP POST
  if (ENABLE_WIFI && WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    String json = "{";
    json += "\"timestamp\":" + String(timestamp, 3) + ",";
    json += "\"distance_cm\":" + String(distance_cm, 2) + ",";
    json += "\"load_kg\":" + String(load_kg, 4) + ",";
    json += "\"ax_g\":" + String(ax, 4) + ",";
    json += "\"ay_g\":" + String(ay, 4) + ",";
    json += "\"az_g\":" + String(az, 4);
    json += "}";

    int httpCode = http.POST(json);
    http.end();
  }

  delay(200); // 5 Hz update rate
}
