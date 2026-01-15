require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'super-secret-keyra-key';

// WebAuthn Config
const rpName = 'Keyra Password Manager';
const rpID = 'localhost'; // Change for production
const origin = `http://${rpID}:5173`;

// In-memory challenge store (Use Redis/DB in production)
const currentChallenges = {};

app.use(cors());
app.use(express.json());

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Register
app.post('/api/auth/register', async (req, res) => {
    const { username, password, salt, publicKey, encryptedPrivateKey } = req.body; // salt is for client-side key derivation

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const stmt = db.prepare("INSERT INTO users (username, password_hash, salt, vault_blob, public_key, encrypted_private_key) VALUES (?, ?, ?, ?, ?, ?)");
        stmt.run(username, hashedPassword, salt, '', publicKey, encryptedPrivateKey, (err) => {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
        stmt.finalize();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid credentials' });

        if (await bcrypt.compare(password, row.password_hash)) {
            const token = jwt.sign({ id: row.id, username: row.username }, SECRET_KEY, { expiresIn: '1h' });
            // Return the salt and vault_blob so the client can derive the key and decrypt
            res.json({
                token,
                salt: row.salt,
                vault: row.vault_blob
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Sync Vault (Save)
app.post('/api/vault/sync', authenticateToken, (req, res) => {
    const { vault } = req.body;
    const userId = req.user.id;

    db.run("UPDATE users SET vault_blob = ? WHERE id = ?", [vault, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Vault synced successfully' });
    });
});

// Get Vault (Fetch) - In case we need to fetch explicitly
// --- WebAuthn Endpoints ---

// 1. Register Request (Generate Options)
app.get('/api/auth/webauthn/register/options', authenticateToken, async (req, res) => {
    const user = req.user;

    // Get user's existing authenticators to prevent duplicates
    db.all("SELECT credentialID FROM authenticators WHERE user_id = ?", [user.id], async (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const userAuthenticators = rows.map(row => ({
            credentialID: row.credentialID,
            transports: [] // Optional
        }));

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: String(user.id),
            userName: user.username,
            attestationType: 'none',
            excludeCredentials: userAuthenticators,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        });

        // Store challenge
        currentChallenges[user.id] = options.challenge;

        res.json(options);
    });
});

// 2. Register Verify
app.post('/api/auth/webauthn/register/verify', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const body = req.body;

    const expectedChallenge = currentChallenges[userId];
    if (!expectedChallenge) return res.status(400).json({ error: 'Challenge not found' });

    try {
        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

            // Save authenticator to DB
            // credentialPublicKey is Uint8Array, needs base64? hash-wasm utils?
            // SimpleWebAuthn returns Buffer/Uint8Array. Let's store as base64 string.
            const pubKeyB64 = Buffer.from(credentialPublicKey).toString('base64');
            const credIdB64 = Buffer.from(credentialID).toString('base64'); // ID is technically base64url usually?

            // Actually, credentialID in response is base64url. verification.registrationInfo.credentialID is buffer??
            // Let's rely on `credentialID` from `body.id` which is base64url.

            const stmt = db.prepare("INSERT INTO authenticators (credentialID, credentialPublicKey, counter, user_id, transports) VALUES (?, ?, ?, ?, ?)");
            stmt.run(body.id, pubKeyB64, counter, userId, '', (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to save authenticator' });
                }
                delete currentChallenges[userId];
                res.json({ verified: true });
            });
            stmt.finalize();
        } else {
            res.status(400).json({ verified: false, error: 'Verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. Login Request (Generate Options)
app.post('/api/auth/webauthn/login/options', (req, res) => {
    const { username } = req.body;

    db.get("SELECT id, username FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        db.all("SELECT credentialID FROM authenticators WHERE user_id = ?", [user.id], async (err, rows) => {
            const userAuthenticators = rows.map(row => ({
                credentialID: row.credentialID,
                transports: []
            }));

            const options = await generateAuthenticationOptions({
                rpID,
                allowCredentials: userAuthenticators,
                userVerification: 'preferred',
            });

            // Store challenge mapped to username (or temp session ID)
            // For simplicity, map to username (assuming unique login attempt flow)
            currentChallenges[username] = options.challenge;

            res.json(options);
        });
    });
});

// 4. Login Verify
app.post('/api/auth/webauthn/login/verify', (req, res) => {
    const { username, response } = req.body;

    const expectedChallenge = currentChallenges[username];
    if (!expectedChallenge) return res.status(400).json({ error: 'Challenge not found' });

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Find the authenticator in DB
        // response.id is the credential ID
        db.get("SELECT * FROM authenticators WHERE credentialID = ?", [response.id], async (err, authRow) => {
            if (!authRow) return res.status(400).json({ error: 'Authenticator not registered' });

            try {
                // authRow.credentialPublicKey is base64 string, need Buffer
                const authenticator = {
                    credentialPublicKey: Buffer.from(authRow.credentialPublicKey, 'base64'),
                    credentialID: Buffer.from(authRow.credentialID, 'base64'), // Wait, body.id is base64url. 
                    counter: authRow.counter
                };

                // Verification logic
                // verifyAuthenticationResponse expects credentialID to be Buffer usually?
                // Actually verifyAuthenticationResponse uses the authenticator object passed to verify signature.
                // The `authenticator` argument needs: credentialPublicKey (Buffer), credentialID (Buffer), counter (number).

                // Oops, `response.id` is base64url string. `authRow.credentialID` we saved as base64url string (body.id).
                // So buffer conversion:
                // Buffer.from(response.id, 'base64') -> might fail if it's base64url? 
                // SimpleWebAuthn handles base64url decoding internally usually.

                const verification = await verifyAuthenticationResponse({
                    response,
                    expectedChallenge,
                    expectedOrigin: origin,
                    expectedRPID: rpID,
                    authenticator: {
                        credentialPublicKey: Buffer.from(authRow.credentialPublicKey, 'base64'),
                        credentialID: Buffer.from(authRow.credentialID, 'base64url'), // Use 'base64url' encoding if node supports it or stripped base64
                        counter: authRow.counter,
                    }
                });

                if (verification.verified) {
                    const { authenticationInfo } = verification;

                    // Update counter
                    db.run("UPDATE authenticators SET counter = ? WHERE credentialID = ?", [authenticationInfo.newCounter, response.id]);
                    delete currentChallenges[username];

                    // Issue Token
                    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });

                    res.json({
                        verified: true,
                        token,
                        salt: user.salt,
                        vault: user.vault_blob
                    });
                } else {
                    res.status(400).json({ verified: false, error: 'Verification failed' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Verification error' });
            }
        });
    });
});

// --- Secure Sharing Endpoints ---

// Get Public Key of a user
app.get('/api/users/:username/public-key', authenticateToken, (req, res) => {
    db.get("SELECT public_key, id FROM users WHERE username = ?", [req.params.username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json({ publicKey: row.public_key, userId: row.id });
    });
});

// Send a Share
app.post('/api/shares', authenticateToken, (req, res) => {
    const { recipientId, encryptedData } = req.body;
    const senderId = req.user.id;

    const stmt = db.prepare("INSERT INTO shares (sender_id, recipient_id, encrypted_data) VALUES (?, ?, ?)");
    stmt.run(senderId, recipientId, encryptedData, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Item shared successfully' });
    });
    stmt.finalize();
});

// Get My Shares (Inbox)
app.get('/api/shares', authenticateToken, (req, res) => {
    const userId = req.user.id;
    // Join with users to get sender name
    db.all(`
        SELECT shares.id, shares.encrypted_data, shares.created_at, users.username as sender_username 
        FROM shares 
        JOIN users ON shares.sender_id = users.id 
        WHERE shares.recipient_id = ?
    `, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Delete Share (after accepting or rejecting)
app.delete('/api/shares/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    // Update to ensure only recipient can delete? Or sender too? For now recipient.
    db.run("DELETE FROM shares WHERE id = ? AND recipient_id = ?", [req.params.id, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Share deleted' });
    });
});

// Get My Encrypted Private Key (Need this to accept shares)
app.get('/api/auth/private-key', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.get("SELECT encrypted_private_key FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row || !row.encrypted_private_key) return res.status(404).json({ error: 'No private key found' });
        res.json({ encryptedPrivateKey: row.encrypted_private_key });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
