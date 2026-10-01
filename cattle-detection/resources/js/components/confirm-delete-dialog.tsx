import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

/**
 * Confirmation before a destructive action.
 *
 * The caller supplies the description because the consequence differs per
 * entity: deleting a cow also removes its sensor, vision and risk rows, while
 * deleting an account just ends someone's access.
 */
type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    processing: boolean;
};

export default function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    onConfirm,
    processing,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangleIcon className="size-5 text-destructive" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

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
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={processing}
                    >
                        {processing ? "Menghapus..." : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
