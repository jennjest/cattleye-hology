import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Operator summary pinned to the bottom of the rail. The whole card opens the
 * account menu, because that is where logout lives.
 */
export function NavUser() {
    const { auth } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    const getInitials = useInitials();

    if (!auth.user) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    data-test="sidebar-menu-button"
                    className="flex w-full items-center gap-3 rounded-xl border border-brand-secondary/30 bg-brand-dark/40 p-2 text-left transition-colors hover:bg-brand-dark/60 dark:bg-black/30"
                >
                    <span className="relative">
                        <Avatar className="size-9 overflow-hidden rounded-lg border border-brand-accent/40">
                            <AvatarImage
                                src={auth.user.avatar}
                                alt={auth.user.name}
                            />
                            <AvatarFallback className="rounded-lg bg-brand-accent text-[11px] font-bold text-brand-dark">
                                {getInitials(auth.user.name ?? '')}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-brand-dark bg-emerald-500" />
                    </span>

                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-white">
                            {auth.user.name}
                        </span>
                        <span className="block truncate text-[10px] text-brand-accent/70">
                            {auth.user.email}
                        </span>
                    </span>

                    <ChevronsUpDown className="size-3.5 shrink-0 text-brand-accent/70" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                align="end"
                side={isMobile || state === 'expanded' ? 'bottom' : 'right'}
            >
                <UserMenuContent user={auth.user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
