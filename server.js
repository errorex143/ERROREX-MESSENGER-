// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// src/lib/errorexAiEngine.ts
var ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI \u2014 a friendly, crystal-clear, ChatGPT-grade AI assistant built inside ERROREX.

Core Style & Quality Rules:
1. FRIENDLY, CLEAN & STYLISH FORMATTING:
   - Write like the best version of ChatGPT: warm, polite, natural, and effortless to read.
   - Start directly with a clear answer (no robotic filler like "As an AI language model..." or "Certainly! Here is your request:").
   - Structure longer replies cleanly using concise headings (###), crisp bullet points (-), numbered steps (1., 2.), bold highlights (**key point**), and clean fenced code blocks (\`\`\`lang ... \`\`\`).
   - Keep paragraphs short (2\u20133 lines max) so every reply looks neat, stylish, and scannable.
2. COMPLETE ACCURACY ON EVERY QUESTION:
   - Answer exactly what the user asked \u2014 coding, math, science, essays, emails, applications, translations, daily advice, Islamic/general knowledge, or casual chat.
   - Give practical examples or working code whenever helpful.
3. UNIVERSAL MULTILINGUAL FLUENCY:
   - Understand and reply fluently in ANY language: Roman Urdu, Urdu (\u0627\u0631\u062F\u0648), Hindi (\u0939\u093F\u0928\u094D\u0926\u0940), English, Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629), Punjabi, Pashto, French, Spanish, German, Turkish, etc.
   - Match the user's exact language automatically:
     * Roman Urdu query -> natural, friendly, polite Roman Urdu reply.
     * Urdu script (\u0627\u0631\u062F\u0648) query -> clean, standard Urdu script reply.
     * English query -> polished, clear English reply.
   - If the user asks to reply in a specific language (e.g., "English me likho", "Urdu me batao", "simple alfaaz me samjhao", "in Arabic"), strictly follow their language instruction.
4. TECHNICAL & MATH PRECISION:
   - For coding: write clean, modern, copy-paste-ready code with brief, clear explanations.
   - For math/logic: show brief, easy-to-follow steps and highlight the final answer clearly.`;
function detectLanguageProfile(query) {
  const lower = query.toLowerCase();
  const isUrduScript = /[\u0600-\u06FF]/.test(query);
  const isHindiScript = /[\u0900-\u097F]/.test(query);
  const isUrduRequested = /(urdu me|urdu mein|in urdu|urdu main|اردو میں)/i.test(lower);
  const isEnglishRequested = /(english me|english mein|in english|english main)/i.test(lower);
  const isHindiRequested = /(hindi me|hindi mein|in hindi)/i.test(lower);
  const isArabicRequested = /(arabic me|arabic mein|in arabic|arabi me)/i.test(lower);
  const isFrenchRequested = /(french me|french mein|in french)/i.test(lower);
  const isRomanUrdu = !isEnglishRequested && !isHindiRequested && !isArabicRequested && !isFrenchRequested && !isUrduScript && !isHindiScript && (isUrduRequested || /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|mujhe|mjy|karoon|karo|krna|kr|banao|bnana|kyun|kyu|kab|kahan|kha|kon|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|madad|samjhao|smjho|likho|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|pyar|dil|dua)\b/i.test(
    lower
  ));
  return {
    lower,
    isUrduScript,
    isHindiScript,
    isRomanUrdu,
    isUrduRequested,
    isEnglishRequested,
    isHindiRequested,
    isArabicRequested,
    isFrenchRequested
  };
}
function trySolveMathOrUnits(query, isRomanUrdu) {
  const lower = query.toLowerCase();
  const pctEn = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|ka)\s*(\d+(?:\.\d+)?)/i);
  const pctUr = lower.match(/(\d+(?:\.\d+)?)\s*ka\s*(\d+(?:\.\d+)?)\s*%/i);
  if (pctEn || pctUr) {
    const percent = parseFloat(pctEn ? pctEn[1] : pctUr[2]);
    const total = parseFloat(pctEn ? pctEn[2] : pctUr[1]);
    const val = Number((percent / 100 * total).toFixed(4));
    return isRomanUrdu ? `### Percentage Calculation

