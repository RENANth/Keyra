import * as CryptoService from './crypto';
import * as ApiService from './api';

const STORAGE_KEY = 'keyra_vault_cache';
const TOKEN_KEY = 'keyra_auth_token';
const MASTER_KEY_REF = 'keyra_master_key'; // In memory only, but for this demo we might need to handle it carefully

let memoryKey = null;

export const setMasterKey = (key) => {
    memoryKey = key;
};

export const getMasterKey = () => memoryKey;

/**
 * loads vault from local storage or API
 */
export async function loadVault() {
    // If we have a token, try to fetch from API?
    // Or just rely on what was passed during login.
    // For MVP: Login returns the vault blob. We decrypt and store in memory/local.

    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
        try {
            return JSON.parse(localData); // Encrypted blob (if stringified)
        } catch (e) {
            return localData; // Raw string (backward compatibility)
        }
    }
    return null;
}

export async function saveVault(data) {
    // 1. Encrypt data
    if (!memoryKey) throw new Error("Vault is locked");

    const json = JSON.stringify(data);
    const encrypted = await CryptoService.encrypt(json, memoryKey);

    // encrypted is { iv, ciphertext }
    // We store a serialized string: iv:ciphertext
    const blob = `${encrypted.iv}:${encrypted.ciphertext}`;

    // 2. Save locally
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));

    // 3. Sync to backend if logged in
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        try {
            await ApiService.syncVault(token, blob);
        } catch (e) {
            console.warn('Sync failed', e);
            // Scheduled retry?
        }
    }
}

export async function unlockVault(blob) {
    if (!memoryKey) throw new Error("No key derived");
    if (!blob) return []; // Empty vault

    const [iv, ciphertext] = blob.split(':');
    const json = await CryptoService.decrypt(ciphertext, iv, memoryKey);
    return JSON.parse(json);
}

export function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEY); // Option: keep local cache? Securest is to remove.
    memoryKey = null;
    window.location.reload();
}
