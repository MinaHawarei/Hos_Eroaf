import AuthSimpleLayout from '@/layouts/auth/AuthSimpleLayout';

export default function AuthLayout({ title, description, children }: { title?: string, description?: string, children: React.ReactNode }) {
    return (
        <AuthSimpleLayout title={title} description={description}>
            {children}
        </AuthSimpleLayout>
    );
}
