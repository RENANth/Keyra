import { useState, useEffect } from 'react';

const themes = [
    { id: 'obsidian', name: 'Obsidian', color: '#8b5cf6' },
    { id: 'cyber', name: 'Cyber', color: '#06b6d4' },
    { id: 'gold', name: 'Gold', color: '#d4af37' }
];

export default function ThemeSwitcher() {
    const [currentTheme, setCurrentTheme] = useState('obsidian');

    useEffect(() => {
        const saved = localStorage.getItem('keyra_theme') || 'obsidian';
        setTheme(saved);
    }, []);

    const setTheme = (themeId) => {
        document.body.setAttribute('data-theme', themeId);
        localStorage.setItem('keyra_theme', themeId);
        setCurrentTheme(themeId);
    };

    return (
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            {themes.map(theme => (
                <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    title={theme.name}
                    style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: theme.color,
                        border: currentTheme === theme.id ? '2px solid white' : 'none',
                        cursor: 'pointer',
                        boxShadow: currentTheme === theme.id ? `0 0 10px ${theme.color}` : 'none',
                        transition: 'all 0.3s ease',
                        transform: currentTheme === theme.id ? 'scale(1.1)' : 'scale(1)'
                    }}
                />
            ))}
        </div>
    );
}
