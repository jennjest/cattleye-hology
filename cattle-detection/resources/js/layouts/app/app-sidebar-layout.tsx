import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0">
                <AppTopbar breadcrumbs={breadcrumbs} />
                {/* `SidebarInset` is already a <main>; nesting another one
                    would break the document outline. */}
                <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}
