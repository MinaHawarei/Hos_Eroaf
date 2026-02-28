import SettingsLayout from '@/layouts/settings/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/InputError';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import DeleteUser from '@/components/DeleteUser';
import type { SharedData } from '@/types';

export default function Profile() {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <SettingsLayout>
            <Head title="الملف الشخصي" />

            <div className="space-y-12">
                <section>
                    <form onSubmit={submit} className="space-y-6 max-w-xl">
                        <div className="grid gap-2">
                            <Label htmlFor="name">الاسم</Label>
                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">البريد الإلكتروني</Label>
                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                حفظ
                            </Button>

                            {recentlySuccessful && (
                                <p className="text-sm text-muted-foreground animate-in fade-in duration-300">
                                    تم الحفظ بنجاح.
                                </p>
                            )}
                        </div>
                    </form>
                </section>

                <div className="border-t border-border pt-12">
                    <DeleteUser />
                </div>
            </div>
        </SettingsLayout>
    );
}
