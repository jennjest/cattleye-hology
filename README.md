# CATTLEYE: Early Detection of FMD in Cattle via Edge AI

This repository contains a prototype system for the early detection of **Foot-and-Mouth Disease (FMD / PMK)** in cattle through the integration of **wearable devices** and **computer vision**, processed locally using **Edge AI**. The system fuses three physiological and visual signals into a single risk score per cow, enabling farmers to identify which cattle need immediate inspection in real time.

## 🌟 Overview

Foot-and-Mouth Disease spreads rapidly within a single barn, yet current detection methods still rely on periodic visual observation. This creates a "blind window" between inspections, allowing the virus to spread throughout the herd and causing significant economic losses.

CATTLEYE addresses this gap by transforming three signals into a single actionable status:

- **Body temperature and activity:** Collected through a wearable device.
- **Mouth and feet imagery:** Captured using a camera and analyzed by a CNN model.
- **Fused risk score:** Generated using fuzzy sensor fusion.

All inference and fuzzy logic run locally on a **Raspberry Pi (edge)** rather than in the cloud, allowing the system to operate in barns with limited infrastructure.

## ✨ Features

- **Per-cow temperature and activity monitoring:** A wearable necklace equipped with an MLX90614 infrared temperature sensor and MPU6050 accelerometer/gyroscope sends data every second via MQTT.
- **Automated image classification:** An ESP32-CAM captures the mouth and feet area. A CNN model based on MobileNetV2 and TensorFlow Lite classifies conditions as **Normal** or **FMD**.
- **Unified 0–100 risk score:** Fuzzy Mamdani logic fuses temperature, activity, and visual signals into three statuses: **Normal (<33)**, **Waspada / Warning (33–<60)**, and **Risiko Tinggi / High Risk (≥60)**.
- **Edge processing:** TensorFlow Lite inference and sensor fusion are executed on a Raspberry Pi 3 rather than in the cloud, reducing latency and dependence on internet connectivity.
- **Web dashboard:** Displays barn summaries, individual cow profiles, temperature trends, an interactive barn layout map, and the reasons behind each risk score.
- **Early warning alerts:** High-risk statuses trigger automatic dashboard alerts to help farmers and veterinarians prioritize inspections.

## 🛠️ Technologies & Hardware

### Main Hardware

| Component | Description |
|---|---|
| **Edge Brain** | Raspberry Pi 3 running CNN inference, TensorFlow Lite, fuzzy sensor fusion, and FastAPI |
| **Wearable Device** | ESP32-C3 Super Mini, MLX90614 infrared temperature sensor, MPU6050 motion sensor, AA battery, MT3608 step-up module, and 3D-printed enclosure |
| **Camera** | ESP32-CAM with OV2640 camera sensor, VGA 640 × 480 resolution, for monitoring the feeding and drinking area |
| **Network** | 2.4 GHz Wi-Fi router |
| **Communication** | MQTT for wearable telemetry and HTTP/MJPEG for camera streaming |

### Software & Algorithms

| Category | Technology |
|---|---|
| **Programming Languages** | Python, C/C++ |
| **Machine Learning Model** | MobileNetV2 with TensorFlow Lite, 128 × 128 input |
| **Sensor Fusion** | Fuzzy Mamdani Logic |
| **Fuzzy Inputs** | Temperature, activity, and visual classification |
| **Fuzzy Inference** | AND aggregation and centroid defuzzification |
| **Communication Protocols** | MQTT with JSON payloads at 1 Hz, HTTP/MJPEG |
| **API Framework** | FastAPI |
| **Development Tools** | Arduino IDE, ESP-IDF, Python, TensorFlow |

### Fuzzy Logic Configuration

The fuzzy inference system combines three input variables:

| Input | Linguistic Variables |
|---|---|
| **Temperature** | Normal, Slightly High, Fever |
| **Activity** | Normal, Decreased, Drastically Decreased |
| **Visual Classification** | Low, Medium, High |

The system produces a risk score between 0 and 100.

| Risk Score | Status | Interpretation |
|---|---|---|
| **0–<33** | Normal | No significant warning detected by the current system |
| **33–<60** | Waspada / Warning | Requires closer observation |
| **60–100** | Risiko Tinggi / High Risk | Prioritize inspection by a farmer or veterinarian |

> **Important:** CATTLEYE is a prototype for preliminary risk screening, not a definitive diagnostic tool. A high-risk score indicates that further inspection may be warranted. It does not independently confirm FMD infection.

