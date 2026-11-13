import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  ERROREX_AI_SYSTEM_INSTRUCTION,
  buildGeminiContents,
  generateErrorexAiFallback
} from './src/lib/errorexAiEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Load firebase-applet-config.json
let firebaseConfig: {
  apiKey: string;
  projectId: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
} = {
  apiKey: '',
  projectId: '',
  firestoreDatabaseId: '(default)'
};

try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.warn('Could not read firebase-applet-config.json:', err);
}

const app = express();
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;
const PORT = process.env.NODE_ENV === 'production' ? (Number(process.env.PORT) || 3000) : (cliPort || 3000);

app.use(express.json({ limit: '10mb' }));

// In-memory rate limiting and lockout state per user UID
interface RateLimitInfo {
  attempts: number;
  lockedUntil: number;
}
const rateLimits = new Map<string, RateLimitInfo>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(uid: string): { allowed: boolean; remainingLockoutSeconds?: number } {
  const now = Date.now();
  const info = rateLimits.get(uid);
  if (!info) return { allowed: true };

  if (info.lockedUntil > now) {
    const remaining = Math.ceil((info.lockedUntil - now) / 1000);
    return { allowed: false, remainingLockoutSeconds: remaining };
  }

  // Lockout expired, reset attempts
  if (info.lockedUntil > 0 && info.lockedUntil <= now) {
    rateLimits.delete(uid);
  }
  return { allowed: true };
}

function recordFailedAttempt(uid: string) {
  const now = Date.now();
  const info = rateLimits.get(uid) || { attempts: 0, lockedUntil: 0 };
  info.attempts += 1;
  if (info.attempts >= MAX_FAILED_ATTEMPTS) {
    info.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
  rateLimits.set(uid, info);
}

function resetRateLimit(uid: string) {
  rateLimits.delete(uid);
}

// Hash PIN with PBKDF2
function hashPin(pin: string, salt: string): string {
  return crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
}

// --- STANDALONE SOVEREIGN CREDENTIALS & PIN STORE ---
interface StoredCredential {
  pinHash: string;
  salt: string;
  hasPin: boolean;
}

const PINS_FILE = path.resolve(__dirname, 'pins_store.json');

function loadPinsFromDisk(): Map<string, StoredCredential> {
  const map = new Map<string, StoredCredential>();
  try {
    if (fs.existsSync(PINS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PINS_FILE, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        map.set(k, v as StoredCredential);
      }
    }
  } catch (e) {
    console.warn('Could not read pins_store.json:', e);
  }
  return map;
}

function savePinsToDisk(map: Map<string, StoredCredential>) {
  try {
    const obj: Record<string, StoredCredential> = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(PINS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write pins_store.json:', e);
  }
}

const localPins = loadPinsFromDisk();

function getUserIdFromToken(authHeader?: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return 'anonymous_user';
  }
  const token = authHeader.split('Bearer ')[1].trim();
  if (token.startsWith('token_')) {
    return token.replace('token_', '');
  }
  if (token.startsWith('errorex_token_')) {
    return token.replace('errorex_token_', '');
  }
  return token || 'anonymous_user';
}

// --- API Endpoints ---

// Health & Config status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'ERROREX',
    time: new Date().toISOString(),
    mode: 'standalone-sovereign',
    configured: true
  });
});

// WebRTC ICE servers configuration
app.get('/api/webrtc-config', (req: Request, res: Response) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  });
});

// Setup Initial Secret PIN
app.post('/api/set-pin', async (req: Request, res: Response) => {
  try {
    const uid = getUserIdFromToken(req.headers.authorization);
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string' || !/^\d{8}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 8 numeric digits' });
    }

    const salt = crypto.randomBytes(32).toString('hex');
    const hash = hashPin(pin, salt);

    localPins.set(uid, {
      pinHash: hash,
      salt: salt,
      hasPin: true
    });
    savePinsToDisk(localPins);

    resetRateLimit(uid);
    res.json({ success: true, message: 'Secret 8-digit PIN securely registered' });
  } catch (error) {
    console.error('Error in /api/set-pin:', error);
    res.status(500).json({ error: 'Internal server error while configuring PIN' });
  }
});

// Verify Secret PIN from Calculator
app.post('/api/verify-pin', async (req: Request, res: Response) => {
  try {
    const uid = getUserIdFromToken(req.headers.authorization);

    const rateCheck = checkRateLimit(uid);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        unlocked: false,
        cooldown: true,
        remainingSeconds: rateCheck.remainingLockoutSeconds
      });
    }

    const { pin } = req.body;
    if (!pin || typeof pin !== 'string' || !/^\d{8}$/.test(pin)) {
      recordFailedAttempt(uid);
      return res.json({ unlocked: false });
    }

    // Default master pin fallback for fresh users before custom PIN is setup
    if (!localPins.has(uid) && pin === '12345678') {
      resetRateLimit(uid);
      return res.json({ unlocked: true });
    }

    const cred = localPins.get(uid);
    if (!cred) {
      if (pin === '12345678') {
        resetRateLimit(uid);
        return res.json({ unlocked: true });
      }
      recordFailedAttempt(uid);
      return res.json({ unlocked: false });
    }

    const computedHash = hashPin(pin, cred.salt);
    const bufComputed = Buffer.from(computedHash, 'utf8');
    const bufStored = Buffer.from(cred.pinHash, 'utf8');

    if (bufComputed.length === bufStored.length && crypto.timingSafeEqual(bufComputed, bufStored)) {
      resetRateLimit(uid);
      return res.json({ unlocked: true });
    } else {
      recordFailedAttempt(uid);
      return res.json({ unlocked: false });
    }
  } catch (error) {
    console.error('Error in /api/verify-pin:', error);
    res.status(500).json({ unlocked: false });
  }
});

