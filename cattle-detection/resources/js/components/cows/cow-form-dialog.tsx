import { useForm } from "@inertiajs/react";
import { useEffect } from "react";
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
import { formatUrl } from '@/lib/utils';

type Cow = {
    id: number;
    code: string;
    name: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cow?: Cow;
    /**
     * The create or update route. Passed in as a url/method pair because
     * Inertia's submit() needs the verb and URL, while the generated Wayfinder
     * `form()` helpers return the `action` shape used by the <Form> component.
     */
    action: ReturnType<typeof formatUrl>;
    onSuccess: () => void;
};

/**
 * Create/edit form for a cow.
 *
 * Owns its own form state so field errors land on the fields they belong to.
 * The parent controls only `open`, which is what lets the same component back
 * both the create and edit paths.
 */
export default function CowFormDialog({
    open,
    onOpenChange,
    cow,
    action,
    onSuccess,
}: Props) {
    const { data, setData, submit, processing, errors, clearErrors, reset } =
        useForm({
            code: "",
            name: "",
        });

    // The component stays mounted across opens, so the fields have to be
    // re-seeded every time the dialog becomes visible.
    useEffect(() => {
        if (!open) {
            return;
        }

        clearErrors();
        setData({ code: cow?.code ?? "", name: cow?.name ?? "" });
    }, [open, cow?.id, clearErrors, setData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {cow ? `Edit sapi ${cow.code}` : "Tambah sapi"}
                    </DialogTitle>
                    <DialogDescription>
                        Kode sapi dipakai sebagai kunci oleh Raspberry Pi, topik
                        MQTT, dan nama file ekspor CSV. Mengubahnya setelah data
                        terkumpul berarti data lama tidak lagi ikut terkelompok.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="cow-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit(action, { onSuccess });
                    }}
                    className="space-y-4"
                >
                    <div className="grid gap-2">
                        <Label htmlFor="code">Kode sapi</Label>
                        <Input
                            id="code"
                            name="code"
                            value={data.code}
                            onChange={(event) =>
                                setData("code", event.target.value)
                            }
                            placeholder="cow01"
                            autoComplete="off"
                            autoFocus
                            aria-invalid={Boolean(errors.code)}
                            aria-describedby="code-help"
                        />
                        <p
                            id="code-help"
                            className="text-xs text-muted-foreground"
                        >
                            Huruf kecil, angka, tanda hubung, dan garis bawah.
                            Contoh: cow01.
                        </p>
                        <InputError message={errors.code} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama sapi</Label>
                        <Input
                            id="name"
                            name="name"
                            value={data.name}
                            onChange={(event) =>
                                setData("name", event.target.value)
                            }
                            placeholder="Sari"
                            aria-invalid={Boolean(errors.name)}
                        />
                        <InputError message={errors.name} />
                    </div>
                </form>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                            reset();
                            onOpenChange(false);
                        }}
                        disabled={processing}
                    >
                        Batal
                    </Button>

                    {/* No DialogClose wrapper: the dialog has to stay open on a
                        validation error so the operator does not lose input. */}
                    <Button type="submit" form="cow-form" disabled={processing}>
                        {processing ? "Menyimpan..." : "Simpan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
