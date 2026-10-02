import {
    Activity,
    LayoutGrid,
    LineChart,
    ListTree,
    Map as MapIcon,
    Settings,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { index as barnMapIndex } from '@/routes/barn-map';
import { index as cowsIndex } from '@/routes/cows';
import { index as analyticsIndex } from '@/routes/analytics';
import { index as detailIndex } from '@/routes/detail';
import { edit as profileEdit } from '@/routes/profile';
import type { NavItem } from '@/types';

/**
 * Single source of truth for the CATTLEYE sidebar, mirroring the six entries of
 * "Desain Dashboard.html". Adding a page means adding one entry here instead of
 * editing the sidebar component.
 */
export const mainNavItems: NavItem[] = [
    {
        title: 'Gambaran Umum',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Peta Kandang',
        href: barnMapIndex(),
        icon: MapIcon,
    },
    {
        title: 'Daftar Ternak',
        href: cowsIndex(),
        icon: ListTree,
    },
    {
        title: 'Detail Ternak',
        href: detailIndex(),
        icon: Activity,
        // `cows/show` is the same destination as `/detail`, so light the item up
        // on both URLs.
        activePrefixes: ['/cows/'],
    },
    {
        title: 'Analitik',
        href: analyticsIndex(),
        icon: LineChart,
    },
    {
        title: 'Pengaturan',
        href: profileEdit(),
        icon: Settings,
        // Every settings sub-route belongs to this entry.
        activePrefixes: ['/settings'],
    },
];
