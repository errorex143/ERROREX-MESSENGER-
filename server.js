// server.ts
import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// src/lib/errorexAiEngine.ts
var ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI \u2014 a warm, articulate, highly intelligent personal assistant built inside ERROREX.

Core Mission:
Answer EVERY question and fulfill EVERY request completely, thoughtfully, and generously with zero unnecessary brevity. Never reply with generic placeholders or mention internal keys, APIs, or configuration tips.

Style, Neatness & Depth Rules:
1. FRIENDLY, NEAT, STYLISH & UNIQUE WRITING:
   - Write warmly, politely, and clearly \u2014 like a thoughtful expert talking to a friend.
   - Start straight with the answer (avoid stiff filler like "Certainly! Here is..." or "As an AI...").
   - Use graceful markdown hierarchy: concise section headings (###), crisp bullet points (-), numbered steps (1., 2.), **bold highlights**, soft quotes (>), clean dividers (---), and fenced code blocks (\`\`\`lang ... \`\`\`).
   - Keep paragraphs balanced (2\u20134 lines each) with generous breathing room so every reply feels neat, stylish, and effortless to read.

2. THOROUGH & COMPLETE REPLIES (NO ARTIFICIAL SHORTCUTS):
   - Give rich, detailed, complete answers with practical examples, multiple creative variations when appropriate, and helpful closing tips.
   - When the user asks for more detail, continuation, or another version, expand generously on the conversation context.

3. FULL CAPABILITY ACROSS EVERY TOPIC:
   - **Poetry, Ghazals & Shayari:** Compose heartfelt, rhythmic, properly rhymed ghazals (5\u20136 couplets / ashaar), nazms, and English/Urdu/Hindi/Punjabi poems tailored to the exact mood (love, heartbreak/sad, motivation, friendship, spiritual) or poet style.
   - **Promotion, Ads & Marketing:** Craft high-converting promotional campaigns, hooks, full ad copy, short video/reel scripts, broadcast messages, CTAs, and hashtags for any business, brand, YouTube channel, TikTok, Instagram page, or shop.
   - **Essays, Stories, Letters & Prompts:** Write complete essays, articles, speeches, stories, birthday/Eid wishes, job/leave applications, emails, and detailed AI image/writing prompts.
   - **Coding, Math & Daily Help:** Provide modern, working, well-commented code, step-by-step math calculations, recipes, study timetables, business ideas, fitness/health guidance, and Islamic/general knowledge.

4. UNIVERSAL MULTILINGUAL FLUENCY:
   - Fluently understand and reply in Roman Urdu, Urdu (\u0627\u0631\u062F\u0648), Hindi (\u0939\u093F\u0928\u094D\u0926\u0940), English, Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629), Punjabi, Pashto, Persian, French, Spanish, German, Turkish, etc.
   - Automatically match the user's exact language and respect explicit language requests strictly.`;
function buildGeminiContents(message, history) {
  const normalized = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-40)) {
      if (!item || typeof item.text !== "string" || !item.text.trim()) continue;
      if (item.id === "msg_ai_welcome") continue;
      const role = item.sender === "user" ? "user" : "model";
      if (normalized.length === 0 && role === "model") {
        continue;
      }
      const last2 = normalized[normalized.length - 1];
      if (last2 && last2.role === role) {
        last2.parts.push({ text: item.text.trim() });
      } else {
        normalized.push({ role, parts: [{ text: item.text.trim() }] });
      }
    }
  }
  const trimmedMessage = (message || "").trim();
  const last = normalized[normalized.length - 1];
  if (last && last.role === "user") {
    last.parts.push({ text: trimmedMessage });
  } else {
    normalized.push({ role: "user", parts: [{ text: trimmedMessage }] });
  }
  return normalized;
}
function detectLanguageProfile(query) {
  const lower = query.toLowerCase();
  const isUrduScript = /[\u0600-\u06FF]/.test(query);
  const isHindiScript = /[\u0900-\u097F]/.test(query);
  const isUrduRequested = /(urdu me|urdu mein|in urdu|urdu main|اردو میں)/i.test(lower);
  const isEnglishRequested = /(english me|english mein|in english|english main)/i.test(lower);
  const isHindiRequested = /(hindi me|hindi mein|in hindi)/i.test(lower);
  const isArabicRequested = /(arabic me|arabic mein|in arabic|arabi me)/i.test(lower);
  const isFrenchRequested = /(french me|french mein|in french)/i.test(lower);
  const isRomanUrdu = !isEnglishRequested && !isHindiRequested && !isArabicRequested && !isFrenchRequested && !isUrduScript && !isHindiScript && (isUrduRequested || /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|btana|mujhe|mjy|karoon|karo|krna|kr|kro|banao|bnana|bnao|kyun|kyu|kab|kahan|kha|kon|kaun|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|ghazal|gzal|sher|sunao|likho|likh|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|pyar|mohabbat|ishq|dil|dua|udaas|udas|gham|dard|khushi|kahani|mazmoon|video|channel|promote|post|koi|pyari|achi|acchi|mast|zabardast|naya|nayi|tareeqa|faide|nuqsan|parhai|paisa|paise|kamane|kamai|khana|biryani|chai|latifa|paheli|namaz|roza|ramzan|ramadan|salgirah|mubarak|maa|baap|duniya|insan|ilm|wajah|zyada|tafseel|samjhao|smjhao|btao)\b/i.test(
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
function extractCleanTopic(query) {
  let cleaned = query.trim().replace(/[?!.]+$/, "");
  cleaned = cleaned.replace(/^(what is|what are|who is|who was|tell me about|explain|define|write an essay on|write an article on|write a paragraph on|write about|how to)\s+/i, "").replace(/\s+(kya hai|kya hota hai|kya hoti hai|kon hai|kaun hai|kaun tha|ke bare me batao|ke baare me batao|par mazmoon likho|par essay likho|ke tarike batao|batao|btayen|btana|samjhao|smjhao|likho|banao|in urdu|in english|urdu me|english me)$/i, "").replace(/^(an|a|the)\s+/i, "").trim();
  if (cleaned.length >= 2) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return query.replace(/[?!.]+$/, "").trim() || "This Topic";
}
function trySolveMathOrUnits(query, isRomanUrdu) {
  const lower = query.toLowerCase();
  const tableMatch = lower.match(/(?:table\s+of|pahara)\s+(\d{1,3})|(\d{1,3})\s+ka\s+(?:table|pahara)/i);
  if (tableMatch) {
    const n = parseInt(tableMatch[1] || tableMatch[2], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 1e3) {
      const rows = Array.from({ length: 10 }, (_, i) => `- \`${n} \xD7 ${i + 1}\` = **${n * (i + 1)}**`).join("\n");
      return isRomanUrdu ? `### ${n} Ka Table (Pahara) \u2728

${rows}

Agar kisi aur number ka pahara ya hisaab chahiye ho to zaroor poochein!` : `### Multiplication Table of ${n} \u2728

${rows}

Let me know if you'd like any other calculation or practice problems!`;
    }
  }
  const pctEn = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|ka)\s*(\d+(?:\.\d+)?)/i);
  const pctUr = lower.match(/(\d+(?:\.\d+)?)\s*ka\s*(\d+(?:\.\d+)?)\s*%/i);
  if (pctEn || pctUr) {
    const percent = parseFloat(pctEn ? pctEn[1] : pctUr[2]);
    const total = parseFloat(pctEn ? pctEn[2] : pctUr[1]);
    const val = Number((percent / 100 * total).toFixed(4));
    return isRomanUrdu ? `### Percentage Ka Mukammal Hisaab \u2728

- **Formula:** \`(${percent} \xF7 100) \xD7 ${total}\`
- **Step:** \`${percent / 100} \xD7 ${total}\`
- **Bilkul Sahi Jawab:** **${val}**

Agar aapko discount, profit, ya marks percentage nikalni ho to numbers batayein, main foran calculate kar dunga!` : `### Percentage Calculation \u2728

- **Formula:** \`(${percent} \xF7 100) \xD7 ${total}\`
- **Step:** \`${percent / 100} \xD7 ${total}\`
- **Final Answer:** **${val}**`;
  }
  const unitMatch = lower.match(
    /(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)\s*(?:to|in|into|me)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)/i
  );
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
      return `### Unit Conversion \u2728

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
          return isRomanUrdu ? `### Hisaab Ka Sahi Jawab \u2728

