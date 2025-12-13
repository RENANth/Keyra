import { useState, useEffect } from 'react';

export default function PasswordGenerator({ onSelect }) {
    const [length, setLength] = useState(16);
    const [useSymbols, setUseSymbols] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [generated, setGenerated] = useState('');

    useEffect(() => {
        generate();
    }, [length, useSymbols, useNumbers]);

    const generate = () => {
        const charset = {
            letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };

        let chars = charset.letters;
        if (useNumbers) chars += charset.numbers;
        if (useSymbols) chars += charset.symbols;

        let password = '';
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            password += chars[array[i] % chars.length];
        }

        setGenerated(password);
    };

    return (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Generator</span>
                <button type="button" onClick={generate} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>↻ Refresh</button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <code style={{ flex: 1, padding: '0.8rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#a5b4fc' }}>
                    {generated}
                </code>
                <button
                    type="button"
                    onClick={() => onSelect(generated)}
                    style={{ background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '8px', padding: '0 1rem', cursor: 'pointer' }}
                >
                    Use
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input type="range" min="8" max="32" value={length} onChange={e => setLength(parseInt(e.target.value))} />
                    {length} chars
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} /> 123
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} /> !@#
                </label>
            </div>
        </div>
    );
}
