import { Form, Head } from '@inertiajs/react';
import { useMemo } from 'react';
import FusionSettingsController from '@/actions/App/Http/Controllers/Settings/FusionSettingsController';
import FusionDeviceStatus from '@/components/fusion/device-status';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { edit as editFusionSettings } from '@/routes/fusion-settings';
import {
    driftedFields,
    fusionSettingGroups,
    type DeviceFusionSettings,
    type FusionSettings,
} from '@/types/fusion-settings';

/**
 * Operator-facing page for the sensor fusion tunables.
 *
 * The fusion algorithm itself stays on the Raspberry Pi (cattleye/fusion_settings.py);
 * this page only stores the numbers it applies. Two things are deliberate here:
 *
 *  - the numbers are `number` inputs with `step`, not sliders. A wrong threshold
 *    hides a sick cow, so the operator should type the value they calibrated.
 *  - the device panel at the top is not decoration. The Pi pulls the settings on
 *    its own schedule, so a saved value is not a live value until the Pi says so.
 */

type Props = {
    settings: FusionSettings;
    updatedAt: string | null;
    defaults: FusionSettings;
    device: DeviceFusionSettings;
};

export default function FusionSettings({
    settings,
    updatedAt,
    defaults,
    device,
}: Props) {
    const drifted = useMemo(
        () =>
            device.applied ? driftedFields(settings, device.applied) : [],
        [settings, device.applied],
    );

    return (
        <>
            <Head title="Threshold fusion" />

            <h1 className="sr-only">Threshold sensor fusion</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Threshold fusion"
                    description="Atur ambang risiko dan parameter sensor yang dipakai Raspberry Pi"
                />

                <FusionDeviceStatus
                    reachable={device.reachable}
                    message={device.message}
                    drifted={drifted}
                />

                <Form
                    {...FusionSettingsController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors, recentlySuccessful }) => (
                        <>
                            {fusionSettingGroups.map((group, index) => (
                                <Card key={group.title}>
                                    <CardHeader>
                                        <CardTitle>{group.title}</CardTitle>
                                        <CardDescription>
                                            {group.description}
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="grid gap-5 md:grid-cols-2">
                                        {group.fields.map((field) => {
                                            const error =
                                                errors[
                                                    field.name as keyof typeof errors &
                                                        string
                                                ];
                                            const defaultValue =
                                                defaults[field.name];

                                            return (
                                                <div key={field.name} className="grid gap-2">
                                                    <Label htmlFor={field.name}>
                                                        {field.label}
                                                        {field.unit && (
                                                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                                ({field.unit})
                                                            </span>
                                                        )}
                                                    </Label>

                                                    <Input
                                                        id={field.name}
                                                        name={field.name}
                                                        type="number"
                                                        inputMode="decimal"
                                                        step={field.step}
                                                        min={field.min}
                                                        max={field.max}
                                                        defaultValue={settings[field.name]}
                                                        key={`${field.name}-${String(settings[field.name])}`}
                                                        aria-invalid={Boolean(error)}
                                                        aria-describedby={`${field.name}-help`}
                                                    />

                                                    <p
                                                        id={`${field.name}-help`}
                                                        className="text-xs text-muted-foreground"
                                                    >
                                                        {field.description}
                                                    </p>

                                                    <InputError message={error} />

                                                    {Number(settings[field.name]) !==
                                                        Number(defaultValue) && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Bawaan Pi:{' '}
                                                            {defaultValue}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            ))}

                            <Separator />

                            <div className="flex items-center gap-4">
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Menyimpan...' : 'Simpan threshold'}
                                </Button>

                                {recentlySuccessful && (
                                    <p className="text-sm text-muted-foreground">
                                        Tersimpan
                                        {updatedAt
                                            ? ` · ${new Date(updatedAt).toLocaleString('id-ID')}`
                                            : ''}
                                        . Pi menerimanya pada polling
                                        berikutnya.
                                    </p>
                                )}

                                {Object.keys(errors).length > 0 && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                        Periksa kembali nilai yang ditandai.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

FusionSettings.layout = {
    breadcrumbs: [
        {
            title: 'Threshold fusion',
            href: editFusionSettings(),
        },
    ],
};
