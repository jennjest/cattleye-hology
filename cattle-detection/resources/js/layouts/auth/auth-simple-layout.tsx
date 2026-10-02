import { Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { dashboard } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm sm:max-w-md">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={dashboard()}
                            className="group flex flex-col items-center gap-2.5 font-medium transition-transform hover:scale-105"
                        >
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-accent to-brand-light text-brand-dark shadow-md">
                                <Eye className="size-7" strokeWidth={2.5} />
                            </span>
                            <div className="flex flex-col items-center text-center">
                                <span className="block text-xl leading-none font-bold tracking-tight text-foreground">
                                    CATTLEYE
                                </span>
                                <span className="mt-1 block text-[9px] font-semibold tracking-wider text-brand-secondary dark:text-brand-accent uppercase">
                                    Cow Disease Detection
                                </span>
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-1.5 text-center">
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">
                                {title}
                            </h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft sm:p-8 dark:border-border">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
