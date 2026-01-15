const API_URL = 'http://localhost:3001/api';

export async function register(username, password, salt, publicKey, encryptedPrivateKey) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, salt, publicKey, encryptedPrivateKey })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
    }
    return response.json();
}

export async function login(username, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
    }
    return response.json();
}

export async function syncVault(token, vaultData) {
    const response = await fetch(`${API_URL}/vault/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vault: vaultData })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
    }
    return response.json();
}

// --- WebAuthn API ---

export async function getWebAuthnRegOptions(token) {
    const response = await fetch(`${API_URL}/auth/webauthn/register/options`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
}

export async function verifyWebAuthnReg(token, payload) {
    const response = await fetch(`${API_URL}/auth/webauthn/register/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });
    return handleResponse(response);
}

export async function getWebAuthnLoginOptions(username) {
    const response = await fetch(`${API_URL}/auth/webauthn/login/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    return handleResponse(response);
}

export async function verifyWebAuthnLogin(username, payload) {
    const response = await fetch(`${API_URL}/auth/webauthn/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, response: payload })
    });
    return handleResponse(response);
}

// --- Secure Sharing API ---

export async function getPublicKey(token, username) {
    const response = await fetch(`${API_URL}/users/${username}/public-key`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
}

export async function shareItem(token, recipientId, encryptedData) {
    const response = await fetch(`${API_URL}/shares`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recipientId, encryptedData })
    });
    return handleResponse(response);
}

export async function getShares(token) {
    const response = await fetch(`${API_URL}/shares`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
}

export async function deleteShare(token, shareId) {
    const response = await fetch(`${API_URL}/shares/${shareId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
}

export async function getEncryptedPrivateKey(token) {
    const response = await fetch(`${API_URL}/auth/private-key`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
}

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
}
