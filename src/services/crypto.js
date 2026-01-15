import { argon2id } from 'hash-wasm';

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
 * Main entry point for key derivation.
 * Chooses algorithm based on salt prefix.
 */
export async function deriveKey(password, salt) {
    if (salt.startsWith('argon2|')) {
        return deriveKeyArgon2(password, salt.split('|')[1]);
    }
    return deriveKeyPBKDF2(password, salt);
}

/**
 * Derives key using Argon2id (Modern, GPU-resistant)
 */
async function deriveKeyArgon2(password, salt) {
    const keyBytes = await argon2id({
        password,
        salt, // Argon2 requires salt as string or buffer
        parallelism: 1,
        iterations: 2,
        memorySize: 1024, // 1MB - Low for mobile compatibility but better than PBKDF2
        hashLength: 32, // 256 bits
        outputType: 'encoded' // We actually want raw bytes, lets use 'binary' if supported or parse hex
    });

    // hash-wasm returns hex string by default if output is not specified? 
    // Wait, let's double check documentation via usage. 
    // outputType: 'binary' returns Uint8Array.

    const binaryHash = await argon2id({
        password,
        salt,
        parallelism: 1,
        iterations: 2,
        memorySize: 2048,
        hashLength: 32,
        outputType: 'binary'
    });

    return window.crypto.subtle.importKey(
        "raw",
        binaryHash,
        { name: ALGORITHM },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Legacy PBKDF2 derivation
 */
export async function deriveKeyPBKDF2(password, salt) {
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

// --- RSA-OAEP Implementation for Secure Sharing ---

const RSA_ALG = {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
};

/**
 * Generates a new RSA-OAEP key pair.
 * @returns {Promise<CryptoKeyPair>}
 */
export async function generateIdentityKeyPair() {
    return window.crypto.subtle.generateKey(
        RSA_ALG,
        true,
        ["encrypt", "decrypt"]
    );
}

/**
 * Exports a key to base64 string (SPKI for public, PKCS8 for private).
 */
export async function exportKey(key) {
    const format = key.type === 'public' ? 'spki' : 'pkcs8';
    const exported = await window.crypto.subtle.exportKey(format, key);
    return buf2hex(exported);
}

/**
 * Imports a key from base64 string.
 */
export async function importKey(keyHex, type) {
    const format = type === 'public' ? 'spki' : 'pkcs8';
    const keyData = hex2buf(keyHex);
    return window.crypto.subtle.importKey(
        format,
        keyData,
        RSA_ALG,
        true,
        type === 'public' ? ["encrypt"] : ["decrypt"]
    );
}

/**
 * Encrypts data with a Public Key (for sharing).
 */
export async function encryptRSA(plaintext, publicKey) {
    const encoded = enc.encode(plaintext);
    const ciphertext = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        encoded
    );
    return buf2hex(ciphertext);
}

/**
 * Decrypts data with a Private Key (for receiving).
 */
export async function decryptRSA(ciphertextHex, privateKey) {
    const ciphertext = hex2buf(ciphertextHex);
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        ciphertext
    );
    return dec.decode(decrypted);
}
