import AuthCardLayout from '@/layouts/auth/AuthCardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import InputError from '@/components/InputError';
import { Head, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function TwoFactorChallenge() {
    const [recovery, setRecovery] = useState(false);
    const recoveryCodeInput = useRef<HTMLInputElement>(null);
    const codeInput = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors } = useForm({
        code: '',
        recovery_code: '',
    });

    const toggleRecovery = () => {
        setRecovery(!recovery);
        setData({
            code: '',
            recovery_code: '',
        });
    };

    useEffect(() => {
        if (recovery) {
            recoveryCodeInput.current?.focus();
        }
    }, [recovery]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('two-factor.login'));
    };

    return (
        <AuthCardLayout
            title="تأكيد ثنائي الخطوات"
            description={recovery
                ? 'يرجى تأكيد الوصول إلى حسابك عن طريق إدخال أحد رموز الاسترداد الخاصة بك.'
                : 'يرجى تأكيد الوصول إلى حسابك عن طريق إدخال رمز المصادقة الذي قدمه تطبيق المصادقة الخاص بك.'
            }
        >
            <Head title="تأكيد ثنائي الخطوات" />

            <form onSubmit={submit} className="flex flex-col gap-6">
                {!recovery ? (
                    <div className="grid gap-2">
                        <Label htmlFor="code">الرمز</Label>
                        <InputOTP
                            maxLength={6}
                            value={data.code}
                            onChange={(value: string) => setData('code', value)}
                        >
                            <InputOTPGroup className="w-full justify-between">
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                        <InputError message={errors.code} />
                    </div>
                ) : (
                    <div className="grid gap-2">
                        <Label htmlFor="recovery_code">رمز الاسترداد</Label>
                        <Input
                            id="recovery_code"
                            ref={recoveryCodeInput}
                            type="text"
                            name="recovery_code"
                            value={data.recovery_code}
                            className="mt-1 block w-full"
                            autoComplete="one-time-code"
                            onChange={(e) => setData('recovery_code', e.target.value)}
                        />
                        <InputError message={errors.recovery_code} />
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        تأكيد
                    </Button>

                    <button
                        type="button"
                        className="text-sm text-muted-foreground hover:underline"
                        onClick={toggleRecovery}
                    >
                        {recovery ? 'استخدام رمز المصادقة' : 'استخدام رمز الاسترداد'}
                    </button>
                </div>
            </form>
        </AuthCardLayout>
    );
}
