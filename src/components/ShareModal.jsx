import { useState } from 'react';
import * as ApiService from '../services/api';
import * as CryptoService from '../services/crypto';
import * as StorageService from '../services/storage';

export default function ShareModal({ isOpen, onClose, item }) {
    const [recipient, setRecipient] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    if (!isOpen || !item) return null;

    const handleShare = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');

        try {
            const token = StorageService.getToken();

            // 1. Get Recipient's Public Key
            const { publicKey, userId: recipientId } = await ApiService.getPublicKey(token, recipient);

            // 2. Import Public Key
            const recipientKey = await CryptoService.importKey(publicKey, 'public');

            // 3. Encrypt Item Data with Public Key
            // We share the whole item object as a JSON string
            const itemData = JSON.stringify(item);
            const encryptedData = await CryptoService.encryptRSA(itemData, recipientKey);

            // 4. Send Share
            await ApiService.shareItem(token, recipientId, encryptedData);

            setStatus('success');
            setTimeout(() => {
                onClose();
                setRecipient('');
                setStatus('');
            }, 1500);

        } catch (error) {
            console.error(error);
            setStatus('error: ' + (error.message || 'Failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay fade-in">
            <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>

                <h2 className="title-gradient" style={{ marginTop: 0, marginBottom: '0.5rem' }}>Secure Share</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Share <strong>{item.title}</strong> securely. Only the recipient can decrypt it.
                </p>

                <form onSubmit={handleShare}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Recipient Username</label>
                        <input
                            type="text"
                            className="input-field"
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            placeholder="username"
                            required
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                            {loading ? 'Encrypting...' : 'Share Securely'}
                        </button>
                    </div>
                </form>

                {status === 'success' && (
                    <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', borderRadius: '8px', textAlign: 'center' }}>
                        Shared successfully! 🚀
                    </div>
                )}
                {status.startsWith('error') && (
                    <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '8px', textAlign: 'center' }}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}
