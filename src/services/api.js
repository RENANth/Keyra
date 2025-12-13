const API_URL = 'http://localhost:3001/api';

export async function register(username, password, salt) {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, salt })
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
