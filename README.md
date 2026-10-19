```markdown
# CATTLEYE — Early Detection of FMD in Cattle via Edge AI

This repository contains a prototype system for the early detection of **Foot-and-Mouth Disease (FMD / PMK)** in cattle through the integration of **wearable devices** and **computer vision**, processed locally using **Edge AI**. The system fuses three physiological and visual signals into a single risk score per cow, enabling farmers to identify which cattle need immediate inspection in real-time.

## 🌟 Overview
Foot-and-Mouth Disease spreads rapidly within a single barn, yet current detection methods still rely on periodic visual observation. This creates a "blind window" between inspections, allowing the virus to spread to the entire herd and causing significant economic losses.

CATTLEYE addresses this gap by transforming three signals—**body temperature & activity (wearable)**, **mouth/feet imagery (camera)**, and **fused risk score (fuzzy sensor fusion)**—into a single actionable status. All inference and fuzzy logic run locally on a **Raspberry Pi (edge)**, not in the cloud, ensuring the system operates effectively in barns with limited infrastructure.

## ✨ Features
- **Per-cow temperature & activity monitoring** — A wearable necklace with an MLX90614 infrared sensor and MPU6050 accelerometer/gyroscope sends data every second via MQTT.
- **Automated image classification** — An ESP32-CAM captures the mouth and feet area; a CNN model (MobileNetV2, TFLite) classifies conditions as **Normal vs FMD**.
- **Unified 0–100 risk score** — Fuzzy Mamdani logic fuses three inputs (temperature, activity, visual) into three statuses: **Normal (<33)**, **Waspada / Warning (33–60)**, and **Risiko Tinggi / High Risk (≥60)**.
- **Edge processing** — TFLite inference and sensor fusion are executed on a Raspberry Pi 3, not the cloud, to minimize latency and reduce connectivity dependency.
- **Web dashboard** — Displays barn summaries, per-cow profiles, temperature trends, an interactive barn layout map, and the specific reasons behind each risk score.
- **Early warning alerts** — High-risk statuses trigger automatic alerts on the dashboard to accelerate inspection by farmers or veterinarians.

## 🛠️ Technologies & Hardware
**Main Hardware**
- **Edge Brain**: Raspberry Pi 3 (running CNN/TFLite + sensor fusion + FastAPI)
- **Wearable**: ESP32-C3 Super Mini, MLX90614 (infrared temperature), MPU6050 (motion), AA battery + MT3608 step-up module, 3D-printed enclosure
- **Camera**: ESP32-CAM (OV2640, VGA 640×480) for streaming the feeding/drinking area
- **Network**: 2.4 GHz Wi-Fi router; MQTT communication (wearable) and HTTP/MJPEG (camera)

**Software & Algorithms**
- **Languages**: Python (edge & dashboard), C/C++ (ESP32 firmware)
- **Model**: TensorFlow Lite — MobileNetV2 (128×128 input) for visual classification
- **Fuzzy Logic**: Fuzzy Mamdani — inputs: temperature (Normal / Slightly High / Fever), activity (Normal / Decreased / Drastically Decreased), visual (Low / Medium / High); method: AND–aggregation–centroid
- **Protocols**: MQTT (JSON, 1 Hz), HTTP/MJPEG, FastAPI (`/api/data`, `/api/video_feed`)
- **Tools**: Arduino IDE / ESP-IDF, Python, FastAPI, TensorFlow

## 📁 Project Structure
The repository is structured to reflect the pipeline from hardware to dashboard:

```text
cattleye-hology/
├── firmware/
│   ├── wearable_esp32c3/          # ESP32-C3 code: MLX90614 + MPU6050 + MQTT
│   └── camera_esp32cam/           # ESP32-CAM code: HTTP/MJPEG stream
├── edge/
│   ├── cnn_inference.py           # TFLite Inference (MobileNetV2)
│   ├── fuzzy_fusion.py            # Fuzzy Mamdani Logic
│   └── api_server.py              # FastAPI: data & video endpoints
├── dashboard/
│   ├── app.py                     # Dashboard backend
│   └── templates/                 # Dashboard UI (barn summary, per-cow details)
├── models/
│   └── mobilenetv2_fmd.tflite     # Trained TFLite model (128×128)
├── hardware/
│   ├── schematic/                 # Wearable & camera circuit schematics
│   └── 3d_enclosure/              # 3D printable enclosure designs (STL/STEP)
├── docs/
│   └── prototype_report.pdf       # Full project report (PDF)
└── README.md
```

## 🚀 How to Run (Edge Prototype)
> Note: The current prototype is at **TRL 3 (Proof of Concept)** progressing towards **TRL 4 (Integrated component validation in a lab)**. The steps below assume all hardware components are available and assembled.

### 1. Setup the Edge Brain (Raspberry Pi 3)
```bash
# Clone the repository
git clone https://github.com/jennjest/cattleye-hology.git
cd cattleye-hology

