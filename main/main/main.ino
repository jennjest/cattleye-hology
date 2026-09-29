#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <MPU6050_light.h>
#include <Adafruit_MLX90614.h>

// ===============================
// WIFI
// ===============================

const char* ssid = "ROBOTIIK";
const char* password = "81895656";

// ===============================
// MQTT (HiveMQ Broker)
// ===============================

const char* mqtt_server = "broker.hivemq.com"; //
const int mqtt_port = 1883;                   // Standard TCP port for PubSubClient
const char* mqtt_client_id = "clientId-phdnwnjnAm"; //
const char* mqtt_topic = "cattleye/cow01/wearable"; //

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ===============================
// SENSOR
// ===============================

MPU6050 mpu(Wire);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// ===============================
// WIFI SETUP
// ===============================

void setup_wifi()
{
    Serial.print("Connecting to WiFi");

    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("WiFi connected");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
}

// ===============================
// MQTT RECONNECT
// ===============================

void reconnect_mqtt()
{
    while (!mqttClient.connected())
    {
        Serial.print("Connecting to HiveMQ... ");

        if (mqttClient.connect(mqtt_client_id))
        {
            Serial.println("connected");
        }
        else
        {
            Serial.print("failed, rc=");
            Serial.println(mqttClient.state());

            delay(2000);
        }
    }
}

// ===============================
// SETUP
// ===============================

void setup()
{
    Serial.begin(115200);

    // I2C
    Wire.begin(8, 9);

    // WiFi
    setup_wifi();

    // MQTT
    mqttClient.setServer(mqtt_server, mqtt_port);

    // MPU6050
    byte mpuStatus = mpu.begin();

    Serial.print("MPU6050 status: ");
    Serial.println(mpuStatus);

    if (mpuStatus != 0)
    {
        Serial.println("MPU6050 initialization failed");
    }

    delay(1000);

    Serial.println("Calibrating MPU6050...");
    mpu.calcOffsets();
    Serial.println("Calibration done");

    // MLX90614
    if (!mlx.begin())
    {
        Serial.println("MLX90614 initialization failed");
    }
}

// ===============================
// LOOP
// ===============================

void loop()
{
    if (!mqttClient.connected())
    {
        reconnect_mqtt();
    }

    mqttClient.loop();

    // Update MPU
    mpu.update();

    // Baca sensor
    float temperature = mlx.readObjectTempC();

    float ax = mpu.getAccX();
    float ay = mpu.getAccY();
    float az = mpu.getAccZ();

    float gx = mpu.getGyroX();
    float gy = mpu.getGyroY();
    float gz = mpu.getGyroZ();

    // ===========================
    // BUAT JSON
    // ===========================

    char payload[300];

    snprintf(
        payload,
        sizeof(payload),
        "{\"temperature\":%.2f,"
        "\"ax\":%.2f,"
        "\"ay\":%.2f,"
        "\"az\":%.2f,"
        "\"gx\":%.2f,"
        "\"gy\":%.2f,"
        "\"gz\":%.2f}",
        temperature,
        ax,
        ay,
        az,
        gx,
        gy,
        gz
    );

    // ===========================
    // PUBLISH
    // ===========================

    mqttClient.publish(mqtt_topic, payload);

    Serial.print("Published: ");
    Serial.println(payload);

    delay(1000);
}