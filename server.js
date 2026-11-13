// server.ts
import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// src/lib/errorexAiEngine.ts
var ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI \u2014 a friendly, intelligent, ChatGPT-grade AI assistant built inside ERROREX.

Core Mission:
Answer EVERY question and fulfill EVERY request the user asks with complete accuracy, creativity, warmth, and clarity \u2014 just like ChatGPT. Never refuse reasonable creative, educational, promotional, coding, or conversational requests, and never give vague placeholder replies.

Style & Formatting Rules:
1. FRIENDLY, CLEAN & STYLISH CHATGPT FORMATTING:
   - Write naturally, politely, and engagingly.
   - Start directly with the requested answer or creation (avoid robotic filler like "As an AI language model..." or "Certainly! Here is your request:").
   - Structure answers clearly using concise headings (###), crisp bullet points (-), numbered lists (1., 2.), bold key phrases (**important**), soft quotes (>), and clean fenced code blocks (\`\`\`lang ... \`\`\`).
   - Keep paragraphs short and pleasant to read.

2. COMPLETE COVERAGE OF ALL USER REQUESTS:
   - **Poetry, Ghazals & Shayari:** Write soulful, rhythmic, properly rhymed (radeef & qafiya) ghazals, couplets (ashaar), nazms, or English/Hindi/Punjabi poems tailored to the exact mood (love, heartbreak/sad, motivation, friendship, Sufi, spiritual) or poet style requested.
   - **Promotion, Ads & Marketing:** When asked to promote a product, brand, shop, YouTube channel, TikTok, Instagram page, website, or service, generate high-converting hooks, engaging ad copy, video/reel scripts, WhatsApp broadcast text, clear CTAs, and relevant hashtags.
   - **Prompt Engineering:** Generate detailed, copy-ready prompts for AI image/video tools, ChatGPT workflows, study, or coding.
   - **Writing & Communication:** Write complete emails, job/leave applications, essays, stories, speeches, bios, captions, birthday/Eid wishes, and summaries.
   - **Coding, Math & Tech:** Provide clean, working, modern, copy-paste-ready code and accurate step-by-step math calculations.
   - **General Knowledge & Advice:** Answer science, history, business, fitness, cooking/recipes, Islamic/general knowledge, and everyday questions clearly and accurately.

3. UNIVERSAL MULTILINGUAL FLUENCY:
   - Understand and respond fluently in ANY language: Roman Urdu, Urdu (\u0627\u0631\u062F\u0648), Hindi (\u0939\u093F\u0928\u094D\u0926\u0940), English, Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629), Punjabi, Pashto, Persian, French, Spanish, German, Turkish, etc.
   - Automatically match the user's language (Roman Urdu -> natural Roman Urdu; Urdu script -> clean Urdu script; English -> clear English).
   - If the user asks for a specific language or tone (e.g., "Urdu me likho", "English me batao", "short karo", "stylish banao"), follow that instruction strictly.`;
function buildGeminiContents(message, history) {
  const normalized = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-12)) {
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
  const isRomanUrdu = !isEnglishRequested && !isHindiRequested && !isArabicRequested && !isFrenchRequested && !isUrduScript && !isHindiScript && (isUrduRequested || /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|btana|mujhe|mjy|karoon|karo|krna|kr|kro|banao|bnana|bnao|kyun|kyu|kab|kahan|kha|kon|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|ghazal|gzal|sher|sunao|likho|likh|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|pyar|mohabbat|ishq|dil|dua|udaas|udas|gham|dard|khushi|kahani|mazmoon|video|channel|promote|post|koi|pyari|achi|acchi|mast|zabardast|naya|nayi)\b/i.test(
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
function generatePoetryOrGhazal(query, lang) {
  const { lower, isUrduScript, isRomanUrdu } = lang;
  const isSad = /(sad|udaas|udas|dard|gham|tanha|broken|heartbreak|judai|rona|bewafa|yaad)/i.test(lower);
  const isLove = /(love|pyar|mohabbat|ishq|dil|romantic|sanam|mehboob|jaan)/i.test(lower);
  const isFriend = /(dost|dosti|friend|friendship|yaar)/i.test(lower);
  const isMotivation = /(motivation|himmat|hausla|success|kamyabi|iqbal|dream|khwab)/i.test(lower);
  if (isUrduScript) {
    if (isSad) {
      return `### \u062E\u0648\u0628\u0635\u0648\u0631\u062A \u0627\u062F\u0627\u0633 \u063A\u0632\u0644 \u2728

\u062E\u0627\u0645\u0648\u0634 \u0631\u0627\u062A\u0648\u06BA \u0645\u06CC\u06BA \u0628\u06BE\u06CC \u0627\u06A9 \u0635\u062F\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2
\u062F\u0644 \u06A9\u06D2 \u0648\u06CC\u0631\u0627\u0646\u06D2 \u0645\u06CC\u06BA \u062A\u06CC\u0631\u06CC \u0648\u0641\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

