#!/usr/bin/env python3
"""
Bridge Raspberry Pi -> Laravel (CATTLEYE).

Membaca `GET /api/data` dari main.py lalu meneruskannya apa adanya ke
`POST /api/edge-state` memakai shared secret device.

main.py hanya menulis ke broker MQTT dan menyajikan state lokal; tidak ada kode
di sana yang mengirim apa pun ke server. Skrip ini menutup celah itu tanpa
mengubah main.py: ia bicara lewat HTTP sehingga modul TFLite/kamera tidak perlu
diimpor.

Konfigurasi lewat environment variable (lihat .env.example.bridge):

    CATTLEYE_PI_URL         default http://127.0.0.1:8000
    CATTLEYE_SERVER_URL     default http://127.0.0.1:8000   (alamat Laravel)
    CATTLEYE_DEVICE_TOKEN   WAJIB, hasil `php artisan cattleye:token`
    CATTLEYE_COW_CODE       kode sapi, mis. cow01
    CATTLEYE_BRIDGE_INTERVAL_SEC  default 2.0

Jalankan:

    python3 bridge_to_laravel.py           # loop permanen
    python3 bridge_to_laravel.py --once    # kirim satu snapshot lalu keluar
"""

import os
import sys
import time

import requests

PI_URL = os.environ.get("CATTLEYE_PI_URL", "http://127.0.0.1:8000").rstrip("/")
SERVER_URL = os.environ.get("CATTLEYE_SERVER_URL", "http://127.0.0.1:8000").rstrip("/")
DEVICE_TOKEN = os.environ.get("CATTLEYE_DEVICE_TOKEN", "")
COW_CODE = os.environ.get("CATTLEYE_COW_CODE", "cow01")
INTERVAL_SEC = float(os.environ.get("CATTLEYE_BRIDGE_INTERVAL_SEC", "2.0"))

STATE_PATH = "/api/data"
INGEST_PATH = "/api/edge-state"

READ_TIMEOUT = 3
SEND_TIMEOUT = 5


def log(message):
    stamp = time.strftime("%H:%M:%S")
    print(f"[bridge {stamp}] {message}", flush=True)


def fetch_state():
    """Ambil latest_state dari Pi. Return None kalau Pi belum siap."""
    try:
        response = requests.get(f"{PI_URL}{STATE_PATH}", timeout=READ_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        log(f"Gagal baca {PI_URL}{STATE_PATH}: {exc}")
        return None


def build_payload(state):
    """
    Teruskan blok state apa adanya; Laravel yang memvalidasi dan menyimpan.
    Blok tanpa timestamp dilewati karena itu placeholder awal latest_state.
    """
    wearable = state.get("wearable") or {}
    activity = state.get("activity") or {}
    vision = state.get("vision") or {}
    risk = state.get("risk") or {}

    payload = {"cow_id": COW_CODE, "wearable": wearable}

    if activity.get("score") is not None:
        payload["activity"] = activity
    if vision.get("timestamp") is not None:
        payload["vision"] = vision
    if risk.get("timestamp") is not None:
        payload["risk"] = risk

    return payload


def send(payload):
    headers = {
        "Authorization": f"Bearer {DEVICE_TOKEN}",
        "Accept": "application/json",
    }
    try:
        response = requests.post(
            f"{SERVER_URL}{INGEST_PATH}", json=payload, headers=headers, timeout=SEND_TIMEOUT
        )
    except requests.RequestException as exc:
        log(f"Gagal kirim ke server: {exc}")
        return None

    if response.status_code in (200, 201):
        return response.status_code

    if response.status_code == 422:
        log("Payload ditolak server (422), kemungkinan versi kode berbeda:")
        log(response.text[:400])
    elif response.status_code in (401, 403):
        log(f"Token device ditolak ({response.status_code}). Cek CATTLEYE_DEVICE_TOKEN.")
    elif response.status_code == 503:
        log("Ingest dinonaktifkan di server (CATTLEYE_DEVICE_TOKEN belum diisi).")
    else:
        log(f"Server balas {response.status_code}: {response.text[:200]}")

    return None


def main():
    once = "--once" in sys.argv

    if not DEVICE_TOKEN:
        log("CATTLEYE_DEVICE_TOKEN belum diisi. Jalankan `php artisan cattleye:token` di server.")
        return 1

    log(f"Pi={PI_URL} -> Server={SERVER_URL} sapi={COW_CODE} interval={INTERVAL_SEC}s")

    # Kunci timestamp blok yang terakhir terkirim supaya tidak menulis baris yang sama.
    sent = {"wearable": None, "vision": None, "risk": None}
    consecutive_failures = 0

    while True:
        state = fetch_state()
        if state is not None:
            payload = build_payload(state)
            stamps = {
                "wearable": (payload["wearable"] or {}).get("timestamp"),
                "vision": (payload.get("vision") or {}).get("timestamp"),
                "risk": (payload.get("risk") or {}).get("timestamp"),
            }

            if any(stamps[key] != sent[key] for key in stamps):
                status = send(payload)
                if status is None:
                    consecutive_failures += 1
                else:
                    if consecutive_failures:
                        log(f"SAMBUNG lagi setelah {consecutive_failures} gagal.")
                    consecutive_failures = 0
                    sent.update({k: v for k, v in stamps.items() if v is not None})

        if once:
            return 0

        # Backoff sampai 30 detik supaya server mati tidak membanjiri log Pi.
        if consecutive_failures:
            time.sleep(min(INTERVAL_SEC * (2 ** consecutive_failures), 30))
        else:
            time.sleep(INTERVAL_SEC)


if __name__ == "__main__":
    sys.exit(main())