## 📁 Project Structure

The repository is organized to reflect the processing pipeline from hardware to dashboard.

```text
cattleye-hology/
├── firmware/
│   ├── wearable_esp32c3/          # ESP32-C3: MLX90614 + MPU6050 + MQTT
│   └── camera_esp32cam/           # ESP32-CAM: HTTP/MJPEG stream
├── edge/
│   ├── cnn_inference.py           # TFLite inference using MobileNetV2
│   ├── fuzzy_fusion.py            # Fuzzy Mamdani sensor fusion
│   └── api_server.py              # FastAPI data and video endpoints
├── dashboard/
│   ├── app.py                     # Dashboard backend
│   └── templates/                 # Dashboard UI and cow details
├── models/
│   └── mobilenetv2_fmd.tflite     # Trained TFLite model (128 × 128)
├── hardware/
│   ├── schematic/                 # Wearable and camera schematics
│   └── 3d_enclosure/              # 3D-printable STL/STEP designs
├── docs/
│   └── prototype_report.pdf       # Full project report
└── README.md
```

## 🚀 How to Run

The following instructions describe the intended workflow for the edge prototype. They assume that the hardware is assembled, the firmware is configured, and the required model and software dependencies are available.

### 1. Set Up the Edge Brain (Raspberry Pi 3)

Clone the repository:

```bash
git clone https://github.com/jennjest/cattleye-hology.git
cd cattleye-hology
```

Install the Python dependencies:

```bash
pip install -r edge/requirements.txt
```

The dependency list should include the required packages, such as `tflite-runtime`, `fastapi`, and `uvicorn`, along with any other dependencies used by the implementation.

Start the API server:

```bash
uvicorn edge.api_server:app --host 0.0.0.0 --port 8000
```

The API server is intended to expose the edge processing results and camera stream to the dashboard.

### 2. Run the Wearable Device (ESP32-C3)

1. Open the firmware in `firmware/wearable_esp32c3/` using Arduino IDE or ESP-IDF.
2. Configure the Wi-Fi credentials and MQTT broker address.
3. Connect the MLX90614 and MPU6050 sensors according to the hardware configuration.
4. Flash the firmware to the ESP32-C3.
5. Power on the wearable device and check the serial output for connection status and sensor readings.

The wearable publishes temperature and activity data to the following MQTT topic:

```text
cattleye/cow01/wearable
```

The intended publishing interval is one message per second.

Example JSON payload:

```json
{
  "cow_id": "cow01",
  "temperature": 38.5,
  "activity": 72,
  "timestamp": "2026-10-19T08:00:00Z"
}
```

> **Note:** The JSON fields above are an illustrative example. Adjust the payload to match the actual ESP32 firmware implementation and the edge application's expected schema.

### 3. Run the Camera (ESP32-CAM)

1. Open the firmware in `firmware/camera_esp32cam/`.
2. Configure the Wi-Fi credentials.
3. Flash the firmware to the ESP32-CAM.
4. Place the camera where the relevant mouth and feet areas can be observed.
5. Connect the Raspberry Pi to the same network and verify that the camera stream is reachable.

The ESP32-CAM provides an HTTP/MJPEG video stream for the edge application to process.

The camera URL depends on the IP address and endpoint configured in the firmware.

### 4. Open the Dashboard

After the API server is running, access the application from a device connected to the same network:

```text
http://<Raspberry-Pi-IP>:8000
```

Replace `<Raspberry-Pi-IP>` with the actual IP address of the Raspberry Pi.

The dashboard is intended to display:

- Barn-level summaries.
- Individual cow profiles.
- Temperature and activity trends.
- Visual classification results.
- Fuzzy risk scores from 0 to 100.
- Risk status and the factors contributing to it.
- Camera feed and barn layout visualization.
- Alerts for cattle requiring further inspection.

> **Implementation note:** The dashboard route, API endpoints, MQTT subscription, and camera URL must match the actual application code. A running FastAPI server does not automatically provide every dashboard feature listed above.

## 📊 Validation & Performance Status

The following results represent the reported prototype evaluation.

| Metric | Result |
|---|---|
| Visual classification accuracy on the test set | **90.38%** |
| Cross-validation accuracy | **90.92% ± 2.2%** |
| Core processing pipeline | Reported functional: sensor → MQTT → Raspberry Pi → TFLite → fuzzy fusion → API |
| Technology Readiness Level (TRL) | **TRL 3 progressing toward TRL 4** |

### Validation Notes