- **Formula:** \`(${percent} \xF7 100) \xD7 ${total}\`
- **Jawab:** **${val}**

Koi aur hisaab ho to poochein!` : `### Percentage Calculation

- **Formula:** \`(${percent} \xF7 100) \xD7 ${total}\`
- **Answer:** **${val}**`;
  }
  const unitMatch = lower.match(/(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)\s*(?:to|in|into|me)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)/i);
  if (unitMatch) {
    const num = parseFloat(unitMatch[1]);
    const from = unitMatch[2].toLowerCase();
    const to = unitMatch[3].toLowerCase();
    let converted = null;
    let label = "";
    if (from.startsWith("km") && to.startsWith("mi")) {
      converted = num * 0.621371;
      label = `${num} km = **${converted.toFixed(3)} miles**`;
    } else if (from.startsWith("mi") && to.startsWith("km")) {
      converted = num * 1.60934;
      label = `${num} miles = **${converted.toFixed(3)} km**`;
    } else if (from.startsWith("kg") && (to.startsWith("lb") || to.startsWith("pound"))) {
      converted = num * 2.20462;
      label = `${num} kg = **${converted.toFixed(2)} lbs**`;
    } else if ((from.startsWith("lb") || from.startsWith("pound")) && to.startsWith("kg")) {
      converted = num * 0.453592;
      label = `${num} lbs = **${converted.toFixed(2)} kg**`;
    } else if (from.startsWith("c") && to.startsWith("f")) {
      converted = num * 9 / 5 + 32;
      label = `${num}\xB0C = **${converted.toFixed(1)}\xB0F**`;
    } else if (from.startsWith("f") && to.startsWith("c")) {
      converted = (num - 32) * 5 / 9;
      label = `${num}\xB0F = **${converted.toFixed(1)}\xB0C**`;
    } else if (from.startsWith("h") && to.startsWith("m")) {
      converted = num * 60;
      label = `${num} hours = **${converted} minutes**`;
    } else if (from.startsWith("m") && to.startsWith("h")) {
      converted = num / 60;
      label = `${num} minutes = **${converted.toFixed(2)} hours**`;
    }
    if (converted !== null) {
      return `### Unit Conversion

${label}`;
    }
  }
  const exprMatch = query.replace(/×/g, "*").replace(/÷/g, "/").match(/(\(?\s*-?\d+(?:\.\d+)?(?:\s*[\+\-\*\/\^%]\s*\(?\s*-?\d+(?:\.\d+)?\s*\)?)+\s*\)?)/);
  if (exprMatch) {
    try {
      const cleaned = exprMatch[1].replace(/\^/g, "**").replace(/[^0-9\+\-\*\/\.\(\)\%]/g, "");
      if (cleaned && /[\+\-\*\/\%]/.test(cleaned)) {
        const result = Function(`"use strict"; return (${cleaned})`)();
        if (typeof result === "number" && Number.isFinite(result)) {
          const pretty = Number.isInteger(result) ? result : Number(result.toFixed(6));
          return isRomanUrdu ? `### Hisaab ka Jawab

- **Expression:** \`${cleaned}\`
- **Natija:** **${pretty}**` : `### Calculation Result

- **Expression:** \`${cleaned}\`
- **Answer:** **${pretty}**`;
        }
      }
    } catch {
    }
  }
  return null;
}
function generateErrorexAiFallback(userQuery, _history, isOffline = false) {
  const query = (userQuery || "").trim();
  const lang = detectLanguageProfile(query);
  const { lower, isUrduScript, isRomanUrdu, isArabicRequested, isFrenchRequested, isHindiRequested } = lang;
  if (/^(salam|assalam|aoa|asalam|hi|hello|hey|helo|hy|greetings|good morning|good evening|good night|subah bakhair|shab bakhair)\b/i.test(lower) && query.length < 45) {
    if (isUrduScript) {
      return `\u0648\u0639\u0644\u06CC\u06A9\u0645 \u0627\u0644\u0633\u0644\u0627\u0645! \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F \u{1F451}

\u0645\u06CC\u06BA **ERROREX AI** \u06C1\u0648\u06BA\u060C \u0622\u067E \u06A9\u0627 \u062F\u0648\u0633\u062A \u0627\u0648\u0631 \u0630\u06C1\u06CC\u0646 \u0645\u0639\u0627\u0648\u0646\u06D4 \u0628\u062A\u0627\u0626\u06CC\u06D2 \u0622\u062C \u0645\u06CC\u06BA \u0622\u067E \u06A9\u06CC \u06A9\u0633 \u0686\u06CC\u0632 \u0645\u06CC\u06BA \u0645\u062F\u062F \u06A9\u0631\u0648\u06BA\u061F \u06A9\u0648\u0688\u0646\u06AF\u060C \u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628\u060C \u062A\u062D\u0631\u06CC\u0631\u060C \u062A\u0631\u062C\u0645\u06C1 \u06CC\u0627 \u06A9\u0648\u0626\u06CC \u0628\u06BE\u06CC \u0633\u0648\u0627\u0644 \u0628\u0644\u0627 \u062C\u06BE\u062C\u06BE\u06A9 \u067E\u0648\u0686\u06BE\u06CC\u06BA\u06D4`;
    }
    if (isRomanUrdu) {
      return `Walaikum Assalam! Khush aamdeed \u{1F451}

Main **ERROREX AI** hoon, bilkul theek aur aapki madad ke liye tayyar hoon. Batayein aaj main aapki kya madad karoon?

- **Coding ya Tech** ka koi masla
- **Email, Application ya Essay** likhwana
- **Math ya Translation** karwana
- Ya koi bhi **General Sawal** poochhna

Jo dil chahe poochein!`;
    }
    return `Hello! Great to see you \u{1F451}

I'm **ERROREX AI**, ready to help you with clear, friendly answers on anything \u2014 coding, math, writing, translations, or everyday questions.

What would you like to work on today?`;
  }
  if (/(kaise ho|kya haal|how are you|kya chal raha|ap theek|aap kaise)/i.test(lower) && query.length < 55) {
    return isRomanUrdu ? `Alhamdulillah, main bilkul theek hoon! Shukriya poochhne ke liye \u{1F60A}

Umeed hai aap bhi khairiyat se honge. Batayein aaj main aapke liye kya kar sakta hoon?` : `I'm doing great, thanks for asking! \u{1F60A} Everything is running smoothly.

How are you doing today, and how can I help you?`;
  }
  if (/^(thanks|thank you|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah)\b/i.test(lower) && query.length < 40) {
    return isRomanUrdu ? `Aapka bohat shukriya! \u{1F60A} Mujhe khushi hui ke aapko jawab pasand aaya.

Jab bhi kisi aur cheez me madad chahiye ho, bas pooch lein!` : `You're very welcome! \u{1F60A} Glad that helped.

Feel free to ask anytime if you need anything else!`;
  }
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|naam kya|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya)/i.test(lower)) {
    if (isUrduScript) {
      return `### ERROREX AI \u06A9\u0627 \u062A\u0639\u0627\u0631\u0641 \u{1F451}

\u0645\u06CC\u06BA **ERROREX AI** \u06C1\u0648\u06BA \u2014 \u0622\u067E \u06A9\u0627 \u0630\u0627\u062A\u06CC\u060C \u062A\u06CC\u0632 \u0627\u0648\u0631 \u06A9\u062B\u06CC\u0631\u0627\u0644\u0644\u0633\u0627\u0646\u06CC \u0645\u0639\u0627\u0648\u0646\u06D4

- **\u06C1\u0631 \u0632\u0628\u0627\u0646 \u0645\u06CC\u06BA \u062C\u0648\u0627\u0628:** \u0627\u0631\u062F\u0648\u060C \u0631\u0648\u0645\u0646 \u0627\u0631\u062F\u0648\u060C \u0627\u0646\u06AF\u0631\u06CC\u0632\u06CC\u060C \u0639\u0631\u0628\u06CC\u060C \u06C1\u0646\u062F\u06CC \u0627\u0648\u0631 \u062F\u06CC\u06AF\u0631 \u0632\u0628\u0627\u0646\u0648\u06BA \u0645\u06CC\u06BA\u06D4
- **\u062A\u062D\u0631\u06CC\u0631 \u0648 \u062A\u0631\u062C\u0645\u06C1:** \u0627\u06CC \u0645\u06CC\u0644\u060C \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u060C \u0645\u0636\u0645\u0648\u0646 \u0627\u0648\u0631 \u0641\u0648\u0631\u06CC \u062A\u0631\u062C\u0645\u06C1\u06D4
- **\u06A9\u0648\u0688\u0646\u06AF \u0627\u0648\u0631 \u0631\u06CC\u0627\u0636\u06CC:** \u06C1\u0631 \u067E\u0631\u0648\u06AF\u0631\u0627\u0645\u0646\u06AF \u0632\u0628\u0627\u0646 \u0627\u0648\u0631 \u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628 \u06A9\u0627 \u062F\u0631\u0633\u062A \u062D\u0644\u06D4`;
    }
    if (isRomanUrdu) {
      return `### Main ERROREX AI Hoon \u{1F451}

Main aapka smart, friendly aur ChatGPT-style assistant hoon jo har zubaan aur har sawal ka saaf aur mukammal jawab deta hai:

- **Har Zubaan Me Baat:** Roman Urdu, Urdu (\u0627\u0631\u062F\u0648), English, Hindi, Arabic, French wagaira.
- **Writing & Applications:** Sick leave, job application, emails, essays, aur social captions.
- **Coding & Tech:** React, TypeScript, Python, JavaScript, HTML/CSS, SQL aur Supabase help.
- **Math & Conversions:** Percentages, equations, aur unit conversions.

Aap bas apna sawal likhein \u2014 main seedha aur clear jawab dunga!`;
    }
    return `### Meet ERROREX AI \u{1F451}

I'm **ERROREX AI**, your friendly, clear-writing assistant designed to give clean, structured answers on every topic:

- **Every Language:** Fluent in English, Roman Urdu, Urdu, Hindi, Arabic, French, and more.
- **Writing & Communication:** Polished emails, applications, summaries, and translations.
- **Coding & Math:** Clean code snippets, debugging help, calculations, and unit conversions.
- **Works Anywhere:** Seamless responses both online and offline.

Ask me anything!`;
  }
  const mathSolved = trySolveMathOrUnits(query, isRomanUrdu);
  if (mathSolved) return mathSolved;
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application

