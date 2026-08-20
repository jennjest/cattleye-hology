# MASTER CONCEPT DOCUMENT
## Sistem Deteksi Dini/Skrining PMK pada Sapi (IoT + AI)

**Status dokumen:** Working draft internal tim — BUKAN proposal lomba
**Fase saat ini:** Phase 1 — Product Concept + System Boundary
**Sumber acuan:** Baseline ide tim + Guidebook HoloPaper HOLOGY 9.0
**Label yang digunakan:** `[DECIDED]` `[PROPOSED]` `[OPEN]` `[ASSUMPTION]` `[RESEARCH NEEDED]`

---

## KEPUTUSAN TETAP TIM (REFERENCE — jangan diubah tanpa alasan teknis kuat)

| Komponen | Keputusan | Status |
|---|---|---|
| Wearable | Kalung pintar (bukan ear tag) | `[DECIDED]` |
| Sensor wearable | Suhu/thermal + gyroscope + accelerometer | `[DECIDED]` |
| Kamera | ESP32-CAM, stasioner di area makan | `[DECIDED]` |
| Edge computing | Raspberry Pi 3 | `[DECIDED]` |
| AI | CNN, dataset sekunder | `[DECIDED]` (model spesifik → `[OPEN]`, dibahas Phase AI) |
| Backend | Node.js | `[DECIDED]` (framework spesifik → `[OPEN]`) |
| Frontend | React | `[DECIDED]` |
| Komunikasi web | HTTPS | `[DECIDED]` |

Seluruh keputusan di atas boleh dikritik tapi tidak diganti tanpa justifikasi teknis eksplisit — sesuai aturan tim.

---

## 1. PRODUCT OVERVIEW

| Aspek | Deskripsi |
|---|---|
| Nama sementara sistem | CATTELEYE `[DECIDED]` |
| Problem yang diselesaikan | Keterlambatan deteksi indikasi awal PMK pada sapi akibat monitoring manual yang tidak kontinu |
| Target pengguna primer | Peternak/pengelola kandang (individu atau kelompok ternak) `[DECIDED — dari baseline]` |
| Target pengguna sekunder (kandidat) | Dinas peternakan / dokter hewan wilayah, sebagai penerima eskalasi `[PROPOSED]` — belum ada keputusan role & akses |
| Target objek | Sapi individual dalam satu lokasi kandang, teridentifikasi per ekor |
| Konsep solusi | Wearable (kalung) + kamera stasioner (ESP32-CAM) → edge AI (RPi3) → sensor fusion → skor risiko → dashboard web (React) untuk peternak |
| Value proposition | Monitoring kontinu 24/7 tanpa observasi manual berulang; deteksi lebih awal dari yang mampu dilakukan observasi visual sesaat; skor risiko terukur dan dapat dilacak historinya |
| Batasan sistem | Alat **skrining/deteksi dini**, bukan alat diagnosis final. Diagnosis dan keputusan medis tetap wewenang dokter hewan. Sistem tidak memberi rekomendasi pengobatan. |
| Scope prototype | 1 lokasi kandang, jumlah sapi terbatas (`[ASSUMPTION]` ±2-3 ekor untuk kebutuhan pengujian — perlu dikonfirmasi kapasitas mitra kandang), hardware tunggal per komponen |
| Scope pengembangan masa depan | Multi-kandang, upgrade sensor suhu ke rumen bolus, pose estimation, prediksi penyebaran wabah antar wilayah (mengacu baseline "future work") |

---

## 2. PROBLEM DEFINITION

### Problem → Cause → Consequence → Opportunity

