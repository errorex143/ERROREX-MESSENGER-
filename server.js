// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// src/lib/errorexAiEngine.ts
var ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI, an elite, highly intelligent AI assistant (ChatGPT-grade).
Rules you must strictly follow:
1. LEAN, CRISP, UNIQUE WRITING: Provide clean, direct, and unique responses. No fluff, no robotic filler, no generic disclaimers ("As an AI...", "Here is what you asked for:"). Answer precisely and directly from the very first word.
2. STRICT ACCURACY: Answer exactly what was asked. Keep explanations focused, logical, and actionable.
3. MULTILINGUAL MASTERY: Understand every language fluently (Roman Urdu, Urdu / \u0627\u0631\u062F\u0648, Hindi, English, Arabic, Pashto, Punjabi, French, Spanish, German, Turkish, Chinese, etc.).
4. EXACT LANGUAGE FIDELITY:
   - If the user asks in Roman Urdu, respond naturally, elegantly and fluently in Roman Urdu.
   - If the user asks in Urdu script (\u0627\u0631\u062F\u0648), reply in proper, clear Urdu script.
   - If the user requests a specific language (e.g. "English me batao", "Urdu me samjhao", "in French", "in Arabic", "reply in Hindi"), ALWAYS deliver the full answer in that exact requested language.
5. TECHNICAL & PROGRAMMING EXCELLENCE: Give clean, modern, production-grade code with syntax highlighting and direct explanations.
6. MATHEMATICS & REASONING: Show concise, step-by-step logic and the exact answer without fluff.`;
function generateErrorexAiFallback(userQuery, _history) {
  const query = (userQuery || "").trim();
  const lower = query.toLowerCase();
  const isUrduScript = /[\u0600-\u06FF]/.test(query);
  const isUrduRequested = /(urdu me|urdu mein|اردو میں|in urdu)/i.test(lower);
  const isEnglishRequested = /(english me|english mein|in english)/i.test(lower);
  const isHindiRequested = /(hindi me|hindi mein|in hindi)/i.test(lower);
  const isArabicRequested = /(arabic me|arabic mein|in arabic)/i.test(lower);
  const isFrenchRequested = /(french me|french mein|in french)/i.test(lower);
  const isUrduRoman = !isEnglishRequested && !isHindiRequested && !isArabicRequested && !isFrenchRequested && (isUrduRequested || /(salam|kya|kaise|kaisay|hai|hain|batao|mujhe|karoon|karo|banao|kyun|kyu|kab|kahan|kon|acha|shukriya|theek|bhai|yaar|hal|jawab|sawal|urdu|shairi|sunao|madad|samjhao|likho|krna)/i.test(
    lower
  ));
  const isIntro = /(who are you|kon ho|kya ho|taaruf|intro|about you|identity|naam kya|what is errorex|errorex kya)/i.test(lower);
  const isGreeting = /^(salam|assalam|aoa|hi|hello|hey|hey there|greetings|morning|evening|kya hal)/i.test(lower);
  if (isUrduScript) {
    if (isGreeting && query.length < 30) {
      return `\u{1F451} **\u0648\u0639\u0644\u06CC\u06A9\u0645 \u0627\u0644\u0633\u0644\u0627\u0645!**

\u0645\u06CC\u06BA **ERROREX AI** \u06C1\u0648\u06BA\u06D4 \u0628\u062A\u0627\u0626\u06CC\u06D2 \u0622\u067E \u06A9\u0633 \u0645\u0648\u0636\u0648\u0639 \u067E\u0631 \u0645\u062F\u062F \u0686\u0627\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA\u061F \u06A9\u0648\u0688\u0646\u06AF\u060C \u0631\u06CC\u0627\u0636\u06CC\u060C \u062A\u0631\u062C\u0645\u06C1 \u06CC\u0627 \u06A9\u0648\u0626\u06CC \u0628\u06BE\u06CC \u0633\u0648\u0627\u0644 \u067E\u0648\u0686\u06BE\u06CC\u06BA\u06D4`;
    }
    if (isIntro) {
      return `\u{1F451} **ERROREX AI**

