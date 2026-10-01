"""
Tunable sensor fusion untuk Raspberry Pi.

Nilai di sini BUKAN sumber kebenaran. Nilai ini adalah fallback untuk saat
server tidak bisa dihubungi; settings_sync.py mengambil nilai terbaru dari
Laravel (GET /api/fusion-settings) lalu menerapkannya lewat apply_settings().

Setiap kunci di bawah harus punya padanan di tabel fusion_settings di server,
dan nilai defaultnya harus sama dengan yang di-seed di migration
2026_10_01_000006_create_fusion_settings_table.php. Kalau kedua sisi berbeda,
dashboard akan menampilkan angka yang tidak dijalankan Pi.

Modul ini sengaja tidak mengimpor cv2/numpy/mqtt supaya bisa diuji tanpa
menyalakan kamera.
"""
import threading

# "suhu"       : MLX90614 di kalung membaca suhu PERMUKAAN, bukan suhu tubuh
#               inti. Isi offset hasil kalibrasi (suhu inti - suhu permukaan).
# "aktivitas" : firmware publish 1 Hz, jadi window 30 dtk = ~30 sampel.
# "baseline"  : std magnitudo (g) awal WAJIB dikalibrasi dari rekaman asli.
DEFAULT_SETTINGS = {
    "waspada_threshold": 33.0,
    "tinggi_threshold": 60.0,
    "temp_offset": 0.0,
    "activity_window_sec": 30,
    "activity_min_samples": 10,
    "activity_score_normal": 70.0,
    "baseline_default": 0.05,
    "baseline_warmup_windows": 10,
    "baseline_alpha": 0.002,
    "baseline_update_min_ratio": 0.6,
    "wearable_stale_sec": 30,
    "vision_stale_sec": 30,
    "fusion_interval_sec": 1.0,
}

# Rentang yang diterima dari server. Nilai di luar rentang ditolak satu per satu,
# bukan membatalkan seluruh payload: satu field rusak tidak boleh mengembalikan
# Pi ke default untuk semua field.
RENTANG = {
    "waspada_threshold": (0.0, 100.0),
    "tinggi_threshold": (0.0, 100.0),
    "temp_offset": (-5.0, 5.0),
    "activity_window_sec": (5, 300),
    "activity_min_samples": (1, 300),
    "activity_score_normal": (0.0, 100.0),
    "baseline_default": (1e-6, 10.0),
    "baseline_warmup_windows": (1, 200),
    "baseline_alpha": (1e-6, 1.0),
    "baseline_update_min_ratio": (0.0, 1.0),
    "wearable_stale_sec": (1, 3600),
    "vision_stale_sec": (1, 3600),
    "fusion_interval_sec": (0.1, 60.0),
}

# Nilai yang SEDANG dipakai fusion: DEFAULT_SETTINGS sampai settings dari server
# masuk, lalu diganti satu per satu lewat apply_settings().
settings = dict(DEFAULT_SETTINGS)
settings_lock = threading.Lock()
settings_source = "default"


def setting(kunci):
    """Baca satu tunable di bawah lock, supaya apply_settings() tidak mengikili
    proses yang sedang menulis fusion."""
    with settings_lock:
        return settings[kunci]


def snapshot():
    """Salinan settings saat ini, untuk ditampilkan ke server."""
    with settings_lock:
        return dict(settings)


def source():
    with settings_lock:
        return settings_source


def reset():
    """Kembalikan ke default, untuk pengujian."""
    global settings_source

    with settings_lock:
        settings.update(DEFAULT_SETTINGS)
        settings_source = "default"


def apply_settings(baru, sumber="server"):
    """Terapkan settings dari server.

    Kunci yang tidak dikenal diabaikan diam-diam: server yang lebih baru boleh
    mengirim field yang belum dipahami Pi ini tanpa mematikan fusion. `updated_at`
    ikut diabaikan karena itu metadata, bukan tunable.

    Mengembalikan dict kunci yang benar-benar berubah, atau None kalau tidak ada
    yang berubah. Pemanggil memakai nilai balik itu untuk memutuskan apakah perlu
    menunggu polling penuh.
    """
    if not isinstance(baru, dict):
        return None

    with settings_lock:
        berubah = _terapkan(baru, sumber)

    return berubah or None


def apply_dari_server(baru):
    """Terapkan payload dari settings_sync dan laporkan apakah itu diterima.

    Bedanya dengan apply_settings(): nilai balik di sini berarti "payload-nya
    masuk", bukan "ada yang berubah". Payload yang isinya sama dengan settings
    yang sedang dipakai tetap dianggap diterima, karena tidak ada yang perlu
    ditulis ulang bukan berarti gagal.

    settings_sync memakai nilai balik ini untuk memilih interval tunggu:
    RETRY_SECONDS saat ditolak, POLL_SECONDS saat diterima.
    """
    if not isinstance(baru, dict):
        return False, None

    berubah = apply_settings(baru, sumber="server")

    return True, berubah


def _terapkan(baru, sumber):
    global settings_source

    berubah = {}

    for kunci, nilai in baru.items():
        if kunci == "updated_at" or kunci not in DEFAULT_SETTINGS:
            continue

        if bukan_angka(nilai):
            print(f"[settings] abaikan {kunci}={nilai!r} (bukan angka)")
            continue

        angka = float(nilai)
        batas = RENTANG[kunci]
        if angka < batas[0] or angka > batas[1]:
            print(f"[settings] abaikan {kunci}={nilai!r} (di luar rentang {batas})")
            continue

        # Kunci bulat harus tetap bulat: 30.7 sampel bukan hal yang masuk akal.
        nilai_akhir = int(round(angka)) if isinstance(DEFAULT_SETTINGS[kunci], int) else angka

        if settings[kunci] != nilai_akhir:
            settings[kunci] = nilai_akhir
            berubah[kunci] = nilai_akhir

    if _perbaiki_pita_ambang():
        return berubah or None

    if berubah:
        settings_source = sumber
        print(f"[settings] diterapkan dari {sumber}: {berubah}")

    return berubah


def _perbaiki_pita_ambang():
    """Jaga supaya Waspada selalu di bawah Berisiko Tinggi.

    Kalau tidak, skor tidak pernah masuk ke salah satu pita dan Pi akan
    melaporkan "Normal" terus. Ambang yang saling menabrak dikembalikan ke
    default, karena menebak tidak lebih baik daripada tidak mengubah apa pun.
    """
    if settings["waspada_threshold"] < settings["tinggi_threshold"]:
        return False

    print("[settings] abaikan: ambang Waspada harus lebih kecil dari Berisiko Tinggi")
    settings["waspada_threshold"] = DEFAULT_SETTINGS["waspada_threshold"]
    settings["tinggi_threshold"] = DEFAULT_SETTINGS["tinggi_threshold"]

    return True


def bukan_angka(nilai):
    # bool adalah subclass int di Python, jadi True akan lolos float() sebagai 1.
    return isinstance(nilai, bool) or not isinstance(nilai, (int, float))
