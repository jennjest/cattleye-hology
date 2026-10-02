import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /**
     * How the item is highlighted: `exact` only lights up on its own URL,
     * `prefix` also lights up on every child URL (e.g. Detail Ternak while a
     * cow page is open).
     */
    match?: 'exact' | 'prefix';
    /**
     * Extra URL prefixes that should also light the item up, for entries whose
     * destination has more than one URL (e.g. Detail Ternak is reachable both
     * as `/detail` and as `/cows/{cow}`).
     */
    activePrefixes?: string[];
};
