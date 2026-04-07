export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <img
            src="/icon.png"
            alt="هوس إيروف"
            className={className}
            style={{ objectFit: 'contain' }}
            draggable={false}
        />
    );
}
