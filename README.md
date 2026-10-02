# 🛡️ FlowSentinel
### Predictive Multi-Sensor Chute Blockage Monitoring
*From Detecting Blockage to Predicting Blockage*

> **THIS IS A SOFTWARE-ONLY DEMONSTRATION POC.**
> **NO PHYSICAL SENSORS ARE CONNECTED.** All sensor values are either user-entered
> (Manual / What-If mode) or synthetically simulated (Live Simulation mode).
> The models have **not** been validated on real industrial plant data.

---

## 1. The problem

A **material chute** is a guided/enclosed passage used to transfer bulk material
(iron ore, iron ore fines, pellets, coal/coke, limestone, sinter, etc.) between
process points — e.g. hopper → chute → conveyor/bin.

A **blockage** occurs when material accumulates inside or around the chute until
normal flow becomes restricted or stops. Critically, a chute rarely goes from
fully healthy to fully blocked instantly — it typically progresses:

```
NORMAL FLOW → SMALL BUILDUP → PARTIAL RESTRICTION → UNSTABLE FLOW
            → SEVERE ACCUMULATION → COMPLETE BLOCKAGE
```

Consequences include upstream accumulation, downstream starvation, process
stoppage, manual intervention, spillage, and safety risk.

## 2. Industrial context & existing technologies

Chute blockage detection is not a new problem. Existing approaches include:

- Mechanical chute blockage switches
- Plugged-chute detectors
- Level sensors
- Radar / non-contact material monitoring
- CCTV / visual inspection
- Flow monitoring
- Vibration / flow-aid systems
- Manual inspection

These systems are generally good at **detecting or protecting against a
critical condition once it is present or imminent.**

## 3. The gap — our contribution

**FlowSentinel's contribution is the predictive analytics layer**, not a new
sensing modality. The core idea:

> Combine multiple sensor signals over time, using machine learning, to
> identify the *progression toward* a blockage earlier than a single-sensor
> threshold system would — rather than only detecting the blockage once
> it has already happened.

We call this **temporal multi-sensor fusion for early blockage-risk prediction.**

## 4. Sensors simulated

| Sensor | What it represents | Purpose |
|---|---|---|
| Vibration (accelerometer) | Mounted on the chute wall | Detects mechanical/flow-behavior changes as buildup develops |
| Material level (ultrasonic/radar-style) | Distance to material surface, converted to level % | Rising level = accumulating material |
| Load cell | Mass/loading beneath a hopper or receiving section | Accumulation shows up as rising load |
| Motor current (optional) | Feeder/conveyor motor current | Weak, indirect indicator of increased mechanical loading — never trusted alone |

No single sensor is treated as ground truth. Vibration abnormality *alone*
with everything else stable could just be mechanical noise; vibration
abnormality *combined with* rising level and load is much stronger evidence.

## 5. Manual / What-If input mode

Because there is no physical hardware in this hackathon POC, the primary
demonstration mode lets you **manually set** vibration, material level
(via a distance slider), load, motor current, flow rate, and noise level —
exactly as a future sensor gateway would provide them — and immediately see
the calculated blockage risk. Four presets (NORMAL / PARTIAL / DEVELOPING /
CRITICAL) pre-populate realistic combinations of values for quick demoing;
every value remains manually adjustable afterward.

A second **Live Simulation** mode automatically evolves sensor values over
time (progressive / sudden / random / custom severity) to demonstrate the
temporal-prediction story with live-updating graphs.

## 6. Machine learning

Two complementary models are trained on a synthetic dataset, both consuming
the same 20-feature vector extracted from a rolling window of raw sensor
values (RMS, mean, std, variance, peak, peak-to-peak, kurtosis, crest
factor, slope, rolling averages — see `backend/app/ml/features.py`).

### Isolation Forest (unsupervised anomaly detection)
Trained primarily on **NORMAL** data. Asks: *"does this behavior look
unusual compared with the learned healthy baseline?"* It does **not**
inherently know a given anomaly is a blockage — only that it deviates from
normal.

### Random Forest (supervised classification)
Trained on all four labeled states:
```
0 = NORMAL
1 = PARTIAL BLOCKAGE
2 = DEVELOPING BLOCKAGE
3 = CRITICAL / BLOCKED
```
Asks: *"given these features, which state does this resemble?"* Outputs
class probabilities, e.g. `NORMAL 4% / PARTIAL 11% / DEVELOPING 78% / CRITICAL 7%`.

### Why both?
Neither model's raw output is, by itself, a physically meaningful "blockage
risk" — Random Forest gives classification probabilities, Isolation Forest
gives an anomaly score. A **separate, documented fusion layer**
(`backend/app/ml/fusion.py`) combines them, plus a short-term rising-trend signal from
level/load slopes, into the final 0–100% Blockage Risk Score, with
configurable weights:

```
risk = w_classification * weighted_classification_probability
     + w_anomaly         * anomaly_score
     + w_trend           * temporal_trend_contribution
```

The dashboard displays each component's contribution so the number is never
a black box.

## 7. Sensor fusion & fault tolerance

If a sensor is flagged unhealthy (dropout, stuck, spike, or excessive
noise — see `backend/app/ml/sensor_health.py`), the fusion layer **lowers overall
confidence and damps the risk score toward a cautious mid-range** instead of
trusting the faulty reading. A vibration-only anomaly with everything else
normal should not, by itself, produce a confident CRITICAL call — it may
simply be a sensor problem. This is directly exercised in
`tests/test_fusion.py`.

## 8. Explainability

Beyond the headline risk number, the dashboard shows:
- **"Why is the risk high?"** — qualitative HIGH/MEDIUM/LOW contribution
  bands per fusion component (material accumulation trend, anomaly
  behavior, classification confidence).