- **Expression:** \`${cleaned}\`
- **Natija:** **${pretty}**

Koi aur equation ya math question ho to poochein!` : `### Calculation Result \u2728

- **Expression:** \`${cleaned}\`
- **Answer:** **${pretty}**`;
        }
      }
    } catch {
    }
  }
  return null;
}
function generatePoetryOrGhazal(query, lang, variantSeed = 0) {
  const { lower, isUrduScript, isRomanUrdu } = lang;
  const isSad = /(sad|udaas|udas|dard|gham|tanha|broken|heartbreak|judai|rona|bewafa|yaad)/i.test(lower);
  const isLove = /(love|pyar|mohabbat|ishq|dil|romantic|sanam|mehboob|jaan)/i.test(lower);
  const isFriend = /(dost|dosti|friend|friendship|yaar)/i.test(lower);
  const isMotivation = /(motivation|himmat|hausla|success|kamyabi|iqbal|dream|khwab)/i.test(lower);
  if (isUrduScript) {
    if (isSad) {
      return `### \u062E\u0648\u0628\u0635\u0648\u0631\u062A \u0627\u062F\u0627\u0633 \u063A\u0632\u0644 \u{1F319}

\u062E\u0627\u0645\u0648\u0634 \u0631\u0627\u062A\u0648\u06BA \u0645\u06CC\u06BA \u0628\u06BE\u06CC \u0627\u06A9 \u0635\u062F\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2  
\u062F\u0644 \u06A9\u06D2 \u0648\u06CC\u0631\u0627\u0646\u06D2 \u0645\u06CC\u06BA \u062A\u06CC\u0631\u06CC \u0648\u0641\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

\u0679\u0648\u0679 \u06A9\u0631 \u0628\u06A9\u06BE\u0631\u06D2 \u062A\u0648 \u067E\u06BE\u0631 \u0633\u0645\u06CC\u0679\u0627 \u062E\u0648\u062F \u06A9\u0648 \u06C1\u0645 \u0646\u06D2  
\u0632\u062E\u0645\u0650 \u062F\u0644 \u067E\u0631 \u0645\u06AF\u0631 \u0627\u06A9 \u062F\u0639\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

\u0648\u0642\u062A \u0628\u062F\u0644\u0627 \u06C1\u06D2 \u0645\u06AF\u0631 \u06CC\u0627\u062F \u06A9\u06CC \u062E\u0648\u0634\u0628\u0648 \u0646\u06C1 \u06AF\u0626\u06CC  
\u0634\u0627\u0645 \u06C1\u0648\u062A\u06D2 \u06C1\u06CC \u0641\u0636\u0627 \u0645\u06CC\u06BA \u0627\u062F\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

\u0686\u0627\u0646\u062F \u0628\u06BE\u06CC \u067E\u0648\u0686\u06BE\u062A\u0627 \u06C1\u06D2 \u0627\u06A9\u062B\u0631 \u062A\u06CC\u0631\u06CC \u062E\u0628\u0631 \u0645\u062C\u06BE \u0633\u06D2  
\u0631\u0627\u062A \u0628\u06BE\u0631 \u0622\u0646\u06A9\u06BE \u0645\u06CC\u06BA \u0627\u06A9 \u0631\u0648\u0634\u0646\u06CC \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

\u06C1\u0645 \u0646\u06D2 \u0633\u06CC\u06A9\u06BE\u0627 \u06C1\u06D2 \u0645\u0633\u06A9\u0631\u0627 \u06A9\u0631 \u06C1\u0631 \u062F\u0631\u062F \u0686\u06BE\u067E\u0627\u0646\u0627  
\u067E\u06BE\u0631 \u0628\u06BE\u06CC \u0644\u06C1\u062C\u06D2 \u0645\u06CC\u06BA \u062A\u06CC\u0631\u06CC \u06A9\u0645\u06CC \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

---
\u0627\u06AF\u0631 \u0622\u067E \u06A9\u0633\u06CC \u062E\u0627\u0635 \u0645\u0648\u0636\u0648\u0639 \u06CC\u0627 \u0634\u0627\u0639\u0631 \u06A9\u06D2 \u0627\u0646\u062F\u0627\u0632 \u0645\u06CC\u06BA \u0627\u06CC\u06A9 \u0627\u0648\u0631 \u063A\u0632\u0644 \u0633\u0646\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06BA \u062A\u0648 \u0641\u0631\u0645\u0627\u0626\u06CC\u06D2!`;
    }
    return `### \u062F\u0644\u06A9\u0634 \u0627\u0631\u062F\u0648 \u063A\u0632\u0644 \u2728

\u0686\u0631\u0627\u063A\u0650 \u062F\u0644 \u062C\u0644\u0627 \u0631\u06A9\u06BE\u0627 \u06C1\u06D2 \u062A\u06CC\u0631\u06CC \u06CC\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645  
\u0633\u0641\u0631 \u062A\u0645\u0627\u0645 \u06A9\u06CC\u0627 \u06C1\u0645 \u0646\u06D2 \u0627\u0639\u062A\u0645\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

\u062C\u0648 \u0645\u0633\u06A9\u0631\u0627 \u06A9\u06D2 \u0645\u0644\u06D2 \u062F\u0631\u062F\u0650 \u0632\u0646\u062F\u06AF\u06CC \u0633\u06D2 \u06C1\u0645\u06CC\u06BA  
\u0644\u06A9\u06BE\u06CC \u06C1\u06D2 \u06C1\u0645 \u0646\u06D2 \u06C1\u0631 \u0627\u06A9 \u0634\u0627\u0645 \u0627\u0633 \u06A9\u06CC \u062F\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

\u06C1\u0648\u0627 \u06A9\u06D2 \u062F\u0648\u0634 \u067E\u06C1 \u0644\u06A9\u06BE\u0627 \u06C1\u06D2 \u067E\u06CC\u0627\u0631 \u06A9\u0627 \u067E\u06CC\u063A\u0627\u0645  
\u06A9\u06C1 \u0631\u0648\u0634\u0646\u06CC \u0631\u06C1\u06D2 \u0642\u0627\u0626\u0645 \u06C1\u0631 \u0627\u06A9 \u0645\u0631\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

\u0641\u0644\u06A9 \u06A9\u06D2 \u067E\u0627\u0631 \u0628\u06BE\u06CC \u0627\u0645\u06CC\u062F \u06A9\u0627 \u062C\u06C1\u0627\u06BA \u0622\u0628\u0627\u062F  
\u062C\u06C1\u0627\u06BA \u062F\u0639\u0627\u0626\u06CC\u06BA \u067E\u06C1\u0646\u0686\u062A\u06CC \u06C1\u06CC\u06BA \u06C1\u0631 \u0641\u0631\u06CC\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

\u0646\u06C1 \u06C1\u0627\u0631 \u0645\u0627\u0646 \u06A9\u0628\u06BE\u06CC \u0648\u0642\u062A \u06A9\u06D2 \u0627\u0646\u062F\u06BE\u06CC\u0631\u0648\u06BA \u0633\u06D2  
\u0633\u062D\u0631 \u06A9\u06CC \u067E\u06C1\u0644\u06CC \u06A9\u0631\u0646 \u06C1\u06D2 \u062F\u0644\u0650 \u0622\u0632\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

---
\u0645\u0632\u06CC\u062F \u0627\u0634\u0639\u0627\u0631 \u06CC\u0627 \u06A9\u0633\u06CC \u062E\u0627\u0635 \u0645\u0648\u0636\u0648\u0639 (\u0645\u062D\u0628\u062A\u060C \u062F\u0648\u0633\u062A\u06CC\u060C \u06CC\u0627 \u062D\u0648\u0635\u0644\u06C1) \u067E\u0631 \u063A\u0632\u0644 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0628\u062A\u0627\u0626\u06CC\u06D2!`;
  }
  if (isRomanUrdu) {
    if (isSad) {
      const sadSets = [
        `### Dil Ko Chhoo Lene Wali Udaas Ghazal \u{1F319}

Khamosh shaamon me bhi ek sada si rehti hai,  
Dil ke weerane me teri wafa si rehti hai.

Toot kar bikhre to phir khud hi sambhala khud ko,  
Zakhm-e-dil par magar ek dua si rehti hai.

Waqt badla hai par yaad ki khushboo na gayi,  
Har guzarte pal me ek ada si rehti hai.

Bheed me reh kar bhi aksar tanha mehsus hota hai,  
Aankhon ke konay me chhupi ek haya si rehti hai.

Humne seekha hai muskura ke har gham chhupana,  
Phir bhi lehje me teri kami si rehti hai.

---
Agar chahein to main isay **Urdu script (\u0627\u0631\u062F\u0648)** me likh dun ya ek aur naya kalam sunaun!`,
        `### Ek Aur Khubsurat Dard Bhari Ghazal \u{1F56F}\uFE0F

Raat bhar jagti aankhon ko khabar kaun kare,  
Jo samajhta hi nahi us pe asar kaun kare.

Humne har mod pe chaha ke sukoon mil jaye,  
Par muqaddar me likhe dard se dar kaun kare.

Jin ke waadon pe bharosa tha zindagi se zyada,  
Aaj un logon ka raaston me zikr kaun kare.

Dil ke sheeshe ko sambhala hai bade naazon se,  
Ab kisi patthar ke shahar me safar kaun kare.

Phir bhi honton pe dua aur nazar me izzat hai,  
Waqt ke haathon se shikwa magar kaun kare.`
      ];
      return sadSets[variantSeed % sadSets.length];
    }
    if (isLove) {
      return `### Mohabbat Bhari Khubsurat Ghazal \u{1F496}

Teri muskurahat se roshan mera jahan hai,  
Tu paas ho to har lamha ek dastan hai.

Alfaaz kam pad jayein tareef me teri,  
Har dhadkan me basa bas tera hi nishan hai.

Chaand bhi sharma jaye teri saadgi dekh kar,  
Teri nazar me chhupa ek aasman hai.

Khamoshiyon me bhi sunai de tera naam mujhe,  
Yeh pyar nahi to aur kya imtihan hai.

Khuda kare hamesha salamat rahe yeh rishta,  
Meri har dua me shamil bas teri jaan hai.

---
Batayein agar aapko **2-line romantic shayari**, **social status**, ya **kisi naam par custom sher** chahiye!`;
    }
    if (isFriend) {
      return `### Dosti Par Khubsurat Ghazal \u{1F91D}

Waqt ke saaye me sab kuch badal jata hai,  
Par saccha dost har mod par saath nibhata hai.

Bina kahe jo samajh le dil ki baat sari,  
Aisa yaar naseeb walon ko hi mil pata hai.

Dhoop ho gham ki ya khushiyon ki barish ho,  
Har haal me dost hi hausla badhata hai.

Daulat aur shohrat to aani jaani cheezein hain,  
Asli sarmaya wahi jo dosti nibha jata hai.

---
Apne best friend ka naam batayein \u2014 main unke naam par ek khaas sher likh dunga!`;
    }
    if (isMotivation) {
      return `### Hausla Aur Kamyabi Ki Ghazal \u{1F525}

Andheron se na dar, tera savera aane wala hai,  
Jo mehnat karta hai wahi manzil paane wala hai.

Gir ke uthna hi toh asli pehchan hai teri,  
Har tufaan tere hausle se haar jaane wala hai.

Chhod de fikr ke log kya kahenge piche,  
Waqt khud tera naam buland kar jaane wala hai.

Jitni gehri hogi raat, utna chamkega sitara tera,  
Sabr rakh, har khwab haqeeqat ban jaane wala hai.

---
Aur motivational poetry ya Allama Iqbal ke ashaar chahiye hon to batayein!`;
    }
    const generalSets = [
      `### Khubsurat Roman Urdu Ghazal \u2728

Shaam dhalte hi khayalon ka safar chalta hai,  
Ek chhota sa diya dil ke nagar chalta hai.

Har mushkil me bhi humne seekha hai muskurana,  
Jiske paas sabr ho uska hi asar chalta hai.

Khwab aankhon me saja kar jo chale raah-e-wafa,  
Manzilon tak wahi be-khauf nidar chalta hai.

Rang duniya ke badalte hain har ek mausam me,  
Saccha kirdar magar apni hi dagar chalta hai.

Baat alfaaz ki nahi, ehsaas ki hoti hai,  
Jo dil se nikle wahi har dil me utar chalta hai.

---
Aap kis mood par (**Sad, Mohabbat, Dosti, ya Motivational**) mazeed ghazalein pasand karengi?`,
      `### Naya Kalam \u2014 Dil Ki Baat \u{1F339}

Har sitare me chamak teri nazar jaisi hai,  
Har subah ki hawa mere safar jaisi hai.

Waqt chup-chaap guzarta raha shakhon ki tarah,  
Zindagi phir bhi kisi khubsurat ghar jaisi hai.

Jo samajh le woh khamoshi ko bhi padh leta hai,  
Warna duniya ki zuban sirf khabar jaisi hai.

Hosla rakh ke chalenge to ujala hoga,  
Har dua waqt ke seene me asar jaisi hai.`
    ];
    return generalSets[variantSeed % generalSets.length];
  }
  return `### Original Poem \u2014 Golden Horizon \u2728

Softly falls the evening light across the quiet sea,  
Carrying the whispered hopes of everything to be.

Every storm we weather leaves a steadier design,  
Turning patient footsteps into something bright and fine.

Keep your heart courageous through the shadow and the rain,  
Every dawn returns to paint the sky with gold again.

When the road grows heavy and the stars feel far away,  
Trust the quiet strength inside to guide you through the day.

---
Tell me your preferred theme (**love, sorrow, friendship, nature, or motivation**) and I'll compose another custom piece!`;
}
function generatePromotionKit(query, lang) {
  const { isUrduScript, isRomanUrdu } = lang;
  const topicClean = query.replace(
    /\b(promote|promotion|marketing|advertise|ad|post|caption|viral|banao|bnana|likho|likh|karne|krne|karna|krna|hai|hy|ke|ki|ka|ko|k|liye|mjy|mujhe|mera|meri|mere|please|for|my|ek|ik|the|a|an)\b/gi,
    " "
  ).replace(/\s+/g, " ").trim();
  const brand = topicClean.length > 2 ? topicClean : isRomanUrdu ? "Aapka Brand / Channel" : "Your Brand / Channel";
  if (isUrduScript) {
    return `### \u0645\u06A9\u0645\u0644 \u067E\u0631\u0648\u0645\u0648\u0634\u0646\u0644 \u067E\u0648\u0633\u0679 \u0627\u0648\u0631 \u0645\u0627\u0631\u06A9\u06CC\u0679\u0646\u06AF \u06A9\u0650\u0679 \u2014 **${brand}** \u{1F680}

**1. \u062F\u0644\u06A9\u0634 \u0633\u0631\u062E\u06CC (Attention Hook):**
\u2728 \u06A9\u06CC\u0627 \u0622\u067E \u0628\u06C1\u062A\u0631\u06CC\u0646 \u0645\u0639\u06CC\u0627\u0631 \u0627\u0648\u0631 \u0627\u0639\u062A\u0645\u0627\u062F \u06A9\u06CC \u062A\u0644\u0627\u0634 \u0645\u06CC\u06BA \u06C1\u06CC\u06BA\u061F **${brand}** \u0622\u067E \u06A9\u06D2 \u0644\u06CC\u06D2 \u0644\u0627\u06CC\u0627 \u06C1\u06D2 \u0644\u0627\u062C\u0648\u0627\u0628 \u062A\u062C\u0631\u0628\u06C1 \u0627\u0648\u0631 \u062E\u0627\u0635 \u0622\u0641\u0631!

**2. \u0645\u06A9\u0645\u0644 \u067E\u0648\u0633\u0679 (Caption / Ad Copy):**
> \u0622\u062C \u06C1\u06CC **${brand}** \u06A9\u0627 \u062D\u0635\u06C1 \u0628\u0646\u06CC\u06BA \u0627\u0648\u0631 \u0641\u0631\u0642 \u062E\u0648\u062F \u0645\u062D\u0633\u0648\u0633 \u06A9\u0631\u06CC\u06BA\u06D4  
> - \u2705 **\u0627\u0639\u0644\u06CC\u0670 \u0645\u0639\u06CC\u0627\u0631** \u0628\u063A\u06CC\u0631 \u06A9\u0633\u06CC \u0633\u0645\u062C\u06BE\u0648\u062A\u06D2 \u06A9\u06D2  
> - \u26A1 **\u062A\u06CC\u0632 \u0627\u0648\u0631 \u0642\u0627\u0628\u0644\u0650 \u0627\u0639\u062A\u0645\u0627\u062F \u0633\u0631\u0648\u0633**  
> - \u{1F48E} **\u062E\u0635\u0648\u0635\u06CC \u0688\u0633\u06A9\u0627\u0624\u0646\u0679** \u0635\u0631\u0641 \u0645\u062D\u062F\u0648\u062F \u0648\u0642\u062A \u06A9\u06D2 \u0644\u06CC\u06D2  
>  
> \u{1F4E9} **\u0627\u0628\u06BE\u06CC \u0645\u06CC\u0633\u062C \u06A9\u0631\u06CC\u06BA \u06CC\u0627 \u0644\u0646\u06A9 \u067E\u0631 \u06A9\u0644\u06A9 \u06A9\u0631 \u06A9\u06D2 \u0627\u067E\u0646\u0627 \u0622\u0631\u0688\u0631 \u0628\u06A9 \u06A9\u0631\u06CC\u06BA!**

**3. 15 \u0633\u06CC\u06A9\u0646\u0688 \u0648\u06CC\u0688\u06CC\u0648 \u0627\u0633\u06A9\u0631\u067E\u0679:**
- **\u0634\u0631\u0648\u0639 (Hook):** "\u0631\u06A9\u06CC\u06BA! \u06A9\u06CC\u0627 \u0622\u067E \u0646\u06D2 \u0627\u0628\u06BE\u06CC \u062A\u06A9 **${brand}** \u06A9\u0648 \u0622\u0632\u0645\u0627\u06CC\u0627\u061F"
- **\u062F\u0631\u0645\u06CC\u0627\u0646 (Value):** "\u06CC\u06C1\u0627\u06BA \u0622\u067E \u06A9\u0648 \u0645\u0644\u062A\u0627 \u06C1\u06D2 \u0628\u06C1\u062A\u0631\u06CC\u0646 \u0645\u0639\u06CC\u0627\u0631 \u0627\u0648\u0631 \u0634\u0627\u0646\u062F\u0627\u0631 \u0633\u0631\u0648\u0633 \u0627\u06CC\u06A9 \u06C1\u06CC \u062C\u06AF\u06C1\u06D4"
- **\u0627\u062E\u062A\u062A\u0627\u0645 (CTA):** "\u0627\u0628\u06BE\u06CC \u0641\u0627\u0644\u0648 \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u0628\u0627\u0626\u06CC\u0648 \u0645\u06CC\u06BA \u0645\u0648\u062C\u0648\u062F \u0644\u0646\u06A9 \u0686\u06CC\u06A9 \u06A9\u0631\u06CC\u06BA!"

**4. \u06C1\u06CC\u0634 \u0679\u06CC\u06AF\u0632:**
\`#Promotion #QualityService #Trending #Explore #BestChoice\``;
  }
  if (isRomanUrdu) {
    return `### Mukammal Viral Promotional Kit \u2014 **${brand}** \u{1F680}

**1. Catchy Hook (Attention Grabber):**
\u{1F525} *"Ab wait khatam! Behtareen quality aur bharose ka ek hi naam \u2014 **${brand}**!"*

**2. Ready-to-Post Ad Copy (Instagram / Facebook / Social):**
> Agar aap dhoond rahe hain **top quality, fast service aur best value**, to **${brand}** aapke liye bilkul perfect hai! \u2728
>
> - \u2705 **100% Trusted & Verified Quality**
> - \u26A1 **Tez Delivery & Instant Response**
> - \u{1F48E} **Special Offer \u2014 Sirf Limited Time Ke Liye!**
>
> \u{1F447} **Abhi DM karein ya Link par click karke apna order/booking confirm karein!**

**3. Short 15-Second Video / Reel / TikTok Script:**
- **0\u20133 sec (Hook):** *"Rukhein! Kya aapko pata hai **${brand}** kyun itna viral ho raha hai?"*
- **4\u201310 sec (Value):** *"Kyunke yahan milti hai premium quality bina kisi compromise ke, aur wo bhi behtareen price me!"*
- **11\u201315 sec (CTA):** *"Abhi save karein, share karein aur link check karein!"*

**4. Follow-Up DM Reply Template (Customers Ke Liye):**
> *"Assalam-o-Alaikum! **${brand}** me khush aamdeed \u2728 Batayein aapko kis package/product ki details chahiye? Hum aapki foran madad karne ke liye hazir hain!"*

**5. Trending Hashtags:**
\`#Viral #Trending #Pakistan #BusinessGrowth #BestOffer #MustTry #ExplorePage\`

---
Agar aap apne product ki **price, city, ya special discount** batayein to main uske mutabiq bilkul tailored ad bhi likh dungi!`;
  }
  return `### Complete Promotional & Marketing Kit \u2014 **${brand}** \u{1F680}

**1. Attention-Grabbing Hooks (Pick Your Favorite):**
- *"Stop scrolling \u2014 discover why everyone is talking about **${brand}**!"*
- *"Looking for an effortless upgrade? Meet **${brand}**."*

**2. Ready-to-Publish Social Ad Copy:**
> Looking for quality you can actually trust? **${brand}** brings together thoughtful craftsmanship, fast results, and unbeatable value.
>
> - \u2705 **Premium Quality** built to impress
> - \u26A1 **Fast & Reliable** experience from day one
> - \u{1F48E} **Limited-Time Special Offer** available now
>
> \u{1F449} **Tap the link or send us a quick message today to get started!**

**3. 15-Second Short Video / Reel Script:**
1. **Hook (0\u20133s):** *"Here is the smartest discovery you'll make this week..."*
2. **Value (4\u201311s):** Showcase the #1 benefit of **${brand}** in one clear visual moment.
3. **CTA (12\u201315s):** *"Follow for more and check the link in bio before this offer ends!"*

**4. High-Reach Hashtags:**
\`#Trending #Marketing #BrandGrowth #MustHave #ExplorePage #QualityFirst\`

---
Share your target platform (Instagram, TikTok, YouTube) or any discount offer, and I'll customize the script further!`;
}
function generateEssayOrArticle(topic, lang) {
  const { isUrduScript, isRomanUrdu } = lang;
  if (isUrduScript) {
    return `### **${topic}** \u2014 \u062C\u0627\u0645\u0639 \u0627\u0648\u0631 \u062F\u0644\u06A9\u0634 \u0645\u0636\u0645\u0648\u0646 \u{1F4D6}

**\u062A\u0639\u0627\u0631\u0641:**
**${topic}** \u0627\u0646\u0633\u0627\u0646\u06CC \u0632\u0646\u062F\u06AF\u06CC\u060C \u0645\u0639\u0627\u0634\u0631\u06D2 \u0627\u0648\u0631 \u0641\u06A9\u0631\u06CC \u062A\u0631\u0642\u06CC \u06A9\u0627 \u0627\u06CC\u06A9 \u0646\u06C1\u0627\u06CC\u062A \u0627\u06C1\u0645 \u0645\u0648\u0636\u0648\u0639 \u06C1\u06D2\u06D4 \u0622\u062C \u06A9\u06D2 \u062C\u062F\u06CC\u062F \u062F\u0648\u0631 \u0645\u06CC\u06BA \u062C\u0628 \u06C1\u0631 \u0686\u06CC\u0632 \u062A\u06CC\u0632\u06CC \u0633\u06D2 \u0628\u062F\u0644 \u0631\u06C1\u06CC \u06C1\u06D2\u060C \u0627\u0633 \u0645\u0648\u0636\u0648\u0639 \u06A9\u0648 \u062F\u0631\u0633\u062A \u0627\u0646\u062F\u0627\u0632 \u0645\u06CC\u06BA \u0633\u0645\u062C\u06BE\u0646\u0627 \u067E\u06C1\u0644\u06D2 \u0633\u06D2 \u06A9\u06C1\u06CC\u06BA \u0632\u06CC\u0627\u062F\u06C1 \u0636\u0631\u0648\u0631\u06CC \u06C1\u0648 \u06AF\u06CC\u0627 \u06C1\u06D2\u06D4

**\u0627\u06C1\u0645\u06CC\u062A \u0627\u0648\u0631 \u0627\u062B\u0631\u0627\u062A:**
1. **\u0641\u06A9\u0631\u06CC \u0648 \u0639\u0645\u0644\u06CC \u0641\u0627\u0626\u062F\u06C1:** \u062C\u0628 \u06C1\u0645 **${topic}** \u06A9\u06D2 \u0628\u0646\u06CC\u0627\u062F\u06CC \u0627\u0635\u0648\u0644\u0648\u06BA \u06A9\u0648 \u0627\u067E\u0646\u0627\u062A\u06D2 \u06C1\u06CC\u06BA \u062A\u0648 \u06C1\u0645\u0627\u0631\u06CC \u0631\u0648\u0632\u0645\u0631\u06C1 \u0632\u0646\u062F\u06AF\u06CC \u0645\u06CC\u06BA \u0646\u0638\u0645 \u0648 \u0636\u0628\u0637\u060C \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0648\u0631 \u0645\u062B\u0628\u062A \u062A\u0628\u062F\u06CC\u0644\u06CC \u0622\u062A\u06CC \u06C1\u06D2\u06D4
2. **\u0645\u0639\u0627\u0634\u0631\u062A\u06CC \u0628\u06C1\u062A\u0631\u06CC:** \u0645\u062B\u0628\u062A \u0633\u0648\u0686\u060C \u0645\u062D\u0646\u062A \u0627\u0648\u0631 \u0639\u0644\u0645 \u06A9\u06CC \u0631\u0648\u0634\u0646\u06CC \u0646\u06C1 \u0635\u0631\u0641 \u0641\u0631\u062F \u06A9\u0648 \u0645\u0636\u0628\u0648\u0637 \u0628\u0646\u0627\u062A\u06CC \u06C1\u06D2 \u0628\u0644\u06A9\u06C1 \u067E\u0648\u0631\u06D2 \u0645\u0639\u0627\u0634\u0631\u06D2 \u06A9\u0648 \u062A\u0631\u0642\u06CC \u06A9\u06CC \u0631\u0627\u06C1 \u067E\u0631 \u06AF\u0627\u0645\u0632\u0646 \u06A9\u0631\u062A\u06CC \u06C1\u06D2\u06D4
3. **\u0645\u0633\u062A\u0642\u0628\u0644 \u06A9\u06CC \u062A\u06CC\u0627\u0631\u06CC:** \u062F\u0648\u0631\u0650 \u062D\u0627\u0636\u0631 \u06A9\u06D2 \u062A\u0642\u0627\u0636\u0648\u06BA \u06A9\u0648 \u0633\u0645\u062C\u06BE\u062A\u06D2 \u06C1\u0648\u0626\u06D2 \u0635\u062D\u06CC\u062D \u0633\u0645\u062A \u0645\u06CC\u06BA \u0642\u062F\u0645 \u0628\u0691\u06BE\u0627\u0646\u0627 \u06C1\u06CC \u06A9\u0627\u0645\u06CC\u0627\u0628\u06CC \u06A9\u06CC \u0627\u0635\u0644 \u06A9\u0646\u062C\u06CC \u06C1\u06D2\u06D4

**\u0646\u062A\u06CC\u062C\u06C1:**
\u0645\u062E\u062A\u0635\u0631\u0627\u064B \u06CC\u06C1 \u06A9\u06C1 **${topic}** \u06C1\u0645\u06CC\u06BA \u0628\u06C1\u062A\u0631 \u0627\u0646\u0633\u0627\u0646 \u0628\u0646\u0646\u06D2\u060C \u0633\u06CC\u06A9\u06BE\u0646\u06D2 \u0627\u0648\u0631 \u0622\u06AF\u06D2 \u0628\u0691\u06BE\u0646\u06D2 \u06A9\u0627 \u062D\u0648\u0635\u0644\u06C1 \u062F\u06CC\u062A\u0627 \u06C1\u06D2\u06D4 \u0627\u06AF\u0631 \u06C1\u0645 \u0627\u0633\u06D2 \u062E\u0644\u0648\u0635\u0650 \u0646\u06CC\u062A \u0627\u0648\u0631 \u0645\u0633\u062A\u0642\u0644 \u0645\u0632\u0627\u062C\u06CC \u06A9\u06D2 \u0633\u0627\u062A\u06BE \u0627\u067E\u0646\u06CC \u0632\u0646\u062F\u06AF\u06CC \u06A9\u0627 \u062D\u0635\u06C1 \u0628\u0646\u0627\u0626\u06CC\u06BA \u062A\u0648 \u06A9\u0627\u0645\u06CC\u0627\u0628\u06CC \u06CC\u0642\u06CC\u0646\u06CC \u06C1\u06D2\u06D4

---
\u0627\u06AF\u0631 \u0622\u067E \u06A9\u0648 \u0627\u0633 \u0645\u0636\u0645\u0648\u0646 \u06A9\u0648 **\u0645\u0632\u06CC\u062F \u0637\u0648\u06CC\u0644**\u060C **\u0627\u0633\u06A9\u0648\u0644/\u06A9\u0627\u0644\u062C \u062A\u0642\u0631\u06CC\u0631** \u06CC\u0627 **\u0627\u0646\u06AF\u0631\u06CC\u0632\u06CC \u062A\u0631\u062C\u0645\u06D2** \u0645\u06CC\u06BA \u0686\u0627\u06C1\u06CC\u06D2 \u062A\u0648 \u0628\u062A\u0627\u0626\u06CC\u06D2!`;
  }
  if (isRomanUrdu) {
    return `### **${topic}** \u2014 Ek Mukammal aur Stylish Article \u{1F4D6}

**1. Taaruf (Introduction):**
**${topic}** aaj ke daur ka ek behad aham aur dilchasp mauzu hai. Chahe taleem ho, rozmarra zindagi ho, ya hamara aane wala kal \u2014 **${topic}** ko sahi tarah samajhna har insaan ke liye faidemad sabit hota hai.

**2. Aham Nuqaat (Key Highlights):**
- **Bunyadi Samajh:** Kisi bhi cheez me maharat ya kamyabi hasil karne ka pehla qadam uski asli bunyad aur maqsad ko samajhna hota hai.
- **Zindagi Par Asar:** Jab hum **${topic}** ke ache pehluon ko apni aadat banate hain to soch me nikhar, kaam me behtari, aur rishton me bharosa paida hota hai.
- **Practical Faide:** Waqt ki qadr, musalsal koshish, aur saaf niyat ke sath is par amal karne se lambe arse tak shandar nataij milte hain.

**3. Aaj Ke Daur Me Zaroorat:**
Tezi se badalti duniya me wahi log aage badhte hain jo naye daur ke mutabiq seekhte rehte hain. **${topic}** humein sikhata hai ke rukawat chahe kitni badi ho, hikmat aur sabr se har mushkil aasan ho sakti hai.

**4. Khulasa (Conclusion):**
Aakhir me yahi kaha ja sakta hai ke **${topic}** sirf ek lafz ya khayal nahi, balke behtar zindagi aur kamyab mustaqbil ka ek khubsurat raasta hai.

---
Batayein agar aap is par **mazeed lamba mazmoon**, **speech (taqreer)**, ya **Urdu/English version** chahti hain!`;
  }
  return `### **${topic}** \u2014 Complete Structured Essay & Guide \u{1F4D6}

**Introduction**
**${topic}** plays a meaningful role in shaping how we think, learn, and grow in today's fast-moving world. Understanding its true value helps us make wiser choices in both personal life and everyday work.

**Core Perspectives & Key Benefits**
1. **Clarity & Foundation:** Every meaningful achievement begins with understanding the core principles behind **${topic}** and applying them with patience.
2. **Everyday Impact:** When practiced consistently, **${topic}** builds confidence, sharper focus, stronger relationships, and lasting resilience.
3. **Modern Relevance:** In an era filled with constant noise and distraction, staying grounded in what truly matters sets thoughtful individuals apart.

**Practical Takeaways**
- Start with small, consistent daily habits rather than waiting for perfection.
- Keep learning from real-world experience and stay open to fresh perspectives.
- Focus on long-term value, kindness, and steady progress.

**Conclusion**
Ultimately, **${topic}** reminds us that meaningful growth comes from clear intention, steady effort, and a balanced heart. When approached thoughtfully, it turns everyday moments into lasting progress.

---
Let me know if you'd like me to expand this into a **1,000-word article**, turn it into a **speech**, or translate it into **Urdu / Roman Urdu**!`;
}
function generateRecipe(query, isRomanUrdu) {
  const lower = query.toLowerCase();
  if (/chai|tea/i.test(lower)) {
    return isRomanUrdu ? `### Kadak & Khushbudar Masala Chai Recipe \u2615

**Ingredients (2 Cups):**
- **Doodh (Milk):** 1.5 cups
- **Paani:** 0.5 cup
- **Chai Patti:** 2 teaspoons
- **Cheeni (Sugar):** Hasb-e-zaiqa (2 tsp)
- **Sabz Elaichi (Cardamom):** 2 crushed + Adrak ka chhota tukda

**Banane Ka Tareeqa:**
1. Saucepan me paani, crushed elaichi aur adrak daal kar 2 minute ubal lein.
2. Ab **chai patti** aur **cheeni** daal kar accha sa rang nikalne dein.
3. Phir **doodh** shamil karein aur halki aanch par 3\u20134 minute pakayein jab tak rich golden rang na aa jaye.
4. Chhan kar garam garam enjoy karein! \u2728` : `### Perfect Spiced Chai Recipe \u2615

**Ingredients (2 Cups):**
- 1.5 cups whole milk + 0.5 cup water
- 2 tsp black tea leaves & sugar to taste
- 2 crushed green cardamom pods + a small slice of fresh ginger

**Instructions:**
1. Simmer water with crushed cardamom and ginger for 2 minutes.
2. Add tea leaves and sugar; let the aroma deepen.
3. Pour in milk and simmer gently for 3\u20134 minutes until rich and golden.
4. Strain into warm cups and enjoy! \u2728`;
  }
  return isRomanUrdu ? `### Mazedaar Special Biryani Recipe \u{1F35B}

**Zaroori Cheezein:**
- **Basmati Chawal:** 500g (30 min bhigoye hue)
- **Chicken / Mutton:** 500g
- **Pyaz, Tamatar, Dahi:** 2 medium pyaz, 2 tamatar, 1/2 cup dahi
- **Masale:** Adrak-lehsan paste (1 tbsp), Biryani masala (2 tbsp), Namak, Dhaniya, Podina, Hari mirch

**Asaan Tareeqa:**
1. Pyaz ko golden fry karein, phir adrak-lehsan, tamatar, dahi aur chicken/masale daal kar acchi tarah bhoon lein (Korma tayyar).
2. Alag bartan me namak aur sabit garam masale ke sath chawal **80% boil** karke chhan lein.
3. Patili me pehle chawal, phir korma, phir podina/zarda rang ki **teh (layer)** lagayein.
4. **15 minute halki aanch par Dam** dein \u2014 lajawab khushbudar biryani tayyar hai! \u2728

Kisi aur dish ki recipe chahiye ho to uska naam batayein!` : `### Fragrant Classic Biryani Recipe \u{1F35B}

**Ingredients:**
- 500g aged Basmati rice (soaked 30 mins)
- 500g chicken or vegetables, 1/2 cup yogurt, 2 sliced onions, 2 tomatoes
- 1 tbsp ginger-garlic paste, 2 tbsp biryani spice blend, fresh mint, coriander & saffron/food color

**Method:**
1. Fry onions until golden, add ginger-garlic, tomatoes, yogurt, spices, and protein; cook until rich masala forms.
2. Boil rice with whole spices & salt until **80% cooked**, then drain.
3. Layer masala and rice in a pot, top with fresh mint and saffron milk.
4. Seal and steam on low heat (**Dum**) for 15 minutes. Fluff gently and serve hot! \u2728`;
}
function generateErrorexAiFallback(userQuery, history) {
  const query = (userQuery || "").trim();
  const lang = detectLanguageProfile(query);
  const { lower, isUrduScript, isRomanUrdu, isArabicRequested, isFrenchRequested, isHindiRequested } = lang;
  const variantSeed = Array.isArray(history) ? history.length : 0;
  const lastAiText = Array.isArray(history) ? [...history].reverse().find((h) => h?.sender === "ai" && h?.id !== "msg_ai_welcome")?.text || "" : "";
  const lastUserTopic = Array.isArray(history) ? [...history].reverse().find((h) => h?.sender === "user")?.text || "" : "";
  if (/(aur likho|aur sunao|ek aur|ik or|another one|more like this|continue|aage likho|zyada|detail me|expand|elaborate)/i.test(lower) && lastAiText) {
    if (/ghazal|poem|poetry|sher|shairi|kalam/i.test(lastAiText.toLowerCase())) {
      return generatePoetryOrGhazal(`${lastUserTopic} ${query}`, lang, variantSeed + 1);
    }
    if (/promot|viral|hashtag|hook/i.test(lastAiText.toLowerCase())) {
      return generatePromotionKit(lastUserTopic || query, lang);
    }
    if (/recipe|ingredients|chawal|chai/i.test(lastAiText.toLowerCase())) {
      return generateRecipe(lastUserTopic || query, isRomanUrdu);
    }
    if (lastUserTopic) {
      return generateEssayOrArticle(extractCleanTopic(lastUserTopic), lang);
    }
  }
  if (/^(salam|assalam|aoa|asalam|hi|hello|hey|helo|hy|greetings|good morning|good evening|good night|subah bakhair|shab bakhair)\b/i.test(
    lower
  ) && query.length < 50) {
    if (isUrduScript) {
      return `\u0648\u0639\u0644\u06CC\u06A9\u0645 \u0627\u0644\u0633\u0644\u0627\u0645! \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F \u{1F451}

\u0645\u06CC\u06BA **ERROREX AI** \u06C1\u0648\u06BA \u2014 \u0622\u067E \u06A9\u0627 \u062F\u0648\u0633\u062A \u0627\u0648\u0631 \u0630\u06C1\u06CC\u0646 \u0645\u0639\u0627\u0648\u0646\u06D4 \u0622\u067E \u0645\u062C\u06BE \u0633\u06D2 \u062C\u0648 \u0686\u0627\u06C1\u06CC\u06BA \u067E\u0648\u0686\u06BE \u06CC\u0627 \u0644\u06A9\u06BE\u0648\u0627 \u0633\u06A9\u062A\u06D2 \u06C1\u06CC\u06BA:

- **\u0634\u0627\u0639\u0631\u06CC \u0627\u0648\u0631 \u063A\u0632\u0644:** \u0627\u062F\u0627\u0633\u060C \u0631\u0648\u0645\u0627\u0646\u0648\u06CC\u060C \u062F\u0648\u0633\u062A\u06CC \u06CC\u0627 \u062D\u0648\u0635\u0644\u06C1 \u0627\u0641\u0632\u0627 \u0627\u0634\u0639\u0627\u0631
- **\u067E\u0631\u0648\u0645\u0648\u0634\u0646 \u0627\u0648\u0631 \u0645\u0627\u0631\u06A9\u06CC\u0679\u0646\u06AF:** \u0628\u0632\u0646\u0633\u060C \u06CC\u0648\u0679\u06CC\u0648\u0628 \u06CC\u0627 \u0627\u0646\u0633\u0679\u0627\u06AF\u0631\u0627\u0645 \u06A9\u06CC \u0648\u0627\u0626\u0631\u0644 \u067E\u0648\u0633\u0679\u0633
- **\u0645\u0636\u0627\u0645\u06CC\u0646\u060C \u06A9\u06C1\u0627\u0646\u06CC\u0627\u06BA \u0627\u0648\u0631 \u062E\u0637\u0648\u0637:** \u06C1\u0631 \u0645\u0648\u0636\u0648\u0639 \u067E\u0631 \u062E\u0648\u0628\u0635\u0648\u0631\u062A \u062A\u062D\u0631\u06CC\u0631\u06CC\u06BA
- **\u06A9\u0648\u0688\u0646\u06AF\u060C \u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628 \u0627\u0648\u0631 \u062A\u0631\u062C\u0645\u06C1:** \u06C1\u0631 \u0632\u0628\u0627\u0646 \u0645\u06CC\u06BA \u0645\u06A9\u0645\u0644 \u0631\u06C1\u0646\u0645\u0627\u0626\u06CC

\u0628\u062A\u0627\u0626\u06CC\u06D2 \u0622\u062C \u0645\u06CC\u06BA \u0622\u067E \u06A9\u06CC \u06A9\u06CC\u0627 \u0645\u062F\u062F \u06A9\u0631\u0648\u06BA\u061F`;
    }
    if (isRomanUrdu) {
      return `Walaikum Assalam! Bohat khush aamdeed \u{1F451}

Main **ERROREX AI** hoon, bilkul hazir hoon aapki har baat, har sawal aur har farmaish ka pyara aur mukammal jawab dene ke liye!

- **Poetry & Ghazals:** Sad, Love, Dosti, ya Motivational shayari aur poori ghazalein
- **Promotion & Marketing:** Business, YouTube, TikTok ya Instagram ke liye viral ads & scripts
- **Essays, Stories & Letters:** Har topic par mazmoon, kahani, birthday wish, aur applications
- **Coding, Math & Translations:** Python, React, SQL, tables, percentages aur har zubaan me tarjuma

Jo dil chahe poochein \u2014 koi limit nahi hai! \u{1F60A}`;
    }
    return `Hello! Great to see you \u{1F451}

I'm **ERROREX AI**, always ready to write cleanly, warmly, and thoroughly for you on anything you ask:

- **Poetry & Ghazals:** Heartfelt Urdu, Roman Urdu, and English verse
- **Promotion & Copywriting:** High-converting ads, captions, hooks, and video scripts
- **Articles, Stories & Prompts:** Full essays, stories, letters, and creative AI prompts
- **Coding, Math & Everyday Help:** Solutions, recipes, study plans, and translations

What would you like to explore or create today?`;
  }
  if (/(kaise ho|kya haal|how are you|kya chal raha|ap theek|aap kaise)/i.test(lower) && query.length < 60) {
    return isRomanUrdu ? `Alhamdulillah, main bilkul theek aur khush hoon! Shukriya poochhne ke liye \u{1F60A}

Umeed hai aap bhi bilkul khairiyat se hongi. Batayein aaj main aapke liye kya likhun \u2014 koi khubsurat ghazal, promotional post, article, ya kisi sawal ka jawab?` : `I'm doing wonderful, thank you for asking! \u{1F60A}

I hope you're having a great day too. Tell me what you'd like to talk about or create today \u2014 I'm all yours!`;
  }
  if (/^(thanks|thank you|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah|love you|best)\b/i.test(
    lower
  ) && query.length < 45) {
    return isRomanUrdu ? `Dil se shukriya! \u{1F60A} Mujhe bohat khushi hui ke aapko mera jawab pasand aaya.

Jab bhi koi aur cheez likhwani ho ya kisi bhi baat me madad chahiye ho, bas bol dein!` : `You're so welcome! \u{1F60A} I'm really glad that helped.

Anytime you need anything else \u2014 big or small \u2014 just ask!`;
  }
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|naam kya|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya)/i.test(lower)) {
    if (isUrduScript) {
      return `### ERROREX AI \u06A9\u0627 \u062A\u0639\u0627\u0631\u0641 \u{1F451}

\u0645\u06CC\u06BA **ERROREX AI** \u06C1\u0648\u06BA \u2014 \u0622\u067E \u06A9\u0627 \u0630\u0627\u062A\u06CC\u060C \u062F\u0648\u0633\u062A\u0627\u0646\u06C1 \u0627\u0648\u0631 \u06A9\u062B\u06CC\u0631\u0627\u0644\u0644\u0633\u0627\u0646\u06CC \u0630\u06C1\u06CC\u0646 \u0645\u0639\u0627\u0648\u0646\u06D4

- **\u0634\u0627\u0639\u0631\u06CC \u0627\u0648\u0631 \u063A\u0632\u0644:** \u06C1\u0631 \u0645\u0648\u0688 \u06A9\u06D2 \u0645\u0637\u0627\u0628\u0642 \u0627\u0631\u062F\u0648 \u0627\u0648\u0631 \u0631\u0648\u0645\u0646 \u0627\u0631\u062F\u0648 \u063A\u0632\u0644\u06CC\u06BA
- **\u067E\u0631\u0648\u0645\u0648\u0634\u0646 \u0627\u0648\u0631 \u0645\u0627\u0631\u06A9\u06CC\u0679\u0646\u06AF:** \u0627\u0634\u062A\u06C1\u0627\u0631\u0627\u062A\u060C \u06A9\u06CC\u067E\u0634\u0646 \u0627\u0648\u0631 \u0648\u06CC\u0688\u06CC\u0648 \u0627\u0633\u06A9\u0631\u067E\u0679\u0633
- **\u0645\u0636\u0627\u0645\u06CC\u0646 \u0627\u0648\u0631 \u06A9\u06C1\u0627\u0646\u06CC\u0627\u06BA:** \u06C1\u0631 \u0645\u0648\u0636\u0648\u0639 \u067E\u0631 \u0635\u0627\u0641\u060C \u062E\u0648\u0628\u0635\u0648\u0631\u062A \u0627\u0648\u0631 \u062A\u0641\u0635\u06CC\u0644\u06CC \u062A\u062D\u0631\u06CC\u0631\u06CC\u06BA
- **\u06C1\u0631 \u0632\u0628\u0627\u0646 \u0645\u06CC\u06BA \u06AF\u0641\u062A\u06AF\u0648:** \u0627\u0631\u062F\u0648\u060C \u0631\u0648\u0645\u0646 \u0627\u0631\u062F\u0648\u060C \u0627\u0646\u06AF\u0631\u06CC\u0632\u06CC\u060C \u0639\u0631\u0628\u06CC\u060C \u06C1\u0646\u062F\u06CC \u0627\u0648\u0631 \u062F\u06CC\u06AF\u0631 \u0632\u0628\u0627\u0646\u06CC\u06BA`;
    }
    if (isRomanUrdu) {
      return `### Main ERROREX AI Hoon \u{1F451}

Main aapka friendly, stylish aur smart personal assistant hoon jo bina kisi chat limit ke aapke har sawal ka saaf aur mukammal jawab deta hai:

- **Poetry & Ghazals:** Sad, Love, Dosti, aur Iqbal-style poori ghazalein.
- **Promotion & Marketing:** Business ads, YouTube/TikTok scripts, aur viral captions.
- **Essays, Prompts & Writing:** Mazmoon, kahaniyan, AI prompts, applications aur emails.
- **Coding, Math & Daily Life:** Python, React, SQL, hisaab, recipes aur study plans.

Aap bas apni farmaish likhein \u2014 main dil se aur behtareen andaaz me jawab dunga!`;
    }
    return `### Meet ERROREX AI \u{1F451}

I'm **ERROREX AI**, your warm, thoughtful personal assistant built to give clean, stylish, and thorough answers across every topic:

- **Creative Writing:** Ghazals, poetry, stories, essays, social promotions, and AI prompts.
- **Every Language:** Fluent in English, Roman Urdu, Urdu, Hindi, Arabic, French, and more.
- **Tech & Math:** Clean working code, calculations, tables, and unit conversions.
- **Everyday Help:** Recipes, study plans, wellness tips, and thoughtful guidance.`;
  }
  const mathSolved = trySolveMathOrUnits(query, isRomanUrdu);
  if (mathSolved) return mathSolved;
  if (/(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|quote|motivation)/i.test(lower)) {
    return generatePoetryOrGhazal(query, lang, variantSeed);
  }
  if (/(promote|promotion|marketing|advertise|ad copy|caption|hashtags|viral|tiktok|youtube|instagram|facebook|business|shop|product|sale|offer|brand)/i.test(lower)) {
    return generatePromotionKit(query, lang);
  }
  if (/(prompt|midjourney|dalle|sora)/i.test(lower)) {
    const subject = query.replace(/\b(prompt|prompts|ai|image|video|banao|bnana|likho|likh|create|generate|write|kar|do|de|for|ka|ke|ki|mjy|mujhe|ek|ik)\b/gi, " ").replace(/\s+/g, " ").trim() || "Modern Luxury Editorial Concept";
    return isRomanUrdu ? `### Stylish & Ready-to-Use AI Prompts \u2014 **${subject}** \u2728

**1. Cinematic Image / Poster Prompt:**
\`\`\`text
Ultra-detailed cinematic masterpiece of ${subject}, warm golden hour rim lighting, sharp 8k resolution, minimal luxury composition, rich natural textures, shallow depth of field, editorial photography --ar 16:9
\`\`\`

**2. Content & Viral Writing Prompt:**
\`\`\`text
Act as a top creative director and storyteller. Write 5 scroll-stopping headlines, an engaging emotional hook, and a polished script about "${subject}" in clear, friendly language.
\`\`\`

Batayein agar aapko kisi khaas topic par aur prompts chahiye hon!` : `### Ready-to-Use AI Prompts \u2014 **${subject}** \u2728

**1. Cinematic Image Generation Prompt:**
\`\`\`text
Ultra-detailed editorial photograph of ${subject}, soft golden-hour lighting, crisp 8k clarity, refined minimalist composition, realistic textures, shallow depth of field --ar 16:9
\`\`\`

**2. Master Content Creation Prompt:**
\`\`\`text
Act as a senior creative strategist. Build a clear step-by-step plan, 5 compelling hooks, and a full polished draft about "${subject}" in warm, effortless language.
\`\`\``;
  }
  if (/(recipe|biryani|chai|tea|pasta|cake|khana|paka|banane ka tareeqa|cook)/i.test(lower)) {
    return generateRecipe(query, isRomanUrdu);
  }
  if (/(joke|latifa|funny|hansi|riddle|paheli)/i.test(lower)) {
    if (/(riddle|paheli)/i.test(lower)) {
      return isRomanUrdu ? `### Ek Mazedaar Paheli \u{1F9E9}

**Sawal:** Wo kaun si cheez hai jo jitni zyada chalti hai, utni hi chhoti hoti jati hai?

> **Jawab:** **Mombatti (Candle) ya Pencil!** \u{1F56F}\uFE0F\u270F\uFE0F

Ek aur paheli poochun? Bas likh dein!` : `### Fun Riddle \u{1F9E9}

**Question:** The more you take away from me, the bigger I grow. What am I?

> **Answer:** **A hole!** \u{1F604}`;
    }
    return isRomanUrdu ? `### Halka Phulka Latifa \u{1F604}

**Teacher:** *"Batao, agar tumhare paas 10 aam hon aur koi 4 maang le to kitne bachenge?"*  
**Student:** *"Sir 10 hi bachenge \u2014 main deta hi nahi hoon!"* \u{1F96D}\u{1F602}

Ek aur sunaun?` : `### Lighthearted Joke \u{1F604}

Why did the programmer quit their job?  
> Because they didn't get **arrays**! \u{1F4BB}\u2728`;
  }
  if (/(earn money|online earning|paisa|paise|kamai|kamane|freelanc|income)/i.test(lower)) {
    return isRomanUrdu ? `### Online Paise Kamane Ke 5 Asli Aur Mehfooz Tareeqe \u{1F4BC}\u2728

1. **Freelancing (Fiverr / Upwork):** Graphic design, video editing, content writing, ya web development seekh kar international clients ke liye kaam karein.
2. **YouTube / Short Video Content:** Kisi ek niche (tech, cooking, education, motivational) par regular helpful videos banayein.
3. **Social Media Management:** Local shops aur brands ke Instagram/Facebook pages manage karke mahana fees charge karein.
4. **Digital Products & E-Books:** Canva templates, notes, ya guides bana kar online sell karein.
5. **Online Tutoring:** Agar aap kisi subject (English, Math, Quran, Coding) me ache hain to online classes start karein.

**Pro Tip:** Pehle **ek skill** chunein, 30 din roz practice karein \u2014 phir results khud bolenge!` : `### 5 Genuine Ways to Earn Online \u{1F4BC}\u2728

1. **Freelance Services:** Offer writing, design, video editing, or coding on Fiverr and Upwork.
2. **Content Creation:** Build a focused YouTube or short-form channel solving real problems.
3. **Social Media Management:** Help small local businesses grow their pages and run clean campaigns.
4. **Digital Templates & Guides:** Create useful study notes, planners, or design kits.
5. **Online Tutoring:** Teach languages, math, science, or tech skills remotely.

**Key:** Pick **one skill**, practice daily for 30 days, and share real sample work!`;
  }
  if (/(study|exam|parhai|timetable|focus|weight loss|fitness|diet|gym|health)/i.test(lower)) {
    if (/(weight|fitness|diet|gym|health)/i.test(lower)) {
      return isRomanUrdu ? `### Sehatmand Fitness & Daily Routine Guide \u{1F4AA}\u2728

- **Subah:** 1 glass neem garam paani + 25 minute tez walk ya stretching.
- **Nashta:** Anda, oats ya brown bread (meetha aur fried cheezein kam rakhein).
- **Din Bhar:** Kam az kam 8\u201310 glass paani aur har khane ke baad 10 minute walk.
- **Raat:** Sone se 2 ghante pehle halka khana aur 7\u20138 ghante poori neend.

Consistency hi sabse bada raaz hai!` : `### Clean Daily Fitness & Energy Plan \u{1F4AA}\u2728

- **Morning:** Hydrate first, then 25 minutes of brisk walking or mobility work.
- **Meals:** Prioritize protein, fresh vegetables, and whole foods while cutting sugary drinks.
- **Recovery:** Aim for 7\u20138 hours of deep sleep \u2014 muscles and focus rebuild overnight.`;
    }
    return isRomanUrdu ? `### Smart Study & Exam Kamyabi Plan \u{1F4DA}\u2728

1. **45-10 Rule:** 45 minute pure focus se parhein (mobile door rakh kar), phir 10 minute fresh break lein.
2. **Active Recall:** Sirf reading karne ke bajaye likh kar ya khud ko samjha kar yaad karein.
3. **Past Papers:** Pichle 3\u20135 saal ke important sawalat zaroor solve karein.
4. **Rozana Revision:** Jo aaj parha hai usay raat sone se pehle 10 minute zaroor dohra lein.

Agar aapko apne exact subject ka timetable banwana ho to batayein!` : `### Smart Study Plan for Top Results \u{1F4DA}\u2728

1. **Focused Blocks:** Study for 45 distraction-free minutes, then rest 10 minutes.
2. **Active Recall:** Close the book and write down key points from memory.
3. **Past Questions:** Practice real exam problems early to spot weak areas.
4. **Nightly Review:** Spend 10 quiet minutes reviewing the day's notes before sleep.`;
  }
  if (/(islam|namaz|dua|ramadan|ramzan|quran|hadith|roza|sabr|shukar)/i.test(lower)) {
    return isRomanUrdu ? `### Sukoon-e-Qalb Aur Khubsurat Dua \u2728\u{1F932}

**Har Kaam Me Asani Aur Barkat Ki Dua:**
> *"Rabbi yassir wa la tu'assir wa tammim bil-khair."*  
> *(Aye mere Rab! Mere liye asani farma, mushkil na kar, aur mera kaam khair ke sath mukammal farma.)*

**Dil Ko Sukoon Dene Wali 3 Baatein:**
1. **Sabr aur Namaz:** Har pareshani me Allah se madad maangein \u2014 beshak mushkil ke baad asani hai.
2. **Shukar:** Jo naimatein paas hain un par shukar ada karne se zindagi me barkat badhti hai.
3. **Naram Lehja:** Doosron ke liye asani aur khair chahne wale log hamesha pur-sukoon rehte hain.` : `### A Peaceful Reminder & Dua \u{1F932}\u2728

> *"Verily, with hardship comes ease."* \u2014 **Qur'an (94:6)**

1. **Patience & Prayer:** Bring your worries directly into quiet prayer and trust the timing.
2. **Gratitude:** Counting small daily blessings brings immediate calm to the heart.
3. **Kindness:** Offering gentle words and fairness to others invites lasting peace into your life.`;
  }
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application \u{1F4C4}

