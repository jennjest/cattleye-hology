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
| **F
