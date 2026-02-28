import SettingsLayout from '@/layouts/settings/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/InputError';
import { Head, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

export default function Password() {
    const { data, setData, put, errors, processing, recentlySuccessful, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <>
            <Head title="تغيير كلمة المرور" />
            <SettingsLayout>

            <form onSubmit={updatePassword} className="space-y-6 max-w-xl">
                <div className="grid gap-2">
                    <Label htmlFor="current_password">كلمة المرور الحالية</Label>
                    <Input
                        id="current_password"
                        type="password"
                        className="mt-1 block w-full"
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        autoComplete="current-password"
                    />
                    <InputError message={errors.current_password} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password">كلمة المرور الجديدة</Label>
                    <Input
                        id="password"
                        type="password"
                        className="mt-1 block w-full"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        autoComplete="new-password"
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation">تأكيد كلمة المرور الجديدة</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        className="mt-1 block w-full"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        autoComplete="new-password"
                    />
                    <InputError message={errors.password_confirmation} />
                </div>

                <div className="flex items-center gap-4">
                    <Button disabled={processing}>
                        {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        تحديث كلمة المرور
                    </Button>

                    {recentlySuccessful && (
                        <p className="text-sm text-muted-foreground animate-in fade-in duration-300">
                            تم التحديث بنجاح.
                        </p>
                    )}
                </div>
            </form>
            </SettingsLayout>
        </>
    );
}
