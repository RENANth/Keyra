require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'super-secret-keyra-key';

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
    const { username, password, salt } = req.body; // salt is for client-side key derivation

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const stmt = db.prepare("INSERT INTO users (username, password_hash, salt, vault_blob) VALUES (?, ?, ?, ?)");
        stmt.run(username, hashedPassword, salt, '', (err) => {
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
app.get('/api/vault', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.get("SELECT vault_blob, salt FROM users WHERE id = ?", [userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ vault: row.vault_blob, salt: row.salt });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
