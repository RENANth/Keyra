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

    const handleWebAuthnLogin = async () => {
        if (!username) {
            setError('Please enter your username');
            return;
        }
        setError('');
        setLoading(true);

        try {
            // 1. Get options
            const options = await ApiService.getWebAuthnLoginOptions(username);

            // 2. Start assertion
            // Dynamic import to avoid SSR issues if we had them or just cleaner
            const { startAuthentication } = await import('@simplewebauthn/browser');
            const authResp = await startAuthentication(options);

            // 3. Verify
            const { token, salt, vault } = await ApiService.verifyWebAuthnLogin(username, authResp);

            // Note: We need the Master Key to decrypt!
            // With just a Passkey, we only authenticated to the server.
            // In a true Zero-Knowledge model, the key must be in client memory or wrapped by the passkey.
            // For MVP: We prompt for the password explicitly if not in memory, OR we could wrap the key (advanced).

            // To make this "Quick Unlock", let's assume valid session token + encrypted vault IS the goal.
            // But we can't show data without the key.
            // Prompting for password kills the UX benefit.
            // SOLUTION for MVP: We use Passkey for *Server Auth*. 
            // The Master Key still needs to be entered ONCE per session or we store it in local storage (insecure if not wrapped).

            // Actually, modern password managers use the Passkey to encrypt/decrypt the vault key (via PRF extension), but that's complex.
            // Compromise: Passkey logs you in. If key is missing, ask for it.

            StorageService.saveToken(token);
            localStorage.setItem('keyra_vault_cache', vault);

            // Try to derive key from password field if user entered it, else we might still be locked
            if (password) {
                const key = await CryptoService.deriveKey(password, salt);
                StorageService.setMasterKey(key);
            }

            onLogin();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Passkey login failed');
        } finally {
            setLoading(false);
        }
    };

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
                // Use Argon2id for new users by prefixing salt
                const salt = 'argon2|' + window.crypto.randomUUID();

                // Generate Identity Key Pair (RSA-OAEP)
                const keyPair = await CryptoService.generateIdentityKeyPair();
                const publicKeyHex = await CryptoService.exportKey(keyPair.publicKey);
                const privateKeyHex = await CryptoService.exportKey(keyPair.privateKey);

                // Derive Master Key
                const key = await CryptoService.deriveKey(password, salt);
                StorageService.setMasterKey(key);

                // Encrypt Private Key with Master Key
                const encryptedPrivateKey = await CryptoService.encrypt(privateKeyHex, key);
                const encryptedPrivateKeyStr = JSON.stringify(encryptedPrivateKey); // Store as JSON string of {iv, ciphertext}

                // Register on backend
                await ApiService.register(username, password, salt, publicKeyHex, encryptedPrivateKeyStr);

                // Auto login after register
                // Initialize empty vault
                const emptyVaultData = [];
                await StorageService.saveVault(emptyVaultData);

                // Save Private Key locally (optional optimization, but we have the master key so we can decrypt if needed later)
                // For now, let's just rely on fetching it when needed or storing in memory if we add that state.

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

                {isLogin && (
                    <button
                        type="button"
                        onClick={handleWebAuthnLogin}
                        className="glass-panel"
                        style={{
                            marginTop: '1rem',
                            width: '100%',
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <span>🔑</span> Sign in with Passkey
                    </button>
                )}
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
