# ERROREX — Minimal Luxury Gold Calculator & Private Social Messenger

An end-to-end, dual-layer privacy application. To casual observers and external inspection, ERROREX is a realistic, precision mathematical calculator. For authorized account holders, entering their unique **8-digit secret PIN** and pressing equals (`=`) unlocks a private, end-to-end encrypted social messenger.

---

## 💎 Design Direction: Minimal Luxury Gold

- **Jet Black & Obsidian Canvas**: Deep `#050507` backdrop with subtle golden radial lighting and dark marble texturing.
- **Metallic Gold Accent Hierarchy**: Primary Imperial Gold (`#D4AF37`), Antique Gold (`#AA7C11`), and soft golden glows.
- **8 Selectable Royal Themes**:
  1. Royal Gold (Default)
  2. Emerald Green
  3. Ocean Blue
  4. Royal Purple
  5. Rose Pink
  6. Sunset Orange
  7. Electric Blue
  8. Teal
- **Dual-Mode System**: Instant toggle between Jet Black Luxury and Pearlescent Light modes.
- **Original Brand Identity**: Heraldic crown logo crest with custom serif wordmark and tabular numeric display.

---

## 🔒 The Secret 8-Digit PIN Architecture

1. **Account Registration**: Every user creates an account (via Email/Password or Google Sign-In) and registers an individual 8-digit numeric PIN.
2. **Cryptographic Protection**:
   - The PIN is **never** stored in plain text.
   - Salted with 32 bytes of cryptographically secure random bytes.
   - Hashed using PBKDF2 (SHA-512, 100,000 iterations).
   - Rate-limited server-side (max 5 failed attempts with exponential lockout to prevent brute-force attacks).
   - Time-safe comparison via `crypto.timingSafeEqual` to eliminate timing leaks.
3. **Innocent Camouflage Logic**:
   - When any number or mathematical expression is evaluated with `=`, the server checks if it matches the current user's PIN.
   - If correct: The application smoothly unlocks into the private messenger.
   - If incorrect: The calculator calculates and displays the mathematical answer normally. **No error message, no alert, and no clue that a hidden vault exists.**

---

## 🚀 Features Overview

### 1. The Luxury Calculator Facade
- Precision arithmetic calculations with decimal support.
- Mathematical operations: addition, subtraction, multiplication, division, percentages, negation (`±`), and backspace (`⌫`).
- Full physical keyboard and touch support (`0-9`, `+`, `-`, `*`, `/`, `Enter`, `Escape`, `Backspace`).
- Formula history line and high-contrast tabular readout.

### 2. Private Social Messenger
- **Chats**: 1-to-1 direct messaging and multi-user group councils.
- **Real-Time Messaging**: Real-time snapshot updates via Cloud Firestore.
- **Voice Memos**: Native in-browser audio recording with duration timers and voice memo audio player.
- **Media Attachments**: Image, video, and file sharing with inline previews.
- **Reactions & Replies**: Quote-replies and instant emoji reactions (`❤️`, `👍`, `🔥`, `😂`).
- **Editing & Deletion**: Author-controlled message modification and revocation.

### 3. Voice & Video Calling (WebRTC)
- Direct peer-to-peer audio and video calls.
- STUN server configuration (`stun:stun.l.google.com:19302`).
- Real-time incoming call modal with audio visualizer, call timer, camera toggle, and mute/unmute.
- Complete transmission call logs and quick-dial shortcuts.

### 4. 24-Hour Ephemeral Stories (Status)
- Post text stories with colored backgrounds or photo updates with captions.
- Automated 24-hour expiration filtering.
- Visual story browser with step progress and author controls.

### 5. Friends, Directory & Groups
- Global registered user directory search by `@username` or display name.
- Friend request system with Accept, Reject, and Cancel workflows.
- Group council creation with multi-member invitations and group admin roles.

### 6. Emergency & Privacy Controls
- **Instant Lock**: One-click "Lock Application" button in the messenger returns immediately to the innocent calculator.
- **Zero Session Leak**: Page refresh defaults back to the locked calculator state.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion.
- **Backend**: Node.js, Express, Vite middleware integration (`server.ts`).
- **Database & Auth**: Google Cloud Firestore, Firebase Authentication, Cloud Storage.
- **P2P Calling**: WebSockets / WebRTC RTCPeerConnection with STUN signaling.
- **Security**: Hardened `firestore.rules` with strict schema validation.

---

## 📦 Setup & Deployment

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run dev server (Express backend + Vite)
npm run dev
```

### Production Build
```bash
# Build frontend and compile backend
npm run build

# Start production server
npm start
```

### Free-Tier Hosting (Firebase Spark Plan / Cloud Run)
1. Firebase Authentication: Enable **Email/Password** and **Google** providers in the Firebase Console.
2. Cloud Firestore: Deploy `firestore.rules` using the Firebase CLI (`firebase deploy --only firestore:rules`).
3. Hosting: Deploy frontend static build to Firebase Hosting or run the Node full-stack server on Google Cloud Run or Railway.
