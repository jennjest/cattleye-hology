#include "esp_camera.h"
#include <WiFi.h>

// WiFi
const char* ssid = "jennjest"; //sesuaikan wifi yang terhubung
const char* password = "13572468"; //sesuaikan password wifi

// Pinout AI Thinker
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

WiFiServer server(80);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("START REALTIME STREAM...");

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Biar gak berat dan lancar, resolusi di-set QVGA atau VGA
  config.frame_size = FRAMESIZE_VGA; 
  config.jpeg_quality = 12;
  config.fb_count = 2; // Naikkin ke 2 biar streaming lebih mulus

  Serial.println("INIT KAMERA...");
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("GAGAL: 0x%x\n", err);
    return;
  }
  Serial.println("KAMERA OK!");

  Serial.print("WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK!");
  Serial.print("IP Live Stream: ");
  Serial.println(WiFi.localIP());
  server.begin();
}

void loop() {
  WiFiClient client = server.available();
  if (client) {
    Serial.println("Ada yang nonton live stream!");
    
    // Header wajib buat ngasih tau browser kalau ini VIDEO STREAMING (MJPEG)
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: multipart/x-mixed-replace; boundary=frame");
    client.println();

    while (client.connected()) {
      camera_fb_t* fb = esp_camera_fb_get();
      if (!fb) {
        Serial.println("Gagal ambil gambar");
        break;
      }

      // Kirim pembatas frame
      client.println("--frame");
      client.println("Content-Type: image/jpeg");
      client.print("Content-Length: ");
      client.println(fb->len);
      client.println();
      
      // Kirim data gambarnya
      client.write(fb->buf, fb->len);
      client.println();

      // Kembalikan buffer kamera biar bisa ngambil gambar selanjutnya
      esp_camera_fb_return(fb);
      
      // Kasih delay dikit biar ESP32-CAM gak jantungan/panas
      delay(30); 
    }
    
    client.stop();
    Serial.println("Nontonnya selesai.");
  }
  delay(1);
}


//Konfigurasi jika memakai ESP32 Dev Module untuk upload program:
//Board: ESP32 Dev Module
//Partition scheme: Huge APP
//PSRAM: Enabled
//Upload speed: 115200

//Sewaktu Upload: GPIO0 ke GND di ESP32-CAM (setelah itu lepas dan RST)
// EN ke GND di ESP32 Dev Kit
//TX Dev Kit ke U0T ESP32-CAM
//RX Dev Kit ke U0R ESP32-CAM
//5V-5V
//GND-GND