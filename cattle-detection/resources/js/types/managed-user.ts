export type ManagedUser = {
    id: number;
    name: string;
    email: string;
    /** ISO timestamp, or null while the address is still unverified. */
    email_verified_at: string | null;
    created_at: string | null;
};
