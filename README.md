# Keyra 🔐

**Secure. Elegant. Yours.**

Keyra is a modern, privacy-focused password manager built with a "Zero-Knowledge" architecture. It combines military-grade encryption with a premium, glassmorphism-inspired user interface.

![Keyra Logo](src/assets/logo.png)

## ✨ Features

- **🛡️ Zero-Knowledge Security**: Your passwords are encrypted (AES-256-GCM) on your device before they ever touch the server. We cannot see your data.
- **☁️ Hybrid Sync**: Seamlessly sync your vault across devices. Works offline and syncs when connection is restored.
- **🎨 Dark Premium UI**: A stunning interface featuring animated mesh gradients, glassmorphism effects, and smooth micro-interactions.
- **📱 PWA Support**: Install Keyra on your desktop or mobile device as a native app.
- **⚡ Super Fast**: Built with Vite and React for instant load times.
- **🔧 Power Tools**:
  - **Password Generator**: Create unbreakable passwords instantly.
  - **Strength Meter**: Real-time feedback on your password security.
  - **Search**: Instantly find your credentials.
  - **Auto-Lock**: Protects your vault after inactivity.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Vanilla CSS (Variables & Animations)
- **Backend**: Node.js, Express
- **Database**: SQLite (Storing encrypted blobs)
- **Cryptography**: Web Crypto API (AES-GCM, PBKDF2)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Keyra.git
   cd Keyra
   ```

2. **Install Dependencies**
   ```bash
   # Install Frontend
   npm install

   # Install Backend
   cd server
   npm install
   cd ..
   ```

3. **Run the Application**
   You need to run both the backend and frontend servers.

   **Terminal 1 (Backend)**
   ```bash
   cd server
   npm start
   ```
   *Server runs on port 3001*

   **Terminal 2 (Frontend)**
   ```bash
   npm run dev
   ```
   *App runs on http://localhost:5173*

## 🔒 Security Model

Keyra uses a **Client-Side Encryption** model:
1.  **Master Key Derivation**: Your login password is run through PBKDF2 (100,000 iterations) with a unique salt to derive your **Master Key**. This key **never** leaves your device's memory.
2.  **Encryption**: Your Vault Data is encrypted using AES-256-GCM with your Master Key.
3.  **Storage**: Only the *encrypted* blob (ciphertext) is sent to the server. The server has no way to decrypt it.

## 📱 Mobile Installation

1. Open Keyra in Chrome (Android) or Safari (iOS).
2. Tap "Add to Home Screen" or "Install App".
3. Keyra will launch as a standalone app.

---

*Built with ❤️ by Renan*
