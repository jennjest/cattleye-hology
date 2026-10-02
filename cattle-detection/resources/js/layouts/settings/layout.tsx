import { Link } from '@inertiajs/react';
import {
    Moon,
    ShieldCheck,
    SlidersHorizontal,
    User,
    Users,
} from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editFusion } from '@/routes/fusion-settings';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import { index as usersIndex } from '@/routes/users';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    { title: 'Profil Pengguna', href: edit(), icon: User },
    { title: 'Keamanan', href: editSecurity(), icon: ShieldCheck },
    { title: 'Tampilan', href: editAppearance(), icon: Moon },
    { title: 'Threshold AI', href: editFusion(), icon: SlidersHorizontal },
    { title: 'Pengguna', href: usersIndex(), icon: Users },
];

/**
 * Shell of the Pengaturan section.
 *
 * Mirrors "PAGE 6: PENGATURAN" of the mockup: a header card plus white
 * shadow-soft cards, while keeping the existing settings pages reachable as
 * sub-routes.
 */
export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="space-y-6">
            <Card className="py-6">
                <CardContent className="px-6">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        Pengaturan Sistem CATTLEYE
                    </h1>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Konfigurasi AI Computer Vision, ambang batas IoT, dan
                        preferensi aplikasi.
                    </p>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-6 lg:flex-row">
                <aside className="w-full lg:w-60">
                    <nav
                        aria-label="Pengaturan"
                        className="flex flex-row gap-2 overflow-x-auto lg:flex-col"
                    >
                        {sidebarNavItems.map((item, index) => {
                            const isActive = isCurrentOrParentUrl(item.href);

                            return (
                                <Link
                                    key={`${toUrl(item.href)}-${index}`}
                                    href={item.href}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={cn(
                                        'relative flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all',
                                        isActive
                                            ? 'bg-brand-primary text-white shadow-soft'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700',
                                    )}
                                >
                                    {item.icon ? (
                                        <item.icon className="size-4 shrink-0" />
                                    ) : null}
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <div className="min-w-0 flex-1 space-y-6">{children}</div>
            </div>
        </div>
    );
}