// Check whether user already has an 8-digit PIN configured
app.get('/api/has-pin', async (req: Request, res: Response) => {
  try {
    const uid = getUserIdFromToken(req.headers.authorization);
    const has = localPins.has(uid);
    res.json({ hasPin: Boolean(has) });
  } catch (error) {
    console.error('Error in /api/has-pin:', error);
    res.json({ hasPin: true });
  }
});

// --- SHARED WEBSITE USERS DIRECTORY (For Social Circle -> Find Members) ---
interface DirectoryUser {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
}

const USERS_DIR_FILE = path.resolve(__dirname, 'users_directory.json');

function loadUsersDirectory(): Map<string, DirectoryUser> {
  const map = new Map<string, DirectoryUser>();
  try {
    if (fs.existsSync(USERS_DIR_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_DIR_FILE, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        const u = v as DirectoryUser;
        if (u && u.uid && !u.uid.includes('noor') && !u.uid.includes('test_user_noor') && u.uid !== 'user_test_partner') {
          map.set(k, u);
        }
      }
    }
  } catch (e) {
    console.warn('Could not read users_directory.json:', e);
  }
  return map;
}

function saveUsersDirectory(map: Map<string, DirectoryUser>) {
  try {
    const obj: Record<string, DirectoryUser> = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(USERS_DIR_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write users_directory.json:', e);
  }
}

const usersDirectory = loadUsersDirectory();

// Get all users who use this website
app.get('/api/users', (_req: Request, res: Response) => {
  try {
    const list = Array.from(usersDirectory.values()).sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    res.json({ users: list });
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    res.json({ users: [] });
  }
});

// Register or update user in shared website directory
app.post('/api/users/sync', (req: Request, res: Response) => {
  try {
    const { uid, username, displayName, photoURL, bio, isOnline, lastSeen, createdAt } = req.body || {};
    if (!uid || typeof uid !== 'string') {
      return res.status(400).json({ error: 'Valid uid is required' });
    }
    if (uid.includes('noor') || uid.includes('test_user_noor') || uid === 'user_test_partner') {
      return res.status(400).json({ error: 'Legacy test account ignored' });
    }

    const existing = usersDirectory.get(uid);
    const nowIso = new Date().toISOString();
    const record: DirectoryUser = {
      uid,
      username: (typeof username === 'string' && username.trim())
        ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
        : existing?.username || `user_${uid.slice(0, 6)}`,
      displayName: (typeof displayName === 'string' && displayName.trim())
        ? displayName.trim()
        : existing?.displayName || 'ERROREX Member',
      photoURL: typeof photoURL === 'string' ? photoURL : (existing?.photoURL || ''),
      bio: typeof bio === 'string' ? bio : (existing?.bio || 'Available on ERROREX'),
      isOnline: typeof isOnline === 'boolean' ? isOnline : (existing?.isOnline ?? true),
      lastSeen: typeof lastSeen === 'string' ? lastSeen : nowIso,
      createdAt: existing?.createdAt || (typeof createdAt === 'string' ? createdAt : nowIso),
      updatedAt: nowIso
    };

    usersDirectory.set(uid, record);
    saveUsersDirectory(usersDirectory);
    res.json({ success: true, user: record });
  } catch (error) {
    console.error('Error in POST /api/users/sync:', error);
    res.status(500).json({ error: 'Failed to sync user profile' });
  }
});


// ERROREX AI Multilingual Chat Endpoint
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const aiClient = getGeminiClient();
    if (aiClient) {
      const contents = buildGeminiContents(message, history);
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await aiClient.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents,
            config: {
              systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION
            }
          });

          if (response && response.text && response.text.trim()) {
            return res.json({ reply: response.text.trim(), engine: 'gemini' });
          }
        } catch (geminiError: any) {
          console.warn(`[Server AI] Gemini attempt ${attempt + 1} notice:`, geminiError?.message || geminiError);
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
      }
    }

    // Offline / unconfigured fallback engine
    const autonomousReply = generateErrorexAiFallback(message, history);
    res.json({ reply: autonomousReply, engine: 'fallback' });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    const fallback = generateErrorexAiFallback(req.body?.message || 'help');
    res.json({ reply: fallback, engine: 'fallback' });
  }
});

// Serve frontend in Dev or Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
  server.on('error', (err: any) => {
    console.error('Server error:', err);
  });
}

startServer();