| # | Problem | Cause | Consequence | Opportunity |
|---|---|---|---|---|
| 1 | PMK adalah penyakit hewan menular yang menyebar cepat pada ternak berkuku belah | Penularan lewat kontak langsung, udara, alat/kendaraan terkontaminasi, cairan lepuh/air liur | Penurunan produktivitas ternak, kerugian ekonomi peternak, potensi pembatasan perdagangan ternak antar wilayah | Deteksi dini mempercepat isolasi kasus sebelum menyebar ke sapi lain dalam satu kandang |
| 2 | Deteksi PMK saat ini sangat bergantung pada observasi manual peternak/petugas | Keterbatasan jumlah dokter hewan/petugas lapangan dibanding populasi ternak; pemeriksaan tidak kontinu | Gejala awal (demam ringan, penurunan aktivitas, lesi kecil) sering terlewat sampai kondisi memburuk | Monitoring otomatis 24/7 dapat menangkap perubahan pola lebih awal dibanding pemeriksaan berkala |
| 3 | Gejala awal PMK sulit dikenali sekilas oleh orang non-ahli | Gejala awal tidak selalu tampak kasat mata; butuh pengukuran (suhu) atau observasi pola jangka waktu tertentu | Keterlambatan pelaporan ke dokter hewan | Kombinasi sensor fisiologis + computer vision menstandardisasi deteksi gejala yang sulit diamati manusia secara konsisten |
| 4 | Solusi IoT peternakan yang ada umumnya tidak dirancang spesifik untuk indikasi penyakit menular mulut/kuku `[ASSUMPTION]` | Fokus riset IoT peternakan selama ini lebih banyak ke estrus detection, pakan, produksi susu, bukan penyakit menular spesifik `[RESEARCH NEEDED — akan divalidasi di Bab Research Gap]` | Ada gap solusi spesifik PMK yang menggabungkan sinyal wearable + visual | Novelty berbasis multimodal sensing spesifik untuk indikasi PMK (didetailkan di Phase Novelty Analysis) |

### Mengapa IoT / Wearable / Kamera / AI diperlukan

| Elemen | Alasan |
|---|---|
| **IoT** (umum) | Monitoring kontinu tanpa kehadiran manusia terus-menerus; skalabel untuk banyak ekor; data historis tersimpan otomatis untuk analisis tren |
| **Wearable** | Data suhu dan pola gerak spesifik per individu sapi — tidak bisa didapat dari kamera saja; menangkap gejala sistemik (demam, penurunan aktivitas) yang belum tentu tampak visual |
| **Kamera** | Suhu dan gerak saja tidak bisa mendeteksi lesi mulut/kuku atau hipersalivasi — perlu data visual; juga berfungsi sebagai validasi silang terhadap sinyal wearable |
| **AI (khususnya CV)** | Klasifikasi indikasi visual (lesi, hipersalivasi) tidak feasible dengan threshold sederhana, perlu model yang belajar pola visual; fusion multi-sensor menjadi skor risiko tunggal yang actionable memerlukan pemrosesan otomatis |

> Catatan: Bagian ini belum menyertakan data statistik prevalensi/kerugian ekonomi PMK secara spesifik karena berisiko mengarang angka. Angka spesifik untuk latar belakang proposal nanti **wajib** diambil dari sumber resmi (Kementan/Kementerian Pertanian, dinas peternakan, jurnal) — ditandai `[RESEARCH NEEDED]`.

---

## 3. SOLUTION CONCEPT

### System Narrative (ringkas, teknis)

- Setiap sapi memakai kalung pintar berisi sensor suhu, gyroscope, dan accelerometer → data dikirim berkala ke Raspberry Pi.
- ESP32-CAM terpasang stasioner di area makan → menangkap gambar/video saat sapi berada di area tersebut → dikirim ke Raspberry Pi.
- Raspberry Pi 3 berperan sebagai edge compute: menerima data sensor + gambar, melakukan preprocessing, menjalankan inference CNN untuk klasifikasi indikasi visual, dan melakukan sensor fusion menjadi skor risiko per sapi.
- Skor risiko dan data pendukung dikirim ke backend Node.js melalui HTTPS.
- Backend menyimpan data ke database, menyediakan API untuk frontend, dan memicu alert jika skor risiko melewati ambang tertentu.
- Frontend React menampilkan dashboard (overview kandang & detail per sapi) kepada peternak.
- Alert dikirim ke peternak dengan rekomendasi tindakan (isolasi, hubungi dokter hewan) — **sistem tidak memutuskan diagnosis**.

### System Workflow — Jalur Wearable

