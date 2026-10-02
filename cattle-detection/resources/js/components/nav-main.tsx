import { Link } from '@inertiajs/react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

/**
 * Sidebar navigation, styled exactly like the `.nav-btn` buttons of
 * "Desain Dashboard.html": rounded pill, brand accent text on the active item.
 */
export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <nav className="mt-2 space-y-1.5 p-3">
            {items.map((item) => {
                const matchesOwnUrl =
                    item.match === 'prefix'
                        ? isCurrentOrParentUrl(item.href)
                        : isCurrentUrl(item.href);

                const matchesExtraPrefix = (item.activePrefixes ?? []).some(
                    (prefix) => isCurrentOrParentUrl(prefix),
                );

                const isActive = matchesOwnUrl || matchesExtraPrefix;

                return (
                    <Link
                        key={item.title}
                        href={item.href}
                        prefetch
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200',
                            isActive
                                ? 'bg-brand-secondary/60 text-brand-accent shadow-inner'
                                : 'text-gray-300 hover:bg-brand-secondary/40 hover:text-white',
                        )}
                    >
                        {item.icon && <item.icon className="size-4 shrink-0" />}
                        <span>{item.title}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
