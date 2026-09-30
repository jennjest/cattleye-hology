import json
import time
import threading
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

ESP32CAM_URL = "http://192.168.1.127/"   # sesuaikan
MODEL_PATH = "models/fmd_cattle_model.tflite"
IMG_SIZE = 128

CLASSES = ["Normal", "PMK"]
LABEL_NAMES = {0: "Normal", 1: "PMK"}

INFERENCE_EVERY_N_FRAMES = 5

# Ambang batas sederhana
TEMP_FEVER = 39.5
ACTIVITY_LOW = 0.5

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
    "vision": {
        "label": "Unknown",
        "confidence": 0.0,
        "timestamp": None
    },
    "risk": {
        "score": 0,
        "status": "Normal",
        "reasons": [],
        "timestamp": None
    }
}

frame_lock = threading.Lock()
latest_frame = None

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

# ======================
# FUNGSI AI
# ======================
def predict_vision(frame_bgr):
    img = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img.astype(np.float32) / 255.0
    img = np.expand_dims(img, axis=0)

    interpreter.set_tensor(input_details[0]['index'], img)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])[0]

    idx = int(np.argmax(output))
    return LABEL_NAMES[idx], float(output[idx]), output

# ======================
# SENSOR FUSION
# ======================
def sensor_fusion(wearable, vision):
    reasons = []
    score = 0.0

    temp = wearable.get("temperature")
    if temp is not None:
        if temp >= TEMP_FEVER:
            score += 40
            reasons.append(f"Suhu tinggi ({temp:.1f}°C)")
        elif temp >= TEMP_FEVER - 0.5:
            score += 20
            reasons.append(f"Suhu agak tinggi ({temp:.1f}°C)")

    ax, ay, az = wearable.get("ax"), wearable.get("ay"), wearable.get("az")
    if None not in (ax, ay, az):
        activity = (ax * ax + ay * ay + az * az) ** 0.5
        if activity < ACTIVITY_LOW:
            score += 20
            reasons.append("Aktivitas rendah")

    if vision["label"] == "PMK":
        score += 40 * vision["confidence"]
        reasons.append(f"Visual PMK ({vision['confidence']*100:.1f}%)")
    elif vision["label"] == "Normal":
        score -= 10 * vision["confidence"]

    score = max(0, min(100, score))

    if score < 40:
        status = "Normal"
    elif score < 70:
        status = "Waspada"
    else:
        status = "Berisiko Tinggi"

    return {
        "score": round(score, 1),
        "status": status,
        "reasons": reasons,
        "timestamp": time.time()
    }

# ======================
# MQTT
# ======================
def on_connect(client, userdata, flags, rc):
    print("MQTT connected, rc =", rc)
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    global latest_state
    try:
        payload = json.loads(msg.payload.decode())
    except Exception as e:
        print("MQTT parse error:", e)
        return

    with state_lock:
        latest_state["wearable"].update(payload)
        latest_state["wearable"]["timestamp"] = time.time()

        risk = sensor_fusion(latest_state["wearable"], latest_state["vision"])
        latest_state["risk"] = risk

def mqtt_thread():
    client = mqtt.Client(client_id=MQTT_CLIENT_ID)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()

# ======================
# CAMERA WORKER
# ======================
import requests

def camera_thread():
    global latest_frame, latest_state

    while True:
        try:
            print("Connect ke ESP32-CAM...")
            stream = requests.get(ESP32CAM_URL, stream=True, timeout=10)

            if stream.status_code != 200:
                print("Status:", stream.status_code, "- coba lagi 3 detik...")
                time.sleep(3)
                continue

            print("Stream ESP32-CAM terbuka!")

            bytes_data = b''
            frame_count = 0
            no_frame_count = 0

            for chunk in stream.iter_content(chunk_size=4096):
                if not chunk:
                    no_frame_count += 1
                    if no_frame_count > 100:
                        print("Stream mati, reconnect...")
                        break
                    continue

                no_frame_count = 0
                bytes_data += chunk

                a = bytes_data.find(b'\xff\xd8')  # JPEG start
                b = bytes_data.find(b'\xff\xd9')  # JPEG end

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
                        label, conf, probs = predict_vision(frame)
                        with state_lock:
                            latest_state["vision"] = {
                                "label": label,
                                "confidence": conf,
                                "timestamp": time.time()
                            }
                            risk = sensor_fusion(
                                latest_state["wearable"],
                                latest_state["vision"]
                            )
                            latest_state["risk"] = risk

                        color = (0, 255, 0) if label == "Normal" else (0, 0, 255)
                        cv2.putText(
                            frame,
                            f"{label} {conf*100:.1f}%",
                            (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            1,
                            color,
                            2
                        )

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

def gen_frames():
    while True:
        with frame_lock:
            if latest_frame is None:
                time.sleep(0.1)
                continue
            frame = latest_frame.copy()

        ret, jpeg = cv2.imencode('.jpg', frame)
        if not ret:
            continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')

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

    uvicorn.run(app, host="0.0.0.0", port=8000)
