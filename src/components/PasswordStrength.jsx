export default function PasswordStrength({ password }) {
    const calculateStrength = (pwd) => {
        if (!pwd) return { score: 0, label: '', color: 'transparent' };

        let score = 0;
        if (pwd.length > 8) score++;
        if (pwd.length > 12) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        if (score <= 2) return { score, label: 'Weak', color: '#ef4444' }; // Red
        if (score <= 4) return { score, label: 'Good', color: '#fbbf24' }; // Yellow
        return { score, label: 'Strong', color: '#10b981' }; // Green
    };

    const { score, label, color } = calculateStrength(password);
    const bars = [1, 2, 3, 4, 5];

    return (
        <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '4px' }}>
                {bars.map((b) => (
                    <div
                        key={b}
                        style={{
                            flex: 1,
                            borderRadius: '2px',
                            background: b <= score ? color : 'rgba(255,255,255,0.1)',
                            transition: 'background 0.3s'
                        }}
                    />
                ))}
            </div>
            {password && <div style={{ textAlign: 'right', fontSize: '0.75rem', color: color }}>{label}</div>}
        </div>
    );
}