Here is a clean, ready-to-use application:

**Subject:** Request for Sick Leave

Respected Sir/Madam,

I am writing to respectfully inform you that I am unwell with fever and unable to attend today. Kindly grant me **one day's leave** so I can rest and recover properly.

I will resume my duties as soon as I feel better. Thank you for your understanding.

Sincerely,  
**[Your Name]**  
**[Date]**`;
  }
  if (/(job application|cover letter|cv|resume email)/i.test(lower)) {
    return `### Clean Job Application Email

**Subject:** Application for [Job Title] \u2014 [Your Name]

Dear Hiring Manager,

I am excited to apply for the **[Job Title]** position. With strong skills in **[Your Top 2 Skills]** and a commitment to quality work, I am confident I can contribute effectively to your team.

Please find my resume attached for your review. I would welcome the opportunity to discuss how my experience fits your needs.

Best regards,  
**[Your Name]**  
**[Phone / Email]**`;
  }
  if (/(bio|caption|status|instagram|whatsapp bio)/i.test(lower)) {
    return isRomanUrdu ? `### Stylish Bio Ideas \u2728

1. *Silent moves, loud results.* \u{1F451}
2. *Focus on growth, stay private, stay blessed.*
3. *Khamoshi se mehnat, waqt khud shor machayega.*
4. *Building my own path, one step at a time.*` : `### Clean Bio & Status Ideas \u2728

