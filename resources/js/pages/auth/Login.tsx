import AuthCardLayout from '@/layouts/auth/AuthCardLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

type Props = {
    status?: string;
    canResetPassword?: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthCardLayout
            title="تسجيل الدخول"
            description="مرحباً بك مجدداً في هوس إيروف"
        >
            <Head title="تسجيل الدخول" />

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">كلمة المرور</Label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs text-muted-foreground hover:underline"
                            >
                                نسيت كلمة المرور؟
                            </Link>
                        )}
                    </div>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="remember"
                        checked={data.remember}
                        onCheckedChange={(checked) => setData('remember', checked === true)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal">تذكرني على هذا الجهاز</Label>
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    دخول
                </Button>

                <div className="text-center text-sm">
                    ليس لديك حساب؟{' '}
                    <Link href={route('register')} className="font-semibold text-primary hover:underline">
                        إنشاء حساب جديد
                    </Link>
                </div>
            </form>
        </AuthCardLayout>
    );
}
