"""
CATTLEYE - backend edge (Raspberry Pi)

Alur: wearable (MQTT) + kamera (ESP32-CAM) -> sensor fusion FUZZY -> API FastAPI

Input fuzzy:
  suhu      (°C, dikoreksi TEMP_OFFSET)          range 30-45
  aktivitas (skor 0-100, relatif terhadap baseline sapi)
  visual    (probabilitas PMK dari CNN, 0-1)
Output: skor risiko 0-100 -> Normal / Waspada / Berisiko Tinggi
"""
import json
import time
import threading
import collections
import requests
import cv2
import numpy as np
import paho.mqtt.client as mqtt
from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse
import uvicorn

# ======================
# KONFIGURASI
# ======================
MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "cattleye/cow01/wearable"
MQTT_CLIENT_ID = "cattleye-pi-001"

ESP32CAM_URL = "http://192.168.1.127/"   # sesuaikan (biasanya endpoint stream: http://IP:81/stream)
MODEL_PATH = "models/fmd_cattle_model.tflite"
# Ukuran input model dibaca otomatis dari file .tflite (lihat bagian LOAD TFLITE)

CLASSES = ["Normal", "PMK"]
LABEL_NAMES = {0: "Normal", 1: "PMK"}
PMK_INDEX = CLASSES.index("PMK")

INFERENCE_EVERY_N_FRAMES = 5

# --- Suhu ---
# MLX90614 di kalung membaca suhu PERMUKAAN, bukan suhu tubuh inti.
# Isi offset hasil kalibrasi (suhu inti - suhu permukaan). Nilai 0.0 = belum dikalibrasi.
TEMP_OFFSET = 0.0

# --- IMU ---
ACCEL_TO_G = 1.0 / 9.80665       # firmware mengirim m/s² (az ~ 9.81 saat diam). Isi 1.0 jika sudah g
ACTIVITY_WINDOW_SEC = 30         # firmware publish 1 Hz -> window 30 dtk = ~30 sampel
ACTIVITY_MIN_SAMPLES = 10        # minimal sampel dalam window
ACTIVITY_SCORE_NORMAL = 70.0     # skor aktivitas ketika r = 1 (sama dengan baseline)

ACTIVITY_BASELINE_DEFAULT = 0.05   # std magnitudo (g) awal -> WAJIB dikalibrasi dari rekaman sensor asli
BASELINE_WARMUP_WINDOWS = 10       # 10 window x 30 dtk = 5 menit (untuk demo)
BASELINE_ALPHA = 0.002             # kecepatan baseline mengikuti kebiasaan sapi (EMA)
BASELINE_UPDATE_MIN_RATIO = 0.6    # window yang sangat lesu TIDAK dipakai memperbarui baseline
MIN_BASELINE = 1e-3

# --- Data basi ---
WEARABLE_STALE_SEC = 30
VISION_STALE_SEC = 30
FUSION_INTERVAL_SEC = 1.0

# --- Label dari skor risiko ---
THRESH_WASPADA = 33
THRESH_TINGGI = 60

# ======================
# STATE GLOBAL
# ======================
state_lock = threading.Lock()
latest_state = {
    "wearable": {
        "temperature": None,
        "ax": None, "ay": None, "az": None,
        "gx": None, "gy": None, "gz": None,
        "timestamp": None
    },
    "activity": {
        "std_g": None, "ratio": None, "score": None,
        "baseline": ACTIVITY_BASELINE_DEFAULT,
        "baseline_ready": False, "samples": 0
    },
    "vision": {
        "label": "Unknown",
        "confidence": 0.0,
        "p_pmk": None,
        "timestamp": None
    },
    "risk": {
        "score": 0,
        "status": "Tidak Ada Data",
        "reasons": [],
        "timestamp": None
    }
}

frame_lock = threading.Lock()
latest_frame = None

# buffer IMU & baseline (diakses di dalam state_lock)
imu_buffer = collections.deque()   # (timestamp, magnitudo_g)
baseline = {"value": ACTIVITY_BASELINE_DEFAULT, "sum": 0.0, "windows": 0,
            "ready": False, "last_update": 0.0}

# ======================
# LOAD TFLITE
# ======================
try:
    import tflite_runtime.interpreter as tflite
except ImportError:
    import tensorflow.lite as tflite

