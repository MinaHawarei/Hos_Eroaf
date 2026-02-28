export default function InputError({ message, className = '' }: { message?: string, className?: string }) {
    return message ? (
        <div className={className}>
            <p className="text-sm text-red-600 dark:text-red-500">
                {message}
            </p>
        </div>
    ) : null;
}
