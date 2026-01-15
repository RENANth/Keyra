import { useState, useEffect } from 'react';

export default function PasswordHealth({ items, onClose }) {
    const [stats, setStats] = useState({ weak: [], reused: [], pwned: [], score: 100 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        analyzeVault();
    }, [items]);

    const sha1 = async (str) => {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest('SHA-1', enc.encode(str));
        return Array.from(new Uint8Array(hash))
            .map(v => v.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    };

    const analyzeVault = async () => {
        setLoading(true);
        const weak = [];
        const reuseMap = {};
        const reused = [];
        const pwned = [];

        // 1. Local Analysis
        for (const item of items) {
            const password = item.password || '';

            // Weak Check
            if (password.length < 12) {
                weak.push({ ...item, reason: 'Too short (< 12 chars)' });
            } else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) {
                weak.push({ ...item, reason: 'Missing complexity' });
            }

            // Reuse Check
            if (password.length > 0) {
                if (reuseMap[password]) {
                    reuseMap[password].push(item);
                } else {
                    reuseMap[password] = [item];
                }
            }
        }

        // Process Reuse Map
        Object.values(reuseMap).forEach(group => {
            if (group.length > 1) {
                group.forEach(item => reused.push({ ...item, reason: `Reused ${group.length} times` }));
            }
        });

        // 2. Pwned Check (Batch / Async)
        // Rate limiting precaution: Check sequentially or limited batch? 
        // Pwned Passwords API has no hard rate limit but we should be nice.
        // Let's check only the first 10 for MVP or add a "Scan Pwned" button to verify all.
        // For auto-scan, let's limit to ensuring we don't spam.

        let checkedCount = 0;
        for (const item of items) {
            if (checkedCount > 5) break; // Limit auto-scan for demo speed
            if (!item.password) continue;

            try {
                const hash = await sha1(item.password);
                const prefix = hash.substring(0, 5);
                const suffix = hash.substring(5);

                const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
                const text = await response.text();

                if (text.includes(suffix)) {
                    pwned.push({ ...item, reason: 'Found in data breach' });
                }
            } catch (e) {
                console.warn("Pwned check failed", e);
            }
            checkedCount++;
        }

        // Calculate Score
        const total = items.length || 1;
        const deductions = (weak.length * 5) + (reused.length * 10) + (pwned.length * 20);
        const score = Math.max(0, 100 - (deductions / total * 50)); // Rough heuristic

        setStats({ weak, reused, pwned, score: Math.round(score) });
        setLoading(false);
    };

    return (
        <div className="glass-panel" style={{
            position: 'fixed', top: '5%', left: '5%', width: '90%', height: '90%',
            zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '2rem',
            background: '#0a0a0a'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 className="title-gradient" style={{ margin: 0 }}>Security Health</h2>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            {loading ? (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Scanning Vault...</div>
            ) : (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {/* Score Card */}
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem', background: `linear-gradient(135deg, ${stats.score > 80 ? '#10b981' : stats.score > 50 ? '#f59e0b' : '#ef4444'}, transparent)` }}>
                        <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{stats.score}</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)' }}>Security Score</div>
                    </div>

                    <div className="vault-grid">
                        {/* Compromised */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderColor: '#ef4444' }}>
                            <h3 style={{ color: '#ef4444', marginTop: 0 }}>⚠️ Compromised ({stats.pwned.length})</h3>
                            <p style={{ fontSize: '0.9rem', color: '#999' }}>Found in known data breaches.</p>
                            <ul style={{ paddingLeft: '1rem' }}>
                                {stats.pwned.map((item, i) => (
                                    <li key={i}>{item.title}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Reused */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderColor: '#f59e0b' }}>
                            <h3 style={{ color: '#f59e0b', marginTop: 0 }}>🔄 Reused ({stats.reused.length})</h3>
                            <p style={{ fontSize: '0.9rem', color: '#999' }}>Passwords used multiple times.</p>
                            <ul style={{ paddingLeft: '1rem' }}>
                                {stats.reused.map((item, i) => (
                                    <li key={i}>{item.title}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Weak */}
                        <div className="glass-panel" style={{ padding: '1.5rem', borderColor: '#8b5cf6' }}>
                            <h3 style={{ color: '#8b5cf6', marginTop: 0 }}>🔓 Weak ({stats.weak.length})</h3>
                            <p style={{ fontSize: '0.9rem', color: '#999' }}>Short or simple passwords.</p>
                            <ul style={{ paddingLeft: '1rem' }}>
                                {stats.weak.map((item, i) => (
                                    <li key={i}>{item.title}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
