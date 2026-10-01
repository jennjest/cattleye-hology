import { AlertTriangleIcon, CheckCircle2Icon, HardDriveIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { fusionSettingGroups, type FusionSettings } from '@/types/fusion-settings';

/**
 * Tells the operator whether the numbers on this form are the ones the Pi is
 * actually running.
 *
 * The Pi pulls the settings on its own schedule (default 60s, see
 * cattleye/settings_sync.py), so a freshly saved value is not live yet. Without
 * this panel the page would quietly claim a threshold that no longer applies,
 * and the mismatch would only surface as a cow that looks fine but never alerts.
 */

type Props = {
    reachable: boolean;
    message: string | null;
    drifted: (keyof FusionSettings)[];
};

export default function FusionDeviceStatus({
    reachable,
    message,
    drifted,
}: Props) {
    const labels = new Map(
        fusionSettingGroups
            .flatMap((group) => group.fields)
            .map((field) => [field.name, field.label]),
    );

    return (
        <Alert variant={reachable ? 'default' : 'destructive'}>
            {reachable ? (
                <CheckCircle2Icon />
            ) : drifted.length > 0 ? (
                <AlertTriangleIcon />
            ) : (
                <HardDriveIcon />
            )}

            <AlertTitle>
                {!reachable
                    ? 'Raspberry Pi tidak dapat dihubungi'
                    : drifted.length > 0
                      ? `${drifted.length} setting belum sampai ke Pi`
                      : 'Pi menjalankan setting yang sama'}
            </AlertTitle>

            <AlertDescription>
                {!reachable ? (
                    <>
                        {message ??
                            'Alamat Pi belum diisi atau Pi tidak menjawab.'}{' '}
                        Setting di bawah tetap tersimpan, dan Pi akan mengambilnya
                        sendiri setelah koneksi kembali. Selama ini Pi berjalan
                        dengan nilai terakhir yang diterimanya.
                    </>
                ) : drifted.length > 0 ? (
                    <>
                        Pi masih memakai nilai lama untuk:{' '}
                        <span className="font-medium">
                            {drifted
                                .map((name) => labels.get(name) ?? name)
                                .join(', ')}
                        </span>
                        . Pi mengambil setting baru pada polling berikutnya
                        (bawaan 60 detik).
                    </>
                ) : (
                    <>
                        Semua ambang dan parameter di halaman ini sudah aktif di
                        Raspberry Pi.
                    </>
                )}
            </AlertDescription>

            {drifted.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {drifted.map((name) => (
                        <Badge key={name} variant="outline">
                            {labels.get(name) ?? name}
                        </Badge>
                    ))}
                </div>
            )}
        </Alert>
    );
}
