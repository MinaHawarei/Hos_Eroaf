import AuthCardLayout from '@/layouts/auth/AuthCardLayout';
import { Button } from '@/components/ui/button';
import { Head, Link, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    const verificationLinkSent = status === 'verification-link-sent';

    return (
        <AuthCardLayout
            title="تأكيد البريد الإلكتروني"
            description="شكراً لتسجيلك! قبل البدء، هل يمكنك تأكيد بريدك الإلكتروني من خلال الضغط على الرابط الذي أرسلناه لك للتو؟"
        >
            <Head title="تأكيد البريد الإلكتروني" />

            {verificationLinkSent && (
                <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400">
                    تم إرسال رابط تأكيد جديد إلى عنوان البريد الإلكتروني الذي قدمته أثناء التسجيل.
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-6">
                <Button type="submit" className="w-full" disabled={processing}>
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إعادة إرسال البريد
                </Button>

                <div className="flex items-center justify-between">
                    <Link
                        href={route('profile.edit')}
                        className="text-sm font-medium text-muted-foreground hover:underline"
                    >
                        تعديل الملف الشخصي
                    </Link>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm font-medium text-muted-foreground hover:underline"
                    >
                        تسجيل الخروج
                    </Link>
                </div>
            </form>
        </AuthCardLayout>
    );
}
