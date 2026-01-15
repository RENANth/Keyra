import { useState, useEffect } from 'react';
import * as StorageService from '../services/storage';
import * as ApiService from '../services/api';
import CredentialModal from './CredentialModal';
import PasswordHealth from './PasswordHealth';
import ShareModal from './ShareModal';
import ThemeSwitcher from './ThemeSwitcher';

export default function Vault({ onLogout }) {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showHealth, setShowHealth] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [shareItem, setShareItem] = useState(null); // Item being shared
    const [shares, setShares] = useState([]); // Incoming shares

    useEffect(() => {
        loadItems();
        checkShares();
    }, []);

    const checkShares = async () => {
        try {
            const token = StorageService.getToken();
            const pendingShares = await ApiService.getShares(token);
            setShares(pendingShares || []);
        } catch (e) {
            console.error("Failed to load shares", e);
        }
    };

    const handleAcceptShare = async (share) => {
        try {
            const token = StorageService.getToken();

            // 1. Get My Encrypted Private Key
            const { encryptedPrivateKey } = await ApiService.getEncryptedPrivateKey(token);
            // encryptedPrivateKey is JSON string {iv, ciphertext}
            const encryptedPrivKeyObj = JSON.parse(encryptedPrivateKey);

            // 2. Decrypt Private Key using Master Key
            const masterKey = StorageService.getMasterKey();
            if (!masterKey) throw new Error("Master Key not in memory. Please relogin.");

            const privateKeyHex = await CryptoService.decrypt(
                encryptedPrivKeyObj.ciphertext,
                encryptedPrivKeyObj.iv,
                masterKey
            );
            const privateKey = await CryptoService.importKey(privateKeyHex, 'private');

            // 3. Decrypt the Share
            const decryptedItemJson = await CryptoService.decryptRSA(share.encrypted_data, privateKey);
            const newItem = JSON.parse(decryptedItemJson);

            // 4. Add to Vault (giving it a new ID to avoid collisions)
            const itemToAdd = { ...newItem, id: crypto.randomUUID(), title: `${newItem.title} (Shared)` };

            const updatedItems = [...items, itemToAdd];
            setItems(updatedItems);
            await StorageService.saveVault(updatedItems);

            // 5. Delete Share
            await ApiService.deleteShare(token, share.id);
            setShares(shares.filter(s => s.id !== share.id));

            alert(`Accepted "${newItem.title}"`);
        } catch (e) {
            console.error(e);
            alert("Failed to accept share: " + e.message);
        }
    };

    const handleLogout = () => {
        StorageService.logout();
        onLogout();
    };

    const getFavicon = (url) => {
        try {
            const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch {
            return '';
        }
    };

    const handleRegisterPasskey = async () => {
        if (!confirm("Add this device as a Passkey?")) return;

        try {
            const token = StorageService.getToken();

            // 1. Get options
            const options = await ApiService.getWebAuthnRegOptions(token);

            // 2. Create credential
            const { startRegistration } = await import('@simplewebauthn/browser');
            const attResp = await startRegistration(options);

            // 3. Verify
            const verification = await ApiService.verifyWebAuthnReg(token, attResp);

            if (verification.verified) {
                alert("Passkey registered successfully! You can now use it to login.");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to register Passkey: " + error.message);
        }
    };

    const handleSaveItem = async (item) => {
        let updatedItems;
        if (editingItem) {
            // Edit existing
            updatedItems = items.map(i => i.id === item.id ? item : i);
        } else {
            // Add new
            updatedItems = [...items, item];
        }

        setItems(updatedItems);
        await StorageService.saveVault(updatedItems);
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const openAddModal = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const deleteItem = async (id) => {
        if (!confirm("Are you sure?")) return;
        const updatedItems = items.filter(i => i.id !== id);
        setItems(updatedItems);
        await StorageService.saveVault(updatedItems);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);

        // Auto-clear after 30 seconds
        setTimeout(() => {
            navigator.clipboard.writeText('').catch(() => { });
        }, 30000);
    };

    const handleExport = () => {
        if (!confirm("Export unencrypted data to JSON?")) return;

        const dataStr = JSON.stringify(items, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `keyra_backup_${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src="/src/assets/logo.png" alt="Keyra" style={{ height: '50px' }} />
                        <ThemeSwitcher />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={handleExport} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                            ↓ Backup
                        </button>
                        <button onClick={handleRegisterPasskey} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                            🔑 Add Passkey
                        </button>
                        <button onClick={() => setShowHealth(true)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                            🏥 Check Health
                        </button>
                        <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 1.2rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                            Lock Vault
                        </button>
                    </div>
                </div>

                <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                    <input
                        type="text"
                        placeholder="Search your vault..."
                        className="input-field"
                        style={{ paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.2)', borderColor: 'transparent' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                </div>
            </header>

            {shares.length > 0 && (
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px' }}>
                    <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7' }}>
                        <span>📥</span> Incoming Shares ({shares.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {shares.map(share => (
                            <div key={share.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>From: <strong>{share.sender_username}</strong></div>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{new Date(share.created_at).toLocaleDateString()}</div>
                                </div>
                                <button
                                    onClick={() => handleAcceptShare(share)}
                                    style={{ background: '#10b981', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    Accept
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="vault-grid">
                {filteredItems.map(item => (
                    <div key={item.id} className="glass-panel fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', cursor: 'pointer' }} onClick={() => openEditModal(item)}>
                            {item.url ? (
                                <img src={getFavicon(item.url)} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🔑</div>
                            )}
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: '600', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.username}</div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', gap: '0.8rem' }}>
                            <button
                                onClick={() => copyToClipboard(item.password)}
                                style={{ flex: 1, padding: '0.8rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#c7d2fe', borderRadius: '10px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}
                            >
                                Copy
                            </button>
                            <button
                                onClick={() => setShareItem(item)}
                                style={{ padding: '0.8rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s' }}
                                title="Share"
                            >
                                📤
                            </button>
                            <button
                                onClick={() => openEditModal(item)}
                                style={{ padding: '0.8rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => deleteItem(item.id)}
                                style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                                Del
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={openAddModal}
                    className="glass-panel"
                    style={{
                        minHeight: '200px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: '2px dashed rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.02)',
                        color: 'var(--text-muted)',
                    }}
                >
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem', background: 'var(--primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>+</div>
                    <div style={{ fontWeight: '500' }}>Add Credential</div>
                </button>
            </div>

            <CredentialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveItem}
                initialData={editingItem}
            />
            {showHealth && <PasswordHealth items={items} onClose={() => setShowHealth(false)} />}
            <ShareModal isOpen={!!shareItem} onClose={() => setShareItem(null)} item={shareItem} />
        </div>
    );
}