interpreter = tflite.Interpreter(model_path=MODEL_PATH)
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# ukuran input mengikuti model (bukan angka tebakan)
IMG_SIZE = int(input_details[0]['shape'][1])

# ======================
# FUNGSI AI
# ======================
def predict_vision(frame_bgr):
    img = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    if input_details[0]['dtype'] == np.uint8:      # model terkuantisasi
        img = img.astype(np.uint8)
    else:
        img = img.astype(np.float32) / 255.0
    img = np.expand_dims(img, axis=0)

    interpreter.set_tensor(input_details[0]['index'], img)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])[0].astype(np.float32)

    # dekuantisasi jika output uint8
    scale, zero = output_details[0].get('quantization', (0.0, 0))
    if output_details[0]['dtype'] == np.uint8 and scale:
        output = (output - zero) * scale

    # output sigmoid (1 nilai) -> ubah jadi [p_normal, p_pmk]
    if output.size == 1:
        p = float(np.clip(output[0], 0.0, 1.0))
        output = np.array([1.0 - p, p], dtype=np.float32)

    idx = int(np.argmax(output))
    return LABEL_NAMES[idx], float(output[idx]), output

# ======================
# FUZZY (Mamdani, implementasi manual - ringan untuk Raspberry Pi)
# ======================
def trapmf(x, a, b, c, d):
    """Fungsi keanggotaan trapesium. a==b atau c==d berarti bahu (shoulder)."""
    if x < a or x > d:
        return 0.0
    if b <= x <= c:
        return 1.0
    if x < b:
        return (x - a) / (b - a)
    return (d - x) / (d - c)

def trimf(x, a, b, c):
    return trapmf(x, a, b, b, c)

def mf_eval(spec, x):
    kind, p = spec
    return trapmf(x, *p) if kind == "trap" else trimf(x, *p)

# Range (universe) tiap variabel; input di-clip ke range ini
UNIVERSE = {"suhu": (30.0, 45.0), "aktivitas": (0.0, 100.0), "visual": (0.0, 1.0)}

INPUT_MF = {
    "suhu": {
        "normal":      ("trap", (30.0, 30.0, 38.5, 39.3)),
        "agak_tinggi": ("tri",  (38.8, 39.5, 40.2)),
        "demam":       ("trap", (39.8, 40.5, 45.0, 45.0)),
    },
    "aktivitas": {
        "menurun_drastis": ("trap", (0.0, 0.0, 21.0, 35.0)),
        "menurun":         ("tri",  (21.0, 38.5, 56.0)),
        "normal":          ("trap", (45.5, 63.0, 100.0, 100.0)),
    },
    "visual": {
        "rendah": ("trap", (0.0, 0.0, 0.3, 0.5)),
        "sedang": ("tri",  (0.3, 0.5, 0.7)),
        "tinggi": ("trap", (0.5, 0.7, 1.0, 1.0)),
    },
}

OUTPUT_MF = {
    "Normal":  ("trap", (0.0, 0.0, 20.0, 40.0)),
    "Waspada": ("tri",  (25.0, 50.0, 75.0)),
    "Tinggi":  ("trap", (60.0, 80.0, 100.0, 100.0)),
}

Y = np.arange(0.0, 101.0, 1.0)
OUT_ARR = {name: np.array([mf_eval(spec, y) for y in Y]) for name, spec in OUTPUT_MF.items()}

# (suhu, aktivitas, visual, output, bobot)   None = tidak dipakai (don't care)
# Bobot 0.5 pada rule gejala tunggal: supaya rule Waspada tidak "menarik turun" skor
# saat ada dua gejala atau lebih (hasil uji: 2 gejala ~71.7, 1 gejala 50, normal ~16).
RULES = [
    ("demam",       "menurun_drastis", None,     "Tinggi",  1.0),
    ("demam",       None,              "tinggi", "Tinggi",  1.0),
    (None,          "menurun_drastis", "tinggi", "Tinggi",  1.0),
    ("agak_tinggi", None,              "tinggi", "Tinggi",  1.0),
    ("demam",       None,              None,     "Waspada", 0.5),
    (None,          "menurun_drastis", None,     "Waspada", 0.5),
    (None,          None,              "tinggi", "Waspada", 0.5),
    (None,          None,              "sedang", "Waspada", 0.5),
    ("agak_tinggi", "menurun",         None,     "Waspada", 1.0),
    (None,          "menurun",         None,     "Waspada", 0.5),
    ("normal",      "normal",          "rendah", "Normal",  1.0),
    ("agak_tinggi", None,              None,     "Waspada", 0.5),  # menutup celah: suhu agak tinggi saja
]

