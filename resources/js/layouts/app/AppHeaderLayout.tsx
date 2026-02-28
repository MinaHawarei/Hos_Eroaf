import AppContent from '@/components/AppContent';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import type { BreadcrumbItem } from '@/types';

export default function AppHeaderLayout({ breadcrumbs = [], children }: { breadcrumbs?: BreadcrumbItem[], children: React.ReactNode }) {
    return (
        <AppShell variant="header">
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent>
                {children}
            </AppContent>
        </AppShell>
    );
}
