import { Head } from '@inertiajs/react';
import { Palette } from 'lucide-react';
import AppearanceTabs from '@/components/appearance-tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Tampilan" />

            <h1 className="sr-only">Pengaturan tampilan</h1>

            <Card className="gap-5 py-6">
                <CardHeader className="px-6">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Palette className="size-4 text-brand-primary dark:text-brand-accent" />
                        Tampilan
                    </CardTitle>
                    <p className="text-xs text-gray-500">
                        Sesuaikan tema antarmuka akun Anda.
                    </p>
                </CardHeader>

                <CardContent className="px-6">
                    <AppearanceTabs />
                </CardContent>
            </Card>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Tampilan',
            href: editAppearance(),
        },
    ],
};
