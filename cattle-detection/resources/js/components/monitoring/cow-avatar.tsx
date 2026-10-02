import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

type Props = {
    name: string;
    /** Renders a small status dot in the corner. */
    dotClassName?: string;
    className?: string;
};

/**
 * Stand-in for the cattle photo of the mockup.
 *
 * The schema has no image column, so the avatar shows the cow's initials in a
 * brand tile instead of silently rendering an empty box.
 */
export default function CowAvatar({ name, dotClassName, className }: Props) {
    const getInitials = useInitials();

    return (
        <span className={cn('relative inline-flex shrink-0', className)}>
            <span className="flex size-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-brand-soft/70 text-xs font-bold text-brand-primary dark:border-slate-700 dark:bg-emerald-950/60 dark:text-brand-accent">
                {getInitials(name)}
            </span>

            {dotClassName ? (
                <span
                    aria-hidden="true"
                    className={cn(
                        'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white dark:border-slate-800',
                        dotClassName,
                    )}
                />
            ) : null}
        </span>
    );
}