- **Random Forest feature importance** — clearly labeled as *model* feature
  importance, not a causal explanation of any single reading.
- A **fusion score breakdown** showing exactly how many of the 100 risk
  points came from each component.

## 9. POC status of results

Random Forest accuracy on this synthetic dataset is typically **~80%** (not
99%+, by design — the four states are made to overlap at their boundaries so
the classes are not trivially separable, matching real-world ambiguity).
**Every metrics panel in the app repeats this disclaimer:**

> *This performance is measured on synthetic/controlled POC data and should
> not be interpreted as industrial field accuracy.*

The dashboard's "prediction lead time" (time between crossing the 50%-risk
warning threshold and the 75%-risk critical threshold) is similarly labeled
**"POC simulated prediction lead time"** — it demonstrates the *concept* of
early warning, not a validated real-plant number.

## 10. Project structure

```
FlowSentinel/
├── run.py                   # one-command launcher (backend + built frontend)
├── start.bat                # Windows shortcut for run.py
├── reset_dataset.py         # manual terminal-only reset of data/real_sensor_dataset.csv (keeps header)
├── requirements.txt
├── backend/
│   └── app/
│       ├── main.py          # FastAPI app, serves frontend/dist
│       ├── config.py        # data/model paths, CORS
│       ├── schemas.py
│       ├── ml/              # sensors, simulator, features, anomaly_model,
│       │                    # classifier, fusion, sensor_health, evaluation
│       ├── routes/          # telemetry, simulation, hardware, training,
│       │                    # analytics, alerts, mode, ws
│       └── services/        # ml_engine, simulation, hardware, data, alert, app_state
├── frontend/                # React + TypeScript + Tailwind (Vite)
├── hardware/                # ESP32 firmware + wiring guide
├── data/
│   ├── real_sensor_dataset.csv
│   └── models/              # synthetic fallback models (random_forest, isolation_forest)
├── models/                  # models trained on real recorded data
├── tests/
└── docs/architecture.md
```

## 11. Installation & running

```bash
pip install -r requirements.txt
python run.py            # builds the frontend on first run, opens http://127.0.0.1:8000

# frontend development (hot reload on :5173)
cd frontend && npm install
cd .. && python run.py --dev
```

## 12. Testing

```bash
# with pytest (if installed)
pytest tests/ -v

# or standalone, no pytest required
python tests/test_simulator.py
python tests/test_models.py
python tests/test_fusion.py
```

Tests cover: normal operation → low risk; gradual blockage → progressively
rising risk; sudden blockage → sharp risk increase; a faulty vibration
sensor not automatically forcing a CRITICAL call; a faulty level sensor
reducing confidence rather than being trusted; stability under increased
noise; and functioning correctly across different random seeds.

## 13. Limitations

- All sensor data is synthetic; no real industrial chute or plant data was
  used anywhere in this project.
- The four blockage-material profiles (iron ore, coal, pellets, limestone)
  only rescale simulation parameters — they are **not** industrially
  validated material models.
- Model accuracy, anomaly separation, and prediction-lead-time figures
  reflect performance on controlled synthetic data only.
- The digital-twin chute visualization is illustrative only, not a physical
  simulation of granular material dynamics.

## 14. Future work

```
Synthetic sensors → Real sensors → ESP32 / industrial IoT gateway
                  → Edge AI → PLC / SCADA integration → Industrial deployment
                  → Field validation of accuracy & real prediction lead time
```

## 15. Honesty statement

**What is real:** chute blockage is a real industrial problem; the listed
existing detection technologies are real and deployed; sensor fusion + ML
is a technically plausible approach to earlier risk estimation.

**What is simulated in this POC:** all sensor measurements, material
behavior, blockage progression, and the entire training dataset.

**What is future work:** real sensors, real plant data, edge hardware,
SCADA/PLC integration, and field validation.

This project never claims real sensor readings, real steel-plant data, real
industrial accuracy, a validated prediction lead time, or deployment-ready
industrial AI. The real contribution demonstrated here is the **software
architecture and ML methodology** — genuine feature extraction, genuine
model training/inference, and a documented, non-trivial fusion mechanism —
not a hardcoded `if severity > 70: risk = 90`.


## Real ESP32 hardware mode

The app supports a real ESP32 gateway. The laptop receives one CSV line per sample:

```text
timestamp,distance_cm,load_kg,ax_g,ay_g,az_g[,motor_current_a]
```

Install the serial dependency:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Run:

```powershell
python run.py
```

In the **Hardware Gateway** view, select the ESP32 COM port, set the ultrasonic empty/full reference distances, connect, and read samples. The app converts:

- ultrasonic distance -> material level percentage
- accelerometer Ax/Ay/Az -> total acceleration magnitude (current POC vibration signal)
- ESP32 load_kg -> load feature

The rolling-window feature extractor, Isolation Forest, Random Forest and fusion layer then operate on the same feature space used by simulation.

### Training on real labelled data

Record labelled sessions and train from the **Model Training Studio** view in the web app
(backed by `/api/training/*`). Samples are appended to `data/real_sensor_dataset.csv`
(`timestamp,distance_cm,load_kg,ax_g,ay_g,az_g,state`, optional `motor_current_a`).
State labels are 0 NORMAL, 1 PARTIAL BLOCKAGE, 2 DEVELOPING BLOCKAGE, 3 CRITICAL / BLOCKED.
Trained models are saved to `models/`; if none exist the backend falls back to the
synthetic models in `data/models/`.

To wipe the recorded dataset (terminal only, keeps the header):

```bash
python reset_dataset.py
```

**Do not treat synthetic-model accuracy as field validation.** Collect representative real operating data, label events carefully, retrain, test on held-out periods, and validate prediction lead time before operational use.
