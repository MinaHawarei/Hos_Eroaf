import AppLayoutComponent from '@/layouts/app/AppSidebarLayout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({ breadcrumbs = [], children }: { breadcrumbs?: BreadcrumbItem[], children: React.ReactNode }) {
    return (
        <AppLayoutComponent breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutComponent>
    );
}
