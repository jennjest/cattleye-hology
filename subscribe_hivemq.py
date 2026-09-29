import json
import paho.mqtt.client as mqtt

# ===============================
# KONFIGURASI MQTT
# ===============================
BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC = "cattleye/cow01/wearable"

# Client ID HARUS UNIK (Berbeda dengan ESP32 dan Browser)
CLIENT_ID = "RaspberryPi_Cow01_Subscriber" 


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"Berhasil terhubung ke Broker HiveMQ!")
        client.subscribe(TOPIC)
        print(f"Subscribed ke topic: {TOPIC}\nMenerima data...")
    else:
        print(f"Gagal terhubung, error code: {rc}")


def on_message(client, userdata, msg):
    try:
        payload_str = msg.payload.decode("utf-8")

        # Parse string JSON menjadi Dictionary Python
        data = json.loads(payload_str)

        print("\n================ DATA MASUK ================")
        print(f"Suhu        : {data.get('temperature')} °C")
        print(
            f"Accel (XYZ) : {data.get('ax')}, {data.get('ay')}, {data.get('az')}"
        )
        print(
            f"Gyro  (XYZ) : {data.get('gx')}, {data.get('gy')}, {data.get('gz')}"
        )

    except Exception as e:
        print(f"{msg.payload}")

# Inisialisasi MQTT Client (Mendukung Paho MQTT v2.x)
try:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, CLIENT_ID)
except AttributeError:
    # Untuk versi paho-mqtt versi lama
    client = mqtt.Client(CLIENT_ID)

client.on_connect = on_connect
client.on_message = on_message

print("Menghubungkan ke HiveMQ...")
client.connect(BROKER, PORT, 60)

# Loop selamanya untuk menerima pesan secara realtime
client.loop_forever()
