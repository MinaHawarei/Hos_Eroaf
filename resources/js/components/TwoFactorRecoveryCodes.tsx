import { Button } from '@/components/ui/button';
import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

export default function TwoFactorRecoveryCodes({ codes }: { codes: string[] }) {
    const { post, processing } = useForm({});

    const regenerateCodes = () => {
        post(route('two-factor.recovery-codes'), {
            preserveScroll: true,
        });
    };

    return (
        <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-2">
                    {codes.map((code) => (
                        <div key={code}>{code}</div>
                    ))}
                </div>
            </div>

            <p className="text-sm text-muted-foreground">
                قم بتخزين رموز الاسترداد هذه في مدير كلمات مرور آمن. يمكن استخدامها لاستعادة الوصول إلى حسابك في حالة فقدان جهاز المصادقة ثنائي الخطوات الخاص بك.
            </p>

            <Button
                variant="outline"
                size="sm"
                onClick={regenerateCodes}
                disabled={processing}
            >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                توليد رموز جديدة
            </Button>
        </div>
    );
}
