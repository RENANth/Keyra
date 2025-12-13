
const ALGORITHM = 'AES-GCM';
const DIGEST = 'SHA-256';
const ITERATIONS = 100000;
const KEY_LENGTH = 256;

// Utilities for ArrayBuffer <-> Hex/String
const enc = new TextEncoder();
const dec = new TextDecoder();

export function buf2hex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

export function hex2buf(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

/**
 * Derives a cryptographic key from a password and salt.
 * @param {string} password 
 * @param {string} salt - Specific salt for this derivation
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, salt) {
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(salt),
            iterations: ITERATIONS,
            hash: DIGEST
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false, // non-extractable
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts data using AES-GCM.
 * @param {string} plaintext 
 * @param {CryptoKey} key 
 * @returns {Promise<{iv: string, ciphertext: string}>}
 */
export async function encrypt(plaintext, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = enc.encode(plaintext);

    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv
        },
        key,
        encoded
    );

    return {
        iv: buf2hex(iv),
        ciphertext: buf2hex(ciphertext)
    };
}

/**
 * Decrypts data using AES-GCM.
 * @param {string} ciphertextHex 
 * @param {string} ivHex 
 * @param {CryptoKey} key 
 * @returns {Promise<string>}
 */
export async function decrypt(ciphertextHex, ivHex, key) {
    try {
        const ciphertext = hex2buf(ciphertextHex);
        const iv = hex2buf(ivHex);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv: iv
            },
            key,
            ciphertext
        );

        return dec.decode(decrypted);
    } catch (e) {
        throw new Error('Decryption failed');
    }
}
