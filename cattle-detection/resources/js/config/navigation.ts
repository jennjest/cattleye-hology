import {
    Activity,
    Beef,
    Gauge,
    History,
    LayoutGrid,
    Settings,
    Users,
} from "lucide-react";
import { dashboard } from "@/routes";
import { index as cowsIndex } from "@/routes/cows";
import { index as historyIndex } from "@/routes/history";
import { index as usersIndex } from "@/routes/users";
import { index as monitoringIndex } from "@/routes/monitoring";
import { edit as editFusionSettings } from "@/routes/fusion-settings";
import { edit as profileEdit } from "@/routes/profile";
import type { NavItem } from "@/types";

/**
 * Single source of truth for the CATTLEYE sidebar. Adding a page means adding
 * one entry here instead of editing the sidebar component.
 */
export const mainNavItems: NavItem[] = [
    {
        title: "Dashboard",
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: "Cows",
        href: cowsIndex(),
        icon: Beef,
    },
    {
        title: "Monitoring",
        href: monitoringIndex(),
        icon: Activity,
    },
    {
        title: "History",
        href: historyIndex(),
        icon: History,
    },
    {
        title: "Threshold fusion",
        href: editFusionSettings(),
        icon: Gauge,
    },
    {
        title: "Akun pengguna",
        href: usersIndex(),
        icon: Users,
    },
    {
        title: "Settings",
        href: profileEdit(),
        icon: Settings,
    },
];