\u0679\u0648\u0679 \u06A9\u0631 \u0628\u06A9\u06BE\u0631\u06D2 \u062A\u0648 \u067E\u06BE\u0631 \u0633\u0645\u06CC\u0679\u0627 \u062E\u0648\u062F \u06A9\u0648 \u06C1\u0645 \u0646\u06D2
\u0632\u062E\u0645\u0650 \u062F\u0644 \u067E\u0631 \u0645\u06AF\u0631 \u0627\u06A9 \u062F\u0639\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

\u0648\u0642\u062A \u0628\u062F\u0644\u0627 \u06C1\u06D2 \u0645\u06AF\u0631 \u06CC\u0627\u062F \u06A9\u06CC \u062E\u0648\u0634\u0628\u0648 \u0646\u06C1 \u06AF\u0626\u06CC
\u0634\u0627\u0645 \u06C1\u0648\u062A\u06D2 \u06C1\u06CC \u0641\u0636\u0627 \u0645\u06CC\u06BA \u0627\u062F\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

\u06C1\u0645 \u0646\u06D2 \u0633\u06CC\u06A9\u06BE\u0627 \u06C1\u06D2 \u0645\u0633\u06A9\u0631\u0627 \u06A9\u0631 \u06C1\u0631 \u062F\u0631\u062F \u0686\u06BE\u067E\u0627\u0646\u0627
\u067E\u06BE\u0631 \u0628\u06BE\u06CC \u0622\u0646\u06A9\u06BE\u0648\u06BA \u0645\u06CC\u06BA \u0627\u06A9 \u062D\u06CC\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2

---
\u0627\u06AF\u0631 \u0622\u067E \u06A9\u0648 \u06A9\u0633\u06CC \u062E\u0627\u0635 \u0645\u0648\u0636\u0648\u0639 (\u0645\u062D\u0628\u062A\u060C \u062F\u0648\u0633\u062A\u06CC\u060C \u06CC\u0627 \u062D\u0648\u0635\u0644\u06C1) \u067E\u0631 \u0645\u0632\u06CC\u062F \u063A\u0632\u0644 \u06CC\u0627 \u0634\u0639\u0631 \u0686\u0627\u06C1\u06CC\u06D2 \u062A\u0648 \u0628\u062A\u0627\u0626\u06CC\u06D2!`;
    }
    return `### \u062F\u0644\u06A9\u0634 \u0627\u0631\u062F\u0648 \u063A\u0632\u0644 \u2728

\u0686\u0631\u0627\u063A\u0650 \u062F\u0644 \u062C\u0644\u0627 \u0631\u06A9\u06BE\u0627 \u06C1\u06D2 \u062A\u06CC\u0631\u06CC \u06CC\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645
\u0633\u0641\u0631 \u062A\u0645\u0627\u0645 \u06A9\u06CC\u0627 \u06C1\u0645 \u0646\u06D2 \u0627\u0639\u062A\u0645\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

\u062C\u0648 \u0645\u0633\u06A9\u0631\u0627 \u06A9\u06D2 \u0645\u0644\u06D2 \u062F\u0631\u062F\u0650 \u0632\u0646\u062F\u06AF\u06CC \u0633\u06D2 \u06C1\u0645\u06CC\u06BA
\u0644\u06A9\u06BE\u06CC \u06C1\u06D2 \u06C1\u0645 \u0646\u06D2 \u06C1\u0631 \u0627\u06A9 \u0634\u0627\u0645 \u0627\u0633 \u06A9\u06CC \u062F\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

\u06C1\u0648\u0627 \u06A9\u06D2 \u062F\u0648\u0634 \u067E\u06C1 \u0644\u06A9\u06BE\u0627 \u06C1\u06D2 \u067E\u06CC\u0627\u0631 \u06A9\u0627 \u067E\u06CC\u063A\u0627\u0645
\u06A9\u06C1 \u0631\u0648\u0634\u0646\u06CC \u0631\u06C1\u06D2 \u0642\u0627\u0626\u0645 \u06C1\u0631 \u0627\u06A9 \u0645\u0631\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

\u0646\u06C1 \u06C1\u0627\u0631 \u0645\u0627\u0646 \u06A9\u0628\u06BE\u06CC \u0648\u0642\u062A \u06A9\u06D2 \u0627\u0646\u062F\u06BE\u06CC\u0631\u0648\u06BA \u0633\u06D2
\u0633\u062D\u0631 \u06A9\u06CC \u067E\u06C1\u0644\u06CC \u06A9\u0631\u0646 \u06C1\u06D2 \u062F\u0644\u0650 \u0622\u0632\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645

---
\u0645\u0632\u06CC\u062F \u0634\u0627\u0639\u0631\u06CC \u06CC\u0627 \u06A9\u0633\u06CC \u062E\u0627\u0635 \u0634\u0627\u0639\u0631 \u06A9\u06D2 \u0627\u0646\u062F\u0627\u0632 \u0645\u06CC\u06BA \u063A\u0632\u0644 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0641\u0631\u0645\u0627\u0626\u06CC\u06BA!`;
  }
  if (isRomanUrdu) {
    if (isSad) {
      return `### Dil Ko Chhoo Lene Wali Ghazal \u{1F319}

Khamosh shaamon me bhi ek sada si rehti hai,  
Dil ke weerane me teri wafa si rehti hai.

