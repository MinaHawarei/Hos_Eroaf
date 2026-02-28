import SettingsLayout from '@/layouts/settings/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Head, usePage, useForm } from '@inertiajs/react';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import type { SharedData } from '@/types';
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal';
import TwoFactorRecoveryCodes from '@/components/TwoFactorRecoveryCodes';

type Props = {
    requiresConfirmation?: boolean;
};

export default function TwoFactor({ requiresConfirmation }: Props) {
    const { auth } = usePage<SharedData>().props;
    const [enabling, setEnabling] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [setupKey, setSetupKey] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

    const enabled = auth.user.two_factor_enabled;

    const { post, delete: destroy, processing } = useForm({});

    const enableTwoFactor = () => {
        setEnabling(true);
        post(route('two-factor.enable'), {
            preserveScroll: true,
            onSuccess: () => Promise.all([showQrCode(), showSetupKey(), showRecoveryCodes()]),
            onFinish: () => setEnabling(false),
        });
    };

    const disableTwoFactor = () => {
        destroy(route('two-factor.disable'), {
            preserveScroll: true,
        });
    };

    const showQrCode = () => {
        return axios.get(route('two-factor.qr-code')).then(response => {
            setQrCode(response.data.svg);
            if (requiresConfirmation) setConfirming(true);
        });
    };

    const showSetupKey = () => {
        return axios.get(route('two-factor.secret-key')).then(response => {
            setSetupKey(response.data.secretKey);
        });
    };

    const showRecoveryCodes = () => {
        return axios.get(route('two-factor.recovery-codes')).then(response => {
            setRecoveryCodes(response.data);
        });
    };

    return (
        <SettingsLayout>
            <Head title="الأمان" />

            <div className="space-y-6 max-w-2xl">
                <div className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
                    <div className={`p-2 rounded-full ${enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30'}`}>
                        {enabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-semibold">
                            {enabled ? 'المصادقة ثنائية الخطوات مفعلة' : 'لم تقم بتفعيل المصادقة ثنائية الخطوات'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            عند تفعيل المصادقة ثنائية الخطوات، سيُطلب منك تقديم رمز عشوائي آمن أثناء تسجيل الدخول. يمكنك الحصول على هذا الرمز من تطبيق Google Authenticator في هاتفك.
                        </p>
                    </div>
                </div>

                {!enabled ? (
                    <Button onClick={enableTwoFactor} disabled={enabling || processing}>
                        {enabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        تفعيل
                    </Button>
                ) : (
                    <div className="space-y-6">
                        {confirming ? (
                            <TwoFactorSetupModal
                                open={confirming}
                                onOpenChange={setConfirming}
                                qrCode={qrCode}
                                setupKey={setupKey}
                                onConfirmed={() => setConfirming(false)}
                            />
                        ) : null}

                        {recoveryCodes.length > 0 && <TwoFactorRecoveryCodes codes={recoveryCodes} />}

                        <div className="flex gap-4">
                            {recoveryCodes.length === 0 && (
                                <Button variant="outline" onClick={showRecoveryCodes} disabled={processing}>
                                    إظهار رموز الاسترداد
                                </Button>
                            )}

                            <Button variant="destructive" onClick={disableTwoFactor} disabled={processing}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                إيقاف التفعيل
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </SettingsLayout>
    );
}
