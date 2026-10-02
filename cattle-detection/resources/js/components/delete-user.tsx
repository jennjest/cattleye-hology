import { Form } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);

    return (
        <Card className="gap-5 border-red-200 py-6 dark:border-red-900/50">
            <CardHeader className="px-6">
                <CardTitle className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                    <AlertTriangle className="size-4" />
                    Hapus Akun
                </CardTitle>
                <p className="text-xs text-gray-500">
                    Menghapus akun akan menghilangkan seluruh sumber daya dan
                    datanya secara permanen.
                </p>
            </CardHeader>

            <CardContent className="px-6">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button
                            variant="destructive"
                            data-test="delete-user-button"
                            className="rounded-xl text-xs font-bold"
                        >
                            Hapus Akun
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogTitle>
                            Yakin ingin menghapus akun Anda?
                        </DialogTitle>
                        <DialogDescription>
                            Setelah akun dihapus, seluruh sumber daya dan
                            datanya akan hilang permanen. Masukkan kata sandi
                            untuk mengonfirmasi bahwa Anda benar-benar ingin
                            menghapus akun ini.
                        </DialogDescription>

                        <Form
                            {...ProfileController.destroy.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            onError={() => passwordInput.current?.focus()}
                            resetOnSuccess
                            className="space-y-6"
                        >
                            {({ resetAndClearErrors, processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="password"
                                            className="sr-only"
                                        >
                                            Kata sandi
                                        </Label>

                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            ref={passwordInput}
                                            placeholder="Kata sandi"
                                            autoComplete="current-password"
                                        />

                                        <InputError message={errors.password} />
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button
                                                variant="secondary"
                                                onClick={() =>
                                                    resetAndClearErrors()
                                                }
                                            >
                                                Batal
                                            </Button>
                                        </DialogClose>

                                        <Button
                                            variant="destructive"
                                            disabled={processing}
                                            asChild
                                        >
                                            <button
                                                type="submit"
                                                data-test="confirm-delete-user-button"
                                            >
                                                Hapus Akun
                                            </button>
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