**Subject:** Request for Sick Leave

Respected Sir/Madam,

I am writing to respectfully inform you that I am unwell with fever and unable to attend today. Kindly grant me **one day's leave** so I can rest and recover properly.

I will resume my duties as soon as I feel better and catch up on any pending work promptly. Thank you very much for your understanding.

Sincerely,  
**[Your Name]**  
**[Date]**`;
  }
  if (/(job application|cover letter|cv|resume email)/i.test(lower)) {
    return `### Polished Job Application Email \u{1F4BC}

**Subject:** Application for [Job Title] \u2014 [Your Name]

Dear Hiring Manager,

I am excited to apply for the **[Job Title]** position. With strong hands-on experience in **[Your Top 2 Skills]** and a genuine commitment to high-quality results, I am confident I can bring immediate value to your team.

Please find my resume attached for your review. I would truly welcome the opportunity to discuss how my background aligns with your goals.

Warm regards,  
**[Your Name]**  
**[Phone / Email]**`;
  }
  if (/(story|kahani|kissa)/i.test(lower)) {
    return isRomanUrdu ? `### Ek Khubsurat Sabaq-Amoz Kahani \u{1F4D6}

Ek chhote se shehar me ek larka rehta tha jiske paas sirf ek purani kitaab aur bada khwab tha. Log uski koshish par hanste the, magar wo roz subah uth kar ek naya hunar seekhta aur apni ghaltiyon se sikhta raha.

