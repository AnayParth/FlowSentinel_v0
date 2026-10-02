#include <Wire.h>
#include "HX711.h"

// =====================================================
//                  PIN CONFIGURATION
// =====================================================

// ---------- MPU6500 / MPU6050 ----------
#define MPU_ADDR 0x68
#define SDA_PIN  21
#define SCL_PIN  22

// ---------- HX711 ----------
#define HX_DOUT 32
#define HX_SCK  33

// ---------- HC-SR04 ----------
#define TRIG_PIN 25
#define ECHO_PIN 26


// =====================================================
//                  HX711 OBJECT
// =====================================================

HX711 scale;


// =====================================================
//              LOAD CELL CALIBRATION
// =====================================================

float calibrationFactor = -74.0;


// =====================================================
//                  MPU REGISTERS
// =====================================================

#define WHO_AM_I_REG   0x75
#define PWR_MGMT_1     0x6B
#define ACCEL_XOUT_H   0x3B


// =====================================================
//                 MPU WRITE
// =====================================================

void writeMPURegister(byte reg, byte value)
{
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}


// =====================================================
//                 MPU READ
// =====================================================

bool readMPU(float &ax, float &ay, float &az)
{
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(ACCEL_XOUT_H);

  if (Wire.endTransmission(false) != 0)
  {
    return false;
  }

  Wire.requestFrom(MPU_ADDR, 6);

  if (Wire.available() < 6)
  {
    return false;
  }

  int16_t rawX =
      ((int16_t)Wire.read() << 8) | Wire.read();

  int16_t rawY =
      ((int16_t)Wire.read() << 8) | Wire.read();

  int16_t rawZ =
      ((int16_t)Wire.read() << 8) | Wire.read();


  // MPU configured for ±2g
  ax = rawX / 16384.0;
  ay = rawY / 16384.0;
  az = rawZ / 16384.0;

  return true;
}


// =====================================================
//               ULTRASONIC READING
// =====================================================

float readUltrasonicOnce()
{
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(3);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration =
      pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0)
  {
    return -1;
  }

  return duration * 0.0343 / 2.0;
}

float readUltrasonic()
{
  const int samples = 9;

  float values[samples];
  int validCount = 0;

  for (int i = 0; i < samples; i++)
  {
    float value = readUltrasonicOnce();

    if (value > 0)
    {
      values[validCount] = value;
      validCount++;
    }

    delay(20);
  }

  if (validCount == 0)
  {
    return -1;
  }

  // Sort readings
  for (int i = 0; i < validCount - 1; i++)
  {
    for (int j = i + 1; j < validCount; j++)
    {
      if (values[i] > values[j])
      {
        float temp = values[i];
        values[i] = values[j];
        values[j] = temp;
      }
    }
  }

  // Return median
  return values[validCount / 2];
}

// float remapDistance(float distance)
// {
//   float mappedDistance =
//       1.0 +
//       (distance - 0.5) * 7.0 / 4.5;

//   // Prevent values outside the desired range
//   if (mappedDistance < 1.0)
//   {
//     mappedDistance = 1.0;
//   }

//   if (mappedDistance > 8.0)
//   {
//     mappedDistance = 8.0;
//   }

//   return mappedDistance;
// }

float remapDistance(float rawDistance)
{
  const float RAW_EMPTY = 17.0;
  const float RAW_FULL = 2.0;

  const float CHUTE_EMPTY = 8.0;
  const float CHUTE_FULL = 0.5;

  if (rawDistance < 0)
  {
    return -1;
  }

  // Clamp raw sensor readings
  if (rawDistance > RAW_EMPTY)
  {
    rawDistance = RAW_EMPTY;
  }

  if (rawDistance < RAW_FULL)
  {
    rawDistance = RAW_FULL;
  }

  float mappedDistance =
      CHUTE_FULL +
      (
        (rawDistance - RAW_FULL) *
        (CHUTE_EMPTY - CHUTE_FULL)
      ) /
      (RAW_EMPTY - RAW_FULL);

  return mappedDistance;
}

// =====================================================
//                     SETUP
// =====================================================

void setup()
{
  Serial.begin(115200);

  delay(1500);


  // ===================================================
  // HC-SR04
  // ===================================================

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(TRIG_PIN, LOW);


  // ===================================================
  // MPU
  // ===================================================

  Wire.begin(SDA_PIN, SCL_PIN);

  delay(100);


  // Check MPU

  Wire.beginTransmission(MPU_ADDR);

  byte mpuError =
      Wire.endTransmission();


  if (mpuError == 0)
  {
    // Wake MPU

    writeMPURegister(
      PWR_MGMT_1,
      0x00
    );

    delay(100);
  }


  // ===================================================
  // HX711
  // ===================================================

  scale.begin(
    HX_DOUT,
    HX_SCK
  );


  if (scale.wait_ready_timeout(3000))
  {
    scale.set_scale(
      calibrationFactor
    );

    delay(3000);

    scale.tare(20);
  }
}


// =====================================================
//                     MAIN LOOP
// =====================================================

void loop()
{

  // ===================================================
  // READ MPU
  // ===================================================

  float ax = 0;
  float ay = 0;
  float az = 0;


  bool mpuOK =
      readMPU(
        ax,
        ay,
        az
      );


  // ===================================================
  // READ ULTRASONIC
  // ===================================================
  
  float rawDistance =
      readUltrasonic();

  // float distance =
  //     mapUltrasonicToChuteHeight(rawDistance);

  // ===================================================
  // READ HX711
  // ===================================================

  float weightGrams = 0;

  bool hxOK =
      scale.wait_ready_timeout(500);


  if (hxOK)
  {
    weightGrams =
        scale.get_units(10);

    if (
      weightGrams > -2 &&
      weightGrams < 2
    )
    {
      weightGrams = 0;
    }
  }


  // ===================================================
  // CONVERT GRAMS TO KG
  // ===================================================

  float weightKg =
      weightGrams / 1000.0;


  // ===================================================
  // HANDLE SENSOR FAILURES
  // ===================================================

  if (distance < 0)
  {
    distance = 0;
  }

  if (!mpuOK)
  {
    ax = 0;
    ay = 0;
    az = 0;
  }

  if (!hxOK)
  {
    weightKg = 0;
  }


  // ===================================================
  // TIMESTAMP
  // ===================================================

  float timestamp =
      millis() / 1000.0;


  // ===================================================
  // SEND CSV TO PYTHON BACKEND
  // ===================================================
  //
  // Expected format:
  //
  // timestamp,distance_cm,load_kg,ax_g,ay_g,az_g
  //
  // Example:
  //
  // 123.400,97.52,0.000,-0.0210,0.0342,0.9812
  //
  // ===================================================

  Serial.print(
    timestamp,
    3
  );

  Serial.print(",");

  Serial.print(
    distance,
    2
  );

  Serial.print(",");

  Serial.print(
    weightKg,
    4
  );

  Serial.print(",");

  Serial.print(
    ax,
    4
  );

  Serial.print(",");

  Serial.print(
    ay,
    4
  );

  Serial.print(",");

  Serial.println(
    az,
    4
  );


  // ===================================================
  // SAMPLE RATE
  // ===================================================

  delay(300);
}