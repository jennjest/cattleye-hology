"""
Sinkronisasi settings fusion dari server Laravel ke Raspberry Pi.

Bridge ini memakai token device yang sama dengan cattleye/bridge_to_laravel.py,
jadi tidak ada secret kedua yang harus dikonfigurasi di jaringan ini.

Alur:
  1. GET /api/fusion-settings -> ambil ambang terbaru dari server
  2. Serahkan ke main.py lewat apply_settings() di bawah lock

Kalau server tidak bisa dihubungi, Pi tetap berjalan dengan nilai terakhir yang
diterapkan. Ambang fusion menentukan kapan sapi dianggap berisiko, karena itu
sistem tidak boleh berhenti hanya karena satu request gagal.
"""
import os
import threading

import requests

# Seberapa sering menanyakan settings baru. Operator mengubahnya secara manual,
# jadi polling lambat sudah cukup dan tidak menahan koneksi Pi.
POLL_SECONDS = float(os.environ.get("CATTLEYE_SETTINGS_POLL_SECONDS", "60"))
RETRY_SECONDS = 30
TIMEOUT = 10

BASE_URL = os.environ.get("CATTLEYE_SERVER_URL", "http://127.0.0.1:8000").rstrip("/")
TOKEN = os.environ.get("CATTLEYE_DEVICE_TOKEN", "")


def fetch_settings(base_url=None, token=None, session=None):
    """Ambil settings fusion dari server.

    Mengembalikan dict, atau None kalau server tidak bisa dihubungi atau
    jawabannya tidak masuk akal. Tidak pernah melempar exception karena pemanggil
    nya berjalan di thread daemon dan tidak boleh mati karena satu request gagal.
    """
    url = (base_url or BASE_URL).rstrip("/") + "/api/fusion-settings"
    client = session or requests

    try:
        response = client.get(
            url,
            headers={"Authorization": f"Bearer {token or TOKEN}", "Accept": "application/json"},
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as e:
        print(f"[settings] gagal mengambil dari {url}: {e}")
        return None

    data = payload.get("data") if isinstance(payload, dict) else None

    if not isinstance(data, dict) or not data:
        print(f"[settings] balasan {url} tidak berisi settings yang bisa dipakai")
        return None

    return data


def settings_loop(apply, base_url=None, token=None, session=None, stop=None):
    """Polling settings lalu serahkan ke callback `apply(dict)`.

    `apply` dipanggil hanya ketika server menjawab, dan harus mengembalikan True
    kalau settings-nya diterima supaya loop tidak menunggu satu menit penuh hanya
    karena satu payload ditolak. Ada exception guard per iterasi: satu payload
    rusak tidak boleh menghentikan thread ini selamanya.
    """
    stop = stop or threading.Event()
    url = (base_url or BASE_URL).rstrip("/")
    token = token or TOKEN

    if not token:
        print("[settings] CATTLEYE_DEVICE_TOKEN kosong, polling dinonaktifkan")
        return

    while not stop.is_set():
        # Minta sekali saat start supaya ambang baru langsung berlaku setelah Pi
        # dinyalakan ulang, bukan menunggu satu menit.
        data = fetch_settings(url, token, session)

        if data is None:
            stop.wait(RETRY_SECONDS)
            continue

        try:
            if apply(data):
                stop.wait(POLL_SECONDS)
            else:
                print("[settings] settings ditolak, coba lagi nanti")
                stop.wait(RETRY_SECONDS)
        except Exception as e:
            print(f"[settings] gagal menerapkan settings: {e}")
            stop.wait(RETRY_SECONDS)


def start(apply, base_url=None, token=None):
    """Jalankan settings_loop di thread daemon."""
    thread = threading.Thread(
        target=settings_loop,
        args=(apply, base_url, token),
        daemon=True,
        name="cattleye-settings",
    )
    thread.start()
    return thread