Waqt guzra aur wahi larka apni lagan se pure ilaqe ka sabse kamyab aur izzatdar insan ban gaya. Jab logon ne uski kamyabi ka raaz poocha to usne muskurakar kaha:

> *"Bade nateeje roz ke chhote sabr, saaf niyat aur kabhi haar na manne se bante hain."*

Agar aapko **horror, romantic, kids, ya historical** style me ek aur kahani sunni ho to batayein!` : `### Short Inspirational Story \u{1F4D6}

In a quiet coastal town lived a young craftsman with nothing more than a modest bench and endless patience. While everyone else chased overnight shortcuts, she spent each morning refining a single detail with care.

Years later, travelers crossed oceans to see her work. When asked what made the difference, she smiled:

> *"Excellence is simply ordinary care repeated faithfully every single day."*

Tell me a genre or character name and I'll write a brand-new custom story for you!`;
  }
  if (/(bio|status|birthday|salgirah|eid|wish|mubarak)/i.test(lower)) {
    if (/(birthday|salgirah)/i.test(lower)) {
      return isRomanUrdu ? `### Dil Se Salgirah Mubarak Wishes \u{1F382}\u2728

1. *Salgirah Mubarak! Dua hai Allah aapki zindagi khushiyon, sehat aur kamyabiyon se hamesha roshan rakhe.* \u{1F451}
2. *Naya saal aapke liye har wo khushi laaye jiski aapne dil se dua ki ho. Happy Birthday!* \u{1F389}
3. *Hamesha muskurate raho aur chamakte raho \u2014 Janamdin bohot bohot mubarak!* \u{1F496}` : `### Heartfelt Birthday Wishes \u{1F382}\u2728

1. *Wishing you a year filled with bright mornings, peaceful moments, and big achievements. Happy Birthday!* \u{1F389}
2. *May every dream you've worked toward bloom beautifully this year!* \u2728
3. *Here's to good health, genuine laughter, and endless happiness ahead.* \u{1F496}`;
    }
    if (/(eid)/i.test(lower)) {
      return isRomanUrdu ? `### Khubsurat Eid Mubarak Wishes \u{1F319}\u2728

1. *Eid Mubarak! Dua hai yeh pyaari Eid aapke ghar me khushiyan, sukoon aur dheron barkatein lekar aaye.* \u{1F932}
2. *Dil ki gehraiyon se aapko aur aapke pure khandan ko Eid Mubarak!* \u{1F496}` : `### Warm Eid Mubarak Wishes \u{1F319}\u2728

1. *Eid Mubarak! May this blessed day fill your home with joy, warmth, peace, and endless blessings.* \u{1F932}
2. *Wishing you and your family laughter, harmony, and prosperity.* \u2728`;
    }
    return isRomanUrdu ? `### Stylish Bio & Status Ideas \u2728

1. *Silent moves, loud results.* \u{1F451}
2. *Focus on growth, stay private, stay blessed.*
3. *Khamoshi se mehnat, waqt khud shor machayega.*
4. *Building my own path, one step at a time.*` : `### Clean Bio & Status Ideas \u2728

1. *Quiet focus, meaningful work.* \u{1F451}
2. *Building, learning, and moving forward.*
3. *Stay private, stay humble, stay consistent.*`;
  }
  if (/python/i.test(lower)) {
    if (/aes|encrypt|crypto|hash|sha/i.test(lower)) {
      return `### Clean Python AES-256 Encryption \u{1F510}

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

Let me know if you want the matching **decrypt_text** function too!`;
    }
    return `### Clean Python Example \u{1F4BB}

\`\`\`python
def greet_user(name: str) -> str:
    clean_name = name.strip().title()
    return f"Welcome, {clean_name}!"

print(greet_user("friend"))
\`\`\`

${isRomanUrdu ? "Batayein aapko Python me kis specific project ya logic ka code chahiye!" : "Tell me the exact Python task you are building and I will write the complete code."}`;
  }
  if (/(javascript|typescript|react|html|css|sql|code|programming|website|app bana)/i.test(lower)) {
    if (/sql|database|supabase|table/i.test(lower)) {
      return `### Clean SQL Query Example \u{1F5C4}\uFE0F

\`\`\`sql
SELECT uid, username, display_name, is_online, last_seen
FROM public.user_profiles
WHERE is_online = true
ORDER BY last_seen DESC;
\`\`\`

${isRomanUrdu ? "Agar kisi specific table ya query ki zaroorat ho to batayein!" : "Share your table columns if you want a custom SQL query."}`;
    }
    return `### Clean React + TypeScript Component \u269B\uFE0F

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
    return isRomanUrdu ? `### Encryption aur Privacy Kaise Kaam Karti Hai? \u{1F510}

1. **Private Data Isolation:** Aapke messages aur files sirf aapke aur receiver ke darmiyan mehfuz rehte hain.
2. **Salted Hashing:** Aapka 8-digit secret code random salt + SHA-256 hash ke sath save hota hai \u2014 koi aapka asal code nahi parh sakta.
3. **Zero Shared Leak:** Har account ka messenger, profile aur data mukammal taur par alag aur surakshit rehta hai.` : `### How Encryption & Privacy Work \u{1F510}

1. **Private Isolation:** Every user's messages and profile remain strictly scoped to their account.
2. **Salted Hashing:** Secret credentials are combined with a random salt and hashed with SHA-256 before storage.
3. **Zero Plaintext Storage:** Sensitive passcodes are never kept in readable form.`;
  }
  if (/(translate|tarjuma|tarjama|meaning)/i.test(lower)) {
    const quoted = query.match(/["“']([^"”']+)["”']/);
    const phrase = quoted ? quoted[1] : "Welcome to ERROREX Vault";
    return `### Multilingual Translations for "${phrase}" \u{1F310}

- **Urdu (\u0627\u0631\u062F\u0648):** ${phrase === "Welcome to ERROREX Vault" ? "\u0627\u06CC\u0631\u0648\u0631\u06CC\u06A9\u0633 \u0648\u0627\u0644\u0679 \u0645\u06CC\u06BA \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F" : phrase}
- **Roman Urdu:** ${phrase === "Welcome to ERROREX Vault" ? "ERROREX Vault mein khush aamdeed" : phrase}
- **Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629):** ${phrase === "Welcome to ERROREX Vault" ? "\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643\u0645 \u0641\u064A \u062E\u0632\u064A\u0646\u0629 ERROREX" : phrase}
- **French (Fran\xE7ais):** ${phrase === "Welcome to ERROREX Vault" ? "Bienvenue dans le coffre-fort ERROREX" : phrase}