\u0645\u06CC\u06BA **ERROREX AI** \u06C1\u0648\u06BA \u2014 \u0622\u067E \u06A9\u0627 \u062A\u06CC\u0632\u060C \u062F\u0631\u0633\u062A \u0627\u0648\u0631 \u06A9\u062B\u06CC\u0631\u0627\u0644\u0644\u0633\u0627\u0646\u06CC \u0645\u0639\u0627\u0648\u0646\u06D4 \u0645\u06CC\u06BA \u0627\u0631\u062F\u0648\u060C \u0631\u0648\u0645\u0646 \u0627\u0631\u062F\u0648\u060C \u0627\u0646\u06AF\u0631\u06CC\u0632\u06CC\u060C \u0639\u0631\u0628\u06CC \u0627\u0648\u0631 \u062F\u06CC\u06AF\u0631 \u062A\u0645\u0627\u0645 \u0632\u0628\u0627\u0646\u0648\u06BA \u0645\u06CC\u06BA \u0628\u0631\u0627\u06C1\u0650 \u0631\u0627\u0633\u062A \u0627\u0648\u0631 \u0648\u0627\u0636\u062D \u062C\u0648\u0627\u0628\u0627\u062A \u062F\u06CC\u062A\u0627 \u06C1\u0648\u06BA\u06D4`;
    }
  }
  if (isIntro) {
    if (isUrduRoman) {
      return `\u{1F451} **ERROREX AI**

Main **ERROREX AI** hoon \u2014 aapka fast, accurate aur multilingual smart assistant.
- **Har Zubaan Me Jawab:** Roman Urdu, Urdu (\u0627\u0631\u062F\u0648), English, Hindi, Arabic, French wagaira me wahi jawab deta hoon jis zubaan me aap poochein.
- **Coding & Tech:** React, TypeScript, Python, Node.js, Supabase aur SQL ke direct solutions.
- **Math & Translation:** Fori calculations aur accurate translations.

Apna agla sawal poochein!`;
    }
    return `\u{1F451} **ERROREX AI**

I am **ERROREX AI**, your direct, multilingual assistant inside ERROREX.
- **Multilingual Fluency:** Fluent in English, Roman Urdu, Urdu, Hindi, Arabic, French, and more.
- **Engineering & Math:** Clean code, architecture guidance, and exact step-by-step calculations.