```
Sapi → Wearable (Kalung) → Communication [OPEN] → Raspberry Pi
     → AI/Preprocessing → Sensor Fusion → Backend → Database
     → React Dashboard → Alert → User Action
```

### System Workflow — Jalur Kamera

```
Sapi (di area makan) → ESP32-CAM → Communication [OPEN] → Raspberry Pi
     → Computer Vision (CNN) → Visual Abnormality Score
     → (masuk ke Sensor Fusion bersama jalur wearable)
```

### User Workflow

1. Peternak memasang kalung pada sapi (setup awal, di luar cakupan otomatisasi sistem).
2. Sistem berjalan otomatis (sensing → edge → fusion → dashboard) tanpa intervensi manual rutin.
3. Peternak memeriksa dashboard secara berkala **atau** menerima alert saat skor risiko tinggi.
4. Klik alert/notifikasi → diarahkan ke detail sapi terkait (Mode B, mengacu baseline).
5. Peternak mengambil tindakan (isolasi manual, menghubungi dokter hewan) berdasarkan rekomendasi sistem.

### Data Workflow (ringkas — detail penuh di Phase Data Flow)

Wearable/Kamera → Raw sensor & image data → Edge preprocessing → Fitur & skor per modalitas → Fusion → Risk score + metadata → Backend (simpan + API) → Frontend (tampilkan) → User action (opsional dicatat sebagai tindak lanjut, masuk future scope).

---

## 4. SYSTEM BOUNDARY

### In-Scope (Prototipe)

- Monitoring individual sapi dalam satu lokasi kandang menggunakan kalung + kamera stasioner.
- Deteksi dini/skrining risiko PMK berbasis kombinasi sinyal suhu, aktivitas, gerak, dan indikasi visual dari area makan.
- Dashboard monitoring untuk peternak: overview kandang, detail per sapi, histori, alert, rekomendasi tindakan.
- Edge processing lokal di Raspberry Pi (inference CV utama tidak bergantung pada cloud AI eksternal).

### Out-of-Scope (untuk versi ini)

- Diagnosis medis definitif atau penggantian pemeriksaan dokter hewan.
- Rekomendasi pengobatan/dosis obat.
- Prediksi wabah antar kandang/wilayah — masuk **future work**, bukan prototipe.
- Manajemen ternak menyeluruh (pakan, reproduksi, dsb.) di luar konteks indikasi PMK.
- Skala peternakan industri besar (ribuan ekor) — kapasitas RPi3 tidak dirancang untuk itu di versi prototipe.

### Batasan Fisik

| Dimensi | Batasan Prototipe |
|---|---|
| Lokasi | 1 kandang/lokasi ternak |
| Jumlah sapi | Terbatas `[ASSUMPTION — perlu konfirmasi mitra kandang]` |
| Titik kamera | 1 titik per area makan (multi-titik → `[OPEN]`, dibahas Phase Camera System) |
| Konektivitas | Diasumsikan tersedia jaringan lokal (Wi-Fi/lainnya) di lokasi kandang `[ASSUMPTION]` |

### Batasan Temporal

Prototype Version dan Real Deployment Version dipisahkan secara eksplisit — RPi3 dan ESP32-CAM mungkin cukup untuk prototipe skala kecil, namun belum tentu optimal untuk deployment besar (dibahas detail di Phase Feasibility Analysis).

---

## 5. CORE WORKFLOW

Alur penuh: physical system → sensing → communication → edge → AI → fusion → backend → database → frontend → alert → user action.