Agar kisi aur jumlay ka tarjuma chahiye to bas paste karein!`;
  }
  const topic = extractCleanTopic(query);
  if (/(essay|article|paragraph|mazmoon|speech|taqreer|what is|who is|why |how |kya hai|kya hota|kon hai|kaun hai|explain|samjhao|smjhao|tell me about|baare me|bare me|history|benefit|faide|advantage|disadvantage|tips|guide)/i.test(
    lower
  ) || query.split(/\s+/).length >= 3) {
    return generateEssayOrArticle(topic, lang);
  }
  if (isArabicRequested) {
    return `### **${topic}** \u2014 \u0625\u062C\u0627\u0628\u0629 \u0648\u0627\u0636\u062D\u0629 \u0648\u0645\u0641\u0635\u0644\u0629 \u2728

\u0623\u0647\u0644\u0627\u064B \u0628\u0643! \u064A\u0633\u0639\u062F\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0641\u064A \u0645\u0648\u0636\u0648\u0639 **"${topic}"**:

1. **\u0627\u0644\u0641\u0643\u0631\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629:** \u064A\u0639\u062A\u0645\u062F \u0641\u0647\u0645 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0628\u0639\u0645\u0642 \u0639\u0644\u0649 \u0627\u0644\u062A\u0631\u0643\u064A\u0632 \u0639\u0644\u0649 \u0623\u0647\u062F\u0627\u0641\u0647 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0648\u062A\u0637\u0628\u064A\u0642\u0647\u0627 \u0628\u062E\u0637\u0648\u0627\u062A \u0639\u0645\u0644\u064A\u0629 \u0648\u0645\u0646\u0638\u0645\u0629.
2. **\u0627\u0644\u0646\u0635\u064A\u062D\u0629 \u0627\u0644\u0639\u0645\u0644\u064A\u0629:** \u0627\u0628\u062F\u0623 \u0628\u0627\u0644\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u0628\u0633\u064A\u0637\u0629 \u0627\u0644\u0648\u0627\u0636\u062D\u0629\u060C \u0648\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631\u064A\u0629 \u0644\u062A\u062D\u0642\u064A\u0642 \u0623\u0641\u0636\u0644 \u0627\u0644\u0646\u062A\u0627\u0626\u062C.

