# Deteksi PMK Sapi — Web App (Streamlit)

Web app sederhana untuk menguji model klasifikasi Normal vs PMK.
Bisa upload foto dari komputer atau paste link foto dari internet.

## 1. Siapkan folder

Taruh 3 file ini dalam satu folder yang sama:

```
streamlit_app/
├── app.py
├── requirements.txt
├── labels.txt              <-- hasil export dari notebook
└── fmd_cattle_model.keras  <-- hasil export dari notebook
```

`fmd_cattle_model.keras` dan `labels.txt` didapat dari cell "Export Model for
Raspberry Pi" di notebook (bagian `SAVE TRAINED KERAS MODEL` dan
`SAVE LABELS FOR RASPBERRY PI`). Download kedua file itu dari Kaggle Output,
lalu pindahkan ke folder ini.

## 2. Install dependencies

Disarankan pakai virtual environment:

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Jalankan app

```bash
streamlit run app.py
```

Browser akan terbuka otomatis ke `http://localhost:8501`.

## 4. Cara pakai

- Tab **Upload Foto**: pilih file jpg/png dari komputer.
- Tab **Link Foto (URL)**: paste URL gambar langsung dari internet
  (misal hasil klik-kanan "Copy image address" di Google Images).

Hasil prediksi (Normal / PMK) beserta persentase keyakinan akan muncul
di bawah gambar.

## Catatan penting

- Model dilatih dengan dataset kecil (342 gambar), jadi hasil untuk foto yang
  jauh berbeda dari data training (sudut kamera aneh, kualitas rendah, jenis
  sapi berbeda) bisa kurang akurat. App ini untuk demo/skrining, bukan
  pengganti diagnosis dokter hewan.
- Kalau mau pakai model `.tflite` (lebih ringan) daripada `.keras`, ganti
  bagian `load_model()` di `app.py` untuk menggunakan
  `tf.lite.Interpreter` — beri tahu saya kalau butuh versi itu.
- Untuk deploy online (bukan cuma di laptop sendiri), bisa upload folder ini
  ke [Streamlit Community Cloud](https://streamlit.io/cloud) (gratis) dengan
  menghubungkan ke repo GitHub yang berisi file-file ini.
