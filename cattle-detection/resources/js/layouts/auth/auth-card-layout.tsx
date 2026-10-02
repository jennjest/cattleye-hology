import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { Eye } from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="flex w-full max-w-md flex-col gap-6">
                <Link
                    href={dashboard()}
                    className="group flex flex-col items-center gap-2.5 self-center font-medium transition-transform hover:scale-105"
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
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="rounded-xl">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