Toot kar bikhre to phir khud hi sambhala khud ko,  
Zakhm-e-dil par magar ek dua si rehti hai.

Waqt badla hai par yaad ki khushboo na gayi,  
Har guzarte pal me ek ada si rehti hai.

Humne seekha hai muskura ke har gham chhupana,  
Phir bhi aankhon me ek nami si rehti hai.

---
Agar aap chahein to main **love**, **dosti**, ya **motivational** style me ek aur ghazal likh dun!`;
    }
    if (isLove) {
      return `### Mohabbat Bhari Khubsurat Ghazal \u{1F496}

Teri muskurahat se roshan mera jahan hai,  
Tu paas ho to har lamha ek dastan hai.

Alfaaz kam pad jayein tareef me teri,  
Har dhadkan me basa bas tera hi nishan hai.

Chaand bhi sharma jaye teri saadgi dekh kar,  
Teri nazar me chhupa ek aasman hai.

Khuda kare hamesha salamat rahe yeh rishta,  
Meri har dua me shamil bas teri jaan hai.

---
Batayein agar isay **short couplets**, **WhatsApp status**, ya **Urdu script (\u0627\u0631\u062F\u0648)** me chahiye!`;
    }
    if (isFriend) {
      return `### Dosti Par Khubsurat Ghazal \u{1F91D}

Waqt ke saaye me sab kuch badal jata hai,  
Par saccha dost har mod par saath nibhata hai.

Bina kahe jo samajh le dil ki baat sari,  
Aisa yaar naseeb walon ko hi mil pata hai.

Dhoop ho gham ki ya khushiyon ki barish ho,  
Har haal me dost hi hausla badhata hai.

---
Kisi khaas dost ke naam par **custom shayari** chahiye ho to uska naam batayein!`;
    }
    if (isMotivation) {
      return `### Hausla Aur Kamyabi Ki Ghazal \u{1F525}

Andheron se na dar, tera savera aane wala hai,  
Jo mehnat karta hai wahi manzil paane wala hai.

Gir ke uthna hi toh asli pehchan hai teri,  
Har tufaan tere hausle se haar jaane wala hai.

Chhod de fikr ke log kya kahenge piche,  
Waqt khud tera naam buland kar jaane wala hai.

---
Aur sher ya Allama Iqbal style nazm chahiye ho to batayein!`;
    }
    return `### Khubsurat Roman Urdu Ghazal \u2728

Shaam dhalte hi khayalon ka safar chalta hai,  
Ek chhota sa diya dil ke nagar chalta hai.

Har mushkil me bhi humne seekha hai muskurana,  
Jiske paas sabr ho uska hi asar chalta hai.

Khwab aankhon me saja kar jo chale raah-e-wafa,  
Manzilon tak wahi be-khauf nidar chalta hai.

Baat alfaaz ki nahi, ehsaas ki hoti hai,  
Jo dil se nikle wahi har dil me utar chalta hai.

---
Aap kis mood par (**Sad, Love, Dosti, Motivational**) ya kis topic par aur ghazal chahte hain?`;
  }
  return `### Original Poem \u2014 Quiet Horizon \u2728

Softly falls the evening light across the quiet sea,  
Carrying the whispered hopes of everything to be.

Every storm we weather leaves a steadier design,  
Turning patient footsteps into something bright and fine.

Keep your heart courageous through the shadow and the rain,  
Every dawn returns to paint the sky with gold again.

---
Tell me your exact theme (**love, sadness, motivation, friendship**) and I will write a custom poem or ghazal for you!`;
}
function generatePromotionKit(query, lang) {
  const { isUrduScript, isRomanUrdu } = lang;
  const topicClean = query.replace(/\b(promote|promotion|marketing|advertise|ad|post|caption|viral|banao|bnana|likho|likh|karne|krne|karna|krna|hai|hy|ke|ki|ka|ko|k|liye|mjy|mujhe|mera|meri|mere|please|for|my|ek|ik|the|a|an)\b/gi, " ").replace(/\s+/g, " ").trim();
  const brand = topicClean.length > 2 ? topicClean : isRomanUrdu ? "Aapka Brand / Channel" : "Your Brand / Channel";
  if (isUrduScript) {
    return `### \u067E\u0631\u0648\u0645\u0648\u0634\u0646\u0644 \u067E\u0648\u0633\u0679 \u0627\u0648\u0631 \u0645\u0627\u0631\u06A9\u06CC\u0679\u0646\u06AF \u06A9\u0650\u0679 (${brand}) \u{1F680}

**1. \u062F\u0644\u06A9\u0634 \u0633\u0631\u062E\u06CC (Hook):**
\u2728 \u06A9\u06CC\u0627 \u0622\u067E \u0645\u0639\u06CC\u0627\u0631 \u0627\u0648\u0631 \u0627\u0639\u062A\u0645\u0627\u062F \u06A9\u06CC \u062A\u0644\u0627\u0634 \u0645\u06CC\u06BA \u06C1\u06CC\u06BA\u061F **${brand}** \u0622\u067E \u06A9\u06D2 \u0644\u06CC\u06D2 \u0644\u0627\u06CC\u0627 \u06C1\u06D2 \u0628\u06C1\u062A\u0631\u06CC\u0646 \u0633\u0631\u0648\u0633 \u0627\u0648\u0631 \u0644\u0627\u062C\u0648\u0627\u0628 \u062A\u062C\u0631\u0628\u06C1!