- **Visual classification accuracy** refers to the performance of the image classification model on its evaluated test set.
- **Cross-validation results** provide an estimate of model performance across different validation splits.
- **Integrated pipeline testing** should verify the complete flow from wearable telemetry and camera input to risk scoring and dashboard display.
- **TRL 4 validation** requires integrated components to be validated in a laboratory environment.

> **Note:** The reported metrics should be supported by the corresponding evaluation dataset, experiment configuration, and validation results. Model accuracy alone does not establish reliable field performance or confirm that the system can diagnose FMD. Fuzzy thresholds and membership functions are preliminary configurations that require further evaluation with veterinarians and field data.

## 💰 Estimated Prototype Cost

The following figures represent the estimated prototype costs.

| Component | Estimated Cost |
|---|---:|
| Barn infrastructure (edge device, camera, and router) | ± Rp 1,352,000 |
| Wearable device per cow | ± Rp 311,500 |
| **Total prototype cost** | **± Rp 3,018,500** |

The total estimate covers the stated prototype expenses, including consumables, server rental, and field-testing transportation where applicable. Mass production, routine maintenance, and battery replacement costs are not included.

> **Note:** The total cost should be reconciled with the number of wearable units and the final bill of materials used in the prototype.

## 🎯 Expected Impact

### Farmers

Continuous monitoring can help reduce the need for repetitive manual observations and provide earlier indications of cattle that may require attention.

### Veterinarians and Government Agencies

A prioritized list of potentially at-risk cattle can help direct inspections and support disease surveillance activities.

### Agri-Tech Ecosystem

CATTLEYE demonstrates a potential application of Edge AI in resource-constrained livestock environments, particularly for farms with limited connectivity.

### Sustainable Development Goals (SDGs)

The project aligns with the following Sustainable Development Goals:

- **SDG 2: Zero Hunger**, through efforts to support livestock health and food security.
- **SDG 8: Decent Work and Economic Growth**, by exploring technology that can help improve livestock management efficiency.
- **SDG 9: Industry, Innovation and Infrastructure**, through the integration of embedded systems, computer vision, and edge computing.

## 📄 Project Report & Demo

### Full Project Report

The full report is intended to include the project background, root cause analysis, system architecture, finite-state-machine (FSM) and fuzzy logic diagrams, validation results, and development roadmap.

Report path:

```text
docs/prototype_report.pdf
```

### Demo Video

The demonstration video will be added after the integrated prototype testing is completed.

## 🗺️ Development Roadmap

The following activities are intended to guide future development:

- [ ] Complete end-to-end integration testing of the wearable, camera, Raspberry Pi, and dashboard.
- [ ] Verify MQTT connectivity and telemetry reliability under expected operating conditions.
- [ ] Evaluate camera positioning and image quality for mouth and feet observations.
- [ ] Validate the CNN model using appropriately labeled and representative image data.
- [ ] Tune fuzzy membership functions and risk thresholds with veterinary input.
- [ ] Test the prototype in a controlled livestock environment.
- [ ] Evaluate latency, reliability, power consumption, and network recovery.
- [ ] Document the results of laboratory validation before progressing toward field testing.

## ⚠️ Limitations

CATTLEYE is an early-stage prototype and has several limitations:

- The system provides preliminary risk screening rather than a definitive FMD diagnosis.
- CNN performance depends on dataset quality, class balance, image quality, and similarity between training images and real-world conditions.
- Infrared temperature measurements can be affected by sensor positioning, measurement distance, ambient conditions, and the body surface being measured.
- Activity patterns may vary with animal behavior, age, environment, and daily routines.
- Risk scores depend on the selected fuzzy membership functions and inference rules.
- Field reliability, long-term durability, and performance across different farms require further evaluation.

Any suspected FMD case should be assessed through the appropriate veterinary and animal-health procedures.

## 🤝 Contributing

Contributions are welcome. You can help improve CATTLEYE by forking the repository, opening an issue, or submitting a pull request.

Areas of interest include:

- Improving fuzzy membership functions and inference rules.
- Expanding and validating the image dataset.
- Optimizing CNN inference on resource-constrained hardware.
- Improving MQTT reliability and edge processing.
- Enhancing wearable durability and enclosure design.
- Improving dashboard usability and alert interpretation.
- Adding reproducible testing and validation documentation.

When submitting contributions, please describe the problem being addressed, the proposed changes, and any relevant test results.

## 📜 License

A license has not yet been specified for this repository. Please check the repository for licensing information before redistributing or reusing its source code.
