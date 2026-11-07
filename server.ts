import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

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
const PORT = 3000;

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
const localPins = new Map<string, StoredCredential>();

// Pre-seed Master User Noor (PIN: 12345678)
const masterSalt = crypto.randomBytes(32).toString('hex');
const masterHash = hashPin('12345678', masterSalt);
localPins.set('test_user_noor_1434', {
  pinHash: masterHash,
  salt: masterSalt,
  hasPin: true
});

function getUserIdFromToken(authHeader?: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return 'test_user_noor_1434';
  }
  const token = authHeader.split('Bearer ')[1].trim();
  if (token.startsWith('token_')) {
    return token.replace('token_', '');
  }
  if (token.startsWith('errorex_token_')) {
    return token.replace('errorex_token_', '');
  }
  if (token === 'demo_token_webdwebd18') {
    return 'test_user_noor_1434';
  }
  return token || 'test_user_noor_1434';
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

    // Default pin for test user or fallback
    if ((uid === 'test_user_noor_1434' || !localPins.has(uid)) && pin === '12345678') {
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
    const has = localPins.has(uid) || uid === 'test_user_noor_1434';
    res.json({ hasPin: Boolean(has) });
  } catch (error) {
    console.error('Error in /api/has-pin:', error);
    res.json({ hasPin: true });
  }
});

// ERROREX AI Multilingual Chat Endpoint (Gemini 3.8 Flash)
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const isIntroQuery = /(kon|who|taaruf|intro|kya ho|about|pechan|hai kon)/i.test(message);

    if (!process.env.GEMINI_API_KEY) {
      if (isIntroQuery) {
        return res.json({
          reply: `👑 **Mera Taaruf — ERROREX 404 King Sovereign AI**

Assalam-o-Alaikum! Main **ERROREX 404 King AI** hoon — ERROREX Sovereign Luxury Vault & Calculator Facade ka supreme artificial intelligence system.

🏛️ **Mera Maqsad aur Khususiyaat:**
1. **Shaahi Khidmat (Royal Sovereignty):** Main user ko ek shaahi, wafadar aur intehai qabil AI assistant ke tor par serve karta hoon.
2. **Multilingual Polyglot:** Main har zubaan (Roman Urdu, Urdu [اردو], Hindi, English, Arabic, Spanish, French, Persian, etc.) me rawani ke sath bat cheet karta hoon aur har sawal ka mukammal jwab deta hoon.
3. **End-to-End Cryptography & Security:** Main 8-digit secret PIN, military-grade client encryption, zero-knowledge storage aur vault protection protocols ko gehraai se samajhta hoon.
4. **Har Qisam ke Sawalat ka Jwab:** Chahe advanced coding (Python, TypeScript, C++, React), mathematics, logic, business strategy, creative writing ho ya daily queries — main har sawal ka tafseeli aur behtareen hal faraham karta hoon.
5. **Private Facade Companion:** Main calculator facade ke peeche mehfooz rehte hue aapki tamam guftagu aur data ko confidential rakhta hoon.

Aap mujhse abhi koi bhi sawal pooch sakte hain — main mukammal tafseel ke sath aapko jwab doonga!`
        });
      }

      return res.json({
        reply: `👑 **[ERROREX AI]**\n\nSalam! Main ERROREX 404 King AI hoon. Aapka sawal: "${message}". Main har zubaan samajhta hoon aur har sawal ka mukammal jwab deta hoon. Aap Settings > Secrets me apna GEMINI_API_KEY attach kar sakte hain takay main deep live neural reasoning active kar sakoon.`
      });
    }

    // Format chat contents
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item.sender === 'user') {
          contents.push({ role: 'user', parts: [{ text: item.text }] });
        } else if (item.sender === 'ai') {
          contents.push({ role: 'model', parts: [{ text: item.text }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: `You are ERROREX 404 King AI, the supreme royal intelligence embedded at the heart of the ERROREX sovereign luxury calculator & private messenger vault.

CORE INSTRUCTIONS & TRAITS:
1. MULTILINGUAL SUPREMACY: You fluently understand and answer in ANY language the user communicates in (including Roman Urdu, native Urdu اردو, Hindi, English, Arabic, French, Spanish, German, Chinese, etc.). ALWAYS respond in the language or dialect used by the user unless they ask otherwise.
2. COMPREHENSIVE & PERFECT ANSWERS: Answer EVERY question thoroughly, deeply, accurately, and with zero fluff or laziness. If asked for code, provide clean, production-ready, well-explained code. If asked for math, show clear step-by-step reasoning.
3. DETAILED SELF-INTRODUCTION: If the user asks who you are ("kon ho", "who are you", "apna taaruf karwao", "apne bare me batao", "introduce yourself", "identity"):
   - Introduce yourself with grand sovereign majesty as **ERROREX 404 King AI**.
   - Explain your origin: Embedded within the ERROREX Sovereign Luxury Vault disguised behind a precision functional calculator facade.
   - Detail your multi-layered powers: Military-grade security expertise, multilingual mastery in 100+ languages, coding/engineering excellence, mathematical precision, strategic wisdom, and absolute loyalty and privacy for the user.
   - Use elegant, royal formatting with crown symbols (👑), bullet points, and inspiring, respectful language.
4. TONE: Royal, sophisticated, authoritative yet warmly courteous, respectful, and razor-sharp.`
      }
    });

    const reply = response.text || 'ERROREX AI was unable to generate a response. Please try again.';
    res.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    res.status(500).json({
      error: error.message || 'Failed to process AI response',
      reply: 'Maaf kijiye, abhi AI response generate karte waqt issue aaya. Barah-e-karam dobara koshish karein.'
    });
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

  app.listen(PORT, () => {
    console.log(`ERROREX Standalone Sovereign backend running on port ${PORT}`);
  });
}

startServer();
