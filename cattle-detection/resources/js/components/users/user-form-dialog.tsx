import { useForm } from "@inertiajs/react";
import { useEffect } from "react";
import UsersController from "@/actions/App/Http/Controllers/Settings/UsersController";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUrl } from "@/lib/utils";
import type { ManagedUser } from "@/types/managed-user";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: ManagedUser;
    onSuccess: () => void;
};

/**
 * Create/edit form for a dashboard account.
 *
 * Editing is limited to name and email on purpose. Passwords are created here
 * but never changed here: a self-service reset already exists, and a password
 * field on this form would invite someone to reuse a password they do not
 * remember.
 */
export default function UserFormDialog({
    open,
    onOpenChange,
    user,
    onSuccess,
}: Props) {
    const { data, setData, submit, processing, errors, clearErrors } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({
            name: user?.name ?? "",
            email: user?.email ?? "",
            password: "",
            password_confirmation: "",
        });
    }, [open, user?.id, clearErrors, setData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {user ? `Edit akun ${user.email}` : "Tambah akun"}
                    </DialogTitle>
                    <DialogDescription>
                        {user
                            ? "Mengubah email berarti akun harus verifikasi ulang sebelum menerima notifikasi risiko."
                            : "Akun baru belum terverifikasi. Notifikasi risiko hanya dikirim ke akun yang emailnya sudah dikonfirmasi."}
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="user-form"
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (user) {
                            submit(
                                formatUrl(UsersController.update.form(user.id)),
                                { onSuccess },
                            );

                            return;
                        }

                        submit(formatUrl(UsersController.store.form()), {
                            onSuccess,
                        });
                    }}
                    className="space-y-4"
                >
                    <div className="grid gap-2">
                        <Label htmlFor="user-name">Nama</Label>
                        <Input
                            id="user-name"
                            name="name"
                            value={data.name}
                            onChange={(event) =>
                                setData("name", event.target.value)
                            }
                            placeholder="Sari"
                            autoComplete="off"
                            autoFocus
                            aria-invalid={Boolean(errors.name)}
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                            id="user-email"
                            name="email"
                            type="email"
                            value={data.email}
                            onChange={(event) =>
                                setData("email", event.target.value)
                            }
                            placeholder="sari@example.com"
                            autoComplete="off"
                            aria-invalid={Boolean(errors.email)}
                        />
                        <InputError message={errors.email} />
                    </div>

                    {!user && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="user-password">
                                    Kata sandi
                                </Label>
                                <Input
                                    id="user-password"
                                    name="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(event) =>
                                        setData("password", event.target.value)
                                    }
                                    autoComplete="new-password"
                                    aria-invalid={Boolean(errors.password)}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="user-password-confirmation">
                                    Ulangi kata sandi
                                </Label>
                                <Input
                                    id="user-password-confirmation"
                                    name="password_confirmation"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(event) =>
                                        setData(
                                            "password_confirmation",
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                    aria-invalid={Boolean(
                                        errors.password_confirmation,
                                    )}
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>
                        </>
                    )}
                </form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        Batal
                    </Button>

                    <Button
                        type="submit"
                        form="user-form"
                        disabled={processing}
                    >
                        {processing ? "Menyimpan..." : "Simpan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
