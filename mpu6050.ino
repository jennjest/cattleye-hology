#include <Wire.h>
#include <MPU6050_light.h>

MPU6050 mpu(Wire);

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  // Inisialisasi I2C ESP32-C3
  Wire.begin(8, 9); 
  
  byte status = mpu.begin();
  Serial.print("Status Koneksi MPU6050: ");
  Serial.println(status); // Status 0 = Berhasil
  
  if (status != 0) {
    Serial.println("Gagal terhubung! Silakan pakai kode Raw sebelumnya.");
    while (1) { delay(10); }
  }
  
  Serial.println("Berhasil! Diamkan sensor untuk kalibrasi otomatis...");
  delay(1000);
  mpu.calcOffsets(); // Kalibrasi offset awal
  Serial.println("Kalibrasi Selesai!\n");
}

void loop() {
  mpu.update(); // Mengambil data terbaru dari sensor
  
  // Tampilkan data Akselerometer (m/s^2)
  Serial.print("Acc [X: "); 
  Serial.print(mpu.getAccX() * 9.81, 2);
  Serial.print(", Y: "); 
  Serial.print(mpu.getAccY() * 9.81, 2);
  Serial.print(", Z: "); 
  Serial.print(mpu.getAccZ() * 9.81, 2);
  
  // Tampilkan data Gyroscope (deg/s)
  Serial.print("]  ||  Gyro [X: "); 
  Serial.print(mpu.getGyroX(), 2);
  Serial.print(", Y: "); 
  Serial.print(mpu.getGyroY(), 2);
  Serial.print(", Z: "); 
  Serial.print(mpu.getGyroZ(), 2);
  Serial.println("]");
  
  delay(500);
}