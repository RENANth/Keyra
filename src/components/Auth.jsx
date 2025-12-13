import { useState } from 'react';
import * as StorageService from '../services/storage';
import * as ApiService from '../services/api';
import * as CryptoService from '../services/crypto';

export default function Auth({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // LOGIN FLOW
                const { token, salt, vault } = await ApiService.login(username, password);

                // Derive key locally
                const key = await CryptoService.deriveKey(password, salt);
                StorageService.setMasterKey(key);
                StorageService.saveToken(token);

                // Cache vault locally
                localStorage.setItem('keyra_vault_cache', vault); // It's already encrypted blob

                onLogin();
            } else {
                // REGISTER FLOW
                const salt = window.crypto.randomUUID(); // Simple unique salt

                // Register on backend
                await ApiService.register(username, password, salt);

                // Auto login after register
                // Derive key
                const key = await CryptoService.deriveKey(password, salt);
                StorageService.setMasterKey(key);

                // Initialize empty vault
                const emptyVaultData = [];
                await StorageService.saveVault(emptyVaultData);

                onLogin();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel fade-in" style={{ padding: '2.5rem', width: '100%', maxWidth: '380px' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <img src="/src/assets/logo.png" alt="Keyra" style={{ width: '100%', height: 'auto', marginBottom: '0.5rem', filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Secure. Elegant. Yours.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                    <input
                        type="text"
                        placeholder="Username"
                        className="input-field"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <input
                        type="password"
                        placeholder="Master Password"
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && <div style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'center', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                    {loading ? 'Processing...' : (isLogin ? 'Unlock Vault' : 'Create Account')}
                </button>
            </form>

            <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                {isLogin ? "New to Keyra? " : "Already have a vault? "}
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                >
                    {isLogin ? 'Create Account' : 'Log In'}
                </button>
            </div>
        </div>
    );
}
