# Menjalankan App dengan Docker

Ada 2 cara: pakai `docker compose` (paling gampang) atau `docker build` + `docker run` manual.

## 0. Siapkan file model

Sama seperti versi non-Docker, kamu tetap butuh 2 file ini dari hasil export notebook:

```
streamlit_app/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── app.py
├── requirements.txt
├── labels.txt              <-- taruh di sini
└── fmd_cattle_model.keras  <-- taruh di sini
```

## Cara 1 — Docker Compose (disarankan)

Model & labels di-mount sebagai volume, jadi kalau nanti kamu retrain dan
ganti file model, tidak perlu rebuild image — cukup restart container.

```bash
docker compose up --build
```

Buka `http://localhost:8501` di browser.

Untuk berhenti:

```bash
docker compose down
```

Untuk jalan di background (detached):

```bash
docker compose up -d --build
```

## Cara 2 — Docker manual (tanpa compose)

Build image (model & labels ikut ter-copy ke dalam image kalau ada di folder ini):

```bash
docker build -t fmd-cattle-detector .
```

Jalankan container:

```bash
docker run -p 8501:8501 fmd-cattle-detector
```

Atau kalau mau mount model dari luar (tanpa rebuild image tiap ganti model):

```bash
docker run -p 8501:8501 \
  -v $(pwd)/fmd_cattle_model.keras:/app/fmd_cattle_model.keras:ro \
  -v $(pwd)/labels.txt:/app/labels.txt:ro \
  fmd-cattle-detector
```

Buka `http://localhost:8501`.

## Cek log / debug

```bash
docker compose logs -f
# atau
docker logs -f fmd-cattle-detector
```

## Kalau model belum ada saat build

App akan langsung `st.stop()` dengan pesan error yang jelas ("File model
tidak ditemukan...") daripada crash membingungkan — pastikan
`fmd_cattle_model.keras` dan `labels.txt` sudah ada di folder sebelum
`docker build` / `docker compose up`.

## Catatan ukuran image

Image dasar `python:3.11-slim` + TensorFlow bisa berukuran ~1.5–2 GB karena
TensorFlow cukup besar. Kalau ingin lebih ringan, bisa pertimbangkan pakai
`tensorflow-cpu` di `requirements.txt` (versi tanpa dependensi GPU) — cukup
ganti baris `tensorflow>=2.15` menjadi `tensorflow-cpu>=2.15`, karena app ini
hanya melakukan inference ringan di CPU, tidak perlu GPU.