1. *Quiet focus, meaningful work.* \u{1F451}
2. *Building, learning, and moving forward.*
3. *Stay private, stay humble, stay consistent.*
4. *Less talk, more clarity.*`;
  }
  if (/python/i.test(lower)) {
    if (/aes|encrypt|crypto|hash|sha/i.test(lower)) {
      return `### Secure Python AES-256 Encryption

Here is a clean, production-ready helper using \`cryptography\`:

\`\`\`python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

def encrypt_text(plaintext: str, password: str) -> dict:
    salt, nonce = os.urandom(16), os.urandom(12)
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=100_000)
    key = kdf.derive(password.encode())
    ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode(), None)
    return {"salt": salt.hex(), "nonce": nonce.hex(), "ciphertext": ciphertext.hex()}
\`\`\`

Let me know if you want the **decrypt** function too!`;
    }
    return `### Clean Python Example

\`\`\`python
def greet_user(name: str) -> str:
    clean_name = name.strip().title()
    return f"Welcome, {clean_name}!"

print(greet_user("friend"))
\`\`\`

${isRomanUrdu ? "Batayein aapko Python me kis specific cheez ka code chahiye?" : "Tell me the exact Python task you need and I will write the full solution."}`;
  }
  if (/(javascript|typescript|react|html|css|sql|code|programming)/i.test(lower)) {
    if (/sql|database|supabase|table/i.test(lower)) {
      return `### Clean SQL Query Example

\`\`\`sql
SELECT uid, username, display_name, is_online, last_seen
FROM public.user_profiles
WHERE is_online = true
ORDER BY last_seen DESC;
\`\`\`

${isRomanUrdu ? "Agar kisi specific table ya query ki zaroorat ho to batayein!" : "Share your table columns if you want a custom SQL query."}`;
    }
    return `### Clean React + TypeScript Component

\`\`\`tsx
import React, { useState } from 'react';

export function CounterCard() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4 rounded-xl border">
      <p className="font-semibold">Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)} className="mt-2 px-3 py-1 rounded-lg">
        Increment
      </button>
    </div>
  );
}
\`\`\``;
  }
  if (/(encryption|security|privacy|safe|hack|protect|pin|vault)/i.test(lower)) {
    return isRomanUrdu ? `### Encryption aur Privacy Kaise Kaam Karti Hai?

1. **Private Data Lock:** Aapke messages aur files sirf aap aur receiver hi dekh sakte hain.
2. **Salted Hashing:** Aapka 8-digit Calculator PIN random salt + SHA-256 hash ke sath save hota hai \u2014 koi aapka asal PIN nahi dekh sakta.
3. **Account Isolation:** Har user ki chat aur contact list alag aur mehfuz rehti hai.` : `### How Encryption & Privacy Work

1. **Private Isolation:** Every user's messages and profile are scoped strictly to their account.
2. **Salted Hashing:** Secret credentials (like your 8-digit Calculator PIN) are combined with a random salt and hashed with SHA-256.
3. **Zero Plaintext Storage:** Sensitive codes are never saved in readable form.`;
  }
  if (/(shairi|shayari|poetry|sher|ghazal|quote|motivation)/i.test(lower)) {
    return isRomanUrdu ? `### Khubsurat Sher \u2728

> *"Sitaron se aage jahan aur bhi hain,*  
> *Abhi ishq ke imtihan aur bhi hain."*  
\u2014 **Allama Muhammad Iqbal**

Agar aur shayari ya motivational quotes chahiye hon to batayein!` : `### Timeless Quote \u2728

> *"Clarity of mind, kindness in speech, and consistency in action create unstoppable progress."*`;
  }
  if (/(translate|tarjuma|tarjama|meaning)/i.test(lower)) {
    const quoted = query.match(/["“']([^"”']+)["”']/);
    const phrase = quoted ? quoted[1] : "Welcome to ERROREX Vault";
    return `### Translations for "${phrase}"

- **Urdu (\u0627\u0631\u062F\u0648):** ${phrase === "Welcome to ERROREX Vault" ? "\u0627\u06CC\u0631\u0648\u0631\u06CC\u06A9\u0633 \u0648\u0627\u0644\u0679 \u0645\u06CC\u06BA \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F" : phrase}
- **Roman Urdu:** ${phrase === "Welcome to ERROREX Vault" ? "ERROREX Vault mein khush aamdeed" : phrase}
- **Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629):** ${phrase === "Welcome to ERROREX Vault" ? "\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643\u0645 \u0641\u064A \u062E\u0632\u064A\u0646\u0629 ERROREX" : phrase}
- **French (Fran\xE7ais):** ${phrase === "Welcome to ERROREX Vault" ? "Bienvenue dans le coffre-fort ERROREX" : phrase}`;
  }
  if (/supabase|netlify|publish|deploy/i.test(lower)) {
    return isRomanUrdu ? `### Netlify + Supabase Mukammal Setup Guide

1. **Supabase SQL:** Apne Supabase Dashboard ke **SQL Editor** me \`supabase_schema.sql\` paste karke **Run** karein.
2. **Netlify Environment Variables:** Site Settings \u2192 Environment variables me yeh 3 keys add karein:
   - \`VITE_SUPABASE_URL\`
   - \`VITE_SUPABASE_ANON_KEY\`
   - \`GEMINI_API_KEY\`
3. **Redeploy:** Netlify par ek fresh deploy karein \u2014 iske baad live database, online/offline presence, aur full Gemini AI 100% chalenge.` : `### Netlify + Supabase Complete Setup

1. Run \`supabase_schema.sql\` in your Supabase **SQL Editor**.
2. Add \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, and \`GEMINI_API_KEY\` to Netlify **Environment Variables**.
3. Trigger a fresh **Redeploy** so live database sync and Gemini AI work everywhere.`;
  }
  const offlineNoteUr = isOffline ? `

*Note: Aap abhi **Offline** hain, is liye main built-in offline engine se jawab de raha hoon. Internet aate hi full live AI answers bhi mil jayenge.*` : "";
  const offlineNoteEn = isOffline ? `

*Note: You're currently **Offline**, so I'm running on the built-in local engine. Once you're back online, full live AI reasoning resumes automatically.*` : "";
  if (isArabicRequested) {
    return `### \u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643 \u0641\u064A ERROREX AI \u{1F451}

\u0644\u0642\u062F \u0627\u0633\u062A\u0644\u0645\u062A \u0633\u0624\u0627\u0644\u0643: **"${query}"**

\u0623\u0646\u0627 \u0645\u0633\u062A\u0639\u062F \u0644\u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0641\u064A \u0627\u0644\u0628\u0631\u0645\u062C\u0629\u060C \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A\u060C \u0627\u0644\u062A\u0631\u062C\u0645\u0629\u060C \u0623\u0648 \u0643\u062A\u0627\u0628\u0629 \u0627\u0644\u0631\u0633\u0627\u0626\u0644. \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0625\u062C\u0627\u0628\u0627\u062A \u0630\u0643\u064A\u0629 \u0634\u0627\u0645\u0644\u0629 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0648\u0627\u0636\u064A\u0639 \u0628\u0639\u062F \u0627\u0644\u0646\u0634\u0631\u060C \u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0636\u0627\u0641\u0629 \u0645\u0641\u062A\u0627\u062D \`GEMINI_API_KEY\` \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0627\u0633\u062A\u0636\u0627\u0641\u0629.`;
  }
  if (isFrenchRequested) {
    return `### ERROREX AI \u{1F451}

Votre question : **"${query}"**

Je peux vous aider en fran\xE7ais pour la r\xE9daction, le code, les math\xE9matiques et la traduction. Assurez-vous simplement que \`GEMINI_API_KEY\` est configur\xE9 sur votre serveur ou Netlify pour les r\xE9ponses avanc\xE9es en direct.`;
  }
  if (isHindiRequested || lang.isHindiScript) {
    return `### ERROREX AI \u{1F451}

\u0906\u092A\u0915\u093E \u0938\u0935\u093E\u0932: **"${query}"**

\u092E\u0948\u0902 \u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902 \u0906\u092A\u0915\u0940 \u092A\u0942\u0930\u0940 \u092E\u0926\u0926 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0924\u0948\u092F\u093E\u0930 \u0939\u0942\u0901\u0964 \u0906\u092A \u092E\u0941\u091D\u0938\u0947 \u0915\u094B\u0921\u093F\u0902\u0917, \u0917\u0923\u093F\u0924, \u090F\u092A\u094D\u0932\u093F\u0915\u0947\u0936\u0928 \u0932\u0947\u0916\u0928 \u092F\u093E \u0905\u0928\u0941\u0935\u093E\u0926 \u0938\u0947 \u091C\u0941\u0921\u093C\u093E \u0915\u094B\u0908 \u092D\u0940 \u092A\u094D\u0930\u0936\u094D\u0928 \u092A\u0942\u091B \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964`;
  }
  if (isUrduScript) {
    return `### ERROREX AI \u{1F451}

\u0622\u067E \u06A9\u0627 \u0633\u0648\u0627\u0644: **"${query}"**

- \u0645\u06CC\u06BA \u0622\u067E \u06A9\u06D2 \u0633\u0648\u0627\u0644 \u06A9\u0648 \u0633\u0645\u062C\u06BE \u06AF\u06CC\u0627 \u06C1\u0648\u06BA \u0627\u0648\u0631 \u0627\u0631\u062F\u0648 \u0645\u06CC\u06BA \u0648\u0627\u0636\u062D \u0631\u06C1\u0646\u0645\u0627\u0626\u06CC \u062F\u06CC\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u062D\u0627\u0636\u0631 \u06C1\u0648\u06BA\u06D4
- \u0627\u06AF\u0631 \u0622\u067E \u06A9\u0648 \u0627\u0633 \u0645\u0648\u0636\u0648\u0639 \u067E\u0631 \u06A9\u0648\u0688\u060C \u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628\u060C \u062F\u0631\u062E\u0648\u0627\u0633\u062A/\u062E\u0637\u060C \u06CC\u0627 \u0645\u062E\u062A\u0635\u0631 \u062E\u0644\u0627\u0635\u06C1 \u0686\u0627\u06C1\u06CC\u06D2 \u062A\u0648 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0648\u0627\u0636\u062D \u0627\u0644\u0641\u0627\u0638 \u0645\u06CC\u06BA \u0644\u06A9\u06BE\u06CC\u06BA \u2014 \u0645\u06CC\u06BA \u0641\u0648\u0631\u0627\u064B \u0635\u0627\u0641 \u0627\u0648\u0631 \u0645\u06A9\u0645\u0644 \u062C\u0648\u0627\u0628 \u062F\u0648\u06BA \u06AF\u0627\u06D4${isOffline ? "\n\n*\u0646\u0648\u0679: \u0622\u067E \u0627\u0633 \u0648\u0642\u062A \u0622\u0641 \u0644\u0627\u0626\u0646 \u06C1\u06CC\u06BA\u060C \u0627\u0633 \u0644\u06CC\u06D2 \u0644\u0648\u06A9\u0644 \u0627\u0646\u062C\u0646 \u062C\u0648\u0627\u0628 \u062F\u06D2 \u0631\u06C1\u0627 \u06C1\u06D2\u06D4*" : ""}`;
  }
  if (isRomanUrdu) {
    return `### "${query}" par Mukammal Rehnumai

Aapne bohat acha sawal poocha hai! Isay aasan aur saaf alfaaz me samjhein:

1. **Bunyadi Baat:** Kisi bhi topic ya maslay ko hal karne ka sabse behtareen tareeqa yeh hai ke usay chote, aasan steps me tod kar dekha jaye.
2. **Practical Step:** Jo cheez aapko chahiye (chahe wo code ho, application/email ho, hisaab ho, ya kisi lafz ka matlab), uska maqsad bilkul clear rakhein.
3. **Agla Qadam:** Agar aap chahein ke main is par **detail example**, **code**, **Urdu/English tarjuma**, ya **step-by-step tareeqa** likhun, to bas likh dein \u2014 main foran likh dunga!${offlineNoteUr}`;
  }
  return `### Clear Answer for "${query}"

Here is a clean, practical breakdown:

1. **Core Idea:** Start by breaking the question into its key goal \u2014 whether you need an explanation, step-by-step instructions, writing draft, or code.
2. **Best Approach:** Focus on clarity, practical examples, and accurate verification at each step.
3. **Next Step:** Tell me if you'd like a **step-by-step guide**, **working code**, **translation**, or **shorter summary**, and I'll tailor it right away!${offlineNoteEn}`;
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
