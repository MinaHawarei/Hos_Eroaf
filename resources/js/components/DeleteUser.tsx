import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/InputError';
import { useForm } from '@inertiajs/react';
import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

export default function DeleteUser() {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
    } = useForm({
        password: '',
    });

    const deleteUser = (e: React.FormEvent) => {
        e.preventDefault();

        destroy(route('current-user.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => { },
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        reset();
    };

    return (
        <section className="space-y-6">
            <header>
                <h2 className="text-lg font-medium text-destructive">حذف الحساب</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    بمجرد حذف حسابك، سيتم حذف جميع موارده وبياناته بشكل دائم. قبل حذف حسابك، يرجى تنزيل أي بيانات أو معلومات ترغب في الاحتفاظ بها.
                </p>
            </header>

            <Dialog open={confirmingUserDeletion} onOpenChange={setConfirmingUserDeletion}>
                <DialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        حذف الحساب
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <form onSubmit={deleteUser}>
                        <DialogHeader>
                            <DialogTitle>هل أنت متأكد أنك تريد حذف حسابك؟</DialogTitle>
                            <DialogDescription>
                                بمجرد حذف حسابك، سيتم حذف جميع موارده وبياناته بشكل دائم. يرجى إدخال كلمة المرور الخاصة بك لتأكيد رغبتك في حذف حسابك بشكل دائم.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-6 space-y-2">
                            <Label htmlFor="password" title="password">كلمة المرور</Label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="كلمة المرور"
                                required
                            />
                            <InputError message={errors.password} />
                        </div>

                        <DialogFooter className="mt-6">
                            <Button variant="secondary" onClick={closeModal} type="button">
                                إلغاء
                            </Button>
                            <Button variant="destructive" className="ms-3" disabled={processing}>
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                حذف الحساب نهائياً
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}
