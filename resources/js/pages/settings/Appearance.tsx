import SettingsLayout from '@/layouts/settings/SettingsLayout';
import AppearanceTabs from '@/components/AppearanceTabs';
import { Head } from '@inertiajs/react';

export default function Appearance() {
    return (
        <SettingsLayout>
            <Head title="إعدادات المظهر" />

            <div className="space-y-6">
                <div>
                    <h3 className="mb-4 text-sm font-medium">السمة</h3>
                    <AppearanceTabs />
                </div>
            </div>
        </SettingsLayout>
    );
}