def describe_rule(rule):
    s, a, v, out, _ = rule
    parts = []
    if s: parts.append("suhu " + s.replace("_", " "))
    if a: parts.append("aktivitas " + a.replace("_", " "))
    if v: parts.append("visual " + v)
    label = "Berisiko Tinggi" if out == "Tinggi" else out
    return " + ".join(parts) + " -> " + label

def fuzzy_infer(suhu, aktivitas, visual):
    """Return (skor_risiko 0-100, daftar rule yang aktif [(kekuatan, rule), ...])."""
    x = {
        "suhu": min(max(suhu, UNIVERSE["suhu"][0]), UNIVERSE["suhu"][1]),
        "aktivitas": min(max(aktivitas, UNIVERSE["aktivitas"][0]), UNIVERSE["aktivitas"][1]),
        "visual": min(max(visual, UNIVERSE["visual"][0]), UNIVERSE["visual"][1]),
    }
    mu = {var: {name: mf_eval(spec, x[var]) for name, spec in sets.items()}
          for var, sets in INPUT_MF.items()}

    agg = np.zeros_like(Y)
    fired = []
    for rule in RULES:
        s, a, v, out, w = rule
        degs = []
        if s: degs.append(mu["suhu"][s])
        if a: degs.append(mu["aktivitas"][a])
        if v: degs.append(mu["visual"][v])
        strength = min(degs) * w                      # AND = min, dikali bobot
        if strength <= 0.0:
            continue
        agg = np.maximum(agg, np.minimum(strength, OUT_ARR[out]))   # implikasi min, agregasi max
        fired.append((strength, rule))

    total = agg.sum()
    score = float((Y * agg).sum() / total) if total > 1e-9 else 0.0   # centroid
    fired.sort(key=lambda t: t[0], reverse=True)
    return score, fired

# ======================
# FITUR AKTIVITAS (IMU)
# ======================
def push_imu_sample(t, ax, ay, az):
    mag = ((ax * ax + ay * ay + az * az) ** 0.5) * ACCEL_TO_G
    imu_buffer.append((t, mag))
    cutoff = t - ACTIVITY_WINDOW_SEC
    while imu_buffer and imu_buffer[0][0] < cutoff:
        imu_buffer.popleft()

def update_baseline(A, now):
    """Dipanggil maksimal sekali per window."""
    if now - baseline["last_update"] < ACTIVITY_WINDOW_SEC:
        return
    baseline["last_update"] = now
    if not baseline["ready"]:
        baseline["sum"] += A
        baseline["windows"] += 1
        if baseline["windows"] >= BASELINE_WARMUP_WINDOWS:
            baseline["value"] = max(baseline["sum"] / baseline["windows"], MIN_BASELINE)
            baseline["ready"] = True
    elif A >= BASELINE_UPDATE_MIN_RATIO * baseline["value"]:
        baseline["value"] = (1 - BASELINE_ALPHA) * baseline["value"] + BASELINE_ALPHA * A

def update_activity(now):
    """
    Std magnitudo akselerasi pada window terakhir, dibanding baseline sapi.
    (Magnitudo mentah ~1 g saat diam maupun bergerak, jadi yang informatif adalah variasinya.)
    """
    cutoff = now - ACTIVITY_WINDOW_SEC
    mags = [m for (t, m) in imu_buffer if t >= cutoff]
    info = {"std_g": None, "ratio": None, "score": None,
            "baseline": round(baseline["value"], 5),
            "baseline_ready": baseline["ready"], "samples": len(mags)}
    if len(mags) < ACTIVITY_MIN_SAMPLES:
        return info

    A = float(np.std(mags))
    update_baseline(A, now)
    r = A / max(baseline["value"], MIN_BASELINE)
    score = min(100.0, max(0.0, ACTIVITY_SCORE_NORMAL * r))
    info.update({"std_g": round(A, 5), "ratio": round(r, 3), "score": round(score, 1),
                 "baseline": round(baseline["value"], 5)})
    return info

# ======================
# SENSOR FUSION
# ======================
NETRAL = {"suhu": 38.5, "aktivitas": ACTIVITY_SCORE_NORMAL, "visual": 0.0}

