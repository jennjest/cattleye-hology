#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <MPU6050_light.h>
#include <Adafruit_MLX90614.h>

// ===============================
// WIFI
// ===============================
const char* ssid     = "jennjest";
const char* password = "13572468";

// ===============================
// MQTT
// ===============================
const char* mqtt_server = "broker.hivemq.com";
const int   mqtt_port   = 1883;
// client_id dibuat otomatis dari MAC address (// <<< FIX: hindari bentrok)
const char* mqtt_topic  = "cattleye/cow01/wearable";

WiFiClient   espClient;
PubSubClient mqttClient(espClient);

// ===============================
// SENSOR
// ===============================
MPU6050          mpu(Wire);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// ===============================
// TIMING (non-blocking)
// ===============================
unsigned long lastPublish     = 0;
unsigned long lastMqttAttempt = 0;
unsigned long lastWifiCheck   = 0;
const unsigned long PUBLISH_INTERVAL = 1000;   // 1 detik
const unsigned long MQTT_RETRY_MS    = 2000;   // coba reconnect tiap 2 detik
const unsigned long WIFI_CHECK_MS    = 5000;   // cek WiFi tiap 5 detik

// ===============================
// WIFI SETUP
// ===============================
void setup_wifi()
{
    Serial.print("Connecting to WiFi");
    WiFi.mode(WIFI_STA);
    WiFi.setTxPower(WIFI_POWER_8_5dBm);
    WiFi.begin(ssid, password);

    // Jangan blokir selamanya — max 15 detik
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.println("WiFi connected");
        Serial.print("ESP32 IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println();
        Serial.println("WiFi GAGAL — akan dicoba lagi di loop()");
    }
}

// ===============================
// MQTT RECONNECT (non-blocking) // <<< FIX
// ===============================
void reconnect_mqtt_nonblocking()
{
    if (millis() - lastMqttAttempt < MQTT_RETRY_MS) return;
    lastMqttAttempt = millis();

    // Client ID unik berbasis MAC
    String clientId = "cattleye-" + WiFi.macAddress();
    clientId.replace(":", "");   // hilangkan titik dua

    Serial.print("MQTT connect... ");
    if (mqttClient.connect(clientId.c_str())) {
        Serial.println("OK");
    } else {
        Serial.print("gagal, rc=");
        Serial.println(mqttClient.state());
    }
}

// ===============================
// SETUP
// ===============================
void setup()
{
    Serial.begin(115200);
    delay(300);
    Serial.println("\n=== CATTLEYE Wearable Boot ===");

    // I2C dengan timeout // <<< FIX: biar tidak hang kalau bus nyangkut
    Wire.begin(8, 9);
    Wire.setTimeOut(50);   // ms

    // WiFi
    setup_wifi();

    // MQTT
    mqttClient.setServer(mqtt_server, mqtt_port);
    mqttClient.setKeepAlive(30);
    mqttClient.setSocketTimeout(10);

    // MPU6050
    byte mpuStatus = mpu.begin();
    Serial.print("MPU6050 status: ");
    Serial.println(mpuStatus);
    if (mpuStatus != 0) {
        Serial.println("MPU6050 initialization FAILED — cek kabel I2C");
    } else {
        delay(1000);
        Serial.println("Calibrating MPU6050 (jangan gerakkan sensor)...");
        mpu.calcOffsets();
        Serial.println("Calibration done");
    }

    // MLX90614
    if (!mlx.begin()) {
        Serial.println("MLX90614 initialization FAILED — cek kabel I2C / alamat");
    } else {
        Serial.println("MLX90614 OK");
    }
}

// ===============================
// LOOP
// ===============================
void loop()
{
    // --- 1. Pastikan WiFi hidup // <<< FIX
    if (millis() - lastWifiCheck > WIFI_CHECK_MS) {
        lastWifiCheck = millis();
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("WiFi drop — reconnect...");
            WiFi.disconnect();
            setup_wifi();
        }
    }

    // --- 2. Pastikan MQTT hidup (non-blocking) // <<< FIX
    if (WiFi.status() == WL_CONNECTED) {
        if (!mqttClient.connected()) {
            reconnect_mqtt_nonblocking();
        } else {
            mqttClient.loop();
        }
    }

    // --- 3. Update MPU (dibungkus timeout supaya tidak hang)
    mpu.update();

    // --- 4. Publish tiap 1 detik (tanpa delay blocking)
    if (millis() - lastPublish < PUBLISH_INTERVAL) return;
    lastPublish = millis();

    // Baca sensor
    float temperature = mlx.readObjectTempC();
    float ax = mpu.getAccX();
    float ay = mpu.getAccY();
    float az = mpu.getAccZ();
    float gx = mpu.getGyroX();
    float gy = mpu.getGyroY();
    float gz = mpu.getGyroZ();

    // Sanity check MLX (kadang NaN kalau I2C glitch)
    if (isnan(temperature)) {
        Serial.println("MLX90614 baca NaN — skip publish");
        return;
    }

    // Buat JSON
    char payload[300];
    snprintf(
        payload, sizeof(payload),
        "{\"temperature\":%.2f,"
        "\"ax\":%.2f,\"ay\":%.2f,\"az\":%.2f,"
        "\"gx\":%.2f,\"gy\":%.2f,\"gz\":%.2f}",
        temperature,
        ax, ay, az,
        gx, gy, gz
    );

    // Publish
    if (mqttClient.connected()) {
        bool ok = mqttClient.publish(mqtt_topic, payload);
        Serial.print(ok ? "Published: " : "Publish GAGAL: ");
        Serial.println(payload);
    } else {
        Serial.print("MQTT down, skip: ");
        Serial.println(payload);
    }
}
