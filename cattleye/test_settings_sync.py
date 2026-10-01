"""Smoke test untuk settings_sync.py.

Tidak memanggil jaringan sungguhan: responses-nya dikasih stub. Jalankan:
python3 test_settings_sync.py
"""
import os
import sys
import threading
import types

# requests tidak terpasang di mesin development ini, dan test ini tidak pernah
# menyentuh jaringan sungguhan karena semua session-nya di-stub.
if "requests" not in sys.modules:
    stub = types.ModuleType("requests")

    def _tidak_dipakai(*a, **k):
        raise AssertionError("test ini harusnya tidak memanggil requests sungguhan")

    stub.get = _tidak_dipakai
    stub.post = _tidak_dipakai
    sys.modules["requests"] = stub

import settings_sync

failures = []


def check(label, got, want):
    ok = got == want
    print(("PASS " if ok else "FAIL ") + label + f": {got!r}" + ("" if ok else f"  (want {want!r})"))
    if not ok:
        failures.append(label)


class FakeResponse:
    def __init__(self, payload, status=200, raises=False):
        self._payload = payload
        self.status = status
        self._raises = raises

    def raise_for_status(self):
        if self._raises:
            raise RuntimeError("HTTP 500")

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def get(self, url, headers=None, timeout=None):
        self.calls.append({"url": url, "headers": headers, "timeout": timeout})
        nxt = self.responses.pop(0) if self.responses else FakeResponse({"data": {}})
        if isinstance(nxt, Exception):
            raise nxt
        return nxt


# --- happy path --------------------------------------------------------------
session = FakeSession([FakeResponse({"data": {"waspada_threshold": 25, "tinggi_threshold": 55}})])
hasil = settings_sync.fetch_settings("http://server.test/", "token-abc", session)
check("settings diambil", hasil, {"waspada_threshold": 25, "tinggi_threshold": 55})
check("url benar", session.calls[0]["url"], "http://server.test/api/fusion-settings")
check("bearer token dikirim", session.calls[0]["headers"]["Authorization"], "Bearer token-abc")
check("timeout dikirim", session.calls[0]["timeout"], settings_sync.TIMEOUT)

# --- server tidak bisa dihubungi -> None, bukan exception --------------------
check("timeout", settings_sync.fetch_settings("http://x", "t", FakeSession([FakeResponse(None, raises=True)])), None)
check("koneksi ditolak", settings_sync.fetch_settings("http://x", "t", FakeSession([ConnectionError("refused")])), None)
check("HTTP 500", settings_sync.fetch_settings("http://x", "t", FakeSession([FakeResponse(None, status=500, raises=True)])), None)

# --- balasan tidak masuk akal -> None ---------------------------------------
check("data kosong", settings_sync.fetch_settings("http://x", "t", FakeSession([FakeResponse({"data": {}})])), None)
check("data bukan dict", settings_sync.fetch_settings("http://x", "t", FakeSession([FakeResponse({"data": "x"})])), None)
check("bukan json", settings_sync.fetch_settings("http://x", "t", FakeSession([FakeResponse([1, 2, 3])])), None)

# --- loop: berhenti setelah apply berhasil ----------------------------------
stop = threading.Event()
terpakai = []
sesi = FakeSession([FakeResponse({"data": {"waspada_threshold": 25}})])


def apply_ok(data):
    terpakai.append(data)
    stop.set()
    return True


settings_sync.settings_loop(apply_ok, "http://server.test", "token", sesi, stop)
check("apply dipanggil sekali", len(terpakai), 1)
check("isi sampai apply", terpakai[0], {"waspada_threshold": 25})

# --- loop: apply yang melempar tidak mematikan thread -----------------------
stop2 = threading.Event()
percobaan = []


def apply_boom(data):
    percobaan.append(data)
    if len(percobaan) >= 2:
        stop2.set()
    raise ValueError("payload rusak")


settings_sync.RETRY_SECONDS = 0.01
settings_sync.settings_loop(
    apply_boom, "http://server.test", "token",
    FakeSession([FakeResponse({"data": {"x": 1}}), FakeResponse({"data": {"x": 2}})]),
    stop2,
)
check("apply yang error dicoba lagi", len(percobaan), 2)

# --- loop: apply menolak payload -> tunggu retry, tidak LANJUT polling -----
stop3 = threading.Event()
percobaan3 = []


def apply_tolak(data):
    percobaan3.append(data)
    if len(percobaan3) >= 2:
        stop3.set()
    return False


settings_sync.settings_loop(
    apply_tolak, "http://server.test", "token",
    FakeSession([FakeResponse({"data": {"a": 1}}), FakeResponse({"data": {"a": 2}})]),
    stop3,
)
check("payload ditolak diulang", len(percobaan3), 2)

# --- loop tanpa token langsung berhenti -------------------------------------
called = []
settings_sync.settings_loop(lambda d: called.append(d), "http://server.test", "", None)
check("tanpa token tidak poll", called, [])

print()
if failures:
    print(f"GAGAL {len(failures)}: {failures}")
    raise SystemExit(1)
print("SEMUA LOLOS")
