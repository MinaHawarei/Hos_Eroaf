import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Menu, Search } from 'lucide-react';
import AppLogo from '@/components/AppLogo';
import AppLogoIcon from '@/components/AppLogoIcon';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import UserMenuContent from '@/components/UserMenuContent';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { getInitials } from '@/hooks/use-initials';
import { cn, toUrl } from '@/lib/utils';
import type { BreadcrumbItem, NavItem, SharedData } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

export default function AppHeader({ breadcrumbs = [] }: Props) {
    const { auth } = usePage<SharedData>().props;
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();

    const activeItemStyles = 'text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100';

    const mainNavItems: NavItem[] = [
        {
            title: 'الرئيسية',
            href: route('dashboard'),
            icon: LayoutGrid,
        },
    ];

    const rightNavItems: NavItem[] = [
        {
            title: 'الإعدادات',
            href: route('settings'),
            icon: BookOpen,
        },
    ];

    return (
        <div>
            <div className="border-b border-sidebar-border/80">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    {/* Mobile Menu */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="mr-2 h-9 w-9">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] p-6">
                                <SheetTitle className="sr-only">قائمة التنقل</SheetTitle>
                                <SheetHeader className="flex justify-start text-left">
                                    <AppLogoIcon className="size-6 fill-current text-black dark:text-white" />
                                </SheetHeader>
                                <div className="flex h-full flex-1 flex-col justify-between space-y-4 py-6">
                                    <nav className="-mx-3 space-y-1">
                                        {mainNavItems.map((item) => (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent",
                                                    isCurrentUrl(item.href) && activeItemStyles
                                                )}
                                            >
                                                {item.icon && <item.icon className="h-5 w-5" />}
                                                {item.title}
                                            </Link>
                                        ))}
                                    </nav>
                                    <div className="flex flex-col space-y-4">
                                        {rightNavItems.map((item) => (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                className="flex items-center space-x-2 text-sm font-medium"
                                            >
                                                {item.icon && <item.icon className="h-5 w-5" />}
                                                <span>{item.title}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link href={route('dashboard')} className="flex items-center gap-x-2">
                        <AppLogo />
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden h-full lg:flex lg:flex-1">
                        <NavigationMenu className="ml-10 flex h-full items-stretch">
                            <NavigationMenuList className="flex h-full items-stretch space-x-2">
                                {mainNavItems.map((item, index) => (
                                    <NavigationMenuItem key={index} className="relative flex h-full items-center">
                                        <Link
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                isCurrentUrl(item.href) && activeItemStyles,
                                                'h-9 cursor-pointer px-3'
                                            )}
                                            href={item.href}
                                        >
                                            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                            {item.title}
                                        </Link>
                                        {isCurrentUrl(item.href) && (
                                            <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-black dark:bg-white" />
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex items-center space-x-2">
                        <div className="relative flex items-center space-x-1">
                            <Button variant="ghost" size="icon" className="group h-9 w-9 cursor-pointer">
                                <Search className="size-5 opacity-80 group-hover:opacity-100" />
                            </Button>

                            <div className="hidden space-x-1 lg:flex">
                                {rightNavItems.map((item) => (
                                    <TooltipProvider key={item.title} delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" asChild className="group h-9 w-9 cursor-pointer">
                                                    <Link href={item.href}>
                                                        <span className="sr-only">{item.title}</span>
                                                        {item.icon && <item.icon className="size-5 opacity-80 group-hover:opacity-100" />}
                                                    </Link>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{item.title}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative size-10 w-auto rounded-full p-1 focus-within:ring-2 focus-within:ring-primary">
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        {auth.user?.avatar && <AvatarImage src={auth.user.avatar} alt={auth.user.name} />}
                                        <AvatarFallback className="rounded-lg bg-neutral-200 font-semibold text-black dark:bg-neutral-700 dark:text-white">
                                            {getInitials(auth.user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {breadcrumbs.length > 1 && (
                <div className="flex w-full border-b border-sidebar-border/70">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </div>
    );
}
