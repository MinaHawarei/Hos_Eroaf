import { Link } from '@inertiajs/react';
import Heading from '@/components/Heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { toUrl } from '@/lib/utils';
import { type NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: route('profile.edit'),
    },
    {
        title: 'Password',
        href: route('password.edit'),
    },
    {
        title: 'Two-Factor Auth',
        href: route('two-factor.show'),
    },
    {
        title: 'Appearance',
        href: route('appearance.edit'),
    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6">
            <Heading
                title="Settings"
                description="Manage your profile and account settings"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav
                        className="flex flex-col space-y-1 space-x-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item) => (
                            <Button
                                key={toUrl(item.href)}
                                variant="ghost"
                                className={`w-full justify-start ${isCurrentUrl(item.href) ? 'bg-muted' : ''}`}
                                asChild
                            >
                                <Link href={item.href}>
                                    {item.icon && <item.icon className="h-4 w-4" />}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
