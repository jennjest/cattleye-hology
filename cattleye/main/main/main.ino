#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <MPU6050_light.h>
#include <Adafruit_MLX90614.h>

// =====================================================
// WIFI
// =====================================================

const char* ssid = "jennjest";
const char* password = "13572468";

// IP LAPTOP YANG MENJALANKAN MOSQUITTO
const char* mqtt_server = "10.151.42.19";


// =====================================================
// MQTT
// =====================================================

const int mqtt_port = 1883;

const char* mqtt_topic = "plant/sensor";

WiFiClient espClient;
PubSubClient mqttClient(espClient);


// =====================================================
// I2C ESP32-C3
// =====================================================

#define SDA_PIN 8
#define SCL_PIN 9


// =====================================================
// SENSOR
// =====================================================

MPU6050 mpu(Wire);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();


// =====================================================
// TIMING
// =====================================================

unsigned long lastPublish = 0;

const unsigned long PUBLISH_INTERVAL = 500;


// =====================================================
// WIFI
// =====================================================

// =====================================================
// WIFI
// =====================================================

void setupWiFi()
{
  Serial.println();
  Serial.println("=== WIFI ===");

  // 1. Putuskan koneksi sebelumnya dan bersihkan konfigurasi
  WiFi.disconnect(true);
  delay(1000); 

  // 2. Set mode ke Station (Klien)
  WiFi.mode(WIFI_STA);

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  // 3. Mulai koneksi
  WiFi.begin(ssid, password);

  unsigned long startTime = millis();

  // Tunggu maksimal 15 detik
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 15000)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("WiFi connected!");
    Serial.print("ESP32-C3 IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
  else
  {
    Serial.println("WiFi connection FAILED!");
    Serial.print("WiFi status code: ");
    Serial.println(WiFi.status());
    // Hentikan proses koneksi yang menggantung agar tidak bentrok di percobaan berikutnya
    WiFi.disconnect(); 
  }
}


// =====================================================
// MQTT RECONNECT
// =====================================================

void reconnectMQTT()
{
  while (!mqttClient.connected())
  {
    Serial.print("Connecting to MQTT... ");

    String clientId =
      "ESP32-C3-" +
      String((uint32_t)ESP.getEfuseMac(), HEX);

    if (mqttClient.connect(clientId.c_str()))
    {
      Serial.println("connected!");
    }
    else
    {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 2 seconds...");

      delay(2000);
    }
  }
}


// =====================================================
// SETUP
// =====================================================

void setup()
{
  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("================================");
  Serial.println(" ESP32-C3 SENSOR SYSTEM");
  Serial.println("================================");


  // ===================================================
  // I2C
  // ===================================================

  Wire.begin(SDA_PIN, SCL_PIN);

  Serial.println();
  Serial.println("=== SENSOR INITIALIZATION ===");


  // ===================================================
  // MPU6050
  // ===================================================

  byte status = mpu.begin();

  Serial.print("MPU6050 status: ");
  Serial.println(status);

  if (status != 0)
  {
    Serial.println("MPU6050 gagal terhubung!");

    while (1)
    {
      delay(10);
    }
  }

  Serial.println("MPU6050 connected.");

  Serial.println("Diamkan MPU6050 untuk kalibrasi...");

  delay(1000);

  mpu.calcOffsets(true, true);

  Serial.println("Kalibrasi MPU6050 selesai.");


  // ===================================================
  // MLX90614
  // ===================================================

  Serial.println();
  Serial.println("Memulai MLX90614...");

  if (!mlx.begin(0x5A, &Wire))
  {
    Serial.println("MLX90614 gagal terhubung!");

    while (1)
    {
      delay(10);
    }
  }

  Serial.println("MLX90614 connected.");


  // ===================================================
  // WIFI
  // ===================================================

  setupWiFi();


  // ===================================================
  // MQTT
  // ===================================================

  mqttClient.setServer(mqtt_server, mqtt_port);

  mqttClient.setBufferSize(512);

  Serial.println();
  Serial.print("MQTT Broker: ");
  Serial.print(mqtt_server);
  Serial.print(":");
  Serial.println(mqtt_port);

  Serial.println();
  Serial.println("=== SYSTEM READY ===");
}


// =====================================================
// LOOP
// =====================================================

void loop()
{
  // ===================================================
  // CEK WIFI
  // ===================================================

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi terputus!");

    setupWiFi();

    // Kalau masih gagal, jangan lanjut MQTT
    if (WiFi.status() != WL_CONNECTED)
    {
      delay(2000);
      return;
    }
  }


  // ===================================================
  // CEK MQTT
  // ===================================================

  if (!mqttClient.connected())
  {
    reconnectMQTT();
  }

  mqttClient.loop();


  // ===================================================
  // UPDATE MPU6050
  // ===================================================

  mpu.update();


  // ===================================================
  // PUBLISH DATA
  // ===================================================

  if (millis() - lastPublish >= PUBLISH_INTERVAL)
  {
    lastPublish = millis();


    // =================================================
    // MPU6050
    // =================================================

    float accX = mpu.getAccX() * 9.81;
    float accY = mpu.getAccY() * 9.81;
    float accZ = mpu.getAccZ() * 9.81;

    float gyroX = mpu.getGyroX();
    float gyroY = mpu.getGyroY();
    float gyroZ = mpu.getGyroZ();

    float angleX = mpu.getAngleX();
    float angleY = mpu.getAngleY();
    float angleZ = mpu.getAngleZ();


    // =================================================
    // MLX90614
    // =================================================

    float objectTemp = mlx.readObjectTempC();
    float ambientTemp = mlx.readAmbientTempC();


    // =================================================
    // JSON PAYLOAD
    // =================================================

    char payload[512];

    snprintf(
      payload,
      sizeof(payload),

      "{"
      "\"acc_x\":%.2f,"
      "\"acc_y\":%.2f,"
      "\"acc_z\":%.2f,"
      "\"gyro_x\":%.2f,"
      "\"gyro_y\":%.2f,"
      "\"gyro_z\":%.2f,"
      "\"angle_x\":%.2f,"
      "\"angle_y\":%.2f,"
      "\"angle_z\":%.2f,"
      "\"mlx_object\":%.2f,"
      "\"mlx_ambient\":%.2f"
      "}",

      accX,
      accY,
      accZ,

      gyroX,
      gyroY,
      gyroZ,

      angleX,
      angleY,
      angleZ,

      objectTemp,
      ambientTemp
    );


    // =================================================
    // MQTT PUBLISH
    // =================================================

    bool success = mqttClient.publish(
      mqtt_topic,
      payload
    );


    // =================================================
    // SERIAL MONITOR
    // =================================================

    if (success)
    {
      Serial.print("MQTT -> ");
      Serial.println(payload);
    }
    else
    {
      Serial.println("Gagal publish MQTT!");
    }
  }
}