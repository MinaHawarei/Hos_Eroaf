import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Props = {
    errors: string[];
    title?: string;
};

export default function AlertError({ errors, title = 'Something went wrong.' }: Props) {
    const uniqueErrors = Array.from(new Set(errors));

    if (uniqueErrors.length === 0) return null;

    return (
        <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>
                <ul className="list-inside list-disc text-sm">
                    {uniqueErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                    ))}
                </ul>
            </AlertDescription>
        </Alert>
    );
}
