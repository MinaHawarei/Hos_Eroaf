import AppContent from '@/components/AppContent';
import AppShell from '@/components/AppShell';
import AppSidebar from '@/components/AppSidebar';
import AppSidebarHeader from '@/components/AppSidebarHeader';
import type { BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({ breadcrumbs = [], children }: { breadcrumbs?: BreadcrumbItem[], children: React.ReactNode }) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}
