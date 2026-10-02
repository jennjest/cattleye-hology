import { Form, Head } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useRef } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/security';
/* @chisel-passkeys */
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
/* @end-chisel-passkeys */
/* @chisel-2fa */
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
/* @end-chisel-2fa */

// oxfmt-ignore
type Props = {
    passwordRules: string;
} /* @chisel-passkeys */ & ManagePasskeysProps /* @end-chisel-passkeys */ /* @chisel-2fa */ &
    ManageTwoFactorProps /* @end-chisel-2fa */;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Keamanan" />

            <h1 className="sr-only">Pengaturan keamanan</h1>

            <Card className="gap-5 py-6">
                <CardHeader className="px-6">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <ShieldCheck className="size-4 text-brand-primary dark:text-brand-accent" />
                        Keamanan Akun
                    </CardTitle>
                    <p className="text-xs text-gray-500">
                        Gunakan kata sandi yang panjang dan acak agar akun tetap
                        aman.
                    </p>
                </CardHeader>

                <CardContent className="px-6">
                    <Form
                        {...SecurityController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        resetOnError={[
                            'password',
                            'password_confirmation',
                            'current_password',
                        ]}
                        resetOnSuccess
                        onError={(errors) => {
                            if (errors.password) {
                                passwordInput.current?.focus();
                            }

                            if (errors.current_password) {
                                currentPasswordInput.current?.focus();
                            }
                        }}
                        className="space-y-4"
                    >
                        {({ errors, processing }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="current_password"
                                        className="text-xs text-gray-500"
                                    >
                                        Kata Sandi Saat Ini
                                    </Label>

                                    <PasswordInput
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900"
                                        autoComplete="current-password"
                                        placeholder="Kata sandi saat ini"
                                    />

                                    <InputError
                                        message={errors.current_password}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-xs text-gray-500"
                                    >
                                        Kata Sandi Baru
                                    </Label>

                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900"
                                        autoComplete="new-password"
                                        placeholder="Kata sandi baru"
                                        passwordrules={props.passwordRules}
                                    />

                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="password_confirmation"
                                        className="text-xs text-gray-500"
                                    >
                                        Konfirmasi Kata Sandi
                                    </Label>

                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        className="mt-1 block w-full rounded-xl border-gray-200 dark:border-slate-700 dark:bg-slate-900"
                                        autoComplete="new-password"
                                        placeholder="Ulangi kata sandi baru"
                                        passwordrules={props.passwordRules}
                                    />

                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-password-button"
                                        className="rounded-xl bg-brand-primary px-5 text-xs font-bold text-white hover:bg-brand-secondary"
                                    >
                                        Perbarui Kata Sandi
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </CardContent>
            </Card>

            {/* @chisel-2fa */}
            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />
            {/* @end-chisel-2fa */}

            {/* @chisel-passkeys */}
            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
            {/* @end-chisel-passkeys */}
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'Keamanan',
            href: edit(),
        },
    ],
};