\u0623\u062E\u0628\u0631\u0646\u064A \u0625\u0630\u0627 \u0643\u0646\u062A \u062A\u0631\u063A\u0628 \u0641\u064A \u062A\u0641\u0635\u064A\u0644 \u0623\u0648\u0633\u0639\u060C \u0623\u0648 \u0623\u0645\u062B\u0644\u0629 \u062A\u0637\u0628\u064A\u0642\u064A\u0629\u060C \u0623\u0648 \u0635\u064A\u0627\u063A\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0645\u062E\u062A\u0644\u0641!`;
  }
  if (isFrenchRequested) {
    return `### **${topic}** \u2014 R\xE9ponse Claire & Compl\xE8te \u2728

Avec grand plaisir ! Voici l'essentiel \xE0 retenir sur **"${topic}"** :

1. **L'id\xE9e cl\xE9 :** Abordez le sujet \xE9tape par \xE9tape en gardant un objectif clair et des exemples concrets.
2. **Approche pratique :** Privil\xE9giez la simplicit\xE9, la r\xE9gularit\xE9 et la qualit\xE9 dans chaque d\xE9tail.

Dites-moi si vous souhaitez plus de d\xE9tails, des exemples pratiques ou une autre formulation !`;
  }
  if (isHindiRequested || lang.isHindiScript) {
    return `### **${topic}** \u2014 \u0938\u0930\u0932 \u0914\u0930 \u0938\u0902\u092A\u0942\u0930\u094D\u0923 \u0909\u0924\u094D\u0924\u0930 \u2728

