import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/InputError';
import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

type Props = {
    qrCode: string;
    setupKey: string;
    onConfirmed: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function TwoFactorSetupModal({ qrCode, setupKey, onConfirmed, open, onOpenChange }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
    });

    const confirm = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('two-factor.confirm'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onConfirmed();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={confirm}>
                    <DialogHeader>
                        <DialogTitle>تفعيل المصادقة ثنائية الخطوات</DialogTitle>
                        <DialogDescription>
                            للمتابعة، يرجى مسح رمز الاستجابة السريعة التالي باستخدام تطبيق المصادقة على هاتفك أو إدخال مفتاح الإعداد يدوياً.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center gap-6 py-4">
                        <div className="p-2 bg-white rounded-lg" dangerouslySetInnerHTML={{ __html: qrCode }} />

                        <div className="text-center">
                            <p className="text-xs font-semibold uppercase text-muted-foreground">مفتاح الإعداد</p>
                            <p className="font-mono text-sm">{setupKey}</p>
                        </div>

                        <div className="w-full space-y-2">
                            <Label htmlFor="code">رمز التحقق</Label>
                            <Input
                                id="code"
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                placeholder="000000"
                                className="text-center font-mono text-lg tracking-widest"
                                autoFocus
                            />
                            <InputError message={errors.code} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="secondary"
                            type="button"
                            onClick={() => onOpenChange(false)}
                        >
                            إلغاء
                        </Button>
                        <Button disabled={processing} className="ms-3">
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            تأكيد التفعيل
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
