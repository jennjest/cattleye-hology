"""
Deteksi Penyakit Mulut dan Kuku (PMK) pada Sapi - Web App
==========================================================
Web app sederhana untuk menguji model klasifikasi sapi Normal vs PMK.
Bisa upload foto dari komputer atau paste link foto dari internet.

Cara menjalankan:
    1. Taruh file model (fmd_cattle_model.keras) dan labels.txt
       di folder yang sama dengan app.py ini.
    2. pip install -r requirements.txt
    3. streamlit run app.py
"""

import io
import os

import numpy as np
import requests
import streamlit as st
import tensorflow as tf
from PIL import Image, UnidentifiedImageError

# ============================================================
# KONFIGURASI - harus sama persis dengan waktu training
# ============================================================

IMG_SIZE = 128
MODEL_PATH = "fmd_cattle_model.keras"      # ganti sesuai nama file model kamu
LABELS_PATH = "labels.txt"

st.set_page_config(
    page_title="Deteksi PMK Sapi",
    page_icon="🐄",
    layout="centered"
)


# ============================================================
# LOAD MODEL & LABELS (di-cache supaya tidak reload tiap interaksi)
# ============================================================

@st.cache_resource
def load_labels(path: str):
    if not os.path.exists(path):
        return ["Normal", "PMK"]
    with open(path, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


@st.cache_resource
def load_model(path: str):
    if not os.path.exists(path):
        st.error(
            f"File model '{path}' tidak ditemukan. "
            "Taruh file .keras hasil training di folder yang sama dengan app.py."
        )
        st.stop()
    return tf.keras.models.load_model(path)


LABELS = load_labels(LABELS_PATH)
model = load_model(MODEL_PATH)


# ============================================================
# PREPROCESSING - harus identik dengan pipeline training:
# RGB -> resize 128x128 -> float32 -> normalisasi /255
# ============================================================

def preprocess_image(pil_img: Image.Image) -> np.ndarray:
    img = pil_img.convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)  # tambah batch dimension
    return arr


def predict(pil_img: Image.Image):
    arr = preprocess_image(pil_img)
    probs = model.predict(arr, verbose=0)[0]
    pred_idx = int(np.argmax(probs))
    return LABELS[pred_idx], probs


def load_image_from_url(url: str) -> Image.Image:
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content))


# ============================================================
# UI
# ============================================================

st.title("🐄 Deteksi PMK pada Sapi")
st.write(
    "Upload foto sapi atau paste link foto dari internet, "
    "lalu model akan memprediksi apakah sapi tersebut **Normal** atau **terindikasi PMK**."
)

tab_upload, tab_url = st.tabs(["📁 Upload Foto", "🔗 Link Foto (URL)"])

pil_image = None

with tab_upload:
    uploaded_file = st.file_uploader(
        "Pilih foto sapi (jpg/png)", type=["jpg", "jpeg", "png"]
    )
    if uploaded_file is not None:
        try:
            pil_image = Image.open(uploaded_file)
        except UnidentifiedImageError:
            st.error("File tidak bisa dibaca sebagai gambar. Coba file lain.")

with tab_url:
    url_input = st.text_input(
        "Paste link gambar di sini",
        placeholder="https://contoh.com/foto-sapi.jpg"
    )
    if url_input:
        try:
            pil_image = load_image_from_url(url_input)
        except Exception as e:
            st.error(f"Gagal mengambil gambar dari URL: {e}")

# ============================================================
# HASIL PREDIKSI
# ============================================================

if pil_image is not None:
    st.image(pil_image, caption="Gambar yang diuji", use_container_width=True)

    with st.spinner("Menganalisis gambar..."):
        label, probs = predict(pil_image)

    confidence = float(np.max(probs)) * 100

    if label.upper() == "PMK":
        st.error(f"⚠️ Hasil: **{label}** (keyakinan {confidence:.1f}%)")
    else:
        st.success(f"✅ Hasil: **{label}** (keyakinan {confidence:.1f}%)")

    st.subheader("Detail probabilitas")
    for name, p in zip(LABELS, probs):
        st.write(f"{name}: {p * 100:.2f}%")
        st.progress(float(p))

    st.caption(
        "⚠️ Ini adalah alat bantu skrining, bukan pengganti diagnosis dokter hewan. "
        "Model dilatih dengan dataset terbatas (342 gambar), jadi hasil untuk foto "
        "di luar konteks dataset (sudut, pencahayaan, jenis sapi berbeda) bisa kurang akurat."
    )
else:
    st.info("Upload foto atau masukkan link gambar untuk mulai deteksi.")
