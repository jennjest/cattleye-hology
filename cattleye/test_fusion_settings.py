"""Smoke test untuk fusion_settings.py.

Modul ini sengaja bebas cv2/numpy/mqtt supaya bisa diuji di mesin development
yang tidak punya kamera. Jalankan: python3 test_fusion_settings.py
"""
import fusion_settings as fs

failures = []


def check(label, got, want):
    ok = got == want
    print(("PASS " if ok else "FAIL ") + label + f": {got!r}" + ("" if ok else f"  (want {want!r})"))
    if not ok:
        failures.append(label)


# --- default harus sama dengan yang di-seed migration -----------------------
check("default waspsada", fs.setting("waspada_threshold"), 33.0)
check("default tinggi", fs.setting("tinggi_threshold"), 60.0)
check("default window", fs.setting("activity_window_sec"), 30)
check("sumber awal", fs.source(), "default")

# --- payload valid diterapkan -----------------------------------------------
berubah = fs.apply_settings({"waspada_threshold": 25, "tinggi_threshold": 55, "temp_offset": 1.5})
check("ada perubahan dilaporkan", berubah, {"waspada_threshold": 25.0, "tinggi_threshold": 55.0, "temp_offset": 1.5})
check("waspada baru", fs.setting("waspada_threshold"), 25.0)
check("tinggi baru", fs.setting("tinggi_threshold"), 55.0)
check("temp_offset baru", fs.setting("temp_offset"), 1.5)
check("sumber jadi server", fs.source(), "server")

# --- payload identik tidak dianggap berubah ---------------------------------
check("tanpa perubahan -> None", fs.apply_settings({"waspada_threshold": 25}), None)

# --- kunci bulat tetap bulat -----------------------------------------------
fs.apply_settings({"activity_window_sec": 45.0})
check("nilai int tetap int", fs.setting("activity_window_sec"), 45)
check("tipe int", type(fs.setting("activity_window_sec")).__name__, "int")

# --- nilai di luar rentang ditolak, field lain dalam payload yang sama jalan --
fs.apply_settings({"waspada_threshold": 500, "tinggi_threshold": 70})
check("di luar rentang ditolak", fs.setting("waspada_threshold"), 25.0)
check("field lain tetap diterapkan", fs.setting("tinggi_threshold"), 70.0)

# --- tipe salah ditolak -------------------------------------------------------
fs.apply_settings({"temp_offset": True})
check("bool ditolak", fs.setting("temp_offset"), 1.5)
fs.apply_settings({"baseline_alpha": "abc"})
check("string ditolak", fs.setting("baseline_alpha"), 0.002)
fs.apply_settings({"baseline_alpha": None})
check("None ditolak", fs.setting("baseline_alpha"), 0.002)

# --- kunci asing diabaikan, updated_at bukan tunable -------------------------
fs.apply_settings({"waspada_threshold": 30, "tidak_dikenal": 99, "updated_at": "2026-01-01T00:00:00+00:00"})
check("kunci asing diabaikan", "tidak_dikenal" in fs.settings, False)
check("updated_at bukan tunable", "updated_at" in fs.settings, False)
check("waspada tetap diterapkan", fs.setting("waspada_threshold"), 30.0)

# --- ambang yang menabrak dikembalikan ke default ----------------------------
fs.apply_settings({"waspada_threshold": 80, "tinggi_threshold": 20})
check("waspada > tinggi -> default", fs.setting("waspada_threshold"), 33.0)
check("tinggi ikut default", fs.setting("tinggi_threshold"), 60.0)

fs.apply_settings({"waspada_threshold": 40, "tinggi_threshold": 40})
check("sama-sama 40 -> default", fs.setting("waspada_threshold"), 33.0)

# --- payload rusak tidak boleh exception ------------------------------------
fs.apply_settings(None)
fs.apply_settings("bukan dict")
fs.apply_settings([1, 2, 3])
check("payload rusak aman", fs.setting("waspada_threshold"), 33.0)

# --- snapshot tidak bocor ke luar -------------------------------------------
snap = fs.snapshot()
snap["waspada_threshold"] = 999
check("snapshot terisolasi", fs.setting("waspada_threshold"), 33.0)

# --- reset -------------------------------------------------------------------
fs.apply_settings({"waspada_threshold": 20, "activity_window_sec": 60})
fs.reset()
check("reset threshold", fs.setting("waspada_threshold"), 33.0)
check("reset window", fs.setting("activity_window_sec"), 30)
check("reset source", fs.source(), "default")

# --- apply_dari_server: "diterima" != "berubah" -----------------------------
# Loop settings_sync memakai nilai balik pertama untuk memilih interval tunggu.
# Kalau payload yang isinya sama dengan settings sekarang dianggap ditolak, Pi
# akan menarik ulang tiap 30 detik selamanya.
fs.reset()
diterima, berubah = fs.apply_dari_server({"waspada_threshold": 33})
check("payload identik tetap diterima", diterima, True)
check("payload identik tidak dilaporkan berubah", berubah, None)
check("settings tidak berubah", fs.setting("waspada_threshold"), 33.0)

diterima, berubah = fs.apply_dari_server({"waspada_threshold": 30})
check("payload baru diterima", diterima, True)
check("payload baru dilaporkan berubah", berubah, {"waspada_threshold": 30.0})

check("payload bukan dict ditolak", fs.apply_dari_server("bukan dict")[0], False)
check("payload None ditolak", fs.apply_dari_server(None)[0], False)

print()
if failures:
    print(f"GAGAL {len(failures)}: {failures}")
    raise SystemExit(1)
print("SEMUA LOLOS")
