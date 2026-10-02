import { Eye } from 'lucide-react';

export default function AppLogo() {
    return (
        <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-brand-light text-xl font-bold text-brand-dark shadow-md">
                <Eye className="size-6" strokeWidth={2.5} />
            </span>
            <div className="grid flex-1 text-left">
                <span className="block text-lg leading-none font-bold tracking-tight text-white">
                    CATTLEYE
                </span>
                <span className="block text-[8px] font-medium tracking-wider text-brand-accent/80 uppercase">
                    Cow Disease Detection
                </span>
            </div>
        </div>
    );
}