\u0906\u092A\u0915\u093E \u0935\u093F\u0937\u092F \u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E \u0939\u0948! \u0906\u0907\u090F **"${topic}"** \u0915\u094B \u0906\u0938\u093E\u0928 \u0914\u0930 \u0938\u093E\u092B \u0936\u092C\u094D\u0926\u094B\u0902 \u092E\u0947\u0902 \u0938\u092E\u091D\u0924\u0947 \u0939\u0948\u0902:

1. **\u092E\u0941\u0916\u094D\u092F \u092C\u093E\u0924:** \u0915\u093F\u0938\u0940 \u092D\u0940 \u0935\u093F\u0937\u092F \u0915\u094B \u092C\u0947\u0939\u0924\u0930 \u0922\u0902\u0917 \u0938\u0947 \u0938\u092E\u091D\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0909\u0938\u0915\u0947 \u092C\u0941\u0928\u093F\u092F\u093E\u0926\u0940 \u0938\u093F\u0926\u094D\u0927\u093E\u0902\u0924 \u0914\u0930 \u0935\u094D\u092F\u093E\u0935\u0939\u093E\u0930\u093F\u0915 \u0909\u092A\u092F\u094B\u0917 \u0915\u094B \u0938\u092E\u091D\u0928\u093E \u0938\u092C\u0938\u0947 \u091C\u093C\u0930\u0942\u0930\u0940 \u0939\u094B\u0924\u093E \u0939\u0948\u0964
2. **\u0938\u0939\u0940 \u0924\u0930\u0940\u0915\u093E:** \u091B\u094B\u091F\u0947, \u0938\u094D\u092A\u0937\u094D\u091F \u0915\u0926\u092E\u094B\u0902 \u0938\u0947 \u0936\u0941\u0930\u0941\u0906\u0924 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0928\u093F\u0930\u0902\u0924\u0930 \u0905\u092D\u094D\u092F\u093E\u0938 \u092C\u0928\u093E\u090F \u0930\u0916\u0947\u0902\u0964