def sensor_fusion(wearable, vision, activity, now=None):
    now = now or time.time()
    reasons = []
    missing = []

    # --- suhu (harus segar)
    suhu = None
    ts = wearable.get("timestamp")
    if wearable.get("temperature") is not None and ts is not None and now - ts <= WEARABLE_STALE_SEC:
        suhu = wearable["temperature"] + TEMP_OFFSET
    else:
        missing.append("suhu")

    # --- aktivitas
    aktivitas = activity.get("score") if activity else None
    if aktivitas is None:
        missing.append("aktivitas")

    # --- visual (pakai probabilitas PMK, bukan label argmax)
    p_pmk = None
    vts = vision.get("timestamp")
    if vision.get("p_pmk") is not None and vts is not None and now - vts <= VISION_STALE_SEC:
        p_pmk = vision["p_pmk"]
    else:
        missing.append("visual")

    inputs = {"suhu": None if suhu is None else round(suhu, 2),
              "aktivitas": aktivitas,
              "visual": None if p_pmk is None else round(p_pmk, 3)}

    if len(missing) == 3:
        return {"score": 0.0, "status": "Tidak Ada Data",
                "reasons": ["Semua input tidak tersedia atau kedaluwarsa"],
                "missing": missing, "inputs": inputs, "timestamp": now}

    skor, fired = fuzzy_infer(
        suhu if suhu is not None else NETRAL["suhu"],
        aktivitas if aktivitas is not None else NETRAL["aktivitas"],
        p_pmk if p_pmk is not None else NETRAL["visual"],
    )

    # alasan = rule non-Normal yang paling kuat
    for strength, rule in fired:
        if rule[3] != "Normal" and strength >= 0.2 and len(reasons) < 3:
            reasons.append(f"{describe_rule(rule)} (derajat {strength:.2f})")
    for m in missing:
        reasons.append(f"Data {m} tidak tersedia (dianggap netral)")

    if skor < THRESH_WASPADA:
        status = "Normal"
    elif skor < THRESH_TINGGI:
        status = "Waspada"
    else:
        status = "Berisiko Tinggi"

    return {
        "score": round(skor, 1),
        "status": status,
        "reasons": reasons,
        "missing": missing,
        "inputs": inputs,
        "timestamp": now
    }

def refresh_risk():
    """Hitung ulang aktivitas + risiko. HARUS dipanggil saat memegang state_lock."""
    now = time.time()
    latest_state["activity"] = update_activity(now)
    latest_state["risk"] = sensor_fusion(
        latest_state["wearable"], latest_state["vision"], latest_state["activity"], now
    )

def fusion_thread():
    """Hitung ulang berkala supaya data basi terdeteksi walau tidak ada pesan baru."""
    while True:
        time.sleep(FUSION_INTERVAL_SEC)
        with state_lock:
            refresh_risk()

# ======================
# MQTT
# ======================
def _num(v):
    try:
        f = float(v)
        return f if np.isfinite(f) else None
    except (TypeError, ValueError):
        return None

WEARABLE_KEYS = ("temperature", "ax", "ay", "az", "gx", "gy", "gz")

def on_connect(client, userdata, flags, rc, *args):
    print("MQTT connected, rc =", rc)
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        if not isinstance(payload, dict):
            raise ValueError("payload bukan objek JSON")
    except Exception as e:
        print("MQTT parse error:", e)
        return

    now = time.time()
    with state_lock:
        for k in WEARABLE_KEYS:
            if k in payload:
                v = _num(payload[k])
                if v is not None:
                    latest_state["wearable"][k] = v
        latest_state["wearable"]["timestamp"] = now

        w = latest_state["wearable"]
        if None not in (w["ax"], w["ay"], w["az"]) and all(k in payload for k in ("ax", "ay", "az")):
            push_imu_sample(now, w["ax"], w["ay"], w["az"])

        refresh_risk()

def make_mqtt_client():
    try:   # paho-mqtt >= 2.0
        return mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id=MQTT_CLIENT_ID)
    except AttributeError:   # paho-mqtt 1.x
        return mqtt.Client(client_id=MQTT_CLIENT_ID)

def mqtt_thread():
    while True:
        try:
            client = make_mqtt_client()
            client.on_connect = on_connect
            client.on_message = on_message
            client.connect(MQTT_BROKER, MQTT_PORT, 60)
            client.loop_forever()      # reconnect otomatis setelah koneksi pertama berhasil
        except Exception as e:
            print("MQTT error:", e, "- coba lagi 5 detik")
            time.sleep(5)

