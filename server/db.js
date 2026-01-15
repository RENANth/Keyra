const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  // Users table
  // password_hash: for login authentication (bcrypt)
  // vault_blob: encrypted vault data
  // salt: for client-side key derivation (stored publicly so client can derive key)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    vault_blob TEXT,
    salt TEXT,
    public_key TEXT,
    encrypted_private_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Authenticators table for WebAuthn/Passkeys
  db.run(`CREATE TABLE IF NOT EXISTS authenticators (
    credentialID TEXT PRIMARY KEY,
    transports TEXT,
    credentialPublicKey TEXT,
    counter INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
  // Shares table for Secure Sharing
  // sender_id: who sent it
  // recipient_id: who it is for
  // encrypted_data: the vault item encrypted with recipient's Public Key
  db.run(`CREATE TABLE IF NOT EXISTS shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        recipient_id INTEGER,
        encrypted_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id),
        FOREIGN KEY(recipient_id) REFERENCES users(id)
    )`);
});

module.exports = db;