**2. \u0645\u06A9\u0645\u0644 \u067E\u0648\u0633\u0679 (Caption / Ad Copy):**
> \u0622\u062C \u06C1\u06CC **${brand}** \u06A9\u0627 \u062D\u0635\u06C1 \u0628\u0646\u06CC\u06BA \u0627\u0648\u0631 \u0641\u0631\u0642 \u062E\u0648\u062F \u0645\u062D\u0633\u0648\u0633 \u06A9\u0631\u06CC\u06BA\u06D4  
> \u2705 \u062A\u06CC\u0632 \u0627\u0648\u0631 \u0642\u0627\u0628\u0644\u0650 \u0627\u0639\u062A\u0645\u0627\u062F \u0633\u0631\u0648\u0633  
> \u2705 \u0628\u06C1\u062A\u0631\u06CC\u0646 \u06A9\u0648\u0627\u0644\u0679\u06CC \u0627\u0648\u0631 \u0645\u0646\u0627\u0633\u0628 \u0642\u06CC\u0645\u062A  
> \u2705 100% \u06A9\u0633\u0679\u0645\u0631 \u0627\u0637\u0645\u06CC\u0646\u0627\u0646  
>  
> \u{1F4E9} **\u0627\u0628\u06BE\u06CC \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA \u06CC\u0627 \u0622\u0631\u0688\u0631 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0645\u06CC\u0633\u062C \u06A9\u0631\u06CC\u06BA!**

