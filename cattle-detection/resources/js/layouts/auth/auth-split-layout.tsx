import { Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { dashboard } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-brand-primary p-10 text-white lg:flex dark:bg-brand-dark dark:border-r">
                <div className="absolute inset-0 bg-brand-primary dark:bg-brand-dark" />
                <Link
                    href={dashboard()}
                    className="relative z-20 flex items-center gap-3 text-lg font-bold tracking-tight text-white"
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
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link
                        href={dashboard()}
                        className="group relative z-20 flex flex-col items-center gap-2.5 lg:hidden"
                    >
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-accent to-brand-light text-xl font-bold text-brand-dark shadow-md">
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
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
