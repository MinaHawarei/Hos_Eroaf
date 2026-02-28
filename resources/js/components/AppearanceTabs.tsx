import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/composables/useAppearance';

const tabs = [
    { value: 'light', Icon: Sun, label: 'فاتح' },
    { value: 'dark', Icon: Moon, label: 'داكن' },
    { value: 'system', Icon: Monitor, label: 'النظام' },
] as const;

export default function AppearanceTabs() {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div className="inline-flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            {tabs.map(({ value, Icon, label }) => (
                <button
                    key={value}
                    onClick={() => updateAppearance(value as any)}
                    className={`flex items-center rounded-md px-3.5 py-1.5 transition-colors ${appearance === value
                        ? 'bg-white shadow-xs dark:bg-neutral-700 dark:text-neutral-100'
                        : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-black dark:text-neutral-400 dark:hover:bg-neutral-700/60'
                        }`}
                >
                    <Icon className="-ml-1 h-4 w-4" />
                    <span className="ml-1.5 text-sm">{label}</span>
                </button>
            ))}
        </div>
    );
}
