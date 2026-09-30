# CATTLEYE — Dokumentasi Teknis

**Deteksi Dini PMK pada Sapi melalui Integrasi Wearable Device dan Computer Vision Berbasis Edge AI**

Proyek untuk HOLOGY 9.0 — Fakultas Ilmu Komputer, Universitas Brawijaya

**Tim:**
- Akthar Kael (245150300111036)
- Meylisa Putri Veramita (245150207111028)
- Jennifer Jestina (245150301111022)

---

## Daftar Isi

1. [Ringkasan Sistem](#1-ringkasan-sistem)
2. [Arsitektur](#2-arsitektur)
3. [Komponen Hardware](#3-komponen-hardware)
4. [Konfigurasi Jaringan](#4-konfigurasi-jaringan)
5. [Struktur Folder](#5-struktur-folder)
6. [Detail Setiap Modul](#6-detail-setiap-modul)
7. [Cara Setup dari Nol](#7-cara-setup-dari-nol)
8. [Cara Menjalankan](#8-cara-menjalankan)
9. [Endpoint API](#9-endpoint-api)
10. [Logika Sensor Fusion](#10-logika-sensor-fusion)
11. [Status Saat Ini](#11-status-saat-ini)
12. [Known Issues & Todo](#12-known-issues--todo)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Ringkasan Sistem

CATTLEYE adalah sistem IoT untuk **deteksi dini Penyakit Mulut dan Kuku (PMK)** pada sapi. Sistem menggabungkan tiga sumber data:

1. **Data fisiologis** (suhu tubuh) dari sensor MLX90614
2. **Data perilaku** (pergerakan) dari sensor MPU6050
3. **Data visual** (kondisi mulut & kaki) dari kamera

Semua data diproses secara **lokal (edge AI)** di Raspberry Pi, kemudian digabungkan dengan algoritma **sensor fusion** untuk menghasilkan **skor risiko PMK** per ekor sapi.

---

## 2. Arsitektur

```
┌─────────────────────┐
│  ESP32-CAM          │  ── HTTP Stream ──┐
│  (Kamera Kandang)   │                    │
│  192.168.1.127      │                    │
└─────────────────────┘                    │
                                           ▼
                                    ┌─────────────────────┐
                                    │  Raspberry Pi       │
┌─────────────────────┐             │  192.168.1.212      │
│  ESP32 Wearable     │  ── MQTT ──▶│                     │
│  (MLX90614 +        │             │  - Subscriber MQTT  │
│   MPU6050)          │             │  - Proses kamera    │
│                     │             │  - Sensor fusion    │
└─────────────────────┘             │  - FastAPI server   │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │  Dashboard / API    │
                                    │  :8000              │
                                    └─────────────────────┘
```

**Alur data:**
1. ESP32 Wearable membaca suhu + gerakan → publish ke MQTT topic `cattleye/cow01/wearable`
2. ESP32-CAM streaming video via HTTP
3. Raspberry Pi menjalankan `main.py`:
   - Subscribe MQTT untuk terima data wearable
   - Ambil frame dari ESP32-CAM → jalankan model CNN (TFLite)
   - Gabungkan semua data → skor risiko
   - Sajikan via FastAPI di port 8000

---

## 3. Komponen Hardware

### 3.1 Wearable Device

| Komponen | Fungsi |
|---|---|
| **ESP32-C3 Super Mini** | Mikrokontroler utama, WiFi terintegrasi |
| **MLX90614 (GY-906)** | Sensor suhu infrared (non-kontak) |
| **MPU6050** | Accelerometer 3-sumbu + Gyroscope 3-sumbu |
| **Baterai AA 1.5V + Step Up MT3608** | Sumber daya portable |
| **Kasing 3D print** | Pelindung, dipasang di kalung sapi |

**Wiring I2C:**
- SDA → GPIO 8
- SCL → GPIO 9

### 3.2 Stasiun Kamera

| Komponen | Fungsi |
|---|---|
| **ESP32-CAM (AI Thinker)** | Kamera OV2640, streaming MJPEG |
| **Dudukan 3D print** | Menjaga sudut pandang konsisten |

Dipasang di area pakan/minum untuk menangkap muka & kaki sapi.

### 3.3 Edge Computing

| Komponen | Fungsi |
|---|---|
| **Raspberry Pi 3** | Pusat pemrosesan data |
| **MicroSD Card 32GB** | OS, model, dan database |

---

## 4. Konfigurasi Jaringan

### 4.1 WiFi

| Parameter | Nilai |
|---|---|
| SSID | `ROBOTIIK` |
| Password | `81895656` |
| Frekuensi | **2.4 GHz** (ESP32 tidak support 5 GHz) |

### 4.2 IP Address

| Perangkat | IP |
|---|---|
| ESP32-CAM | `192.168.1.127` |
| Raspberry Pi | `192.168.1.212` |
| Laptop/HP (client) | DHCP |

**Semua perangkat harus berada di jaringan WiFi yang sama.**

### 4.3 MQTT

| Parameter | Nilai |
|---|---|
| Broker | `broker.hivemq.com` (publik) |
| Port | `1883` |
| Topic | `cattleye/cow01/wearable` |
| Client ID Wearable | `clientId-phdnwnjnAm` |
| Client ID Pi | `cattleye-pi-001` |

> **Catatan:** Untuk produksi, disarankan ganti ke Mosquitto lokal di Raspberry Pi.

---

## 5. Struktur Folder

### 5.1 Di Laptop (Development)

```
cattleye/
├── arduino/                      # Kode untuk ESP32 (upload via Arduino IDE)
│   ├── esp32cam/
│   │   └── esp32cam.ino
│   └── main/
│       └── main.ino
├── models/
│   ├── fmd_cattle_model.tflite   # Model AI hasil konversi
│   └── labels.json
├── fmd_cattle_model.keras        # Model asli dari training
├── convert_tflite.py             # Script konversi .keras → .tflite
├── main.py                       # Kode utama Raspberry Pi
├── requirements.txt
└── README.md
```

### 5.2 Di Raspberry Pi (Production)

```
cattleye/
├── models/
│   ├── fmd_cattle_model.tflite
│   └── labels.json
├── main.py
├── requirements.txt
└── venv/                         # Virtual environment (dibuat di Pi)
```

> Folder `arduino/` **tidak perlu** di-copy ke Raspberry Pi.
---

## 6. Detail Setiap Modul

### 6.1 ESP32 Wearable (`main.ino`)

**Fungsi:**
- Connect ke WiFi `ROBOTIIK`
- Baca suhu dari MLX90614
- Baca akselerasi + gyro dari MPU6050
- Format JSON, publish ke MQTT topic `cattleye/cow01/wearable`

**Format JSON yang dikirim:**
```json
{
  "temperature": 39.5,
  "ax": 0.12, "ay": -0.05, "az": 9.81,
  "gx": 0.01, "gy": 0.02, "gz": 0.00
}
```

**Frekuensi publish:** setiap 1 detik.

**Library Arduino yang dibutuhkan:**
- `WiFi.h` (built-in)
- `PubSubClient` (install via Library Manager)
- `Wire.h` (built-in)
- `MPU6050_light` (install via Library Manager)
- `Adafruit_MLX90614` (install via Library Manager)
- `Adafruit BusIO` (dependency)

**Rekomendasi stabilitas ESP32-C3:**
Tambahkan ini di `setup()` sebelum `WiFi.begin()`:
```cpp
WiFi.mode(WIFI_STA);
WiFi.setTxPower(WIFI_POWER_8_5dBm);
```
Karena regulator ESP32-C3 Super Mini sering overheat saat TX power max (19.5 dBm).

### 6.2 ESP32-CAM (`esp32cam.ino`)

**Fungsi:**
- Connect ke WiFi `ROBOTIIK`
- Streaming video MJPEG di `http://192.168.1.127/`

**Resolusi:** VGA (640×480), JPEG quality 12.

**Library:** `esp_camera.h`, `WiFi.h` (built-in ESP32 board support).

> **⚠️ Penting:** ESP32-CAM hanya melayani **1 klien** pada satu waktu. Jangan buka di browser laptop dan Pi secara bersamaan.

### 6.3 Model AI (`fmd_cattle_model.tflite`)

**Arsitektur:** MobileNetV2 (transfer learning dari ImageNet) + classifier head.

**Input:** Gambar 128×128 piksel RGB, dinormalisasi ke `[0, 1]`.

**Output:** 2 kelas — `[0: Normal, 1: PMK]` (softmax).

**Training:**
- Dataset: 342 gambar (173 Normal, 169 PMK)
- Split: 70% train, 15% validation, 15% test
- Augmentasi: rotation, shift, zoom, flip
- **Akurasi test:** 90.38%
- **Akurasi 5-fold CV:** 90.92% ± 2.2%

**Konversi ke TFLite:**
```python
import tensorflow as tf
model = tf.keras.models.load_model("fmd_cattle_model.keras", compile=False)
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
with open("models/fmd_cattle_model.tflite", "wb") as f:
    f.write(tflite_model)
```

### 6.4 Raspberry Pi (`main.py`)

**Komponen utama:**

| Bagian | Fungsi |
|---|---|
| `mqtt_thread()` | Subscribe MQTT, terima data wearable |
| `camera_thread()` | Ambil frame dari ESP32-CAM, inferensi CNN |
| `predict_vision()` | Jalankan model TFLite pada 1 frame |
| `sensor_fusion()` | Gabungkan suhu + gerak + visual → skor risiko |
| `FastAPI app` | Serve endpoint `/api/data`, `/api/video_feed` |

**State global** (disimpan di memori):
```python
latest_state = {
    "wearable": { "temperature": ..., "ax": ..., ... },
    "vision":   { "label": ..., "confidence": ... },
    "risk":     { "score": ..., "status": ..., "reasons": [...] }
}
```

**Threading:** MQTT dan kamera jalan di thread terpisah, FastAPI di main thread.

---

## 7. Cara Setup dari Nol

### 7.1 Upload Kode ke ESP32

**ESP32 Wearable:**
1. Buka `arduino/main/main.ino` di Arduino IDE
2. Pilih board: **ESP32C3 Dev Module**
3. Install library yang dibutuhkan (lihat bagian 6.1)
4. Upload
5. Buka Serial Monitor (baud 115200) → pastikan muncul `WiFi connected` dan `Published: {...}`

**ESP32-CAM:**
1. Buka `arduino/esp32cam/esp32cam.ino`
2. Pilih board: **AI Thinker ESP32-CAM**
3. Upload (perlu koneksi GPIO 0 ke GND saat upload)
4. Buka Serial Monitor → pastikan muncul `IP Live Stream: 192.168.1.127`
5. Test di browser: `http://192.168.1.127/`

### 7.2 Setup Raspberry Pi

```bash
# 1. Install python3-venv
sudo apt update
sudo apt install python3-venv python3-full -y

# 2. Buat virtual environment
cd ~/cattleye
python3 -m venv venv

# 3. Aktifkan venv
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt
```

**Jika `tflite-runtime` gagal install** (karena Python 3.13 di Raspberry Pi OS terbaru), gunakan `tensorflow` penuh sebagai gantinya. Di `main.py` sudah ada fallback:

```python
try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow.lite as tflite
```

**Jika storage penuh**, arahkan TMPDIR ke home:
```bash
mkdir -p ~/tmp
export TMPDIR=~/tmp
echo 'export TMPDIR=~/tmp' >> ~/.bashrc
```

### 7.3 Setup Model

Di laptop (butuh TensorFlow):
```bash
python convert_tflite.py
```

Copy folder `models/` ke Raspberry Pi.

---

## 8. Cara Menjalankan

### 8.1 Di Raspberry Pi

```bash
cd ~/cattleye
source venv/bin/activate
python main.py
```

**Output yang diharapkan:**
```
MQTT connected, rc = 0
Connect ke ESP32-CAM...
Stream ESP32-CAM terbuka!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 8.2 Akses dari HP/Laptop

| URL | Fungsi |
|---|---|
| `http://192.168.1.212:8000/docs` | Swagger UI |
| `http://192.168.1.212:8000/api/data` | Data JSON realtime |
| `http://192.168.1.212:8000/api/video_feed` | Live stream kamera |

> **⚠️ Untuk video:** Buka di **tab browser baru**, bukan di Swagger UI. Swagger UI tidak bisa menampilkan stream MJPEG.

---

## 9. Endpoint API

### GET `/api/data`

Mengembalikan seluruh state terkini:

```json
{
  "wearable": {
    "temperature": 39.8,
    "ax": 0.12, "ay": -0.05, "az": 9.81,
    "gx": 0.01, "gy": 0.02, "gz": 0.00,
    "timestamp": 1790756000
  },
  "vision": {
    "label": "Normal",
    "confidence": 0.95,
    "timestamp": 1790756000
  },
  "risk": {
    "score": 12.0,
    "status": "Normal",
    "reasons": [],
    "timestamp": 1790756000
  }
}
```

### GET `/api/video_feed`

Streaming MJPEG (multipart/x-mixed-replace). Kompatibel dengan tag `<img>` HTML.

### GET `/docs`

Swagger UI untuk testing endpoint.

---

## 10. Logika Sensor Fusion

**Algoritma sederhana (berbasis threshold):**

```python
score = 0

# Suhu
if temperature >= 39.5:     score += 40  # demam
elif temperature >= 39.0:   score += 20  # subfebris

# Aktivitas (magnitudo akselerasi)
activity = sqrt(ax² + ay² + az²)
if activity < 0.5:          score += 20  # lesu

# Visual
if label == "PMK":          score += 40 * confidence
elif label == "Normal":     score -= 10 * confidence

# Klasifikasi
if score < 40:    status = "Normal"
elif score < 70:  status = "Waspada"
else:             status = "Berisiko Tinggi"
```

**Ambang batas dapat disesuaikan** sesuai hasil uji lapangan.
---

## 11. Status Saat Ini

### ✅ Sudah Selesai

- [x] Proposal CATTLEYE (HOLOGY 9.0)
- [x] Desain 3D casing wearable & ESP32-CAM
- [x] Desain PCB wearable
- [x] Firmware ESP32 Wearable (publish MQTT)
- [x] Firmware ESP32-CAM (streaming MJPEG)
- [x] Training model CNN (akurasi 90.38%)
- [x] Konversi model ke TFLite
- [x] Setup Raspberry Pi (venv, dependencies)
- [x] Kode `main.py` dasar (MQTT + kamera + FastAPI)
- [x] Server FastAPI berjalan di port 8000
- [x] MQTT broker terhubung (`MQTT connected, rc = 0`)
- [x] Endpoint `/api/data` dan `/api/video_feed` aktif

### ⚠️ Sedang Dikerjakan

- [ ] **Integrasi kamera ESP32-CAM ke Raspberry Pi** — `cv2.VideoCapture` sering timeout, perlu diganti ke `requests` + parsing MJPEG manual
- [ ] **Stabilisasi ESP32 Wearable** — data belum masuk ke Pi (indikasi: publish MQTT belum terdeteksi atau crash karena TX power)
- [ ] **Verifikasi model TFLite** di Raspberry Pi (load dan inferensi pertama)

### ❌ Belum Dikerjakan

- [ ] Dashboard web untuk peternak
- [ ] Sistem notifikasi otomatis (WhatsApp/Telegram)
- [ ] Uji lapangan pada sapi sungguhan
- [ ] Tuning threshold sensor fusion
- [ ] Optimasi konsumsi daya wearable
- [ ] Integrasi multi-sapi (cow01, cow02, dst.)

---

## 12. Known Issues & Todo

### Issue #1: ESP32-CAM Stream Timeout

**Gejala:**
```
[mjpeg] Stream timeout triggered after 30047 ms
Gagal baca frame, coba lagi... (loop)
```

**Penyebab:** `cv2.VideoCapture()` tidak stabil untuk MJPEG dari ESP32-CAM.

**Solusi:** Ganti `camera_thread()` ke versi berbasis `requests` + parsing JPEG manual:

```python
def camera_thread():
    global latest_frame, latest_state
    while True:
        try:
            stream = requests.get(ESP32CAM_URL, stream=True, timeout=10)
            bytes_data = b''
            frame_count = 0
            for chunk in stream.iter_content(chunk_size=4096):
                bytes_data += chunk
                a = bytes_data.find(b'\xff\xd8')
                b = bytes_data.find(b'\xff\xd9')
                if a != -1 and b != -1:
                    jpg = bytes_data[a:b+2]
                    bytes_data = bytes_data[b+2:]
                    frame = cv2.imdecode(
                        np.frombuffer(jpg, dtype=np.uint8),
                        cv2.IMREAD_COLOR
                    )
                    if frame is None:
                        continue
                    frame_count += 1
                    if frame_count % INFERENCE_EVERY_N_FRAMES == 0:
                        label, conf, _ = predict_vision(frame)
                        with state_lock:
                            latest_state["vision"] = {
                                "label": label,
                                "confidence": conf,
                                "timestamp": time.time()
                            }
                            latest_state["risk"] = sensor_fusion(
                                latest_state["wearable"],
                                latest_state["vision"]
                            )
                    with frame_lock:
                        latest_frame = frame.copy()
        except Exception as e:
            print("Stream error:", e)
            time.sleep(3)
```

### Issue #2: Data Wearable Null di `/api/data`

**Gejala:** `temperature: null` terus-menerus.

**Kemungkinan penyebab:**
1. ESP32 Wearable belum connect WiFi
2. ESP32 Wearable belum connect MQTT broker
3. ESP32 Wearable crash karena brownout (TX power terlalu tinggi)
4. Topic MQTT di ESP32 dan Pi tidak sama

**Langkah debug:**
- Buka Serial Monitor ESP32 Wearable → lihat apakah ada `Published: {...}`
- Cek topic di kedua sisi: `cattleye/cow01/wearable`
- Tambah TX power fix (lihat 6.1)
- Tes manual publish via app MQTT di HP

### Issue #3: Swagger UI Loading Terus di `/api/video_feed`

**Bukan bug.** Swagger UI tidak didesain untuk menampilkan MJPEG stream. Buka URL di tab browser terpisah.

### Issue #4: `tflite-runtime` Tidak Bisa Install

**Gejala:** `ERROR: No matching distribution found for tflite-runtime`

**Penyebab:** Python 3.13 (Raspberry Pi OS Trixie) belum didukung `tflite-runtime`.

**Solusi:** Fallback ke `tensorflow.lite` (sudah ada di `main.py`).

### Issue #5: Storage Penuh saat Install TensorFlow

**Solusi:**
```bash
pip cache purge
sudo apt clean
sudo apt autoremove -y
mkdir -p ~/tmp
export TMPDIR=~/tmp
```

### Todo List untuk Teman Kolaborator

**Prioritas Tinggi:**
1. Ganti `camera_thread()` ke versi `requests` (Issue #1)
2. Verifikasi TX power ESP32-C3 (Issue #2)
3. Test end-to-end: wearable + kamera + Pi semua jalan bersamaan
4. Verifikasi skor risiko muncul di `/api/data`

**Prioritas Menengah:**
5. Buat dashboard web (HTML + JS) yang menarik data dari `/api/data`
6. Tambah endpoint `/api/history` untuk data historis
7. Simpan data ke SQLite untuk analisis tren

**Prioritas Rendah:**
8. Multi-cow support (topic `cattleye/cow02/...`)
9. Notifikasi WhatsApp/Telegram saat status "Berisiko Tinggi"
10. Optimasi power wearable (deep sleep di antara publish)

---

## 13. Troubleshooting

### Raspberry Pi

| Masalah | Solusi |
|---|---|
| `command not found: pip` | `sudo apt install python3-pip`, atau aktifkan venv |
| `externally-managed-environment` | Buat venv: `python3 -m venv venv && source venv/bin/activate` |
| Storage penuh saat install | `pip cache purge`, set `TMPDIR=~/tmp` |
| `tflite_runtime` tidak ada | Normal — fallback ke `tensorflow.lite` |
| MQTT tidak connect | Cek internet, `ping broker.hivemq.com` |
| `python main.py` tanpa output | Cek isi file, pastikan ada `if __name__ == "__main__":` |
| Port 8000 sudah dipakai | `sudo lsof -i :8000` lalu kill prosesnya |

### ESP32 Wearable

| Masalah | Solusi |
|---|---|
| WiFi tidak connect | Cek SSID/password, pastikan 2.4 GHz |
| MQTT fail `rc=2` | Cek client ID unik, cek broker |
| ESP32 restart sendiri | Turunkan TX power ke 8.5 dBm |
| Sensor tidak terbaca | Cek wiring I2C (SDA=8, SCL=9) |
| Panas berlebih | Kurangi TX power, cek power supply |

### ESP32-CAM

| Masalah | Solusi |
|---|---|
| Tidak muncul di Serial Monitor | Pilih board AI Thinker ESP32-CAM |
| Kamera gagal init `0x...` | Cek kabel FPC kamera, tekan ulang |
| Stream timeout | Cek power supply 5V 2A, jangan USB laptop |
| Hanya 1 klien | Tutup tab lain sebelum buka di Pi |
| Blank di `/api/video_feed` | Ganti `camera_thread` ke `requests` |

### Jaringan

| Masalah | Solusi |
|---|---|
| Pi tidak bisa ping ESP32 | Cek satu jaringan WiFi, cek IP benar |
| `curl: connection refused` | ESP32 belum siap, tunggu 10 detik |
| Beda subnet | Set static IP atau DHCP reservation |

---

## Referensi

- **Proposal:** `HOLOGY 9.0_Proposal_CATTLEYE.pdf`
- **Model training:** `hology-cattle-and-foot-disease-in-cow.ipynb` (Kaggle)
- **Referensi kunci:**
  - Chanchaidechachai et al. (2022) — Analisis epidemiologi & ekonomi PMK
  - Lee & Seo (2021) — Wearable biosensor untuk monitoring sapi
  - Myint et al. (2024) — Deteksi lameness sapi real-time
  - Jouini et al. (2024) — Machine learning di edge computing
  - Zhao et al. (2026) — Multimodal animal health monitoring

---

## Kontak

Jika ada pertanyaan terkait proyek ini:
- **Ketua Tim:** Akthar Kael — 081908962645
- **Pengembang Raspberry Pi:** Jennifer Jestina

---

*Dokumen terakhir diperbarui: 30 September 2026*
