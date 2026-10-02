import { Form, Head, usePage } from '@inertiajs/react';
/* @chisel-email-verification */
import { Link } from '@inertiajs/react';
/* @end-chisel-email-verification */
import { Mail, User as UserIcon } from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
/* @chisel-email-verification */
import { send } from '@/routes/verification';
/* @end-chisel-email-verification */

type PageProps = {
    auth: Auth;
};

export default function Profile(
    /* @chisel-email-verification */
    {
        mustVerifyEmail,
        status,
    }: {
        mustVerifyEmail: boolean;
        status?: string;
    },
    /* @end-chisel-email-verification */
) {
    const { auth } = usePage<PageProps>().props;
    const getInitials = useInitials();

    return (
        <>
            <Head title="Profil Pengguna" />

            <h1 className="sr-only">Profil pengguna</h1>

            <Card className="gap-5 py-6">
                <CardHeader className="px-6">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <UserIcon className="size-4 text-brand-primary dark:text-brand-accent" />
                        Profil Pengguna
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6 px-6">
                    <div className="flex items-center gap-4">
                        <span className="flex size-16 items-center justify-center rounded-2xl border-2 border-brand-primary bg-brand-soft/70 text-lg font-bold text-brand-primary dark:bg-emerald-950/60 dark:text-brand-accent">
                            {getInitials(auth.user.name)}
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                                {auth.user.name}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {auth.user.email}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-brand-primary dark:text-brand-accent">
                                Tim Medis Peternakan
                            </p>
                        </div>
                    </div>

                    <Form
                        {...ProfileController.update.form()}
                        options={{ preserveScroll: true }}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="name"
                                        className="text-xs text-gray-500"
                                    >
                                        Nama Lengkap
                                    </Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Nama lengkap"
                                    />

                                    <InputError
                                        className="mt-1"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-xs text-gray-500"
                                    >
                                        Email
                                    </Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="alamat@email.com"
                                    />

                                    <InputError
                                        className="mt-1"
                                        message={errors.email}
                                    />
                                </div>

                                {/* @chisel-email-verification */}
                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                                            <p className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                                                <Mail className="mt-0.5 size-3.5 shrink-0" />
                                                <span>
                                                    Email Anda belum
                                                    diverifikasi.{' '}
                                                    <Link
                                                        href={send()}
                                                        as="button"
                                                        className="font-semibold underline underline-offset-4"
                                                    >
                                                        Kirim ulang email
                                                        verifikasi.
                                                    </Link>
                                                </span>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-xs font-medium text-green-600">
                                                    Tautan verifikasi baru telah
                                                    dikirim ke email Anda.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                {/* @end-chisel-email-verification */}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                        className="rounded-xl bg-brand-primary px-5 text-xs font-bold text-white hover:bg-brand-secondary"
                                    >
                                        Simpan Profil
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </CardContent>
            </Card>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profil Pengguna',
            href: edit(),
        },
    ],
};
