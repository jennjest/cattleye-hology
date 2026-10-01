/**
 * Fusion tunables that live in the database and are applied on the Pi.
 *
 * The keys mirror `fusion_settings` in the database and `DEFAULT_SETTINGS` in
 * cattleye/fusion_settings.py. The three groups map to the three sections of the
 * settings form: risk bands, the wearable/temperature correction, and the
 * activity/baseline scoring.
 *
 * The values are always numbers: Laravel sends them as floats and the Pi keeps
 * whole-number keys whole, so the form does not have to deal with string
 * coercion. See app/Models/FusionSetting.php.
 */

export type FusionSettings = {
    /** Lower risk-score boundary: below this the cow is Normal. */
    waspada_threshold: number;
    /** Upper boundary: at or above this the cow is Berisiko Tinggi. */
    tinggi_threshold: number;

    /** Core minus skin temperature, from calibrating the MLX90614 collar. */
    temp_offset: number;

    activity_window_sec: number;
    activity_min_samples: number;
    activity_score_normal: number;

    baseline_default: number;
    baseline_warmup_windows: number;
    baseline_alpha: number;
    baseline_update_min_ratio: number;

    /** Age at which an input counts as missing rather than being fused. */
    wearable_stale_sec: number;
    vision_stale_sec: number;
    fusion_interval_sec: number;
};

/**
 * What `GET /api/settings` on the Pi reported.
 *
 * `reachable: false` means the Pi could not be asked at all, which is different
 * from `applied: null`: the page must not claim the saved values are live.
 */
export type DeviceFusionSettings = {
    reachable: boolean;
    applied: Partial<FusionSettings> | null;
    message: string | null;
};

/** One tunable as presented to the operator, with the metadata the form needs. */
export type FusionSettingField = {
    name: keyof FusionSettings;
    label: string;
    description: string;
    step: string;
    min: number;
    max: number;
    unit?: string;
};

export type FusionSettingGroup = {
    title: string;
    description: string;
    fields: FusionSettingField[];
};

/**
 * Field definitions live here rather than in the controller so the range shown
 * next to each input is the same range the request validates on the server.
 */
export const fusionSettingGroups: FusionSettingGroup[] = [
    {
        title: 'Ambang risiko',
        description:
            'Menentukan kapan skor fusion dibaca sebagai Waspada atau Berisiko Tinggi. Ambang Waspada harus selalu lebih kecil dari Berisiko Tinggi.',
        fields: [
            {
                name: 'waspada_threshold',
                label: 'Ambang Waspada',
                description:
                    'Di bawah nilai ini sapi dianggap Normal. Turunkan supaya peringatan lebih sering.',
                step: '1',
                min: 0,
                max: 100,
            },
            {
                name: 'tinggi_threshold',
                label: 'Ambang Berisiko Tinggi',
                description:
                    'Di atas nilai ini sapi dianggap berisiko tinggi dan memicu notifikasi.',
                step: '1',
                min: 0,
                max: 100,
            },
        ],
    },
    {
        title: 'Suhu',
        description:
            'MLX90614 di kalung membaca suhu permukaan, bukan suhu tubuh inti, jadi perlu dikoreksi.',
        fields: [
            {
                name: 'temp_offset',
                label: 'Koreksi suhu (°C)',
                description:
                    'Isi dengan (suhu inti - suhu permukaan) hasil kalibrasi. 0 berarti belum dikalibrasi.',
                step: '0.1',
                min: -5,
                max: 5,
                unit: '°C',
            },
        ],
    },
    {
        title: 'Aktivitas dan baseline',
        description:
            'Skor aktivitas dihitung dari rasio accelerom terhadap baseline yang dipelajari Pi. Baseline terlalu rendah membuat sapi yang rebahan terlihat aktif.',
        fields: [
            {
                name: 'activity_window_sec',
                label: 'Jendela aktivitas (detik)',
                description:
                    'Panjang buffer accelerometer. Firmware mengirim 1 Hz, jadi 30 detik berarti sekitar 30 sampel.',
                step: '1',
                min: 5,
                max: 300,
                unit: 'dtk',
            },
            {
                name: 'activity_min_samples',
                label: 'Minimum sampel',
                description:
                    'Sampel minimal dalam jendela sebelum aktivitas boleh dihitung. Di bawah ini aktivitas dianggap tidak tersedia.',
                step: '1',
                min: 1,
                max: 300,
            },
            {
                name: 'activity_score_normal',
                label: 'Skor aktivitas normal',
                description:
                    'Skor saat rasio aktivitas sama dengan baseline, yaitu saat sapi tenang.',
                step: '0.1',
                min: 0,
                max: 100,
            },
            {
                name: 'baseline_default',
                label: 'Baseline awal',
                description:
                    'Baseline standar magnitudo (g) sebelum dipelajari. Wajib dikalibrasi dari rekaman sensor asli.',
                step: '0.001',
                min: 0.000001,
                max: 10,
                unit: 'g',
            },
            {
                name: 'baseline_warmup_windows',
                label: 'Jendela pemanasan',
                description:
                    'Berapa jendela aktivitas yang dikumpulkan sebelum baseline dianggap siap.',
                step: '1',
                min: 1,
                max: 200,
            },
            {
                name: 'baseline_alpha',
                label: 'Laju baseline (EMA)',
                description:
                    'Seberapa cepat baseline mengikuti kebiasaan sapi. Makin kecil, makin lambat.',
                step: '0.0001',
                min: 0.000001,
                max: 1,
            },
            {
                name: 'baseline_update_min_ratio',
                label: 'Rasio minimum pembaruan',
                description:
                    'Jendela yang sangat lesu tidak dipakai memperbarui baseline, supaya sapi yang tidak bergerak tidak ikut menurunkan baseline.',
                step: '0.01',
                min: 0,
                max: 1,
            },
        ],
    },
    {
        title: 'Kesegaran data',
        description:
            'Input yang terlalu lama diabaikan dan fusion memakai nilai netral, supaya data basi tidak terlihat seperti sapi sehat.',
        fields: [
            {
                name: 'wearable_stale_sec',
                label: 'Batas kedaluwarsa wearable',
                description: 'Umur maksimum data kalung sebelum dianggap tidak tersedia.',
                step: '1',
                min: 1,
                max: 3600,
                unit: 'dtk',
            },
            {
                name: 'vision_stale_sec',
                label: 'Batas kedaluwarsa visual',
                description: 'Umur maksimum hasil deteksi PMK sebelum dianggap tidak tersedia.',
                step: '1',
                min: 1,
                max: 3600,
                unit: 'dtk',
            },
            {
                name: 'fusion_interval_sec',
                label: 'Interval fusion',
                description:
                    'Jeda antar perhitungan fusion. Makin kecil, makin segar, tapi makin berat CPU Pi.',
                step: '0.1',
                min: 0.1,
                max: 60,
                unit: 'dtk',
            },
        ],
    },
];

/**
 * Which tunables differ between what is stored on the server and what the Pi
 * reports running.
 *
 * Floating point noise is treated as equal, otherwise every field would look
 * out of sync because the server stores a decimal and the Pi a float.
 */
export function driftedFields(
    saved: FusionSettings,
    applied: Partial<FusionSettings>,
): (keyof FusionSettings)[] {
    return fusionSettingGroups
        .flatMap((group) => group.fields.map((field) => field.name))
        .filter((name) => {
            const device = applied[name];

            if (device === undefined) {
                return false;
            }

            return Math.abs(Number(device) - Number(saved[name])) > 1e-6;
        });
}