# Install Python dependencies
pip install -r edge/requirements.txt   # tflite-runtime, fastapi, uvicorn, etc.

# Start the API server
uvicorn edge.api_server:app --host 0.0.0.0 --port 8000
```

### 2. Run the Wearable (ESP32-C3)
- Flash `firmware/wearable_esp32c3/` using Arduino IDE or ESP-IDF.
- Ensure Wi-Fi credentials and MQTT broker address are configured.
- Power on the wearable; temperature and activity data will be sent to the topic `cattleye/cow01/wearable` every second.

### 3. Run the Camera (ESP32-CAM)
- Flash `firmware/camera_esp32cam/`.
- Point the camera at the cattle feeding/drinking area.
- The MJPEG stream will be available and processed by the edge.

### 4. Open the Dashboard
- Access `http://<Raspberry-Pi-IP>:8000` or open the provided dashboard interface.
- The dashboard displays barn summaries, per-cow lists, 0–100 risk scores, and the reasons behind each status.

## 📊 Validation & Performance Status
| Metric | Result |
|--------|--------|
| Visual classification accuracy (test set) | **90.38%** |
| Cross-validation | **90.92% ± 2.2%** |
| Core pipeline | Functional (sensor → MQTT → Pi → TFLite → Fuzzy → API) |
| TRL Status | **TRL 3 → 4** (one more integration test before lab validation) |

> **Note**: Fuzzy thresholds and membership functions are initial configurations and will be refined using field test data in collaboration with veterinarians.

## 💰 Estimated Prototype Cost
| Component | Estimated Cost |
|-----------|----------------|
| Barn infrastructure (edge + camera + router) | ± Rp 1,352,000 |
| Wearable per cow | ± Rp 311,500 |
| **Total prototype cost** | **± Rp 3,018,500** |

> This cost covers consumables, server rental, field testing transportation, etc. Mass production, maintenance, and battery replacement costs are not included.

## 🎯 Expected Impact
- **Farmers**: Continuous monitoring without repetitive manual observation; earlier indications for follow-up.
- **Veterinarians & Government Agencies**: A list of at-risk cattle helps prioritize inspections.
- **Agri-tech Ecosystem**: A practical example of Edge AI deployment on resource-constrained devices for smallholder farming.
- **SDGs**: Aligned with Zero Hunger (2), Decent Work and Economic Growth (8), and Industry, Innovation, and Infrastructure (9).

## 📄 Project Report & Demo
- **Full Report (PDF)**: Contains background, root cause analysis, architecture, FSM/fuzzy diagrams, and development roadmap — available in `docs/prototype_report.pdf` (or external link if not uploaded).
- **Demo Video**: To be updated after the TRL 4 integration test is completed.

## 🤝 Contributing
Feel free to fork this repository, open issues, or submit pull requests if you have suggestions for improvements or bug fixes—especially related to fuzzy tuning, dataset expansion, or hardware enclosure durability.
```