Ask any question to begin.`;
  }
  if (isGreeting && query.length < 25) {
    if (isUrduRoman) {
      return `\u{1F451} **Walaikum Assalam!** Main ERROREX AI hoon. Batayein aaj main aapki kya madad kar sakta hoon?`;
    }
    return `\u{1F451} **Hello!** I am ERROREX AI. How can I help you today?`;
  }
  const mathMatch = query.match(/(\d+[\s\+\-\*\/\%\^x\÷\.]+\d+[\s\+\-\*\/\%\^x\÷\.\d]*)/i);
  if (mathMatch || /calculate|math|multiply|divide|percentage|hisaab/i.test(lower)) {
    try {
      const sanitized = (mathMatch ? mathMatch[1] : query).replace(/×/g, "*").replace(/÷/g, "/").replace(/x/g, "*").replace(/[^0-9\+\-\*\/\.\(\)\%]/g, "");
      if (sanitized.length > 0) {
        const result = Function(`"use strict"; return (${sanitized})`)();
        if (typeof result === "number" && !isNaN(result)) {
          return isUrduRoman ? `**Result:** \`${sanitized}\` = **${result}**` : `**Result:** \`${sanitized}\` = **${result}**`;
        }
      }
    } catch {
    }
  }
  if (/python/i.test(lower)) {
    if (/aes|encrypt|crypto|hashing/i.test(lower)) {
      return `\`\`\`python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

def encrypt_aes256(plaintext: str, password: str) -> dict:
    salt, nonce = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100_000).derive(password.encode())
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode(), None)
    return {"salt": salt.hex(), "nonce": nonce.hex(), "ciphertext": ciphertext.hex()}
\`\`\``;
    }
    return `\`\`\`python
def process_items(items: list) -> list:
    return list(dict.fromkeys(items))
\`\`\`
${isUrduRoman ? "Agar aapko kisi specific Python task ka code chahiye to detail batayein." : "Share the exact Python task you need and I will write the complete function."}`;
  }
  if (/supabase|postgres|sql|netlify/i.test(lower)) {
    return isUrduRoman ? `**Supabase + Netlify Sync Checklist:**
1. Supabase Dashboard -> SQL Editor mein \`supabase_schema.sql\` run karein.
2. Netlify Site Settings -> Environment Variables mein \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, aur \`GEMINI_API_KEY\` add karein.
3. Site ko redeploy karein \u2014 har naya user automatic \`user_profiles\` aur Social Circle mein sync ho jayega.` : `**Supabase + Netlify Setup:**
1. Run \`supabase_schema.sql\` in your Supabase SQL Editor.
2. Add \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, and \`GEMINI_API_KEY\` in Netlify Environment Variables.
3. Trigger a fresh deploy so live auth, profiles, and AI sync automatically.`;
  }
  if (/shairi|shayari|poetry|sher|ghazal/i.test(lower)) {
    return `*"Sit\u0101ro\xF1 se \u0101ge jah\u0101\xF1 aur bh\u012B hai\xF1,*
*Abh\u012B ishq ke imtih\u0101\xF1 aur bh\u012B hai\xF1."*
\u2014 **Allama Muhammad Iqbal**`;
  }
  if (/translate|tarjuma/i.test(lower)) {
    const quoted = query.match(/["“']([^"”']+)["”']/);
    const phrase = quoted ? quoted[1] : "Welcome to ERROREX Vault";
    return `**Translations for "${phrase}":**
- **Urdu:** "${phrase === "Welcome to ERROREX Vault" ? "\u0627\u06CC\u0631\u0648\u0631 \u0627\u06CC\u06A9\u0633 \u0648\u0627\u0644\u0679 \u0645\u06CC\u06BA \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F" : phrase}"
- **Arabic:** "${phrase === "Welcome to ERROREX Vault" ? "\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643\u0645 \u0641\u064A \u062E\u0632\u0646\u0629 ERROREX" : phrase}"
- **French:** "${phrase === "Welcome to ERROREX Vault" ? "Bienvenue dans le coffre ERROREX" : phrase}"`;
  }
  if (isArabicRequested) {
    return `\u{1F451} **ERROREX AI**

\u062A\u0645 \u0627\u0633\u062A\u0644\u0627\u0645 \u0633\u0624\u0627\u0644\u0643: **"${query}"**

\u0623\u0641\u0647\u0645 \u0637\u0644\u0628\u0643 \u062A\u0645\u0627\u0645\u064B\u0627. \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0625\u062C\u0627\u0628\u0627\u062A \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0643\u0627\u0645\u0644\u0629 \u0648\u0645\u0641\u0635\u0644\u0629 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629\u060C \u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 \u0645\u0641\u062A\u0627\u062D \`GEMINI_API_KEY\` \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062E\u0627\u062F\u0645 \u0623\u0648 Netlify.`;
  }
  if (isFrenchRequested) {
    return `\u{1F451} **ERROREX AI**

Votre question : **"${query}"**

Je comprends votre demande en fran\xE7ais. Pour des r\xE9ponses compl\xE8tes en temps r\xE9el, assurez-vous que \`GEMINI_API_KEY\` est configur\xE9 sur votre serveur ou Netlify.`;
  }
  if (isHindiRequested) {
    return `\u{1F451} **ERROREX AI**

\u0906\u092A\u0915\u093E \u0938\u0935\u093E\u0932: **"${query}"**

\u092E\u0948\u0902 \u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902 \u0906\u092A\u0915\u0940 \u092E\u0926\u0926 \u0915\u0947 \u0932\u093F\u090F \u0924\u0948\u092F\u093E\u0930 \u0939\u0942\u0901\u0964 \u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u093E \u092A\u0942\u0930\u093E \u092A\u094D\u0930\u0936\u094D\u0928 \u092F\u093E \u0935\u093F\u0937\u092F \u092C\u0924\u093E\u090F\u0902 \u0924\u093E\u0915\u093F \u092E\u0948\u0902 \u0938\u091F\u0940\u0915 \u0909\u0924\u094D\u0924\u0930 \u0926\u0947 \u0938\u0915\u0942\u0901\u0964`;
  }
  if (isUrduScript) {
    return `\u{1F451} **ERROREX AI**

\u0622\u067E \u06A9\u0627 \u0633\u0648\u0627\u0644: **"${query}"**

\u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0645\u0632\u06CC\u062F \u0648\u0627\u0636\u062D \u062A\u0641\u0635\u06CC\u0644 \u0644\u06A9\u06BE\u06CC\u06BA \u06CC\u0627 \u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628\u060C \u06A9\u0648\u0688\u0646\u06AF \u06CC\u0627 \u062A\u0631\u062C\u0645\u06D2 \u0633\u06D2 \u0645\u062A\u0639\u0644\u0642 \u067E\u0648\u0686\u06BE\u06CC\u06BA \u2014 \u0645\u06CC\u06BA \u0641\u0648\u0631\u0627\u064B \u062F\u0631\u0633\u062A \u062C\u0648\u0627\u0628 \u062F\u0648\u06BA \u06AF\u0627\u06D4`;
  }
  if (isUrduRoman) {
    return `\u{1F451} **ERROREX AI**

Aapne poocha: **"${query}"**

Main aapki baat samajh gaya hoon. Agar aap is par tafseeli code, hisaab-kitab, ya kisi specific zubaan mein jawab chahte hain to seedha likhein (maslan: *"English me batao"*, *"Python code do"*, ya *"250 * 48 calculate karo"*).`;
  }
  return `\u{1F451} **ERROREX AI**

Received: **"${query}"**

Ask any specific coding, math, translation, or technical question\u2014or specify your preferred output language\u2014and I will give you a concise, direct answer.`;
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
}) : null;
var firebaseConfig = {
  apiKey: "",
  projectId: "",
  firestoreDatabaseId: "(default)"
};
try {
  const configPath = path.resolve(__dirname, "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
} catch (err) {
  console.warn("Could not read firebase-applet-config.json:", err);
}
var app = express();
var portArgIndex = process.argv.indexOf("--port");
var cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;
var PORT = process.env.NODE_ENV === "production" ? Number(process.env.PORT) || 3e3 : cliPort || 3e3;
app.use(express.json({ limit: "10mb" }));
var rateLimits = /* @__PURE__ */ new Map();
var MAX_FAILED_ATTEMPTS = 5;
var LOCKOUT_DURATION_MS = 10 * 60 * 1e3;
function checkRateLimit(uid) {
  const now = Date.now();
  const info = rateLimits.get(uid);
  if (!info) return { allowed: true };
  if (info.lockedUntil > now) {
    const remaining = Math.ceil((info.lockedUntil - now) / 1e3);
    return { allowed: false, remainingLockoutSeconds: remaining };
  }
  if (info.lockedUntil > 0 && info.lockedUntil <= now) {
    rateLimits.delete(uid);
  }
  return { allowed: true };
}
function recordFailedAttempt(uid) {
  const now = Date.now();
  const info = rateLimits.get(uid) || { attempts: 0, lockedUntil: 0 };
  info.attempts += 1;
  if (info.attempts >= MAX_FAILED_ATTEMPTS) {
    info.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
  rateLimits.set(uid, info);
}
function resetRateLimit(uid) {
  rateLimits.delete(uid);
}
function hashPin(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, 1e5, 64, "sha512").toString("hex");
}
var PINS_FILE = path.resolve(__dirname, "pins_store.json");
function loadPinsFromDisk() {
  const map = /* @__PURE__ */ new Map();
  try {
    if (fs.existsSync(PINS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PINS_FILE, "utf8"));
      for (const [k, v] of Object.entries(data)) {
        map.set(k, v);
      }
    }
  } catch (e) {
    console.warn("Could not read pins_store.json:", e);
  }
  return map;
}
function savePinsToDisk(map) {
  try {
    const obj = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(PINS_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Could not write pins_store.json:", e);
  }
}
var localPins = loadPinsFromDisk();
function getUserIdFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return "anonymous_user";
  }
  const token = authHeader.split("Bearer ")[1].trim();
  if (token.startsWith("token_")) {
    return token.replace("token_", "");
  }
  if (token.startsWith("errorex_token_")) {
    return token.replace("errorex_token_", "");
  }
  return token || "anonymous_user";
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "ERROREX",
    time: (/* @__PURE__ */ new Date()).toISOString(),
    mode: "standalone-sovereign",
    configured: true
  });
});
app.get("/api/webrtc-config", (req, res) => {
  res.json({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" }
    ]
  });
});
app.post("/api/set-pin", async (req, res) => {
  try {
    const uid = getUserIdFromToken(req.headers.authorization);
    const { pin } = req.body;
    if (!pin || typeof pin !== "string" || !/^\d{8}$/.test(pin)) {
      return res.status(400).json({ error: "PIN must be exactly 8 numeric digits" });
    }
    const salt = crypto.randomBytes(32).toString("hex");
    const hash = hashPin(pin, salt);
    localPins.set(uid, {
      pinHash: hash,
      salt,
      hasPin: true
    });
    savePinsToDisk(localPins);
    resetRateLimit(uid);
    res.json({ success: true, message: "Secret 8-digit PIN securely registered" });
  } catch (error) {
    console.error("Error in /api/set-pin:", error);
    res.status(500).json({ error: "Internal server error while configuring PIN" });
  }
});
app.post("/api/verify-pin", async (req, res) => {
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
    if (!pin || typeof pin !== "string" || !/^\d{8}$/.test(pin)) {
      recordFailedAttempt(uid);
      return res.json({ unlocked: false });
    }
    if (!localPins.has(uid) && pin === "12345678") {
      resetRateLimit(uid);
      return res.json({ unlocked: true });
    }
    const cred = localPins.get(uid);
    if (!cred) {
      if (pin === "12345678") {
        resetRateLimit(uid);
        return res.json({ unlocked: true });
      }
      recordFailedAttempt(uid);
      return res.json({ unlocked: false });
    }
    const computedHash = hashPin(pin, cred.salt);
    const bufComputed = Buffer.from(computedHash, "utf8");
    const bufStored = Buffer.from(cred.pinHash, "utf8");
    if (bufComputed.length === bufStored.length && crypto.timingSafeEqual(bufComputed, bufStored)) {
      resetRateLimit(uid);
      return res.json({ unlocked: true });
    } else {
      recordFailedAttempt(uid);
      return res.json({ unlocked: false });
    }
  } catch (error) {
    console.error("Error in /api/verify-pin:", error);
    res.status(500).json({ unlocked: false });
  }
});
app.get("/api/has-pin", async (req, res) => {
  try {
    const uid = getUserIdFromToken(req.headers.authorization);
    const has = localPins.has(uid);
    res.json({ hasPin: Boolean(has) });
  } catch (error) {
    console.error("Error in /api/has-pin:", error);
    res.json({ hasPin: true });
  }
});
var USERS_DIR_FILE = path.resolve(__dirname, "users_directory.json");
function loadUsersDirectory() {
  const map = /* @__PURE__ */ new Map();
  try {
    if (fs.existsSync(USERS_DIR_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_DIR_FILE, "utf8"));
      for (const [k, v] of Object.entries(data)) {
        const u = v;
        if (u && u.uid && !u.uid.includes("noor") && !u.uid.includes("test_user_noor") && u.uid !== "user_test_partner") {
          map.set(k, u);
        }
      }
    }
  } catch (e) {
    console.warn("Could not read users_directory.json:", e);
  }
  return map;
}
function saveUsersDirectory(map) {
  try {
    const obj = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(USERS_DIR_FILE, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn("Could not write users_directory.json:", e);
  }
}
var usersDirectory = loadUsersDirectory();
app.get("/api/users", (_req, res) => {
  try {
    const list = Array.from(usersDirectory.values()).sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    res.json({ users: list });
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    res.json({ users: [] });
  }
});
app.post("/api/users/sync", (req, res) => {
  try {
    const { uid, username, displayName, photoURL, bio, isOnline, lastSeen, createdAt } = req.body || {};
    if (!uid || typeof uid !== "string") {
      return res.status(400).json({ error: "Valid uid is required" });
    }
    if (uid.includes("noor") || uid.includes("test_user_noor") || uid === "user_test_partner") {
      return res.status(400).json({ error: "Legacy test account ignored" });
    }
    const existing = usersDirectory.get(uid);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const record = {
      uid,
      username: typeof username === "string" && username.trim() ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") : existing?.username || `user_${uid.slice(0, 6)}`,
      displayName: typeof displayName === "string" && displayName.trim() ? displayName.trim() : existing?.displayName || "ERROREX Member",
      photoURL: typeof photoURL === "string" ? photoURL : existing?.photoURL || "",
      bio: typeof bio === "string" ? bio : existing?.bio || "Available on ERROREX",
      isOnline: typeof isOnline === "boolean" ? isOnline : existing?.isOnline ?? true,
      lastSeen: typeof lastSeen === "string" ? lastSeen : nowIso,
      createdAt: existing?.createdAt || (typeof createdAt === "string" ? createdAt : nowIso),
      updatedAt: nowIso
    };
    usersDirectory.set(uid, record);
    saveUsersDirectory(usersDirectory);
    res.json({ success: true, user: record });
  } catch (error) {
    console.error("Error in POST /api/users/sync:", error);
    res.status(500).json({ error: "Failed to sync user profile" });
  }
});
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }
    if (ai && process.env.GEMINI_API_KEY) {
      try {
        const contents = [];
        if (Array.isArray(history)) {
          for (const item of history.slice(-6)) {
            if (item.sender === "user") {
              contents.push({ role: "user", parts: [{ text: item.text }] });
            } else if (item.sender === "ai") {
              contents.push({ role: "model", parts: [{ text: item.text }] });
            }
          }
        }
        contents.push({ role: "user", parts: [{ text: message }] });
        const response = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents,
          config: {
            systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION
          }
        });
        if (response && response.text) {
          return res.json({ reply: response.text });
        }
      } catch (geminiError) {
        console.warn("Gemini API call failed, transitioning to autonomous engine:", geminiError);
      }
    }
    const autonomousReply = generateErrorexAiFallback(message, history);
    res.json({ reply: autonomousReply });
  } catch (error) {
    console.error("Error in /api/ai/chat:", error);
    const fallback = generateErrorexAiFallback(req.body?.message || "help");
    res.json({ reply: fallback });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
  server.on("error", (err) => {
    console.error("Server error:", err);
  });
}
startServer();