```
[SAPI]
  │
  ├─ (pakai kalung: suhu, gyro, accel) ──► Communication[OPEN] ──┐
  │                                                               │
  └─ (masuk area makan) ──► [ESP32-CAM] ──► Communication[OPEN] ──┤
                                                                   ▼
                                                  ┌─────────────────────────────┐
                                                  │   RASPBERRY PI 3 (EDGE)     │
                                                  │  • Preprocessing sensor     │
                                                  │  • CV inference (CNN)       │
                                                  │  • Sensor Fusion            │
                                                  │  → Risk Score per sapi      │
                                                  └──────────────┬──────────────┘
                                                                 │ HTTPS
                                                                 ▼
                                                  ┌─────────────────────────────┐
                                                  │   BACKEND (Node.js)         │
                                                  │  • API & Auth               │
                                                  │  • Alert Engine             │
                                                  │  • DB read/write            │
                                                  └───────┬─────────────┬───────┘
                                                           │             │
                                                           ▼             ▼
                                              ┌───────────────┐   ┌─────────────────┐
                                              │ DATABASE[OPEN]│   │ REACT DASHBOARD │
                                              └───────────────┘   └────────┬────────┘
                                                                            ▼
                                                                 ┌─────────────────────┐
                                                                 │      PETERNAK       │
                                                                 │ lihat status, terima │
                                                                 │ alert, ambil tindakan│
                                                                 └─────────────────────┘
```

---

## 6. INITIAL ARCHITECTURE (High-Level — belum detail per layer)

| Layer | Nama | Komponen | Status | Catatan |
|---|---|---|---|---|
| 1 | Sensing | Kalung (suhu, gyro, accel), ESP32-CAM | `[DECIDED]` | Detail sensor placement → Phase Wearable/Camera System |
| 2 | Communication | Kandidat: Wi-Fi / BLE / LoRa + gateway | `[OPEN]` | Trade-off dianalisis di Phase System Architecture |
| 3 | Edge | Raspberry Pi 3 | `[DECIDED]` | Evaluasi keterbatasan RAM/CPU/storage menyusul |
| 4 | AI / Data Fusion | CNN (visual) + fusion sensor → risk score | `[DECIDED arah]` / `[OPEN model & metode fusion]` | Model CNN spesifik & metode fusion (rule-based/weighted/fuzzy/ML) dibahas Phase AI & Sensor Fusion |
| 5 | Backend | Node.js | `[DECIDED]` | Framework/library spesifik `[OPEN]` |
| 6 | Database | — | `[OPEN]` | Kandidat & alasan pemilihan → Phase Database Design |
| 7 | Frontend | React | `[DECIDED]` | Struktur page/komponen → Phase Frontend Architecture |
| 8 | User/Notification | Dashboard, alert (kanal `[OPEN]`), rekomendasi tindakan | `[PARTIAL]` | Kanal notifikasi belum ditentukan |

---

## 7. OPEN DECISION REGISTER (Phase 1)

| ID | Decision | Status | Options | Recommended | Reason |
|---|---|---|---|---|---|
| OD-01 | Nama sistem | OPEN | SIGAP-PMK / EWS-PMK / CattleGuard IoT / lainnya | — | Menunggu diskusi tim & preferensi branding |
| OD-02 | Skala prototipe (jumlah sapi & kandang) | OPEN | 1 kandang kecil (±5–10 ekor) vs simulasi skala lebih besar | 1 kandang kecil `[PROPOSED]` | Selaras kapasitas RPi3 & anggaran mahasiswa; tetap perlu konfirmasi tim & ketersediaan mitra kandang |
| OD-03 | Mitra kandang / sumber data lapangan | OPEN | Dinas peternakan, kelompok tani ternak lokal, kandang kampus | — | Menentukan feasibility uji lapangan & akses dataset sekunder |
| OD-04 | Kanal notifikasi alert | OPEN | WhatsApp API, SMS gateway, push notification web | — | Trade-off biaya vs kompleksitas integrasi — dibahas saat Layer 8 |
| OD-05 | Target pengguna sekunder (dinas peternakan/dokter hewan) | OPEN | Hanya peternak vs peternak + pihak eksternal | — | Berdampak ke desain role/permission dashboard di Phase Frontend & Backend |
| OD-06 | Protokol komunikasi device (Wi-Fi/BLE/LoRa) | OPEN | Dianalisis Phase System Architecture Layer 2 | — | Perlu trade-off jangkauan, daya, biaya sebelum diputuskan |

---

**Status: Phase 1 selesai.** Ketik **"lanjut"** untuk melanjutkan ke phase berikutnya (detail System Architecture per layer, Wearable System, Camera System, dst. — mengikuti keputusan dan struktur yang sudah ditetapkan di sini tanpa mengulang penjelasan yang sudah final).
