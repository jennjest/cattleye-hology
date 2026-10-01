import { Head, useForm } from "@inertiajs/react";
import {
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
    Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import UsersController from "@/actions/App/Http/Controllers/Settings/UsersController";
import ConfirmDeleteDialog from "@/components/confirm-delete-dialog";
import Heading from "@/components/heading";
import UserFormDialog from "@/components/users/user-form-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatUrl } from "@/lib/utils";
import { dashboard } from "@/routes";
import { edit as profileEdit } from "@/routes/profile";
import { index as usersIndex } from "@/routes/users";
import type { ManagedUser } from "@/types/managed-user";

/**
 * Account list for whoever manages the herd.
 *
 * The verification column is the point of this page rather than a detail: a
 * risk alert that is queued but silently discarded because the address was
 * never confirmed looks identical to an alert that was never triggered.
 */

type Props = {
    users: ManagedUser[];
    currentUserId: number | null;
};

export default function UsersSettings({ users, currentUserId }: Props) {
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ManagedUser | undefined>(undefined);
    const [deleting, setDeleting] = useState<ManagedUser | null>(null);

    const deleteForm = useForm({});

    return (
        <>
            <Head title="Akun pengguna" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <Heading
                        title="Akun pengguna"
                        description="Akun yang bisa masuk ke dashboard CATTLEYE dan menerima notifikasi risiko."
                        className="mb-0"
                    />

                    <Button
                        onClick={() => {
                            setEditing(undefined);
                            setFormOpen(true);
                        }}
                    >
                        <PlusIcon />
                        Tambah akun
                    </Button>
                </div>

                <Card className="gap-4 py-4">
                    <CardHeader className="px-4">
                        <CardTitle className="text-base">
                            {users.length} akun terdaftar
                        </CardTitle>
                        <CardDescription>
                            Hanya akun dengan email terverifikasi yang menerima
                            notifikasi risiko. Menambah akun di sini tidak
                            mengirim email verifikasi otomatis.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-4">
                        <div className="overflow-x-auto rounded-xl border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Status email</TableHead>
                                        <TableHead className="w-12" />
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {users.map((user) => {
                                        const isCurrentUser =
                                            user.id === currentUserId;

                                        return (
                                            <TableRow key={user.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar>
                                                            <AvatarFallback>
                                                                {initialsOf(
                                                                    user.name,
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium">
                                                                {user.name}
                                                            </div>
                                                            {isCurrentUser && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    Akun Anda
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="font-mono text-xs">
                                                    {user.email}
                                                </TableCell>

                                                <TableCell>
                                                    {user.email_verified_at ? (
                                                        <Badge>
                                                            Terverifikasi
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary">
                                                            Belum verifikasi
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label={`Kelola ${user.email}`}
                                                            >
                                                                <MoreHorizontalIcon />
                                                            </Button>
                                                        </DropdownMenuTrigger>

                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onSelect={() => {
                                                                    setEditing(
                                                                        user,
                                                                    );
                                                                    setFormOpen(
                                                                        true,
                                                                    );
                                                                }}
                                                            >
                                                                <PencilIcon />
                                                                Edit
                                                            </DropdownMenuItem>

                                                            {/* The server refuses both of these, so the
                                                                menu items are hidden rather than left to fail
                                                                with an error message after the fact. */}
                                                            {!isCurrentUser && (
                                                                <DropdownMenuItem
                                                                    variant="destructive"
                                                                    onSelect={() =>
                                                                        setDeleting(
                                                                            user,
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2Icon />
                                                                    Hapus
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <UserFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                user={editing}
                onSuccess={() => {
                    setFormOpen(false);
                    setEditing(undefined);
                }}
            />

            <ConfirmDeleteDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Hapus akun ${deleting?.email ?? ""}?`}
                description={
                    deleting
                        ? `Akun ${deleting.name} tidak bisa masuk lagi dan berhenti menerima notifikasi risiko. Akun terakhir tidak bisa dihapus.`
                        : ""
                }
                confirmLabel="Hapus akun"
                processing={deleteForm.processing}
                onConfirm={() => {
                    if (!deleting) {
                        return;
                    }

                    deleteForm.submit(
                        formatUrl(UsersController.destroy.form(deleting.id)),
                        {
                            onSuccess: () => setDeleting(null),
                        },
                    );
                }}
            />
        </>
    );
}

function initialsOf(name: string): string {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("");
}

UsersSettings.layout = {
    breadcrumbs: [
        {
            title: "Dashboard",
            href: dashboard(),
        },
        {
            title: "Pengaturan",
            href: profileEdit(),
        },
        {
            title: "Akun pengguna",
            href: usersIndex(),
        },
    ],
};
