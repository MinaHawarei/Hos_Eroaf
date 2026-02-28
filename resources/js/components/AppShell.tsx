import { usePage } from '@inertiajs/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppShellVariant, SharedData } from '@/types';

export default function AppShell({ variant, children }: { variant?: AppShellVariant, children: React.ReactNode }) {
    const { sidebarOpen } = usePage<SharedData>().props;

    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    return (
        <SidebarProvider defaultOpen={sidebarOpen}>
            {children}
        </SidebarProvider>
    );
}