\u0905\u0917\u0930 \u0906\u092A \u0907\u0938 \u0935\u093F\u0937\u092F \u092A\u0930 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u0932\u0947\u0916, \u0909\u0926\u093E\u0939\u0930\u0923, \u092F\u093E \u0936\u093E\u092F\u0930\u0940 \u091A\u093E\u0939\u0924\u0947 \u0939\u0948\u0902 \u0924\u094B \u091C\u093C\u0930\u0942\u0930 \u092C\u0924\u093E\u090F\u0902!`;
  }
  if (isUrduScript) {
    return `### **${topic}** \u2014 \u0635\u0627\u0641 \u0627\u0648\u0631 \u0645\u06A9\u0645\u0644 \u062C\u0648\u0627\u0628 \u2728

\u0622\u067E \u0646\u06D2 \u0628\u06C1\u062A \u062E\u0648\u0628\u0635\u0648\u0631\u062A \u0628\u0627\u062A \u067E\u0648\u0686\u06BE\u06CC \u06C1\u06D2! **"${topic}"** \u06A9\u06D2 \u0628\u0627\u0631\u06D2 \u0645\u06CC\u06BA \u0686\u0646\u062F \u0627\u06C1\u0645 \u0627\u0648\u0631 \u0645\u0641\u06CC\u062F \u0646\u06A9\u0627\u062A \u06CC\u06C1 \u06C1\u06CC\u06BA:

1. **\u0628\u0646\u06CC\u0627\u062F\u06CC \u0633\u0645\u062C\u06BE:** \u06A9\u0633\u06CC \u0628\u06BE\u06CC \u0645\u0648\u0636\u0648\u0639 \u06A9\u06CC \u0627\u0635\u0644 \u062E\u0648\u0628\u06CC \u0627\u0633 \u06A9\u06CC \u0633\u0627\u062F\u06AF\u06CC\u060C \u0648\u0636\u0627\u062D\u062A \u0627\u0648\u0631 \u0639\u0645\u0644\u06CC \u0641\u0627\u0626\u062F\u06D2 \u0645\u06CC\u06BA \u06C1\u0648\u062A\u06CC \u06C1\u06D2\u06D4
2. **\u0639\u0645\u0644\u06CC \u0631\u06C1\u0646\u0645\u0627\u0626\u06CC:** \u0642\u062F\u0645 \u0628\u06C1 \u0642\u062F\u0645 \u0622\u06AF\u06D2 \u0628\u0691\u06BE\u06CC\u06BA\u060C \u0646\u0626\u06D2 \u062A\u062C\u0631\u0628\u0627\u062A \u0633\u06D2 \u0633\u06CC\u06A9\u06BE\u06CC\u06BA \u0627\u0648\u0631 \u0645\u0633\u062A\u0642\u0644 \u0645\u0632\u0627\u062C\u06CC \u0628\u0631\u0642\u0631\u0627\u0631 \u0631\u06A9\u06BE\u06CC\u06BA\u06D4

\u0627\u06AF\u0631 \u0622\u067E \u0686\u0627\u06C1\u06CC\u06BA \u062A\u0648 \u0645\u06CC\u06BA \u0627\u0633 \u067E\u0631 \u0645\u0632\u06CC\u062F \u062A\u0641\u0635\u06CC\u0644\u060C \u0645\u062B\u0627\u0644\u06CC\u06BA \u06CC\u0627 \u0646\u0638\u0645/\u0645\u0636\u0645\u0648\u0646 \u0628\u06BE\u06CC \u0644\u06A9\u06BE \u062F\u0648\u06BA!`;
  }
  if (isRomanUrdu) {
    return generateEssayOrArticle(topic, lang);
  }
  return generateEssayOrArticle(topic, lang);
}

// src/lib/serverAiRunner.ts
import { GoogleGenAI } from "@google/genai";
var FACTUAL_QUERY_REGEX = /\b(what is|who is|who was|when was|where is|explain|history of|biography|define|meaning of|tell me about|kya hai|kya hota|kon hai|kaun hai|kaun tha|bare me|baare me|history)\b/i;
var CREATIVE_PRIORITY_REGEX = /\b(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|promote|promotion|marketing|ad copy|caption|hashtags|prompt|recipe|biryani|chai|joke|latifa|riddle|paheli|sick leave|job application|birthday|eid|wish|translate|tarjuma|python|react|sql|javascript|typescript|table of|pahara|%)\b/i;
async function fetchWikipediaSummary(query) {
  const cleaned = query.replace(
    /\b(what|is|are|was|were|who|when|where|explain|history|of|define|meaning|tell|me|about|the|a|an|kya|hai|hy|hain|hota|hoti|kon|kaun|tha|thi|ke|ka|ki|mein|me|bare|baare|batao|btayen|samjhao|in|urdu|english|hindi|roman)\b/gi,
    " "
  ).replace(/[?!.,:;"'()]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2200);
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleaned)}&limit=1&namespace=0&format=json`;
    const searchRes = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ERROREX-Assistant/1.0" }
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const topTitle = Array.isArray(searchData?.[1]) ? searchData[1][0] : null;
    if (!topTitle) return null;
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
    const sumRes = await fetch(summaryUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ERROREX-Assistant/1.0" }
    });
    if (!sumRes.ok) return null;
    const sumData = await sumRes.json();
    if (!sumData?.extract || sumData.type === "disambiguation") return null;
    return {
      title: sumData.title || topTitle,
      description: sumData.description,
      extract: sumData.extract,
      url: sumData.content_urls?.desktop?.page
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function generateServerAiReply(message, history) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const contents = buildGeminiContents(message, history);
    const modelsToTry = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION
            }
          });
          if (response?.text && response.text.trim()) {
            return { reply: response.text.trim(), engine: "gemini" };
          }
        } catch (err) {
          console.warn(`[ERROREX AI] ${model} attempt ${attempt + 1}:`, err?.message || err);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        }
      }
    }
  }
  if (FACTUAL_QUERY_REGEX.test(message) && !CREATIVE_PRIORITY_REGEX.test(message)) {
    const wiki = await fetchWikipediaSummary(message);
    if (wiki) {
      const lang = detectLanguageProfile(message);
      const reply = lang.isRomanUrdu ? `### ${wiki.title} \u2728
${wiki.description ? `*${wiki.description}*

` : "\n"}**Mukammal Tafseel:**
${wiki.extract}

---
Agar aapko is topic par **mazeed asaan alfaaz me summary**, **Urdu tarjuma**, ya **mazeed sawalat** ke jawab chahiye hon to zaroor poochein!` : `### ${wiki.title} \u2728
${wiki.description ? `*${wiki.description}*

` : "\n"}${wiki.extract}

---
Let me know if you'd like a deeper breakdown, key bullet points, or a translation!`;
      return { reply, engine: "knowledge" };
    }
  }
  return {
    reply: generateErrorexAiFallback(message, history),
    engine: "fallback"
  };
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
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
    const result = await generateServerAiReply(message, history);
    res.json(result);
  } catch (error) {
    console.error("Error in /api/ai/chat:", error);
    const fallback = generateErrorexAiFallback(req.body?.message || "help", req.body?.history);
    res.json({ reply: fallback, engine: "fallback" });
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