# ======================
# CAMERA WORKER
# ======================
MAX_BUFFER_BYTES = 2_000_000

def handle_frame(frame, frame_count, overlay):
    """Jalankan inferensi tiap N frame, update state, kembalikan overlay terakhir."""
    if frame_count % INFERENCE_EVERY_N_FRAMES == 0:
        label, conf, probs = predict_vision(frame)
        with state_lock:
            latest_state["vision"] = {
                "label": label,
                "confidence": conf,
                "p_pmk": float(probs[PMK_INDEX]),
                "timestamp": time.time()
            }
            refresh_risk()
        overlay = (label, conf)

    if overlay is not None:
        label, conf = overlay
        color = (0, 255, 0) if label == "Normal" else (0, 0, 255)
        cv2.putText(frame, f"{label} {conf*100:.1f}%", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
    return overlay

def camera_thread():
    global latest_frame

    while True:
        try:
            print("Connect ke ESP32-CAM...")
            with requests.get(ESP32CAM_URL, stream=True, timeout=10) as stream:
                if stream.status_code != 200:
                    print("Status:", stream.status_code, "- coba lagi 3 detik...")
                    time.sleep(3)
                    continue

                print("Stream ESP32-CAM terbuka!")
                bytes_data = b''
                frame_count = 0
                overlay = None

                # jika stream macet, timeout=10 pada requests melempar exception -> reconnect
                for chunk in stream.iter_content(chunk_size=4096):
                    if not chunk:
                        continue
                    bytes_data += chunk

                    # satu chunk bisa berisi 0, 1, atau lebih dari satu frame
                    while True:
                        a = bytes_data.find(b'\xff\xd8')              # JPEG start
                        if a == -1:
                            bytes_data = bytes_data[-1:]              # sisakan 1 byte (marker terpotong)
                            break
                        b = bytes_data.find(b'\xff\xd9', a + 2)       # JPEG end SETELAH start
                        if b == -1:
                            bytes_data = bytes_data[a:]               # buang data sebelum start
                            if len(bytes_data) > MAX_BUFFER_BYTES:
                                bytes_data = b''
                            break

                        jpg = bytes_data[a:b + 2]
                        bytes_data = bytes_data[b + 2:]

                        frame = cv2.imdecode(np.frombuffer(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                        if frame is None:
                            continue

                        frame_count += 1
                        overlay = handle_frame(frame, frame_count, overlay)

                        with frame_lock:
                            latest_frame = frame.copy()

        except requests.exceptions.RequestException as e:
            print("Error stream:", e)
            time.sleep(3)
        except Exception as e:
            print("Error tak terduga:", e)
            time.sleep(3)

# ======================
# FASTAPI
# ======================
app = FastAPI(title="CATTLEYE API")

@app.get("/api/data")
def api_data():
    with state_lock:
        return JSONResponse(content=latest_state)

@app.post("/api/reset_baseline")
def api_reset_baseline():
    """Mulai ulang kalibrasi baseline. Panggil saat sapi dalam kondisi normal."""
    with state_lock:
        baseline.update({"value": ACTIVITY_BASELINE_DEFAULT, "sum": 0.0, "windows": 0,
                         "ready": False, "last_update": 0.0})
        imu_buffer.clear()
    return {"status": "baseline di-reset", "warmup_windows": BASELINE_WARMUP_WINDOWS,
            "estimasi_detik": BASELINE_WARMUP_WINDOWS * ACTIVITY_WINDOW_SEC}

def gen_frames():
    while True:
        with frame_lock:
            if latest_frame is None:
                frame = None
            else:
                frame = latest_frame.copy()

        if frame is None:
            time.sleep(0.1)
            continue

        ret, jpeg = cv2.imencode('.jpg', frame)
        if not ret:
            time.sleep(0.05)
            continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        time.sleep(0.05)   # batasi ~20 fps agar CPU Pi tidak habis

@app.get("/api/video_feed")
def video_feed():
    return StreamingResponse(
        gen_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

# ======================
# MAIN
# ======================
if __name__ == "__main__":
    threading.Thread(target=mqtt_thread, daemon=True).start()
    threading.Thread(target=camera_thread, daemon=True).start()
    threading.Thread(target=fusion_thread, daemon=True).start()

    uvicorn.run(app, host="0.0.0.0", port=8000)
