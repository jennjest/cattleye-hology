import { Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
} from '@/components/ui/sidebar';
import { mainNavItems } from '@/config/navigation';
import { dashboard } from '@/routes';

/**
 * Fixed brand rail on the left, matching the `<aside>` of
 * "Desain Dashboard.html": logo block on top, navigation in the middle,
 * operator summary pinned to the bottom.
 */
export function AppSidebar() {
    return (
        <Sidebar
            collapsible="offcanvas"
            variant="sidebar"
            className="border-0 bg-brand-primary text-white shadow-xl dark:bg-brand-dark"
        >
            <div className="flex h-full flex-col justify-between">
                <div>
                    <Link
                        href={dashboard()}
                        prefetch
                        className="flex items-center gap-3 border-b border-brand-secondary/40 px-5 py-6"
                    >
                        <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-brand-light text-xl font-bold text-brand-dark shadow-md">
                            <Eye className="size-6" strokeWidth={2.5} />
                        </span>
                        <span>
                            <span className="block text-lg leading-none font-bold tracking-tight text-white">
                                CATTLEYE
                            </span>
                            <span className="block text-[8px] font-medium tracking-wider text-brand-accent/80 uppercase">
                                Cow Disease Detection
                            </span>
                        </span>
                    </Link>

                    <SidebarContent className="overflow-visible">
                        <NavMain items={mainNavItems} />
                    </SidebarContent>
                </div>

                <SidebarFooter className="border-t border-brand-secondary/40 p-3">
                    <NavUser />
                </SidebarFooter>
            </div>
        </Sidebar>
    );
}
