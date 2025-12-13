import { useState, useEffect } from 'react';
import PasswordGenerator from './PasswordGenerator';
import PasswordStrength from './PasswordStrength';

export default function CredentialModal({ isOpen, onClose, onSave, initialData }) {
    const [title, setTitle] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showGenerator, setShowGenerator] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setUsername(initialData.username);
                setPassword(initialData.password);
            } else {
                setTitle('');
                setUsername('');
                setPassword('');
            }
            setShowGenerator(false);
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            id: initialData ? initialData.id : crypto.randomUUID(),
            title,
            username,
            password,
            url: title.includes('.') ? title : '',
            createdAt: initialData ? initialData.createdAt : Date.now()
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,5,10,0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, animation: 'fadeIn 0.2s' }}>
            <div className="glass-panel fade-in" style={{ padding: '2.5rem', width: '90%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 className="title-gradient" style={{ marginBottom: '2rem', fontSize: '1.8rem' }}>
                    {initialData ? 'Edit Credential' : 'New Credential'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <input
                        className="input-field"
                        placeholder="Website / Service Name"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        autoFocus
                    />
                    <input
                        className="input-field"
                        placeholder="Username / Email"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />

                    <div style={{ position: 'relative' }}>
                        <input
                            className="input-field"
                            type="text" // Visible for editing/generating easiest
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowGenerator(!showGenerator)}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}
                        >
                            {showGenerator ? 'Close Gen' : 'Generate'}
                        </button>
                    </div>

                    {showGenerator && (
                        <PasswordGenerator onSelect={(p) => { setPassword(p); setShowGenerator(false); }} />
                    )}

                    <PasswordStrength password={password} />

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '12px', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                        <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