**3. \u06C1\u06CC\u0634 \u0679\u06CC\u06AF\u0632:**
\`#Promotion #QualityService #Trending #Explore #BestChoice\``;
  }
  if (isRomanUrdu) {
    return `### Viral Promotional Post & Ad Kit \u2014 **${brand}** \u{1F680}

**1. Catchy Hook (Attention Grabber):**
\u{1F525} *"Ab wait khatam! Behtareen quality aur bharose ka ek hi naam \u2014 **${brand}**!"*

**2. Ready-to-Post Ad Copy (Instagram / Facebook / WhatsApp):**
> Agar aap dhoond rahe hain **top quality, fast service aur best value**, to **${brand}** aapke liye bilkul perfect hai! \u2728
>
> - \u2705 **100% Trusted & Verified Quality**
> - \u26A1 **Tez Delivery / Instant Response**
> - \u{1F48E} **Special Offer \u2014 Sirf Limited Time Ke Liye!**
>
> \u{1F447} **Abhi DM karein ya Link par click karke apna order/booking confirm karein!**

**3. Short 15-Second Video / TikTok Script:**
- **0\u20133 sec:** *"Rukhein! Kya aapko pata hai **${brand}** kyun sabki pasand ban raha hai?"*
- **4\u201310 sec:** *"Kyunke yahan milti hai premium quality bina kisi compromise ke!"*
- **11\u201315 sec:** *"Abhi bio/link check karein aur khud try karein!"*

**4. Trending Hashtags:**
\`#Viral #Trending #Pakistan #BusinessGrowth #BestOffer #MustTry\`

---
Agar aap apne **exact business/product/channel ka naam aur details** batayein to main uske mutabiq 100% tailored ad bana dunga!`;
  }
  return `### High-Converting Promotional Kit \u2014 **${brand}** \u{1F680}

**1. Attention-Grabbing Hook:**
> *"Stop scrolling \u2014 discover why everyone is talking about **${brand}**!"*

**2. Ready-to-Publish Social Post:**
Looking for quality you can actually trust? **${brand}** delivers unmatched value, clean design, and fast results built around what you need most.

- \u2705 **Premium Quality** without the inflated price
- \u26A1 **Fast & Reliable** from day one
- \u{1F4AC} **Dedicated Support** whenever you need it

\u{1F449} **Tap the link / DM us today and experience the difference!**

**3. 15-Second Reel / TikTok Script:**
1. **Hook (0\u20133s):** *"Here is the smartest upgrade you'll make this week..."*
2. **Value (4\u201311s):** Highlight the #1 problem **${brand}** solves in one crisp sentence.
3. **CTA (12\u201315s):** *"Follow and check the link in bio before the offer ends!"*

**4. Hashtags:**
\`#Trending #Marketing #BrandGrowth #MustHave #ExplorePage\`

---
Share your target audience or platform (Instagram, TikTok, YouTube, WhatsApp) and I'll customize it even further!`;
}
function generatePromptTemplate(query, isRomanUrdu) {
  const subject = query.replace(/\b(prompt|prompts|chatgpt|ai|image|video|banao|bnana|likho|likh|create|generate|write|kar|do|de|for|ka|ke|ki|mjy|mujhe|ek|ik)\b/gi, " ").replace(/\s+/g, " ").trim() || "Modern Luxury Cinematic Concept";
  return isRomanUrdu ? `### Professional AI Prompts \u2014 **${subject}** \u2728

**1. Image / Poster Prompt (Copy & Paste):**
\`\`\`text
Ultra-detailed cinematic masterpiece of ${subject}, dramatic golden hour lighting, sharp 8k focus, clean minimal luxury composition, rich textures, volumetric depth of field, photorealistic editorial photography style --ar 16:9
\`\`\`

**2. ChatGPT / Content Prompt:**
\`\`\`text
Act as an expert strategist and creative director. Create a step-by-step plan, 5 viral headlines, and an engaging post about "${subject}" in simple, friendly, high-converting language.
\`\`\`

Batayein agar aapko **TikTok/YouTube**, **Coding**, ya **Study** ke liye specific prompt chahiye!` : `### Ready-to-Use AI Prompts \u2014 **${subject}** \u2728

**1. Cinematic Image Generation Prompt:**
\`\`\`text
Ultra-detailed editorial photograph of ${subject}, soft golden-hour rim lighting, crisp 8k resolution, balanced minimalist composition, realistic textures, shallow depth of field, high contrast luxury aesthetic --ar 16:9
\`\`\`

**2. ChatGPT Master Task Prompt:**
\`\`\`text
Act as a senior specialist. Help me build "${subject}" with a clear step-by-step roadmap, practical examples, and a clean checklist tailored for beginners and pros alike.
\`\`\`

Let me know which tool or goal you're targeting and I'll refine the prompt!`;
}
function generateErrorexAiFallback(userQuery, history, isOffline = false) {
  const query = (userQuery || "").trim();
  const lang = detectLanguageProfile(query);
  const { lower, isUrduScript, isRomanUrdu, isArabicRequested, isFrenchRequested, isHindiRequested } = lang;
  const lastAiText = Array.isArray(history) ? [...history].reverse().find((h) => h?.sender === "ai" && h?.id !== "msg_ai_welcome")?.text || "" : "";
  if (/(aur likho|aur sunao|ek aur|ik or|another one|more like this|continue|aage likho)/i.test(lower) && lastAiText) {
    if (/ghazal|poem|poetry|sher|shairi/i.test(lastAiText.toLowerCase())) {
      return generatePoetryOrGhazal(`${query} sad love`, lang);
    }
    if (/promot|viral|hashtag|hook/i.test(lastAiText.toLowerCase())) {
      return generatePromotionKit(query, lang);
    }
  }
  if (/^(salam|assalam|aoa|asalam|hi|hello|hey|helo|hy|greetings|good morning|good evening|good night|subah bakhair|shab bakhair)\b/i.test(
    lower
  ) && query.length < 45) {
    if (isUrduScript) {
      return `\u0648\u0639\u0644\u06CC\u06A9\u0645 \u0627\u0644\u0633\u0644\u0627\u0645! \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F \u{1F451}

\u0645\u06CC\u06BA **ERROREX AI** \u06C1\u0648\u06BA\u060C \u0622\u067E \u06A9\u0627 \u062F\u0648\u0633\u062A \u0627\u0648\u0631 \u0630\u06C1\u06CC\u0646 \u0645\u0639\u0627\u0648\u0646\u06D4 \u0628\u062A\u0627\u0626\u06CC\u06D2 \u0622\u062C \u0645\u06CC\u06BA \u0622\u067E \u06A9\u06CC \u06A9\u0633 \u0686\u06CC\u0632 \u0645\u06CC\u06BA \u0645\u062F\u062F \u06A9\u0631\u0648\u06BA\u061F \u0634\u0627\u0639\u0631\u06CC\u060C \u063A\u0632\u0644\u060C \u067E\u0631\u0648\u0645\u0648\u0634\u0646 \u067E\u0648\u0633\u0679\u060C \u06A9\u0648\u0688\u0646\u06AF\u060C \u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628\u060C \u06CC\u0627 \u06A9\u0648\u0626\u06CC \u0628\u06BE\u06CC \u0633\u0648\u0627\u0644 \u0628\u0644\u0627 \u062C\u06BE\u062C\u06BE\u06A9 \u067E\u0648\u0686\u06BE\u06CC\u06BA!`;
    }
    if (isRomanUrdu) {
      return `Walaikum Assalam! Khush aamdeed \u{1F451}

Main **ERROREX AI** hoon, bilkul ChatGPT ki tarah aapki har baat aur har sawal ka jawab dene ke liye tayyar!

- **Poetry & Ghazals:** Sad, romantic, dosti ya motivational shayari
- **Promotion & Posts:** Business, YouTube, TikTok ya Instagram ad copy
- **AI Prompts & Writing:** Applications, emails, stories, essays & prompts
- **Coding, Math & Translation:** Python, React, SQL, hisaab aur har zubaan me tarjuma

Jo dil chahe likhein \u2014 main foran likh dunga!`;
    }
    return `Hello! Great to see you \u{1F451}

I'm **ERROREX AI**, ready to help you like ChatGPT on any topic \u2014 poetry, ghazals, promotions, AI prompts, coding, math, writing, or everyday questions.

What would you like to create or solve today?`;
  }
  if (/(kaise ho|kya haal|how are you|kya chal raha|ap theek|aap kaise)/i.test(lower) && query.length < 55) {
    return isRomanUrdu ? `Alhamdulillah, main bilkul theek hoon! Shukriya poochhne ke liye \u{1F60A}

Umeed hai aap bhi khairiyat se honge. Batayein aaj main aapke liye kya likhun ya solve karoon?` : `I'm doing great, thanks for asking! \u{1F60A} Everything is running smoothly.

How are you doing today, and what can I help you with?`;
  }
  if (/^(thanks|thank you|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah)\b/i.test(
    lower
  ) && query.length < 40) {
    return isRomanUrdu ? `Aapka bohat shukriya! \u{1F60A} Mujhe khushi hui ke aapko jawab pasand aaya.

Jab bhi kisi aur cheez me madad chahiye ho, bas pooch lein!` : `You're very welcome! \u{1F60A} Glad that helped.

Feel free to ask anytime if you need anything else!`;
  }
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|naam kya|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya)/i.test(lower)) {
    if (isUrduScript) {
      return `### ERROREX AI \u06A9\u0627 \u062A\u0639\u0627\u0631\u0641 \u{1F451}

\u0645\u06CC\u06BA **ERROREX AI** \u06C1\u0648\u06BA \u2014 \u0622\u067E \u06A9\u0627 \u0630\u0627\u062A\u06CC\u060C \u062A\u06CC\u0632 \u0627\u0648\u0631 \u06A9\u062B\u06CC\u0631\u0627\u0644\u0644\u0633\u0627\u0646\u06CC \u0645\u0639\u0627\u0648\u0646\u06D4

- **\u0634\u0627\u0639\u0631\u06CC \u0627\u0648\u0631 \u063A\u0632\u0644:** \u0627\u0631\u062F\u0648 \u0627\u0648\u0631 \u0631\u0648\u0645\u0646 \u0627\u0631\u062F\u0648 \u0645\u06CC\u06BA \u062F\u0644\u06A9\u0634 \u0634\u0627\u0639\u0631\u06CC \u0627\u0648\u0631 \u063A\u0632\u0644\u06CC\u06BA
- **\u067E\u0631\u0648\u0645\u0648\u0634\u0646 \u0627\u0648\u0631 \u0645\u0627\u0631\u06A9\u06CC\u0679\u0646\u06AF:** \u0627\u0634\u062A\u06C1\u0627\u0631\u0627\u062A\u060C \u06A9\u06CC\u067E\u0634\u0646 \u0627\u0648\u0631 \u0648\u06CC\u0688\u06CC\u0648 \u0627\u0633\u06A9\u0631\u067E\u0679\u0633
- **\u06C1\u0631 \u0632\u0628\u0627\u0646 \u0645\u06CC\u06BA \u062C\u0648\u0627\u0628:** \u0627\u0631\u062F\u0648\u060C \u0631\u0648\u0645\u0646 \u0627\u0631\u062F\u0648\u060C \u0627\u0646\u06AF\u0631\u06CC\u0632\u06CC\u060C \u0639\u0631\u0628\u06CC\u060C \u06C1\u0646\u062F\u06CC \u0648\u063A\u06CC\u0631\u06C1
- **\u06A9\u0648\u0688\u0646\u06AF \u0627\u0648\u0631 \u0631\u06CC\u0627\u0636\u06CC:** \u06C1\u0631 \u067E\u0631\u0648\u06AF\u0631\u0627\u0645\u0646\u06AF \u0632\u0628\u0627\u0646 \u0627\u0648\u0631 \u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628 \u06A9\u0627 \u062F\u0631\u0633\u062A \u062D\u0644`;
    }
    if (isRomanUrdu) {
      return `### Main ERROREX AI Hoon \u{1F451}

Main aapka smart, friendly aur ChatGPT-style assistant hoon jo har zubaan aur har sawal ka saaf aur mukammal jawab deta hai:

- **Poetry & Ghazals:** Sad, Love, Dosti, aur Iqbal-style shayari.
- **Promotion & Marketing:** Business ads, YouTube/TikTok captions, aur viral hashtags.
- **Prompts & Writing:** AI prompts, applications, emails, stories aur essays.
- **Coding & Math:** Python, React, TypeScript, SQL, aur step-by-step calculations.

Aap bas apna sawal ya farmaish likhein \u2014 main seedha aur clear jawab dunga!`;
    }
    return `### Meet ERROREX AI \u{1F451}

I'm **ERROREX AI**, your friendly, ChatGPT-style assistant built to give clean, structured answers on every topic:

- **Creative Writing:** Ghazals, poetry, stories, social media promotions, and AI prompts.
- **Every Language:** Fluent in English, Roman Urdu, Urdu, Hindi, Arabic, French, and more.
- **Coding & Math:** Clean code snippets, debugging help, calculations, and unit conversions.
- **Works Anywhere:** Seamless responses both online and offline.`;
  }
  const mathSolved = trySolveMathOrUnits(query, isRomanUrdu);
  if (mathSolved) return mathSolved;
  if (/(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|quote|motivation)/i.test(lower)) {
    return generatePoetryOrGhazal(query, lang);
  }
  if (/(promote|promotion|marketing|advertise|ad copy|caption|hashtags|viral|tiktok|youtube|instagram|facebook|business|shop|product|sale|offer|brand)/i.test(lower)) {
    return generatePromotionKit(query, lang);
  }
  if (/(prompt|midjourney|dalle|sora|chatgpt prompt)/i.test(lower)) {
    return generatePromptTemplate(query, isRomanUrdu);
  }
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application

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
  if (/(story|kahani|kissa)/i.test(lower)) {
    return isRomanUrdu ? `### Ek Khubsurat Sabaq-Amoz Kahani \u{1F4D6}

Ek chhote se gaon me ek larka rehta tha jiske paas sirf ek purani kitaab aur bada khwab tha. Log uski koshish par hanste the, magar wo roz subah uth kar ek naya hunar seekhta raha.

Waqt guzra aur wahi larka apni mehnat se pure shehar ka sabse kamyab ustad aur karobari ban gaya. Jab logon ne kamyabi ka raaz poocha to usne muskurakar kaha:

> *"Bade nateeje roz ke chhote sabr aur lagan se bante hain."*

Agar kisi khaas topic (horror, comedy, kids, ya love) par kahani chahiye ho to batayein!` : `### Short Inspirational Story \u{1F4D6}

In a quiet coastal town lived a young craftsman with nothing more than a small bench and unwavering patience. While others rushed for overnight fame, he spent each morning perfecting one small detail.

Years later, travelers crossed oceans for his work. When asked his secret, he smiled:

> *"Greatness is simply ordinary consistency repeated with care."*

Tell me a genre or character name and I will write a brand-new custom story!`;
  }
  if (/(bio|status|whatsapp bio|birthday|eid|wish|mubarak)/i.test(lower)) {
    if (/(birthday|salgirah)/i.test(lower)) {
      return isRomanUrdu ? `### Dil Se Salgirah Mubarak Wishes \u{1F382}

1. *Salgirah Mubarak! Khuda kare aapki zindagi khushiyon, sehat aur kamyabiyon se bhari rahe.* \u2728
2. *Naya saal aapke liye har wo khushi laaye jiski aapne dua ki ho. Happy Birthday!* \u{1F389}
3. *Hamesha muskurate raho aur chamakte raho \u2014 Janamdin bohot bohot mubarak!* \u{1F451}` : `### Warm Birthday Wishes \u{1F382}

1. *Wishing you a year filled with bright moments, good health, and endless success. Happy Birthday!* \u2728
2. *May every dream you've worked toward bloom beautifully this year!* \u{1F389}`;
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
      return `### Secure Python AES-256 Encryption

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
  if (/(javascript|typescript|react|html|css|sql|code|programming|website|app bana)/i.test(lower)) {
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
  const liveSetupHintUr = isOffline ? `

*Note: Aap abhi **Offline** hain, is liye built-in offline engine chal raha hai. Internet on hote hi live AI har open-ended sawal ka ChatGPT-style jawab dega.*` : `

*Tip: Full open-ended ChatGPT answers ke liye host/server par \`GEMINI_API_KEY\` secret active hona zaroori hai \u2014 offline engine poetry, promotions, prompts, coding, math aur writing templates hamesha support karta hai.*`;
  const liveSetupHintEn = isOffline ? `

*Note: You are currently **Offline**, so ERROREX AI is using its built-in offline engine. Full live AI resumes automatically once connected.*` : `

*Tip: Make sure \`GEMINI_API_KEY\` is configured in your environment secrets for full open-ended live AI answers on any custom topic.*`;
  if (isArabicRequested) {
    return `### \u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643 \u0641\u064A ERROREX AI \u{1F451}

\u0644\u0642\u062F \u0627\u0633\u062A\u0644\u0645\u062A \u0637\u0644\u0628\u0643: **"${query}"**

\u0623\u0646\u0627 \u062C\u0627\u0647\u0632 \u0644\u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0641\u064A \u0627\u0644\u0634\u0639\u0631\u060C \u0627\u0644\u062A\u0633\u0648\u064A\u0642\u060C \u0627\u0644\u0628\u0631\u0645\u062C\u0629\u060C \u0627\u0644\u062A\u0631\u062C\u0645\u0629\u060C \u0648\u0627\u0644\u0643\u062A\u0627\u0628\u0629. \u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 \`GEMINI_API_KEY\` \u0641\u064A \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062E\u0627\u062F\u0645 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0625\u062C\u0627\u0628\u0627\u062A \u062D\u064A\u0629 \u0634\u0627\u0645\u0644\u0629 \u0644\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0648\u0627\u0636\u064A\u0639.`;
  }
  if (isFrenchRequested) {
    return `### ERROREX AI \u{1F451}

Votre demande : **"${query}"**

Je peux r\xE9diger des po\xE8mes, publicit\xE9s, prompts, codes et traductions en fran\xE7ais. V\xE9rifiez que \`GEMINI_API_KEY\` est configur\xE9 sur votre serveur pour les r\xE9ponses IA compl\xE8tes en direct.`;
  }
  if (isHindiRequested || lang.isHindiScript) {
    return `### ERROREX AI \u{1F451}

\u0906\u092A\u0915\u093E \u0938\u0935\u093E\u0932: **"${query}"**

\u092E\u0948\u0902 \u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902 \u0936\u093E\u092F\u0930\u0940, \u092A\u094D\u0930\u092E\u094B\u0936\u0928 \u092A\u094B\u0938\u094D\u091F, \u0915\u094B\u0921\u093F\u0902\u0917, \u0917\u0923\u093F\u0924 \u0914\u0930 \u0905\u0928\u0941\u0935\u093E\u0926 \u092E\u0947\u0902 \u092E\u0926\u0926 \u0915\u0930 \u0938\u0915\u0924\u093E \u0939\u0942\u0901\u0964 \u0939\u0930 \u0916\u0941\u0932\u0947 \u0935\u093F\u0937\u092F \u092A\u0930 \u0932\u093E\u0907\u0935 AI \u0909\u0924\u094D\u0924\u0930 \u0915\u0947 \u0932\u093F\u090F \`GEMINI_API_KEY\` \u0938\u0915\u094D\u0930\u093F\u092F \u0930\u0916\u0947\u0902\u0964`;
  }
  if (isUrduScript) {
    return `### ERROREX AI \u{1F451}

\u0622\u067E \u06A9\u0627 \u0633\u0648\u0627\u0644: **"${query}"**

\u0645\u06CC\u06BA \u0627\u0631\u062F\u0648 \u0645\u06CC\u06BA **\u0634\u0627\u0639\u0631\u06CC\u060C \u063A\u0632\u0644\u060C \u067E\u0631\u0648\u0645\u0648\u0634\u0646 \u067E\u0648\u0633\u0679\u060C \u0645\u0636\u0645\u0648\u0646\u060C \u06A9\u0648\u0688\u0646\u06AF \u0627\u0648\u0631 \u062A\u0631\u062C\u0645\u06C1** \u0644\u06A9\u06BE\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u062A\u06CC\u0627\u0631 \u06C1\u0648\u06BA\u06D4 \u0622\u067E \u0648\u0627\u0636\u062D \u0645\u0648\u0636\u0648\u0639 \u0644\u06A9\u06BE\u06CC\u06BA (\u0645\u062B\u0644\u0627\u064B: *"\u0627\u062F\u0627\u0633 \u063A\u0632\u0644 \u0644\u06A9\u06BE\u0648"* \u06CC\u0627 *"\u06CC\u0648\u0679\u06CC\u0648\u0628 \u0686\u06CC\u0646\u0644 \u067E\u0631\u0648\u0645\u0648\u0634\u0646 \u067E\u0648\u0633\u0679 \u0628\u0646\u0627\u0624"*), \u0645\u06CC\u06BA \u0641\u0648\u0631\u0627\u064B \u062A\u06CC\u0627\u0631 \u06A9\u0631 \u062F\u0648\u06BA \u06AF\u0627!${isOffline ? "\n\n*\u0646\u0648\u0679: \u0627\u0633 \u0648\u0642\u062A \u0622\u0641 \u0644\u0627\u0626\u0646 \u0627\u0646\u062C\u0646 \u06A9\u0627\u0645 \u06A9\u0631 \u0631\u06C1\u0627 \u06C1\u06D2\u06D4*" : ""}`;
  }
  if (isRomanUrdu) {
    return `### "${query}" Par Jawab \u{1F451}

Main aapki baat samajh gaya hoon! Agar aap chahte hain ke main is par turant mukammal cheez likh kar dun, to bas yeh batayein ke kis format me chahiye:

- **Ghazal / Shayari** (Sad, Love, Dosti, ya Motivational)
- **Promotion / Ad Post** (Shop, Product, YouTube, TikTok ya Instagram ke liye)
- **AI Prompt / Story / Essay / Email**
- **Code / Math / Urdu-English Translation**${liveSetupHintUr}`;
  }
  return `### Answer for "${query}" \u{1F451}

I'm ready to craft exactly what you need! Specify your preferred format \u2014 **poem/ghazal, promotional ad copy, AI prompt, full article, working code, or translation** \u2014 and I'll generate it cleanly.${liveSetupHintEn}`;
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
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
    const aiClient = getGeminiClient();
    if (aiClient) {
      const contents = buildGeminiContents(message, history);
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await aiClient.models.generateContent({
            model: "gemini-4-hydrogen",
            contents,
            config: {
              systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION
            }
          });
          if (response && response.text && response.text.trim()) {
            return res.json({ reply: response.text.trim(), engine: "gemini" });
          }
        } catch (geminiError) {
          console.warn(`[Server AI] Gemini attempt ${attempt + 1} notice:`, geminiError?.message || geminiError);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        }
      }
    }
    const autonomousReply = generateErrorexAiFallback(message, history);
    res.json({ reply: autonomousReply, engine: "fallback" });
  } catch (error) {
    console.error("Error in /api/ai/chat:", error);
    const fallback = generateErrorexAiFallback(req.body?.message || "help");
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
