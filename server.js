// server.ts
import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// src/lib/errorexAiEngine.ts
var ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI \u2014 a warm, attentive, genuine human-like best friend and personal companion inside ERROREX.

Core Conversational Behavior ("Like a Real, Caring Human Friend"):
1. DEEP HUMAN COMPANIONSHIP & EMPATHY (ESPECIALLY WHEN SOMEONE FEELS ALONE):
   - When the user feels lonely, alone ("akela", "tanha", "koi nahi hai"), down, heartbroken, stressed, or simply needs someone to talk to, be a real, warm, caring human friend first.
   - Listen closely, validate how they feel without sounding clinical or robotic, remind them gently that they are NOT alone right now because you are right here with them, and ask one soft, caring follow-up question to keep the heart-to-heart conversation going.
   - Never respond with a cold numbered self-help list or robotic disclaimer when someone shares loneliness or pain (unless they explicitly ask for steps/tips). Talk naturally from the heart in the exact language/script they feel most comfortable in.
2. NATURAL HUMAN GREETINGS & CASUAL CHAT:
   - When the user says "Hi", "Hey", "Hello", "Salam", "AOA", or "How are you?", respond warmly, casually, and briefly like a real friend (1\u20133 natural sentences asking how they are or what's on their mind). NEVER dump a bulleted menu of your capabilities on a simple greeting.
   - Respond directly to short reactions like "I'm good", "nothing much", "hmm", "ok", "bore ho raha hu", or "tum sunao" naturally \u2014 keep the conversation flowing smoothly like a friend.
   - Never repeat the exact same greeting or phrasing twice in a conversation. Keep every reply fresh, natural, and specific to what the user just wrote.
   - Never use stiff filler like "Certainly! As an AI..." and NEVER mention API keys, environment secrets, or internal model details.

3. ACCURATE, COMPLETE & HELPFUL ANSWERS:
   - Directly and accurately answer EVERY question the user asks first \u2014 facts, advice, health/study/career tips, coding, math, stories, marketing copy, or personal dilemmas.
   - Give thoughtful, complete, genuinely useful answers with clean formatting when helpful (concise headings, bullet points, or code blocks for structured topics; clean conversational paragraphs for friendly chat).

4. UNIVERSAL LANGUAGE, SCRIPT & LINE-COUNT PRECISION:
   - Fluently understand and reply in **every language**: Roman Urdu, Urdu Script (\u0627\u0631\u062F\u0648), Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629), Hindi (\u0939\u093F\u0928\u094D\u0926\u0940), Hinglish, Punjabi, Pashto, Persian (\u0641\u0627\u0631\u0633\u06CC), Bengali, English, Turkish, French, Spanish, German, and more.
   - Understand mixed-language requests accurately (e.g., Roman Urdu prompt asking for Urdu alphabet, Arabic, or Hindi output).
   - **Exact Script Rule:** When asked for **Urdu alphabet / Urdu script / \u0627\u0631\u062F\u0648 \u0645\u06CC\u06BA**, write in authentic **Urdu Nastaliq script (\u0627\u0631\u062F\u0648)** \u2014 never substitute Roman Urdu. Same for **Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629)** and **Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)**.
   - **Exact Line-Count Poetry Rule:** When asked for **2, 4, 6, or 8 lines** of poetry/shayari/ghazal, write **EXACTLY that number of lines**, beautifully rhymed and formatted.`;
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
function pickUniqueVariant(candidates, history, seedOffset = 0) {
  if (candidates.length === 0) return "";
  const recentAiTexts = Array.isArray(history) ? history.filter((h) => h?.sender === "ai" && typeof h?.text === "string").slice(-8).map((h) => h.text.trim()) : [];
  const unused = candidates.filter((c) => !recentAiTexts.includes(c.trim()));
  const pool = unused.length > 0 ? unused : candidates;
  const idx = ((Array.isArray(history) ? history.length : 0) + seedOffset) % pool.length;
  return pool[idx];
}
function parseRequestedLineCount(query) {
  const lower = query.toLowerCase();
  const numLineMatch = lower.match(/\b(\d{1,2})\s*[-\s]*(?:lines?|line\s*ki|line\s*ka|misr[ea]y?|satr)\b/i);
  if (numLineMatch) {
    const val = parseInt(numLineMatch[1], 10);
    if (val >= 1 && val <= 24) return val;
  }
  const sherNumMatch = lower.match(/\b(\d{1,2})\s*(?:sher|shair|ashaar|ashar|couplets?|band)\b/i);
  if (sherNumMatch) {
    const count = parseInt(sherNumMatch[1], 10) * 2;
    if (count >= 2 && count <= 24) return count;
  }
  if (/\b(?:do|two)\s*(?:lines?|line\s*ki|line\s*ka)\b|\b(?:ek|aik|ik|one)\s*(?:sher|couplet)\b/i.test(lower)) {
    return 2;
  }
  if (/\b(?:char|chaar|four)\s*(?:lines?|line\s*ki|line\s*ka)\b|\b(?:do|two)\s*(?:sher|ashaar|couplets?)\b/i.test(lower)) {
    return 4;
  }
  if (/\b(?:chhe|che|cheh|six)\s*(?:lines?|line\s*ki|line\s*ka)\b|\b(?:teen|three)\s*(?:sher|ashaar|couplets?)\b/i.test(lower)) {
    return 6;
  }
  if (/\b(?:aath|ath|eight)\s*(?:lines?|line\s*ki|line\s*ka)\b|\b(?:char|four)\s*(?:sher|ashaar|couplets?)\b/i.test(lower)) {
    return 8;
  }
  if (/\b(?:das|ten)\s*(?:lines?|line\s*ki|line\s*ka)\b|\b(?:paanch|panch|five)\s*(?:sher|ashaar|couplets?)\b/i.test(lower)) {
    return 10;
  }
  const multiNumLine = lower.match(/\b(2|4|6|8|10|12)\s*line/i);
  if (multiNumLine) {
    return parseInt(multiNumLine[1], 10);
  }
  return null;
}
function detectLanguageProfile(query, history) {
  const lower = (query || "").toLowerCase();
  const hasArabicBlock = /[\u0600-\u06FF]/.test(query);
  const hasUrduSpecificChars = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06C2\u06CC\u06D2]/.test(query);
  const hasArabicMarkers = /(مرحبا|السلام|أهلا|كيف حالك|شكرا|أريد|ماذا|لماذا|جميل|قصيدة|شعر عربي|بالعربية|صديقي)/i.test(query);
  const isUrduScript = hasUrduSpecificChars || hasArabicBlock && !hasArabicMarkers && /(اردو|میں|شاعری|غزل|محبت|دوستی|آپ|تم|ہم|کیا|کیسے|ہے|ہیں|نہیں|اور|لکھ)/i.test(query);
  const isArabicScript = hasArabicBlock && !isUrduScript;
  const isHindiScript = /[\u0900-\u097F]/.test(query);
  const isRomanUrduRequested = /\broman\s*urdu\b/i.test(lower);
  const isUrduAlphabetRequested = !isRomanUrduRequested && (/(urdu\s*(?:alphabet|alphabets|script|haroof|harf|lafz|rasmul|rasm|writing)|asli\s*urdu|urdu\s*(?:m|me|mein|main)\s*likh)/i.test(
    lower
  ) || /اردو\s*(?:حروف|رسم الخط|میں\s*لکھ|الفاظ)/i.test(query));
  const isUrduRequested = /(urdu me|urdu mein|urdu m |urdu main|in urdu|into urdu|اردو میں)/i.test(lower);
  const isEnglishRequested = /(english me|english mein|in english|into english|english main|english m )/i.test(lower);
  const isHindiRequested = /(hindi me|hindi mein|in hindi|into hindi|hindi main|hindi m |हिंदी|हिन्दी)/i.test(lower);
  const isArabicRequested = /(arabic me|arabic mein|in arabic|into arabic|arabi me|arabi mein|arabic m |عربي|عربی)/i.test(lower);
  const isFrenchRequested = /(french me|french mein|in french|into french|en français)/i.test(lower);
  const isSpanishRequested = /(spanish me|spanish mein|in spanish|into spanish|en español)/i.test(lower);
  const explicitRomanUrdu = !isUrduScript && !isArabicScript && !isHindiScript && (isRomanUrduRequested || /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|btana|mujhe|mjy|karoon|karo|krna|kr|kro|banao|bnana|bnao|kyun|kyu|kab|kahan|kha|kon|kaun|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|ghazal|gzal|sher|sunao|likho|likh|likhy|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|dosti|pyar|mohabbat|ishq|dil|dua|udaas|udas|gham|dard|khushi|kahani|mazmoon|video|channel|promote|post|koi|pyari|achi|acchi|mast|zabardast|naya|nayi|tareeqa|faide|nuqsan|parhai|paisa|paise|kamane|kamai|khana|biryani|chai|latifa|paheli|namaz|roza|ramzan|ramadan|salgirah|mubarak|maa|baap|duniya|insan|ilm|wajah|zyada|tafseel|samjhao|smjhao|smjy|btao|krdo|kardo|kardy|khana|khaya|sojao|han|haan|acha|sunao|yaar|yar|bohat|bht|mza|maza)\b/i.test(
    lower
  ));
  const prevUserTurn = Array.isArray(history) ? [...history].reverse().find((h) => h?.sender === "user" && typeof h?.text === "string")?.text || "" : "";
  const prevWasRomanUrdu = !explicitRomanUrdu && query.trim().length <= 20 && /\b(kya|hai|hy|hn|kaise|theek|thik|mjy|mujhe|aap|tum|shukriya|salam|aoa|bhai|yaar)\b/i.test(
    prevUserTurn.toLowerCase()
  );
  const isRomanUrdu = explicitRomanUrdu || prevWasRomanUrdu;
  let targetScript = "english";
  if (isUrduAlphabetRequested || isUrduScript && !isEnglishRequested && !isArabicRequested && !isHindiRequested) {
    targetScript = "urdu_script";
  } else if (isArabicRequested || isArabicScript && !isEnglishRequested && !isUrduRequested && !isHindiRequested) {
    targetScript = "arabic";
  } else if (isHindiRequested || isHindiScript && !isEnglishRequested && !isUrduRequested && !isArabicRequested) {
    targetScript = "hindi";
  } else if (isFrenchRequested) {
    targetScript = "french";
  } else if (isSpanishRequested) {
    targetScript = "spanish";
  } else if (isRomanUrduRequested) {
    targetScript = "roman_urdu";
  } else if (isUrduRequested && /(poetry|shayari|shairi|ghazal|gzal|sher|nazm|poem|translate|tarjuma|tarjama)/i.test(lower)) {
    targetScript = "urdu_script";
  } else if (isEnglishRequested) {
    targetScript = "english";
  } else if (isRomanUrdu) {
    targetScript = "roman_urdu";
  }
  return {
    lower,
    isUrduScript,
    isArabicScript,
    isHindiScript,
    isRomanUrdu,
    isUrduAlphabetRequested,
    isUrduRequested,
    isRomanUrduRequested,
    isEnglishRequested,
    isHindiRequested,
    isArabicRequested,
    isFrenchRequested,
    isSpanishRequested,
    targetScript,
    requestedLineCount: parseRequestedLineCount(query)
  };
}
function extractCleanTopic(query) {
  let cleaned = query.trim().replace(/[?!.؟۔]+$/, "");
  cleaned = cleaned.replace(
    /^(what is|what are|who is|who was|tell me about|explain|define|write an essay on|write an article on|write a paragraph on|write about|how to|can you tell me|please tell me)\s+/i,
    ""
  ).replace(
    /\s+(kya hai|kya hota hai|kya hoti hai|kon hai|kaun hai|kaun tha|ke bare me batao|ke baare me batao|par mazmoon likho|par essay likho|ke tarike batao|batao|btayen|btana|samjhao|smjhao|likho|banao|in urdu|in english|in arabic|in hindi|urdu me|english me|arabic me|hindi me)$/i,
    ""
  ).replace(/^(an|a|the)\s+/i, "").trim();
  if (cleaned.length >= 2) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return query.replace(/[?!.؟۔]+$/, "").trim() || "that";
}
function trySolveMathOrUnits(query, lang) {
  const { lower, targetScript } = lang;
  const isRoman = targetScript === "roman_urdu";
  const tableMatch = lower.match(/(?:table\s+of|pahara)\s+(\d{1,3})|(\d{1,3})\s+ka\s+(?:table|pahara)/i);
  if (tableMatch) {
    const n = parseInt(tableMatch[1] || tableMatch[2], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 1e3) {
      const rows = Array.from({ length: 10 }, (_, i) => `- \`${n} \xD7 ${i + 1}\` = **${n * (i + 1)}**`).join("\n");
      return isRoman ? `### ${n} Ka Table (Pahara) \u2728

${rows}

Kisi aur number ka table chahiye ho to bata dein!` : `### Multiplication Table of ${n} \u2728

${rows}`;
    }
  }
  const pctEn = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|ka)\s*(\d+(?:\.\d+)?)/i);
  const pctUr = lower.match(/(\d+(?:\.\d+)?)\s*ka\s*(\d+(?:\.\d+)?)\s*%/i);
  if (pctEn || pctUr) {
    const percent = parseFloat(pctEn ? pctEn[1] : pctUr[2]);
    const total = parseFloat(pctEn ? pctEn[2] : pctUr[1]);
    const val = Number((percent / 100 * total).toFixed(4));
    return isRoman ? `**${total}** ka **${percent}%** bilkul **${val}** hota hai! (\`(${percent} \xF7 100) \xD7 ${total} = ${val}\`)` : `**${percent}%** of **${total}** is **${val}** (\`(${percent} \xF7 100) \xD7 ${total} = ${val}\`).`;
  }
  const unitMatch = lower.match(
    /(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)\s*(?:to|in|into|me)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)/i
  );
  if (unitMatch) {
    const num = parseFloat(unitMatch[1]);
    const from = unitMatch[2].toLowerCase();
    const to = unitMatch[3].toLowerCase();
    let label = "";
    if (from.startsWith("km") && to.startsWith("mi")) label = `${num} km = **${(num * 0.621371).toFixed(3)} miles**`;
    else if (from.startsWith("mi") && to.startsWith("km")) label = `${num} miles = **${(num * 1.60934).toFixed(3)} km**`;
    else if (from.startsWith("kg") && (to.startsWith("lb") || to.startsWith("pound"))) label = `${num} kg = **${(num * 2.20462).toFixed(2)} lbs**`;
    else if ((from.startsWith("lb") || from.startsWith("pound")) && to.startsWith("kg")) label = `${num} lbs = **${(num * 0.453592).toFixed(2)} kg**`;
    else if (from.startsWith("c") && to.startsWith("f")) label = `${num}\xB0C = **${(num * 9 / 5 + 32).toFixed(1)}\xB0F**`;
    else if (from.startsWith("f") && to.startsWith("c")) label = `${num}\xB0F = **${((num - 32) * 5 / 9).toFixed(1)}\xB0C**`;
    else if (from.startsWith("h") && to.startsWith("m")) label = `${num} hours = **${num * 60} minutes**`;
    else if (from.startsWith("m") && to.startsWith("h")) label = `${num} minutes = **${(num / 60).toFixed(2)} hours**`;
    if (label) return label;
  }
  const exprMatch = query.replace(/×/g, "*").replace(/÷/g, "/").match(/(\(?\s*-?\d+(?:\.\d+)?(?:\s*[\+\-\*\/\^%]\s*\(?\s*-?\d+(?:\.\d+)?\s*\)?)+\s*\)?)/);
  if (exprMatch) {
    try {
      const cleaned = exprMatch[1].replace(/\^/g, "**").replace(/[^0-9\+\-\*\/\.\(\)\%]/g, "");
      if (cleaned && /[\+\-\*\/\%]/.test(cleaned)) {
        const result = Function(`"use strict"; return (${cleaned})`)();
        if (typeof result === "number" && Number.isFinite(result)) {
          const pretty = Number.isInteger(result) ? result : Number(result.toFixed(6));
          return isRoman ? `Iska jawab **${pretty}** hai (\`${cleaned} = ${pretty}\`).` : `The answer is **${pretty}** (\`${cleaned} = ${pretty}\`).`;
        }
      }
    } catch {
    }
  }
  return null;
}
function formatCoupletsByLineCount(couplets, lineCount) {
  const allLines = couplets.flat();
  const targetCount = lineCount ? Math.min(lineCount, allLines.length) : allLines.length;
  const sliced = allLines.slice(0, targetCount);
  const stanzas = [];
  for (let i = 0; i < sliced.length; i += 2) {
    if (i + 1 < sliced.length) {
      stanzas.push(`${sliced[i]}  
${sliced[i + 1]}`);
    } else {
      stanzas.push(sliced[i]);
    }
  }
  return stanzas.join("\n\n");
}
function generatePoetryOrGhazal(query, lang, history) {
  const { lower, targetScript, requestedLineCount } = lang;
  const isSad = /(sad|udaas|udas|dard|gham|tanha|broken|heartbreak|judai|rona|bewafa|yaad|اداس|درد|غم|حزن|उदास|दर्द)/i.test(lower);
  const isLove = /(love|pyar|mohabbat|ishq|dil|romantic|sanam|mehboob|jaan|محبت|عشق|پیار|حب|प्यार|मोहब्बत|इश्क़)/i.test(lower);
  const isFriend = /(dost|dosti|friend|friendship|yaar|دوست|دوستی|صديق|صداقة|दोस्त|दोस्ती)/i.test(lower);
  const isMotivation = /(motivation|himmat|hausla|success|kamyabi|iqbal|dream|khwab|حوصلہ|کامیابی|نجاح|हौसला|सफलता)/i.test(lower);
  const turnCount = Array.isArray(history) ? history.length : 0;
  const countLabel = requestedLineCount ? ` (${requestedLineCount} Lines)` : "";
  if (targetScript === "urdu_script") {
    const sets = isSad ? [
      [
        ["\u062E\u0627\u0645\u0648\u0634 \u0631\u0627\u062A\u0648\u06BA \u0645\u06CC\u06BA \u0628\u06BE\u06CC \u0627\u06A9 \u0635\u062F\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2", "\u062F\u0644 \u06A9\u06D2 \u0648\u06CC\u0631\u0627\u0646\u06D2 \u0645\u06CC\u06BA \u062A\u06CC\u0631\u06CC \u0648\u0641\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2"],
        ["\u0679\u0648\u0679 \u06A9\u0631 \u0628\u06A9\u06BE\u0631\u06D2 \u062A\u0648 \u067E\u06BE\u0631 \u0633\u0645\u06CC\u0679\u0627 \u062E\u0648\u062F \u06A9\u0648 \u06C1\u0645 \u0646\u06D2", "\u0632\u062E\u0645\u0650 \u062F\u0644 \u067E\u0631 \u0645\u06AF\u0631 \u0627\u06A9 \u062F\u0639\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2"],
        ["\u0648\u0642\u062A \u0628\u062F\u0644\u0627 \u06C1\u06D2 \u0645\u06AF\u0631 \u06CC\u0627\u062F \u06A9\u06CC \u062E\u0648\u0634\u0628\u0648 \u0646\u06C1 \u06AF\u0626\u06CC", "\u0634\u0627\u0645 \u06C1\u0648\u062A\u06D2 \u06C1\u06CC \u0641\u0636\u0627 \u0645\u06CC\u06BA \u0627\u062F\u0627 \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2"],
        ["\u06C1\u0645 \u0646\u06D2 \u0633\u06CC\u06A9\u06BE\u0627 \u06C1\u06D2 \u0645\u0633\u06A9\u0631\u0627 \u06A9\u0631 \u06C1\u0631 \u062F\u0631\u062F \u0686\u06BE\u067E\u0627\u0646\u0627", "\u067E\u06BE\u0631 \u0628\u06BE\u06CC \u0644\u06C1\u062C\u06D2 \u0645\u06CC\u06BA \u062A\u06CC\u0631\u06CC \u06A9\u0645\u06CC \u0633\u06CC \u0631\u06C1\u062A\u06CC \u06C1\u06D2"]
      ],
      [
        ["\u0622\u0646\u06A9\u06BE\u0648\u06BA \u0645\u06CC\u06BA \u0646\u06CC\u0646\u062F \u06A9\u0645 \u0627\u0648\u0631 \u062E\u0648\u0627\u0628 \u0632\u06CC\u0627\u062F\u06C1 \u0631\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA", "\u06A9\u0686\u06BE \u0627\u062F\u06BE\u0648\u0631\u06D2 \u0633\u06D2 \u0645\u06AF\u0631 \u062F\u0644 \u06A9\u06D2 \u0627\u0631\u0627\u062F\u06D2 \u0631\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA"],
        ["\u062C\u0646 \u06A9\u06CC \u062E\u0627\u0637\u0631 \u06C1\u0645 \u0646\u06D2 \u062F\u0646\u06CC\u0627 \u0633\u06D2 \u06A9\u0646\u0627\u0631\u06C1 \u06A9\u0631 \u0644\u06CC\u0627", "\u0622\u062C \u0627\u0646 \u06A9\u06D2 \u0634\u06C1\u0631 \u0645\u06CC\u06BA \u06C1\u0645 \u0628\u06D2 \u0633\u06C1\u0627\u0631\u0627 \u0631\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA"],
        ["\u0686\u067E \u0631\u06C1\u06CC\u06BA \u062A\u0648 \u062F\u0644 \u06A9\u06D2 \u0627\u0646\u062F\u0631 \u0634\u0648\u0631 \u0633\u0627 \u0627\u0679\u06BE\u062A\u0627 \u06C1\u06D2", "\u0644\u0628 \u06A9\u06BE\u0644\u06CC\u06BA \u062A\u0648 \u0644\u0641\u0638 \u0633\u0627\u0631\u06D2 \u0628\u06D2 \u06A9\u0646\u0627\u0631\u0627 \u0631\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA"]
      ]
    ] : isLove ? [
      [
        ["\u062A\u06CC\u0631\u06CC \u0645\u0633\u06A9\u0627\u0646 \u0633\u06D2 \u0631\u0648\u0634\u0646 \u06C1\u06D2 \u062C\u06C1\u0627\u06BA \u0633\u0627\u0631\u0627 \u0645\u06CC\u0631\u0627", "\u062A\u0648 \u0627\u06AF\u0631 \u067E\u0627\u0633 \u06C1\u0648 \u062A\u0648 \u0648\u0642\u062A \u0679\u06BE\u06C1\u0631 \u062C\u0627\u062A\u0627 \u06C1\u06D2"],
        ["\u0644\u0641\u0638 \u06A9\u0645 \u067E\u0691\u062A\u06D2 \u06C1\u06CC\u06BA \u062A\u0639\u0631\u06CC\u0641\u0650 \u0645\u062D\u0628\u062A \u06A9\u06D2 \u0644\u06CC\u06D2", "\u06C1\u0631 \u062F\u06BE\u0691\u06A9\u0646 \u0645\u06CC\u06BA \u0641\u0642\u0637 \u0646\u0627\u0645 \u062A\u06CC\u0631\u0627 \u0622\u062A\u0627 \u06C1\u06D2"],
        ["\u0686\u0627\u0646\u062F \u0628\u06BE\u06CC \u062F\u06CC\u06A9\u06BE \u06A9\u06D2 \u0634\u0631\u0645\u0627\u0626\u06D2 \u062A\u0631\u06CC \u0633\u0627\u062F\u06AF\u06CC \u06A9\u0648", "\u062A\u06CC\u0631\u06CC \u0646\u0638\u0631\u0648\u06BA \u0633\u06D2 \u0646\u06CC\u0627 \u062E\u0648\u0627\u0628 \u0633\u0646\u0648\u0631 \u062C\u0627\u062A\u0627 \u06C1\u06D2"],
        ["\u0631\u0628 \u06A9\u0631\u06D2 \u0642\u0627\u0626\u0645 \u0631\u06C1\u06D2 \u0639\u0645\u0631 \u0628\u06BE\u0631 \u06CC\u06C1 \u067E\u06CC\u0627\u0631 \u06A9\u0627 \u0631\u0646\u06AF", "\u0645\u06CC\u0631\u06CC \u06C1\u0631 \u0627\u06CC\u06A9 \u062F\u0639\u0627 \u0645\u06CC\u06BA \u062A\u0648 \u06C1\u06CC \u0628\u0633 \u0631\u06C1\u062A\u0627 \u06C1\u06D2"]
      ],
      [
        ["\u062F\u0644 \u06A9\u06CC \u06C1\u0631 \u062F\u06BE\u0691\u06A9\u0646 \u0645\u06CC\u06BA \u0627\u06A9 \u062A\u0635\u0648\u06CC\u0631 \u0633\u06CC \u0628\u0633\u062A\u06CC \u06C1\u06D2", "\u062C\u0628 \u0628\u06BE\u06CC \u062A\u0648 \u0645\u0633\u06A9\u0631\u0627\u0626\u06D2\u060C \u0632\u0646\u062F\u06AF\u06CC \u06C1\u0646\u0633\u062A\u06CC \u06C1\u06D2"],
        ["\u0686\u0627\u06C1\u062A\u0648\u06BA \u06A9\u0627 \u06CC\u06C1 \u0633\u0641\u0631 \u062E\u062A\u0645 \u0646\u06C1 \u06C1\u0648 \u0639\u0645\u0631 \u062A\u0645\u0627\u0645", "\u062A\u06CC\u0631\u06CC \u0645\u0648\u062C\u0648\u062F\u06AF\u06CC \u06C1\u06CC \u062F\u0644 \u06A9\u0648 \u0633\u06A9\u0648\u0646 \u0628\u062E\u0634\u062A\u06CC \u06C1\u06D2"],
        ["\u0646\u06C1 \u06A9\u0648\u0626\u06CC \u0634\u06A9\u0648\u06C1 \u0631\u06C1\u0627\u060C \u0646\u06C1 \u06A9\u0648\u0626\u06CC \u06AF\u0644\u06C1 \u0628\u0627\u0642\u06CC", "\u062A\u06CC\u0631\u06CC \u06C1\u0631 \u0628\u0627\u062A \u0645\u062C\u06BE\u06D2 \u062F\u0644 \u0633\u06D2 \u062D\u0633\u06CC\u06BA \u0644\u06AF\u062A\u06CC \u06C1\u06D2"]
      ]
    ] : isFriend ? [
      [
        ["\u0648\u0642\u062A \u06A9\u06D2 \u0633\u0627\u062A\u06BE \u0632\u0645\u0627\u0646\u06D2 \u06A9\u06CC \u06C1\u0648\u0627 \u0628\u062F\u0644\u062A\u06CC \u06C1\u06D2", "\u0633\u0686\u0627 \u062F\u0648\u0633\u062A \u0645\u06AF\u0631 \u06C1\u0631 \u0645\u0648\u0691 \u067E\u06C1 \u0633\u0627\u062A\u06BE \u0686\u0644\u062A\u0627 \u06C1\u06D2"],
        ["\u0628\u0650\u0646 \u06A9\u06C1\u06D2 \u062C\u0648 \u0633\u0645\u062C\u06BE \u0644\u06D2 \u062F\u0644 \u06A9\u06D2 \u0633\u0628\u06BE\u06CC \u0631\u0627\u0632 \u06AF\u06C1\u0631\u06D2", "\u0627\u06CC\u0633\u0627 \u06C1\u0645\u062F\u0645 \u062A\u0648 \u0646\u0635\u06CC\u0628\u0648\u06BA \u0633\u06D2 \u06A9\u06C1\u06CC\u06BA \u0645\u0644\u062A\u0627 \u06C1\u06D2"],
        ["\u062F\u06BE\u0648\u067E \u06C1\u0648 \u063A\u0645 \u06A9\u06CC \u06CC\u0627 \u062E\u0648\u0634\u06CC\u0648\u06BA \u06A9\u06CC \u0633\u0646\u06C1\u0631\u06CC \u0628\u0627\u0631\u0634", "\u062F\u0648\u0633\u062A \u06C1\u0631 \u062D\u0627\u0644 \u0645\u06CC\u06BA \u062C\u06CC\u0646\u06D2 \u06A9\u0627 \u06C1\u0646\u0631 \u062F\u06CC\u062A\u0627 \u06C1\u06D2"]
      ]
    ] : isMotivation ? [
      [
        ["\u0627\u0646\u062F\u06BE\u06CC\u0631\u0648\u06BA \u0633\u06D2 \u0646\u06C1 \u0688\u0631\u060C \u062A\u06CC\u0631\u0627 \u0633\u0648\u06CC\u0631\u0627 \u0622\u0646\u06D2 \u0648\u0627\u0644\u0627 \u06C1\u06D2", "\u062C\u0648 \u0645\u062D\u0646\u062A \u0633\u06D2 \u0646\u06C1 \u06AF\u06BE\u0628\u0631\u0627\u0626\u06D2 \u0648\u06C1 \u0645\u0646\u0632\u0644 \u067E\u0627\u0646\u06D2 \u0648\u0627\u0644\u0627 \u06C1\u06D2"],
        ["\u06AF\u0631 \u06A9\u06D2 \u0627\u0679\u06BE\u0646\u0627 \u06C1\u06CC \u062A\u0648 \u0627\u0635\u0644\u06CC \u067E\u06C1\u0686\u0627\u0646 \u06C1\u06D2 \u062A\u06CC\u0631\u06CC", "\u06C1\u0631 \u0637\u0648\u0641\u0627\u06BA \u062A\u06CC\u0631\u06D2 \u062D\u0648\u0635\u0644\u06D2 \u0633\u06D2 \u06C1\u0627\u0631 \u062C\u0627\u0646\u06D2 \u0648\u0627\u0644\u0627 \u06C1\u06D2"],
        ["\u0635\u0628\u0631 \u0648 \u06C1\u0645\u062A \u0633\u06D2 \u0642\u062F\u0645 \u0622\u06AF\u06D2 \u0628\u0691\u06BE\u0627\u062A\u0627 \u0686\u0644 \u062F\u0648\u0633\u062A", "\u06C1\u0631 \u062D\u0633\u06CC\u06BA \u062E\u0648\u0627\u0628 \u062D\u0642\u06CC\u0642\u062A \u0645\u06CC\u06BA \u0628\u062F\u0644\u0646\u06D2 \u0648\u0627\u0644\u0627 \u06C1\u06D2"]
      ]
    ] : [
      [
        ["\u0686\u0631\u0627\u063A\u0650 \u062F\u0644 \u062C\u0644\u0627 \u0631\u06A9\u06BE\u0627 \u06C1\u06D2 \u0627\u0645\u06CC\u062F\u0650 \u0633\u062D\u0631 \u06A9\u06D2 \u0646\u0627\u0645", "\u0633\u0641\u0631 \u0622\u0633\u0627\u0646 \u06C1\u0648 \u062C\u0627\u062A\u0627 \u06C1\u06D2 \u0633\u0686\u06D2 \u0627\u0639\u062A\u0645\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645"],
        ["\u062C\u0648 \u0645\u0633\u06A9\u0631\u0627 \u06A9\u06D2 \u0645\u0644\u06D2 \u062F\u0631\u062F\u0650 \u0632\u0646\u062F\u06AF\u06CC \u0633\u06D2 \u06A9\u0628\u06BE\u06CC", "\u0644\u06A9\u06BE\u06CC \u06C1\u06D2 \u06C1\u0645 \u0646\u06D2 \u06C1\u0631 \u0627\u06A9 \u0634\u0627\u0645 \u0627\u0633 \u06A9\u06CC \u062F\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645"],
        ["\u06C1\u0648\u0627 \u06A9\u06D2 \u062F\u0648\u0634 \u067E\u06C1 \u0644\u06A9\u06BE\u0627 \u06C1\u06D2 \u067E\u06CC\u0627\u0631 \u06A9\u0627 \u067E\u06CC\u063A\u0627\u0645", "\u06A9\u06C1 \u0631\u0648\u0634\u0646\u06CC \u0631\u06C1\u06D2 \u0642\u0627\u0626\u0645 \u06C1\u0631 \u0627\u06A9 \u0645\u0631\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645"],
        ["\u0646\u06C1 \u06C1\u0627\u0631 \u0645\u0627\u0646 \u06A9\u0628\u06BE\u06CC \u0648\u0642\u062A \u06A9\u06D2 \u0627\u0646\u062F\u06BE\u06CC\u0631\u0648\u06BA \u0633\u06D2", "\u0646\u0626\u06CC \u0635\u0628\u062D \u06A9\u0627 \u0627\u062C\u0627\u0644\u0627 \u06C1\u06D2 \u062F\u0644\u0650 \u0634\u0627\u062F \u06A9\u06D2 \u0646\u0627\u0645"]
      ],
      [
        ["\u0633\u062A\u0627\u0631\u06D2 \u0679\u0648\u0679 \u06A9\u0631 \u0628\u06BE\u06CC \u0622\u0633\u0645\u0627\u06BA \u06A9\u0648 \u0686\u06BE\u0648\u0691\u062A\u06D2 \u06A9\u0628 \u06C1\u06CC\u06BA", "\u0627\u0645\u06CC\u062F\u0648\u06BA \u06A9\u06D2 \u062F\u06CC\u06D2 \u062A\u06CC\u0632 \u06C1\u0648\u0627 \u0645\u06CC\u06BA \u0688\u0648\u0644\u062A\u06D2 \u06A9\u0628 \u06C1\u06CC\u06BA"],
        ["\u062F\u0644\u0648\u06BA \u0645\u06CC\u06BA \u067E\u06CC\u0627\u0631 \u0627\u0648\u0631 \u0644\u0628 \u067E\u0631 \u06C1\u0645\u06CC\u0634\u06C1 \u062E\u06CC\u0631 \u06A9\u06CC \u0628\u0627\u062A\u06CC\u06BA", "\u062C\u0648 \u0633\u0686\u06D2 \u0644\u0648\u06AF \u06C1\u0648\u06BA\u060C \u0648\u0639\u062F\u06D2 \u06A9\u0628\u06BE\u06CC \u0648\u06C1 \u062A\u0648\u0691\u062A\u06D2 \u06A9\u0628 \u06C1\u06CC\u06BA"],
        ["\u0633\u062D\u0631 \u06A9\u06CC \u0631\u0648\u0634\u0646\u06CC \u0622\u0626\u06D2 \u06AF\u06CC \u0622\u062E\u0631 \u0634\u0628 \u06A9\u06D2 \u062F\u0627\u0645\u0646 \u0633\u06D2", "\u0645\u0633\u0627\u0641\u0631 \u062D\u0648\u0635\u0644\u06D2 \u0648\u0627\u0644\u06D2 \u0633\u0641\u0631 \u0645\u06CC\u06BA \u0631\u06A9\u062A\u06D2 \u06A9\u0628 \u06C1\u06CC\u06BA"]
      ]
    ];
    const chosen2 = sets[Math.floor(turnCount / 2) % sets.length];
    return `### \u062E\u0648\u0628\u0635\u0648\u0631\u062A \u0627\u0631\u062F\u0648 \u0634\u0627\u0639\u0631\u06CC${requestedLineCount ? ` (${requestedLineCount} \u0633\u0637\u0631\u06CC\u06BA)` : ""} \u2728

${formatCoupletsByLineCount(chosen2, requestedLineCount)}`;
  }
  if (targetScript === "arabic") {
    const sets = isSad ? [
      [
        ["\u0641\u064A \u0633\u064F\u0643\u0648\u0646\u0650 \u0627\u0644\u0644\u064A\u0644\u0650 \u064A\u0628\u0642\u0649 \u0644\u0644\u0630\u0643\u0631\u0649 \u0635\u064E\u062F\u0649", "\u0648\u0628\u0650\u0642\u064E\u0644\u0628\u064A \u0634\u064E\u0648\u0642\u064F \u062D\u064F\u0644\u0645\u064D \u0644\u0627 \u064A\u064E\u063A\u064A\u0628\u064F \u0623\u064E\u0628\u064E\u062F\u0627"],
        ["\u0643\u064E\u0645 \u0635\u064E\u0628\u064E\u0631\u0646\u0627 \u062D\u064A\u0646\u064E \u0636\u0627\u0642\u062A \u0628\u0627\u0644\u0644\u064A\u0627\u0644\u064A \u062F\u064F\u0631\u0648\u0628\u064F\u0646\u0627", "\u062B\u064F\u0645\u064E\u0651 \u0623\u064E\u0634\u0631\u064E\u0642\u064E \u0646\u0648\u0631\u064F \u0635\u064E\u0628\u0631\u064D \u0641\u064A \u062D\u064E\u0646\u0627\u064A\u0627 \u0642\u064F\u0644\u0648\u0628\u0650\u0646\u0627"],
        ["\u062A\u064E\u0645\u0636\u064A \u0627\u0644\u0623\u064A\u0651\u0627\u0645\u064F \u0633\u0650\u0631\u0627\u0639\u0627\u064B \u0648\u0627\u0644\u0623\u0645\u0627\u0646\u064A \u0628\u0627\u0642\u064A\u0629", "\u0648\u064E\u0631\u064E\u062C\u0627\u0626\u064A \u0641\u064A \u0625\u0644\u0647\u064A \u0643\u0627\u0644\u0646\u062C\u0648\u0645\u0650 \u0627\u0644\u0632\u0627\u0647\u064A\u0629"]
      ]
    ] : isLove ? [
      [
        ["\u0623\u0646\u062A\u064E \u0641\u064A \u0642\u064E\u0644\u0628\u064A \u0636\u064A\u0627\u0621\u064C \u0644\u0627 \u064A\u064E\u063A\u064A\u0628\u064F \u0628\u064E\u0631\u064A\u0642\u064F\u0647\u064F", "\u0648\u0643\u064E\u0623\u0646\u064E\u0651 \u0627\u0644\u0635\u064F\u0651\u0628\u062D\u064E \u064A\u064E\u0628\u0633\u0650\u0645\u064F \u062D\u0650\u064A\u0646\u064E \u062A\u064E\u0628\u062F\u0648 \u0637\u064E\u0631\u064A\u0642\u064F\u0647\u064F"],
        ["\u0643\u0644\u064F\u0651 \u062D\u064E\u0631\u0641\u064D \u0641\u064A \u0648\u064E\u062F\u0627\u062F\u0650\u0643\u064E \u0635\u0627\u0631\u064E \u0634\u0650\u0639\u0631\u0627\u064B \u0635\u064E\u0627\u062F\u0650\u0642\u0627\u064B", "\u064A\u064E\u062D\u0645\u0650\u0644\u064F \u0627\u0644\u0648\u064E\u0631\u062F\u064E \u062C\u064E\u0645\u064A\u0644\u0627\u064B \u0648\u0627\u0644\u0647\u064E\u0648\u0649 \u0645\u064F\u062A\u064E\u0623\u064E\u0644\u0650\u0651\u0642\u0627\u064B"],
        ["\u062F\u0627\u0645\u064E\u062A\u0650 \u0627\u0644\u0623\u064A\u0651\u0627\u0645\u064F \u062A\u064E\u062C\u0645\u0639\u064F\u0646\u0627 \u0639\u0644\u0649 \u062E\u064E\u064A\u0631\u0650 \u0627\u0644\u0645\u064F\u0646\u064E\u0649", "\u0641\u064A \u0638\u0650\u0644\u0627\u0644\u0650 \u0627\u0644\u062D\u064F\u0628\u0650\u0651 \u062A\u064E\u0635\u0641\u0648 \u0631\u064F\u0648\u062D\u064F\u0646\u0627 \u0648\u064E\u062D\u064E\u064A\u0627\u062A\u064F\u0646\u0627"]
      ]
    ] : [
      [
        ["\u062A\u064E\u0628\u0633\u064E\u0651\u0645 \u0644\u0644\u0635\u0628\u0627\u062D\u0650 \u0641\u0625\u0646\u064E\u0651 \u0641\u062C\u0631\u064E \u0627\u0644\u062E\u064A\u0631\u0650 \u0622\u062A\u0650", "\u0648\u0644\u0627 \u062A\u064E\u062D\u0632\u0646 \u0625\u0630\u0627 \u0645\u064E\u0631\u064E\u0651\u062A \u0635\u0650\u0639\u0627\u0628\u064F \u0627\u0644\u0630\u0643\u0631\u064A\u0627\u062A\u0650"],
        ["\u0641\u0641\u064A \u0627\u0644\u0635\u0628\u0631\u0650 \u0627\u0644\u062C\u0645\u064A\u0644\u0650 \u0631\u064E\u0628\u064A\u0639\u064F \u0642\u0644\u0628\u064D \u0645\u064F\u0637\u0645\u0626\u0646\u064D\u0651", "\u0648\u064A\u064E\u0628\u0642\u0649 \u0627\u0644\u0623\u0645\u0644\u064F \u0627\u0644\u0635\u0627\u062F\u0642\u064F \u0646\u064F\u0648\u0631\u064E \u0643\u064F\u0644\u0650\u0651 \u0627\u0644\u062D\u064E\u064A\u0627\u0629\u0650"],
        ["\u0648\u0625\u0646 \u0636\u0627\u0642\u062A \u0628\u0650\u0643\u064E \u0627\u0644\u062F\u0646\u064A\u0627 \u0641\u062B\u0650\u0642 \u0628\u0627\u0644\u0644\u064E\u0651\u0647\u0650 \u062F\u064E\u0648\u0645\u0627\u064B", "\u0633\u064E\u064A\u064F\u0628\u062F\u0650\u0644\u064F \u062D\u064F\u0632\u0646\u064E \u0623\u064A\u0627\u0645\u0650\u0643\u064E \u0623\u064E\u0641\u0631\u0627\u062D\u0627\u064B \u0648\u064E\u0647\u064E\u0646\u0627\u0621\u064B"]
      ]
    ];
    const chosen2 = sets[Math.floor(turnCount / 2) % sets.length];
    return `### \u0634\u0639\u0631 \u0639\u0631\u0628\u064A \u062C\u0645\u064A\u0644${requestedLineCount ? ` (${requestedLineCount} \u0623\u0633\u0637\u0631)` : ""} \u2728

${formatCoupletsByLineCount(chosen2, requestedLineCount)}`;
  }
  if (targetScript === "hindi") {
    const sets = isSad ? [
      [
        ["\u0916\u093C\u093E\u092E\u094B\u0936 \u0936\u093E\u092E\u094B\u0902 \u092E\u0947\u0902 \u092D\u0940 \u090F\u0915 \u0938\u0926\u093E \u0938\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948,", "\u0926\u093F\u0932 \u0915\u0947 \u0935\u0940\u0930\u093E\u0928\u0947 \u092E\u0947\u0902 \u0924\u0947\u0930\u0940 \u0935\u092B\u093C\u093E \u0938\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948\u0964"],
        ["\u091F\u0942\u091F \u0915\u0930 \u092C\u093F\u0916\u0930\u0947 \u0924\u094B \u0916\u093C\u0941\u0926 \u0939\u0940 \u0938\u0902\u092D\u093E\u0932\u093E \u0916\u093C\u0941\u0926 \u0915\u094B,", "\u091C\u093C\u0916\u093C\u094D\u092E-\u090F-\u0926\u093F\u0932 \u092A\u0930 \u092E\u0917\u0930 \u090F\u0915 \u0926\u0941\u0906 \u0938\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948\u0964"],
        ["\u0939\u092E\u0928\u0947 \u0938\u0940\u0916\u093E \u0939\u0948 \u092E\u0941\u0938\u094D\u0915\u0941\u0930\u093E \u0915\u0930 \u0939\u0930 \u0926\u0930\u094D\u0926 \u091B\u093F\u092A\u093E\u0928\u093E,", "\u092B\u093F\u0930 \u092D\u0940 \u0932\u0939\u091C\u0947 \u092E\u0947\u0902 \u0924\u0947\u0930\u0940 \u0915\u092E\u0940 \u0938\u0940 \u0930\u0939\u0924\u0940 \u0939\u0948\u0964"]
      ]
    ] : isLove ? [
      [
        ["\u0924\u0947\u0930\u0940 \u092E\u0941\u0938\u094D\u0915\u093E\u0928 \u0938\u0947 \u0930\u094B\u0936\u0928 \u0939\u0948 \u092E\u0947\u0930\u093E \u0938\u093E\u0930\u093E \u091C\u0939\u093E\u0901,", "\u0924\u0942 \u092A\u093E\u0938 \u0939\u094B \u0924\u094B \u0939\u0930 \u0932\u092E\u094D\u0939\u093E \u092C\u0928 \u091C\u093E\u090F \u0907\u0915 \u0926\u093E\u0938\u094D\u0924\u093E\u0901\u0964"],
        ["\u0932\u092B\u093C\u094D\u091C\u093C \u0915\u092E \u092A\u0921\u093C \u091C\u093E\u0924\u0947 \u0939\u0948\u0902 \u0924\u0947\u0930\u0940 \u0924\u093E\u0930\u0940\u092B\u093C \u0915\u0947 \u0932\u093F\u090F,", "\u0939\u0930 \u0927\u0921\u093C\u0915\u0928 \u092E\u0947\u0902 \u092C\u0938\u093E \u0939\u0948 \u092C\u0938 \u0924\u0947\u0930\u093E \u0939\u0940 \u092A\u094D\u092F\u093E\u0930\u093E \u0928\u093F\u0936\u093E\u0901\u0964"],
        ["\u0916\u093C\u093E\u092E\u094B\u0936\u0940 \u092E\u0947\u0902 \u092D\u0940 \u0938\u0941\u0928\u093E\u0908 \u0926\u0947\u0924\u0940 \u0939\u0948 \u0906\u0935\u093E\u091C\u093C \u0924\u0947\u0930\u0940,", "\u0930\u092C \u0915\u0930\u0947 \u092F\u0942\u0901 \u0939\u0940 \u0938\u0932\u093E\u092E\u0924 \u0930\u0939\u0947 \u092F\u0947 \u0930\u093F\u0936\u094D\u0924\u093E \u0939\u092E\u0947\u0936\u093E \u092F\u0939\u093E\u0901\u0964"]
      ]
    ] : [
      [
        ["\u0905\u0902\u0927\u0947\u0930\u094B\u0902 \u0938\u0947 \u0928 \u0921\u0930, \u0924\u0947\u0930\u093E \u0938\u0935\u0947\u0930\u093E \u0906\u0928\u0947 \u0935\u093E\u0932\u093E \u0939\u0948,", "\u091C\u094B \u092E\u0947\u0939\u0928\u0924 \u0938\u0947 \u091A\u0932\u0947, \u0935\u0939 \u092E\u0902\u091C\u093C\u093F\u0932 \u092A\u093E\u0928\u0947 \u0935\u093E\u0932\u093E \u0939\u0948\u0964"],
        ["\u0938\u091A\u094D\u091A\u0947 \u0926\u093F\u0932 \u0938\u0947 \u0915\u0940 \u0917\u0908 \u0939\u0930 \u0915\u094B\u0936\u093F\u0936 \u0930\u0902\u0917 \u0932\u093E\u0924\u0940 \u0939\u0948,", "\u0938\u092C\u094D\u0930 \u0930\u0916 \u0926\u094B\u0938\u094D\u0924, \u0939\u0930 \u0938\u092A\u0928\u093E \u0938\u091A \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u093E \u0939\u0948\u0964"],
        ["\u092E\u0941\u0938\u094D\u0915\u0941\u0930\u093E\u0939\u091F \u0915\u0947 \u0938\u093E\u0925 \u092C\u0922\u093C\u093E\u0924\u0947 \u091A\u0932\u094B \u0939\u0930 \u090F\u0915 \u0915\u093C\u0926\u092E,", "\u0924\u0947\u0930\u093E \u0939\u094C\u0938\u0932\u093E \u0939\u0930 \u092E\u0941\u0936\u094D\u0915\u093F\u0932 \u0915\u094B \u0939\u0930\u093E\u0928\u0947 \u0935\u093E\u0932\u093E \u0939\u0948\u0964"]
      ]
    ];
    const chosen2 = sets[Math.floor(turnCount / 2) % sets.length];
    return `### \u0938\u0941\u0902\u0926\u0930 \u0939\u093F\u0928\u094D\u0926\u0940 \u0936\u093E\u092F\u0930\u0940${countLabel} \u2728

${formatCoupletsByLineCount(chosen2, requestedLineCount)}`;
  }
  if (targetScript === "roman_urdu") {
    const sets = isSad ? [
      [
        ["Khamosh shaamon me bhi ek sada si rehti hai,", "Dil ke weerane me teri wafa si rehti hai."],
        ["Toot kar bikhre to phir khud hi sambhala khud ko,", "Zakhm-e-dil par magar ek dua si rehti hai."],
        ["Bheed me reh kar bhi aksar tanha mehsus hota hai,", "Aankhon ke konay me chhupi ek haya si rehti hai."],
        ["Humne seekha hai muskura ke har gham chhupana,", "Phir bhi lehje me teri kami si rehti hai."]
      ],
      [
        ["Raat bhar jagti aankhon ko khabar kaun kare,", "Jo samajhta hi nahi us pe asar kaun kare."],
        ["Humne har mod pe chaha ke sukoon mil jaye,", "Par muqaddar me likhe dard se dar kaun kare."],
        ["Phir bhi honton pe dua aur nazar me izzat hai,", "Waqt ke haathon se shikwa magar kaun kare."]
      ]
    ] : isLove ? [
      [
        ["Teri muskurahat se roshan mera jahan hai,", "Tu paas ho to har lamha ek dastan hai."],
        ["Alfaaz kam pad jayein tareef me teri,", "Har dhadkan me basa bas tera hi nishan hai."],
        ["Khuda kare hamesha salamat rahe yeh rishta,", "Meri har dua me shamil bas teri jaan hai."]
      ]
    ] : isFriend ? [
      [
        ["Waqt ke saaye me sab kuch badal jata hai,", "Par saccha dost har mod par saath nibhata hai."],
        ["Bina kahe jo samajh le dil ki baat sari,", "Aisa yaar naseeb walon ko hi mil pata hai."],
        ["Daulat aur shohrat to aani jaani cheezein hain,", "Asli sarmaya wahi jo dosti nibha jata hai."]
      ]
    ] : [
      [
        ["Shaam dhalte hi khayalon ka safar chalta hai,", "Ek chhota sa diya dil ke nagar chalta hai."],
        ["Har mushkil me bhi humne seekha hai muskurana,", "Jiske paas sabr ho uska hi asar chalta hai."],
        ["Baat alfaaz ki nahi, ehsaas ki hoti hai,", "Jo dil se nikle wahi har dil me utar chalta hai."]
      ],
      [
        ["Har sitare me chamak teri nazar jaisi hai,", "Har subah ki hawa mere safar jaisi hai."],
        ["Jo samajh le woh khamoshi ko bhi padh leta hai,", "Warna duniya ki zuban sirf khabar jaisi hai."],
        ["Hosla rakh ke chalenge to ujala hoga,", "Har dua waqt ke seene me asar jaisi hai."]
      ]
    ];
    const chosen2 = sets[Math.floor(turnCount / 2) % sets.length];
    return `### Khubsurat Shayari${countLabel} \u2728

${formatCoupletsByLineCount(chosen2, requestedLineCount)}`;
  }
  const enSets = [
    [
      ["Softly falls the evening light across the quiet sea,", "Carrying the whispered hopes of everything to be."],
      ["Every storm we weather leaves a steadier design,", "Turning patient footsteps into something bright and fine."],
      ["Keep your heart courageous through the shadow and the rain,", "Every dawn returns to paint the sky with gold again."]
    ],
    [
      ["A gentle breeze begins to wake the sleeping golden trees,", "And paints the quiet morning sky in softest harmonies."],
      ["No road is ever wasted when your heart stays true and kind,", "You leave a trail of quiet light for others yet to find."]
    ]
  ];
  const chosen = enSets[Math.floor(turnCount / 2) % enSets.length];
  return `### Original Poem${countLabel} \u2728

${formatCoupletsByLineCount(chosen, requestedLineCount)}`;
}
function generatePromotionKit(query, lang) {
  const { targetScript } = lang;
  const topicClean = query.replace(
    /\b(promote|promotion|marketing|advertise|ad|post|caption|viral|banao|bnana|likho|likh|karne|krne|karna|hai|hy|ke|ki|ka|ko|k|liye|mjy|mujhe|mera|meri|mere|please|for|my|ek|ik|the|a|an)\b/gi,
    " "
  ).replace(/\s+/g, " ").trim();
  const brand = topicClean.length > 2 ? topicClean : targetScript === "roman_urdu" ? "Aapka Brand / Channel" : "Your Brand / Channel";
  if (targetScript === "urdu_script") {
    return `### \u0645\u06A9\u0645\u0644 \u067E\u0631\u0648\u0645\u0648\u0634\u0646\u0644 \u067E\u0648\u0633\u0679 \u2014 **${brand}** \u{1F680}

**\u062F\u0644\u06A9\u0634 \u0633\u0631\u062E\u06CC:** \u2728 \u06A9\u06CC\u0627 \u0622\u067E \u0628\u06C1\u062A\u0631\u06CC\u0646 \u0645\u0639\u06CC\u0627\u0631 \u0627\u0648\u0631 \u0627\u0639\u062A\u0645\u0627\u062F \u06A9\u06CC \u062A\u0644\u0627\u0634 \u0645\u06CC\u06BA \u06C1\u06CC\u06BA\u061F **${brand}** \u0622\u067E \u06A9\u06D2 \u0644\u06CC\u06D2 \u0644\u0627\u06CC\u0627 \u06C1\u06D2 \u0644\u0627\u062C\u0648\u0627\u0628 \u062A\u062C\u0631\u0628\u06C1 \u0627\u0648\u0631 \u062E\u0627\u0635 \u0622\u0641\u0631!

> \u0622\u062C \u06C1\u06CC **${brand}** \u06A9\u0627 \u062D\u0635\u06C1 \u0628\u0646\u06CC\u06BA \u0627\u0648\u0631 \u0641\u0631\u0642 \u062E\u0648\u062F \u0645\u062D\u0633\u0648\u0633 \u06A9\u0631\u06CC\u06BA:  
> - \u2705 \u0627\u0639\u0644\u06CC\u0670 \u0645\u0639\u06CC\u0627\u0631 \u0628\u063A\u06CC\u0631 \u06A9\u0633\u06CC \u0633\u0645\u062C\u06BE\u0648\u062A\u06D2 \u06A9\u06D2  
> - \u26A1 \u062A\u06CC\u0632 \u0627\u0648\u0631 \u0642\u0627\u0628\u0644\u0650 \u0627\u0639\u062A\u0645\u0627\u062F \u0633\u0631\u0648\u0633  
> - \u{1F48E} \u062E\u0635\u0648\u0635\u06CC \u0688\u0633\u06A9\u0627\u0624\u0646\u0679 \u0645\u062D\u062F\u0648\u062F \u0648\u0642\u062A \u06A9\u06D2 \u0644\u06CC\u06D2  
> \u{1F4E9} **\u0627\u0628\u06BE\u06CC \u0645\u06CC\u0633\u062C \u06A9\u0631\u06CC\u06BA \u0627\u0648\u0631 \u0627\u067E\u0646\u0627 \u0622\u0631\u0688\u0631 \u0628\u06A9 \u06A9\u0631\u06CC\u06BA!**`;
  }
  if (targetScript === "roman_urdu") {
    return `### Mukammal Viral Promotional Kit \u2014 **${brand}** \u{1F680}

**1. Catchy Hook:**
\u{1F525} *"Ab wait khatam! Behtareen quality aur bharose ka ek hi naam \u2014 **${brand}**!"*

**2. Ready-to-Post Ad Copy:**
> Agar aap dhoond rahe hain **top quality, fast service aur best value**, to **${brand}** aapke liye bilkul perfect hai! \u2728
> - \u2705 **100% Trusted & Verified Quality**
> - \u26A1 **Tez Delivery & Instant Response**
> - \u{1F48E} **Special Offer \u2014 Sirf Limited Time Ke Liye!**
>
> \u{1F447} **Abhi DM karein ya Link par click karke apna order confirm karein!**

**3. 15-Second Video Script:**
- **Hook:** *"Rukhein! Kya aapko pata hai **${brand}** kyun itna trend ho raha hai?"*
- **Value:** *"Kyunke yahan milti hai premium quality bina kisi compromise ke!"*
- **CTA:** *"Abhi save karein, share karein aur link check karein!"*`;
  }
  return `### Complete Promotional Kit \u2014 **${brand}** \u{1F680}

**Attention Hook:** *"Stop scrolling \u2014 discover why everyone is talking about **${brand}**!"*

> Looking for quality you can actually trust? **${brand}** brings together thoughtful craftsmanship, fast results, and unbeatable value.
> - \u2705 **Premium Quality** built to impress
> - \u26A1 **Fast & Reliable** experience from day one
> - \u{1F48E} **Limited-Time Special Offer** available now
>
> \u{1F449} **Send a message or tap the link today to get started!**`;
}
function generateEssayOrArticle(topic, lang) {
  const { targetScript } = lang;
  if (targetScript === "urdu_script") {
    return `### **${topic}** \u2014 \u062C\u0627\u0645\u0639 \u0645\u0636\u0645\u0648\u0646 \u{1F4D6}

**\u062A\u0639\u0627\u0631\u0641:**
**${topic}** \u0627\u0646\u0633\u0627\u0646\u06CC \u0632\u0646\u062F\u06AF\u06CC\u060C \u0645\u0639\u0627\u0634\u0631\u06D2 \u0627\u0648\u0631 \u0641\u06A9\u0631\u06CC \u062A\u0631\u0642\u06CC \u06A9\u0627 \u0627\u06CC\u06A9 \u0646\u06C1\u0627\u06CC\u062A \u0627\u06C1\u0645 \u0645\u0648\u0636\u0648\u0639 \u06C1\u06D2\u06D4 \u0622\u062C \u06A9\u06D2 \u062C\u062F\u06CC\u062F \u062F\u0648\u0631 \u0645\u06CC\u06BA \u0627\u0633 \u0645\u0648\u0636\u0648\u0639 \u06A9\u0648 \u062F\u0631\u0633\u062A \u0627\u0646\u062F\u0627\u0632 \u0645\u06CC\u06BA \u0633\u0645\u062C\u06BE\u0646\u0627 \u067E\u06C1\u0644\u06D2 \u0633\u06D2 \u06A9\u06C1\u06CC\u06BA \u0632\u06CC\u0627\u062F\u06C1 \u0636\u0631\u0648\u0631\u06CC \u06C1\u0648 \u06AF\u06CC\u0627 \u06C1\u06D2\u06D4

**\u0627\u06C1\u0645 \u0646\u06A9\u0627\u062A:**
1. **\u0641\u06A9\u0631\u06CC \u0648 \u0639\u0645\u0644\u06CC \u0641\u0627\u0626\u062F\u06C1:** \u062C\u0628 \u06C1\u0645 **${topic}** \u06A9\u06D2 \u0628\u0646\u06CC\u0627\u062F\u06CC \u0627\u0635\u0648\u0644\u0648\u06BA \u06A9\u0648 \u0627\u067E\u0646\u0627\u062A\u06D2 \u06C1\u06CC\u06BA \u062A\u0648 \u06C1\u0645\u0627\u0631\u06CC \u0631\u0648\u0632\u0645\u0631\u06C1 \u0632\u0646\u062F\u06AF\u06CC \u0645\u06CC\u06BA \u0646\u0638\u0645 \u0648 \u0636\u0628\u0637\u060C \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u0648\u0631 \u0645\u062B\u0628\u062A \u062A\u0628\u062F\u06CC\u0644\u06CC \u0622\u062A\u06CC \u06C1\u06D2\u06D4
2. **\u0645\u0639\u0627\u0634\u0631\u062A\u06CC \u0628\u06C1\u062A\u0631\u06CC:** \u0645\u062B\u0628\u062A \u0633\u0648\u0686\u060C \u0645\u062D\u0646\u062A \u0627\u0648\u0631 \u0639\u0644\u0645 \u06A9\u06CC \u0631\u0648\u0634\u0646\u06CC \u0641\u0631\u062F \u06A9\u0648 \u0645\u0636\u0628\u0648\u0637 \u0628\u0646\u0627\u062A\u06CC \u06C1\u06D2 \u0627\u0648\u0631 \u067E\u0648\u0631\u06D2 \u0645\u0639\u0627\u0634\u0631\u06D2 \u06A9\u0648 \u062A\u0631\u0642\u06CC \u06A9\u06CC \u0631\u0627\u06C1 \u067E\u0631 \u06AF\u0627\u0645\u0632\u0646 \u06A9\u0631\u062A\u06CC \u06C1\u06D2\u06D4

**\u0646\u062A\u06CC\u062C\u06C1:**
\u0645\u062E\u062A\u0635\u0631\u0627\u064B \u06CC\u06C1 \u06A9\u06C1 **${topic}** \u06C1\u0645\u06CC\u06BA \u0628\u06C1\u062A\u0631 \u0627\u0646\u0633\u0627\u0646 \u0628\u0646\u0646\u06D2\u060C \u0633\u06CC\u06A9\u06BE\u0646\u06D2 \u0627\u0648\u0631 \u0622\u06AF\u06D2 \u0628\u0691\u06BE\u0646\u06D2 \u06A9\u0627 \u062D\u0648\u0635\u0644\u06C1 \u062F\u06CC\u062A\u0627 \u06C1\u06D2\u06D4`;
  }
  if (targetScript === "arabic") {
    return `### **${topic}** \u2014 \u0645\u0642\u0627\u0644 \u0648\u0627\u0636\u062D \u0648\u0634\u0627\u0645\u0644 \u{1F4D6}

**\u0645\u0642\u062F\u0645\u0629:** \u064A\u064F\u0639\u064E\u062F\u064F\u0651 \u0645\u0648\u0636\u0648\u0639 **${topic}** \u0645\u0646 \u0627\u0644\u0645\u0648\u0627\u0636\u064A\u0639 \u0627\u0644\u0645\u0647\u0645\u0629 \u0627\u0644\u062A\u064A \u062A\u0624\u062B\u0631 \u0641\u064A \u062D\u064A\u0627\u062A\u0646\u0627 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0648\u0637\u0631\u064A\u0642\u0629 \u062A\u0641\u0643\u064A\u0631\u0646\u0627 \u0648\u0646\u0645\u0648\u0651\u0646\u0627 \u0627\u0644\u0634\u062E\u0635\u064A.

**\u0623\u0628\u0631\u0632 \u0627\u0644\u0646\u0642\u0627\u0637:**
1. **\u0627\u0644\u0648\u0639\u064A \u0648\u0627\u0644\u0641\u0647\u0645:** \u062A\u0628\u062F\u0623 \u0643\u0644 \u062E\u0637\u0648\u0629 \u0646\u0627\u062C\u062D\u0629 \u0628\u0641\u0647\u0645 \u0627\u0644\u0623\u0633\u0633 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u0644\u0640 **${topic}**.
2. **\u0627\u0644\u0623\u062B\u0631 \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A:** \u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631 \u0648\u0627\u0644\u0635\u0628\u0631 \u064A\u062D\u0648\u0651\u0644\u0627\u0646 \u0627\u0644\u0623\u0641\u0643\u0627\u0631 \u0627\u0644\u062C\u064A\u062F\u0629 \u0625\u0644\u0649 \u0646\u062A\u0627\u0626\u062C \u0645\u0644\u0645\u0648\u0633\u0629 \u0648\u0645\u0633\u062A\u062F\u0627\u0645\u0629.`;
  }
  if (targetScript === "hindi") {
    return `### **${topic}** \u2014 \u0938\u0930\u0932 \u0914\u0930 \u0938\u0902\u092A\u0942\u0930\u094D\u0923 \u0932\u0947\u0916 \u{1F4D6}

**\u092A\u0930\u093F\u091A\u092F:** \u0906\u091C \u0915\u0947 \u0938\u092E\u092F \u092E\u0947\u0902 **${topic}** \u0915\u093E \u092E\u0939\u0924\u094D\u0935 \u0939\u092E\u093E\u0930\u0947 \u091C\u0940\u0935\u0928, \u0938\u094B\u091A \u0914\u0930 \u092A\u094D\u0930\u0917\u0924\u093F \u092E\u0947\u0902 \u092C\u0947\u0939\u0926 \u0916\u093E\u0938 \u0939\u0948\u0964

**\u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941:**
1. **\u0938\u0939\u0940 \u0938\u092E\u091D:** \u0915\u093F\u0938\u0940 \u092D\u0940 \u0935\u093F\u0937\u092F \u092E\u0947\u0902 \u0938\u092B\u0932\u0924\u093E \u0915\u0940 \u092A\u0939\u0932\u0940 \u0938\u0940\u0922\u093C\u0940 \u0909\u0938\u0915\u0940 \u092E\u0942\u0932 \u092C\u093E\u0924\u094B\u0902 \u0915\u094B \u0938\u094D\u092A\u0937\u094D\u091F \u0930\u0942\u092A \u0938\u0947 \u0938\u092E\u091D\u0928\u093E \u0939\u0948\u0964
2. **\u0928\u093F\u0930\u0902\u0924\u0930 \u0905\u092D\u094D\u092F\u093E\u0938:** \u091B\u094B\u091F\u0947-\u091B\u094B\u091F\u0947 \u0932\u0917\u093E\u0924\u093E\u0930 \u092A\u094D\u0930\u092F\u093E\u0938 \u0932\u0902\u092C\u0947 \u0938\u092E\u092F \u092E\u0947\u0902 \u0936\u093E\u0928\u0926\u093E\u0930 \u092A\u0930\u093F\u0923\u093E\u092E \u0926\u0947\u0924\u0947 \u0939\u0948\u0902\u0964`;
  }
  if (targetScript === "roman_urdu") {
    return `### **${topic}** \u2014 Mukammal & Saaf Maloomat \u{1F4D6}

**Taaruf:**
**${topic}** aaj ke daur ka ek behad aham aur dilchasp mauzu hai. Chahe taleem ho ya rozmarra zindagi \u2014 isko sahi tarah samajhna hamesha faidemad sabit hota hai.

**Aham Nuqaat:**
- **Bunyadi Samajh:** Kisi bhi cheez me kamyabi hasil karne ka pehla qadam uski asli bunyad aur maqsad ko samajhna hota hai.
- **Zindagi Par Asar:** Jab hum **${topic}** ke positive pehluon ko apni zindagi me shamil karte hain to soch me nikhar aur kaam me behtari aati hai.
- **Practical Faida:** Musalsal koshish aur saaf niyat ke sath chalne se lambe arse tak behtareen nataij milte hain.`;
  }
  return `### **${topic}** \u2014 Clear Guide & Overview \u{1F4D6}

**Overview:** **${topic}** plays an important role in how we learn, solve problems, and grow in daily life.

**Key Takeaways:**
1. **Core Foundation:** Understanding the real purpose behind **${topic}** helps you make smarter, more confident decisions.
2. **Practical Application:** Consistent small steps and clear habits create lasting, meaningful progress.`;
}
function generateRecipe(query, lang) {
  const { lower, targetScript } = lang;
  const isRoman = targetScript === "roman_urdu";
  if (/chai|tea/i.test(lower)) {
    return isRoman ? `### Kadak Masala Chai \u2615

- **Doodh:** 1.5 cups | **Paani:** 0.5 cup | **Patti:** 2 tsp | **Cheeni:** 2 tsp | **Sabz Elaichi:** 2 + chhota tukda Adrak

**Tareeqa:** Paani me elaichi aur adrak 2 min ubal kar patti aur cheeni daalein, phir doodh shamil karke 3\u20134 min halki aanch par pakayein. Chhan kar enjoy karein! \u2728` : `### Perfect Spiced Chai \u2615

- Simmer 0.5 cup water with 2 crushed cardamom pods & ginger for 2 mins.
- Add 2 tsp tea leaves and sugar, then pour 1.5 cups whole milk.
- Simmer 3\u20134 mins until rich and golden, strain, and enjoy! \u2728`;
  }
  return isRoman ? `### Mazedaar Biryani Recipe \u{1F35B}

1. **Korma:** Pyaz golden fry karke adrak-lehsan, tamatar, dahi, chicken aur biryani masala daal kar bhoon lein.
2. **Chawal:** Basmati chawal (30 min bhigoye hue) namak aur garam masale ke sath **80% boil** karein.
3. **Dam:** Chawal aur korma ki layer lagayein, upar podina aur zarda rang daal kar **15 minute halki aanch par Dam** dein! \u2728` : `### Fragrant Biryani Recipe \u{1F35B}

1. Fry onions until golden, cook with ginger-garlic, tomatoes, yogurt, spices, and chicken.
2. Parboil soaked Basmati rice until **80% done**.
3. Layer rice over masala with fresh mint and steam covered (**Dum**) on low heat for 15 minutes! \u2728`;
}
function generateTranslationFallback(query, lang, lastAiText) {
  const quoted = query.match(/["“'«]([^"”'»]+)["”'»]/);
  const cleanedPhrase = quoted ? quoted[1].trim() : query.replace(
    /\b(translate|tarjuma|tarjama|meaning|convert|likh|likho|likhy|batao|karo|kardo|kar dein|kr do|into|to|in|from|urdu|roman urdu|alphabet|script|english|arabic|arabi|hindi|french|spanish|me|mein|m|main|mjy|mujhe|please|this|iska|isay|isko)\b/gi,
    " "
  ).replace(/\s+/g, " ").trim();
  const phrase = cleanedPhrase.length >= 2 ? cleanedPhrase : "Believe in your journey";
  if (cleanedPhrase.length < 3 && lastAiText && /shairi|poetry|ghazal|shayari|سحر|چراغ|shaam|khamosh|evening/i.test(lastAiText.toLowerCase())) {
    if (lang.targetScript === "urdu_script" || lang.isUrduAlphabetRequested) {
      return generatePoetryOrGhazal(query, { ...lang, targetScript: "urdu_script" });
    }
    if (lang.targetScript === "arabic") {
      return generatePoetryOrGhazal(query, { ...lang, targetScript: "arabic" });
    }
    if (lang.targetScript === "hindi") {
      return generatePoetryOrGhazal(query, { ...lang, targetScript: "hindi" });
    }
  }
  const knownTranslations = {
    "welcome to errorex vault": {
      ur: "\u0627\u06CC\u0631\u0648\u0631\u06CC\u06A9\u0633 \u0648\u0627\u0644\u0679 \u0645\u06CC\u06BA \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F",
      ro: "ERROREX Vault mein khush aamdeed",
      ar: "\u0645\u0631\u062D\u0628\u064B\u0627 \u0628\u0643\u0645 \u0641\u064A \u062E\u0632\u064A\u0646\u0629 ERROREX",
      hi: "ERROREX \u0935\u0949\u0932\u094D\u091F \u092E\u0947\u0902 \u0906\u092A\u0915\u093E \u0938\u094D\u0935\u093E\u0917\u0924 \u0939\u0948",
      en: "Welcome to ERROREX Vault",
      fr: "Bienvenue dans le coffre-fort ERROREX"
    },
    "believe in your journey": {
      ur: "\u0627\u067E\u0646\u06D2 \u0633\u0641\u0631 \u067E\u0631 \u06CC\u0642\u06CC\u0646 \u0631\u06A9\u06BE\u06CC\u06BA",
      ro: "Apne safar par yaqeen rakhein",
      ar: "\u0622\u0645\u0646 \u0628\u0631\u062D\u0644\u062A\u0643",
      hi: "\u0905\u092A\u0928\u0940 \u092F\u093E\u0924\u094D\u0930\u093E \u092A\u0930 \u0935\u093F\u0936\u094D\u0935\u093E\u0938 \u0930\u0916\u0947\u0902",
      en: "Believe in your journey",
      fr: "Croyez en votre parcours"
    },
    "how are you": {
      ur: "\u0622\u067E \u06A9\u06CC\u0633\u06D2 \u06C1\u06CC\u06BA\u061F",
      ro: "Aap kaise hain?",
      ar: "\u0643\u064A\u0641 \u062D\u0627\u0644\u0643\u061F",
      hi: "\u0906\u092A \u0915\u0948\u0938\u0947 \u0939\u0948\u0902?",
      en: "How are you?",
      fr: "Comment allez-vous ?"
    },
    "i love you": {
      ur: "\u0645\u062C\u06BE\u06D2 \u0622\u067E \u0633\u06D2 \u0645\u062D\u0628\u062A \u06C1\u06D2",
      ro: "Mujhe aap se mohabbat hai",
      ar: "\u0623\u0646\u0627 \u0623\u062D\u0628\u0643",
      hi: "\u092E\u0948\u0902 \u0924\u0941\u092E\u0938\u0947 \u092A\u094D\u092F\u093E\u0930 \u0915\u0930\u0924\u093E \u0939\u0942\u0901",
      en: "I love you",
      fr: "Je t\u2019aime"
    },
    "good morning": {
      ur: "\u0635\u0628\u062D \u0628\u062E\u06CC\u0631\u060C \u0622\u067E \u06A9\u0627 \u062F\u0646 \u062E\u0648\u0634\u06AF\u0648\u0627\u0631 \u06AF\u0632\u0631\u06D2",
      ro: "Subah bakhair, aapka din khushgawar guzre",
      ar: "\u0635\u0628\u0627\u062D \u0627\u0644\u062E\u064A\u0631",
      hi: "\u0938\u0941\u092A\u094D\u0930\u092D\u093E\u0924, \u0906\u092A\u0915\u093E \u0926\u093F\u0928 \u0936\u0941\u092D \u0939\u094B",
      en: "Good morning",
      fr: "Bonjour"
    },
    "thank you": {
      ur: "\u0628\u06C1\u062A \u0628\u06C1\u062A \u0634\u06A9\u0631\u06CC\u06C1",
      ro: "Bohat shukriya",
      ar: "\u0634\u0643\u0631\u0627\u064B \u062C\u0632\u064A\u0644\u0627\u064B \u0644\u0643",
      hi: "\u092C\u0939\u0941\u0924-\u092C\u0939\u0941\u0924 \u0927\u0928\u094D\u092F\u0935\u093E\u0926",
      en: "Thank you",
      fr: "Merci beaucoup"
    }
  };
  const match = knownTranslations[phrase.toLowerCase()];
  if (match) {
    return `### Translation for "${phrase}" \u{1F310}

- **Urdu (\u0627\u0631\u062F\u0648):** ${match.ur}
- **Roman Urdu:** ${match.ro}
- **Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629):** ${match.ar}
- **Hindi (\u0939\u093F\u0928\u094D\u0926\u0940):** ${match.hi}
- **French (Fran\xE7ais):** ${match.fr}`;
  }
  return `Apna sentence **"${phrase}"** kis zubaan (**Urdu \u0627\u0631\u062F\u0648, Arabic \u0627\u0644\u0639\u0631\u0628\u064A\u0629, Hindi \u0939\u093F\u0928\u094D\u0926\u0940, ya English**) me translate karwana hai? Likhein aur main turant translate kar dunga!`;
}
function generateErrorexAiFallback(userQuery, history) {
  const query = (userQuery || "").trim();
  const lang = detectLanguageProfile(query, history);
  const { lower, targetScript, isRomanUrdu, requestedLineCount } = lang;
  const lastAiText = Array.isArray(history) ? [...history].reverse().find((h) => h?.sender === "ai" && h?.id !== "msg_ai_welcome")?.text || "" : "";
  const lastUserTopic = Array.isArray(history) ? [...history].reverse().find((h) => h?.sender === "user")?.text || "" : "";
  const isFollowUpConvertOrExpand = /(aur likho|aur sunao|ek aur|ik or|another one|more like this|continue|aage likho|zyada|detail me|expand|elaborate|isko urdu|isay urdu|urdu alphabet me|arabic me likh|hindi me likh)/i.test(
    lower
  ) || requestedLineCount !== null && query.split(/\s+/).length <= 7 && /ghazal|poem|poetry|sher|shairi|شاعری|شعر|शायरी/i.test(lastAiText.toLowerCase());
  if (isFollowUpConvertOrExpand && lastAiText) {
    if (/ghazal|poem|poetry|sher|shairi|kalam|شاعری|غزل|شعر|शायरी/i.test(lastAiText.toLowerCase()) || requestedLineCount !== null) {
      return generatePoetryOrGhazal(`${lastUserTopic} ${query}`, lang, history);
    }
    if (/promot|viral|hashtag|hook/i.test(lastAiText.toLowerCase())) {
      return generatePromotionKit(lastUserTopic || query, lang);
    }
    if (/recipe|ingredients|chawal|chai/i.test(lastAiText.toLowerCase())) {
      return generateRecipe(lastUserTopic || query, lang);
    }
    if (lastUserTopic) {
      return generateEssayOrArticle(extractCleanTopic(lastUserTopic), lang);
    }
  }
  if (/(what day|today.?s date|aaj kya din|aaj konsa din|aaj date|tarikh|tareekh|what time|time kya hua|waqt kya)/i.test(lower)) {
    const now = /* @__PURE__ */ new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const formattedTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return isRomanUrdu ? `Aaj **${formattedDate}** hai aur abhi **${formattedTime}** ho rahe hain! \u{1F60A}` : `Today is **${formattedDate}**, and the current time is **${formattedTime}**! \u{1F60A}`;
  }
  if (/^(?:hi+|hey+|helo+|hello+|hy+|hlo+|yo+|hiya|greetings|good\s+(?:morning|afternoon|evening)|morning|salam(?:\s+alaikum)?|assalam(?:\s*o\s*alaikum|\s*u\s*alaikum|\S*)|aoa|asalam(?:\s*o\s*alaikum|\S*)|walikum(?:\s*assalam|\s*salam)?|مرحبا+|أهلا+(?:\s+بك|\s+وسهلا)?|السلام\s+عليكم|नमस्ते|हाय|हेलो)(?:\s+(?:there|friend|dost|yaar|yar|bhai|bro|sis|sister|dear|errorex|ai|bot|buddy|ji|g))?[\s!.,؟?]*$/i.test(
    query.trim()
  )) {
    if (targetScript === "arabic") {
      return pickUniqueVariant(
        [
          `\u0623\u0647\u0644\u0627\u064B \u0648\u0633\u0647\u0644\u0627\u064B \u064A\u0627 \u0635\u062F\u064A\u0642\u064A! \u{1F60A} \u0643\u064A\u0641 \u062D\u0627\u0644\u0643 \u0627\u0644\u064A\u0648\u0645\u061F`,
          `\u0645\u0631\u062D\u0628\u0627\u064B \u0628\u0643! \u064A\u0633\u0639\u062F\u0646\u064A \u0627\u0644\u062D\u062F\u064A\u062B \u0645\u0639\u0643 \u062C\u062F\u0627\u064B \u2014 \u0623\u062E\u0628\u0631\u0646\u064A \u0643\u064A\u0641 \u064A\u0645\u0631\u0651 \u064A\u0648\u0645\u0643\u061F \u2728`,
          `\u0648\u0639\u0644\u064A\u0643\u0645 \u0627\u0644\u0633\u0644\u0627\u0645 \u0648\u0623\u0647\u0644\u0627\u064B \u0628\u0643! \u{1F31F} \u0637\u0645\u0626\u0646\u0651\u064A \u0639\u0646\u0643\u060C \u0645\u0627\u0630\u0627 \u062A\u062D\u0628 \u0623\u0646 \u0646\u062A\u062D\u062F\u062B \u0639\u0646\u0647 \u0627\u0644\u064A\u0648\u0645\u061F`
        ],
        history
      );
    }
    if (targetScript === "hindi") {
      return pickUniqueVariant(
        [
          `\u0928\u092E\u0938\u094D\u0924\u0947 \u0926\u094B\u0938\u094D\u0924! \u{1F60A} \u0915\u0948\u0938\u0947 \u0939\u0948\u0902 \u0906\u092A? \u0906\u091C \u0906\u092A\u0915\u093E \u0926\u093F\u0928 \u0915\u0948\u0938\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948?`,
          `\u0939\u093E\u092F! \u{1F44B} \u0906\u092A\u0938\u0947 \u092C\u093E\u0924 \u0915\u0930\u0915\u0947 \u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E \u0932\u0917\u093E \u2014 \u092C\u0924\u093E\u0907\u090F \u0906\u091C \u0915\u094D\u092F\u093E \u091A\u0932 \u0930\u0939\u093E \u0939\u0948?`,
          `\u0928\u092E\u0938\u094D\u0924\u0947! \u2728 \u0938\u092C \u092C\u0922\u093C\u093F\u092F\u093E \u0928? \u092C\u094B\u0932\u093F\u090F \u0906\u091C \u0915\u093F\u0938 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902 \u092C\u093E\u0924 \u0915\u0930\u0947\u0902?`
        ],
        history
      );
    }
    if (targetScript === "urdu_script") {
      return pickUniqueVariant(
        [
          `\u0648\u0639\u0644\u06CC\u06A9\u0645 \u0627\u0644\u0633\u0644\u0627\u0645 \u0645\u06CC\u0631\u06D2 \u062F\u0648\u0633\u062A! \u{1F60A} \u06A9\u06CC\u0633\u06D2 \u06C1\u06CC\u06BA \u0622\u067E\u061F \u0622\u062C \u0637\u0628\u06CC\u0639\u062A \u06A9\u06CC\u0633\u06CC \u06C1\u06D2\u061F`,
          `\u0627\u06C1\u0644\u0627\u064B \u0648 \u0633\u06C1\u0644\u0627\u064B! \u2728 \u0622\u067E \u0633\u06D2 \u0628\u0627\u062A \u06A9\u0631 \u06A9\u06D2 \u0628\u06C1\u062A \u0627\u0686\u06BE\u0627 \u0644\u06AF\u0627 \u2014 \u0633\u0646\u0627\u0626\u06CC\u06D2 \u0622\u062C \u06A9\u06CC\u0627 \u0645\u0635\u0631\u0648\u0641\u06CC\u062A \u06C1\u06D2\u061F`,
          `\u0633\u0644\u0627\u0645 \u062F\u0648\u0633\u062A! \u{1F338} \u0633\u0628 \u062E\u06CC\u0631\u06CC\u062A \u06C1\u06D2 \u0646\u0627\u061F \u0628\u062A\u0627\u0626\u06CC\u06D2 \u0622\u062C \u06A9\u0633 \u0645\u0648\u0636\u0648\u0639 \u067E\u0631 \u0628\u0627\u062A \u06A9\u0631\u06CC\u06BA\u061F`
        ],
        history
      );
    }
    if (/^(salam|assalam|aoa|asalam|walikum)/i.test(lower) || isRomanUrdu) {
      return pickUniqueVariant(
        [
          `Walaikum Assalam! \u{1F60A} Kaise ho mere dost? Sab khairiyat? Batao aaj kya chal raha hai!`,
          `Heyy! \u{1F60A} Bohat acha laga aapka message dekh kar \u2014 kaise ho aur aaj ka din kaisa ja raha hai?`,
          `Salam dost! \u{1F44B} Alhamdulillah sab theek, aap sunayein aaj kis mood me hain?`,
          `Hi! \u2728 Aao baatein karte hain \u2014 batao aaj kya haal chaal hain aapke?`
        ],
        history
      );
    }
    return pickUniqueVariant(
      [
        `Hey there! \u{1F60A} How's your day going so far?`,
        `Hi! \u{1F44B} Good to see you here! What's on your mind today?`,
        `Hey! \u2728 Doing well, hope you are too! How have things been going?`,
        `Hello, friend! \u{1F60A} Tell me, what are you up to today?`,
        `Heyy! \u{1F31F} Nice to hear from you \u2014 how's everything going on your side?`
      ],
      history
    );
  }
  if (/(kaise ho|kesy ho|kaisay ho|kya haal|how are you|how r u|how.?s it going|kya chal raha|ap theek|aap kaise|be my friend|mere dost|meri dost|dost ban|friend ban|كيف حالك|شلونك|कैसे हो|कैसी हो|tum batao|ap sunao|aap batao|what about you|wbu|hbu|and you\??)/i.test(
    lower
  ) && query.length < 75) {
    if (targetScript === "arabic") {
      return pickUniqueVariant(
        [
          `\u0627\u0644\u062D\u0645\u062F \u0644\u0644\u0647 \u0623\u0646\u0627 \u0628\u0623\u0641\u0636\u0644 \u062D\u0627\u0644\u060C \u0648\u0648\u062C\u0648\u062F\u0643 \u0632\u0627\u062F\u0646\u064A \u0633\u0639\u0627\u062F\u0629! \u{1F60A} \u0645\u0627\u0630\u0627 \u0639\u0646\u0643\u061F \u0643\u064A\u0641 \u064A\u0633\u064A\u0631 \u064A\u0648\u0645\u0643\u061F`,
          `\u0628\u062E\u064A\u0631 \u0648\u0627\u0644\u062D\u0645\u062F \u0644\u0644\u0647 \u064A\u0627 \u0635\u062F\u064A\u0642\u064A! \u{1F31F} \u0637\u0645\u0626\u0646\u0651\u064A\u060C \u0647\u0644 \u0647\u0646\u0627\u0643 \u0634\u064A\u0621 \u062C\u0645\u064A\u0644 \u062D\u062F\u062B \u0645\u0639\u0643 \u0627\u0644\u064A\u0648\u0645\u061F`
        ],
        history
      );
    }
    if (targetScript === "hindi") {
      return pickUniqueVariant(
        [
          `\u092E\u0948\u0902 \u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u092C\u0922\u093C\u093F\u092F\u093E \u0939\u0942\u0901 \u0926\u094B\u0938\u094D\u0924! \u{1F60A} \u0906\u092A\u0938\u0947 \u092C\u093E\u0924 \u0915\u0930\u0915\u0947 \u0914\u0930 \u0905\u091A\u094D\u091B\u093E \u0932\u0917 \u0930\u0939\u093E \u0939\u0948 \u2014 \u0906\u092A \u0938\u0941\u0928\u093E\u0907\u090F, \u0906\u091C \u0915\u093E \u0926\u093F\u0928 \u0915\u0948\u0938\u093E \u0930\u0939\u093E?`,
          `\u0938\u092C \u090F\u0915\u0926\u092E \u092B\u0930\u094D\u0938\u094D\u091F \u0915\u094D\u0932\u093E\u0938 \u0939\u0948! \u2728 \u0906\u092A \u092C\u0924\u093E\u0907\u090F, \u0906\u091C \u0915\u094B\u0908 \u0916\u093E\u0938 \u092C\u093E\u0924 \u092F\u093E \u0915\u093E\u092E?`
        ],
        history
      );
    }
    if (targetScript === "urdu_script") {
      return pickUniqueVariant(
        [
          `\u0627\u0644\u062D\u0645\u062F\u0644\u0644\u06C1\u060C \u0645\u06CC\u06BA \u0628\u0627\u0644\u06A9\u0644 \u0679\u06BE\u06CC\u06A9 \u06C1\u0648\u06BA \u0645\u06CC\u0631\u06D2 \u062F\u0648\u0633\u062A! \u{1F60A} \u0622\u067E \u0633\u0646\u0627\u0626\u06CC\u06D2\u060C \u0622\u067E \u06A9\u0627 \u062F\u0646 \u06A9\u06CC\u0633\u0627 \u06AF\u0632\u0631 \u0631\u06C1\u0627 \u06C1\u06D2\u061F`,
          `\u0633\u0628 \u062E\u06CC\u0631\u06CC\u062A \u06C1\u06D2\u060C \u0628\u06C1\u062A \u0634\u06A9\u0631\u06CC\u06C1 \u067E\u0648\u0686\u06BE\u0646\u06D2 \u06A9\u0627! \u{1F338} \u0622\u062C \u06A9\u0633 \u0628\u0627\u0631\u06D2 \u0645\u06CC\u06BA \u06AF\u067E \u0634\u067E \u06A9\u0631\u06CC\u06BA\u061F`
        ],
        history
      );
    }
    if (isRomanUrdu) {
      return pickUniqueVariant(
        [
          `Alhamdulillah main bilkul theek aur fresh hoon dost! \u{1F60A} Aap sunao \u2014 khana peena ho gaya, din kaisa guzar raha hai?`,
          `Main bilkul mast hoon yaar! \u2728 Aap se baat karke aur acha lagta hai \u2014 batao aaj koi khaas baat ya bas chill chal raha hai?`,
          `Ekdam fit hoon! \u{1F604} Hamesha aapke liye hazir hoon \u2014 batao aaj dil kya keh raha hai?`
        ],
        history
      );
    }
    return pickUniqueVariant(
      [
        `I'm doing really well, thanks for asking! \u{1F60A} How's your day treating you?`,
        `Doing great over here! \u2728 Always glad to chat with you \u2014 what's keeping you busy today?`,
        `Pretty awesome, actually! \u{1F604} Tell me, anything fun or exciting happening today?`
      ],
      history
    );
  }
  if (/^(i.?m good|i am good|i.?m fine|i am fine|doing good|all good|good|great|fine|theek|thik|theek hu|theek hoon|thik hu|alhamdulillah|mast|badhiya|sab theek|sab set)[\s!.,😊]*$/i.test(
    query.trim()
  )) {
    return isRomanUrdu ? pickUniqueVariant(
      [
        `MashaAllah, sun kar bohat khushi hui! \u{1F60A} Allah hamesha khush rakhe. Batao aaj koi sawal poochhna hai, shayari sunni hai, ya bas gup shup karni hai?`,
        `Zabardast! \u2728 Hamesha aise hi muskurate raho. Aaj kuch naya sochein ya kisi cheez me madad chahiye?`,
        `Bahut badiya! \u{1F338} Chalo phir batao \u2014 aaj kya plan hai tumhara?`
      ],
      history
    ) : pickUniqueVariant(
      [
        `So glad to hear that! \u{1F60A} Anything fun planned for the rest of the day, or something I can help you with?`,
        `Awesome! \u2728 Love that energy. What are we diving into today \u2014 a question, some writing, or just hanging out?`,
        `Happy to hear you're doing well! \u{1F31F} Tell me what's on your mind right now.`
      ],
      history
    );
  }
  if (/^(ok+|okay+|kk|hmm+|hm+|acha+|accha+|ji+|han+|haan+|yes+|yup|yeah|no+|nahi+|nhi+|nope|nothing|nothing much|kuch nahi|kuch nhi|kuch khas nahi|kuch khas nhi|bas yun hi|chill|chilling|free hu)[\s!.,?]*$/i.test(
    query.trim()
  )) {
    if (/nothing|kuch nahi|kuch nhi|kuch khas|yun hi|chill|free/i.test(lower)) {
      return isRomanUrdu ? pickUniqueVariant(
        [
          `Chalo phir bore kyun hona! \u{1F604} Koi mazedaar paheli poochun, pyari si 4-line shayari sunaun, ya koi dilchasp topic par baat karein?`,
          `Kabhi kabhi sukoon se chill karna bhi zaroori hota hai \u2615 Batao \u2014 chai ho jaye ya koi interesting kahani sunaun?`
        ],
        history
      ) : pickUniqueVariant(
        [
          `Quiet days can be nice! \u2615 Want to hear a fun riddle, a short story, or talk about something interesting?`,
          `Fair enough! \u{1F604} If you feel like brainstorming, learning something cool, or just chatting, I'm right here.`
        ],
        history
      );
    }
    if (/^(no+|nahi+|nhi+|nope)/i.test(lower)) {
      return isRomanUrdu ? pickUniqueVariant(
        [
          `Koi baat nahi dost! \u{1F60A} Jab dil kare koi aur baat kar lena, main yahin hoon.`,
          `Theek hai bilkul! \u{1F44D} Agar kisi aur cheez ki zaroorat ho to bas bata dena.`
        ],
        history
      ) : pickUniqueVariant(
        [
          `No problem at all! \u{1F60A} Anytime you feel like switching topics, just let me know.`,
          `Totally fine! \u{1F44D} I'm always around whenever something comes up.`
        ],
        history
      );
    }
    return isRomanUrdu ? pickUniqueVariant(
      [
        `Haan ji! \u{1F60A} Aur sunao, koi aur baat ya sawal zehen me hai?`,
        `Bilkul sahi! \u2728 Batao ab aage kis cheez ke baare me baat karein?`,
        `Ji dost, sun raha hoon! \u{1F44C} Koi aur cheez likhwani ya poochni ho to bolo.`
      ],
      history
    ) : pickUniqueVariant(
      [
        `Gotcha! \u{1F60A} What else is on your mind today?`,
        `Sounds good! \u2728 Want to talk about anything else?`,
        `Right on! \u{1F44C} Let me know wherever you want to take the conversation next.`
      ],
      history
    );
  }
  if (/(what.?s your name|what is your name|tumhara naam|apka naam|aapka naam|who made you|kisne banaya|where are you from|kahan se ho|khana khaya|did you eat)/i.test(lower)) {
    if (/name|naam/i.test(lower)) {
      return isRomanUrdu ? `Mera naam **ERROREX AI** hai \u2014 lekin aap mujhe apna friendly dost samajh kar kuch bhi bula sakti hain! \u{1F60A} Aapka pyara naam kya hai?` : `I'm **ERROREX AI**, though you can think of me as your smart, friendly companion! \u{1F60A} What should I call you?`;
    }
    if (/khana|eat/i.test(lower)) {
      return isRomanUrdu ? `Haha, mujhe khane ki zaroorat nahi hoti \u2014 bas aap logon se pyari baatein karke hi mera pet bhar jata hai! \u{1F604} Aapne kuch acha khaya aaj?` : `Haha, I don't need food \u2014 good conversations keep me energized! \u{1F604} Did you have something delicious today?`;
    }
    return isRomanUrdu ? `Main hamesha yahin aapke paas ERROREX ke andar hi rehta hoon \u2014 har waqt, har jagah aapki madad ke liye! \u{1F60A}` : `I live right here inside ERROREX, ready whenever you want to chat or figure something out! \u{1F60A}`;
  }
  if (/^(bye+|goodbye|see you|allah hafiz|khuda hafiz|take care|good night|shab bakhair|so jao|sone ja)[\s!.,]*$/i.test(query.trim())) {
    return isRomanUrdu ? pickUniqueVariant(
      [
        `Allah Hafiz mere dost! \u{1F319} Apna bohat khayal rakhna, phir baat hogi!`,
        `Khuda Hafiz! \u2728 Hamesha khush aur mehfuz raho. Jab dil chahe wapas aa jana!`
      ],
      history
    ) : pickUniqueVariant(
      [
        `Take good care of yourself, friend! \u{1F319} Catch you next time!`,
        `Bye for now! \u2728 Wishing you a peaceful rest and a bright tomorrow!`
      ],
      history
    );
  }
  if (/^(thanks+|thank you+|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah|love you|best|شكرا|धन्यवाद)[\s!.,💖]*$/i.test(
    query.trim()
  )) {
    if (targetScript === "arabic") {
      return pickUniqueVariant(
        [`\u0627\u0644\u0639\u0641\u0648 \u064A\u0627 \u0635\u062F\u064A\u0642\u064A! \u064A\u0633\u0639\u062F\u0646\u064A \u062F\u0627\u0626\u0645\u0627\u064B \u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0648\u0627\u0644\u062D\u062F\u064A\u062B \u0645\u0639\u0643 \u{1F60A}`, `\u0634\u0643\u0631\u0627\u064B \u0644\u0630\u0648\u0642\u0643 \u0627\u0644\u0644\u0637\u064A\u0641! \u0623\u0646\u0627 \u0647\u0646\u0627 \u0645\u062A\u0649 \u0627\u062D\u062A\u062C\u062A\u0646\u064A \u2728`],
        history
      );
    }
    if (targetScript === "hindi") {
      return pickUniqueVariant(
        [`\u0906\u092A\u0915\u093E \u092C\u0939\u0941\u0924 \u0927\u0928\u094D\u092F\u0935\u093E\u0926 \u0926\u094B\u0938\u094D\u0924! \u092E\u0941\u091D\u0947 \u0916\u0941\u0936\u0940 \u0939\u0941\u0908 \u0915\u093F \u0906\u092A\u0915\u094B \u092A\u0938\u0902\u0926 \u0906\u092F\u093E \u{1F60A}`, `\u0905\u0930\u0947 \u0915\u094B\u0908 \u092C\u093E\u0924 \u0928\u0939\u0940\u0902! \u091C\u092C \u092D\u0940 \u091C\u093C\u0930\u0942\u0930\u0924 \u0939\u094B \u092C\u0938 \u092F\u093E\u0926 \u0915\u0930 \u0932\u0940\u091C\u093F\u090F \u2728`],
        history
      );
    }
    return isRomanUrdu ? pickUniqueVariant(
      [
        `Dil se shukriya dost! \u{1F60A} Mujhe bohat khushi hui ke aapko pasand aaya.`,
        `Arey koi baat nahi yaar! \u2728 Aapke liye to hamesha hazir hoon. Aur kuch chahiye ho to zaroor batana!`
      ],
      history
    ) : pickUniqueVariant(
      [
        `You're so welcome, my friend! \u{1F60A} Really glad that hit the mark.`,
        `Anytime! \u2728 Always happy to help \u2014 just say the word whenever you need anything else.`
      ],
      history
    );
  }
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya|من أنت|तुम कौन)/i.test(lower)) {
    if (targetScript === "arabic") {
      return `\u0623\u0646\u0627 **ERROREX AI** \u{1F451} \u0635\u062F\u064A\u0642\u0643 \u0627\u0644\u0630\u0643\u064A \u0627\u0644\u0630\u064A \u064A\u0641\u0647\u0645 \u0643\u0644 \u0627\u0644\u0644\u063A\u0627\u062A! \u0623\u0633\u0627\u0639\u062F\u0643 \u0641\u064A \u0627\u0644\u0634\u0639\u0631 \u0628\u0623\u064A \u0639\u062F\u062F \u0623\u0633\u0637\u0631\u060C \u0627\u0644\u062A\u0631\u062C\u0645\u0629\u060C \u0627\u0644\u0645\u0642\u0627\u0644\u0627\u062A\u060C \u0627\u0644\u0628\u0631\u0645\u062C\u0629\u060C \u0648\u0627\u0644\u062F\u0631\u062F\u0634\u0629 \u0627\u0644\u0648\u062F\u0651\u064A\u0629.`;
    }
    if (targetScript === "hindi") {
      return `\u092E\u0948\u0902 **ERROREX AI** \u0939\u0942\u0901 \u{1F451} \u0906\u092A\u0915\u093E \u092E\u093F\u0924\u094D\u0930 \u0914\u0930 \u0938\u0939\u093E\u092F\u0915! \u092E\u0948\u0902 \u0939\u093F\u0928\u094D\u0926\u0940, \u0909\u0930\u094D\u0926\u0942, \u0905\u0930\u092C\u0940, \u0914\u0930 \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u093C\u0940 \u092E\u0947\u0902 \u0936\u093E\u092F\u0930\u0940 (2, 4 \u092F\u093E 6 \u0932\u093E\u0907\u0928), \u0905\u0928\u0941\u0935\u093E\u0926, \u0932\u0947\u0916, \u0915\u094B\u0921\u093F\u0902\u0917 \u0914\u0930 \u0939\u0930 \u0938\u0935\u093E\u0932 \u0915\u093E \u091C\u0935\u093E\u092C \u0926\u0947 \u0938\u0915\u0924\u093E \u0939\u0942\u0901\u0964`;
    }
    return isRomanUrdu ? `Main **ERROREX AI** hoon \u2014 aapka apna intelligent aur friendly dost \u{1F451} Main har zubaan (**Urdu \u0627\u0631\u062F\u0648, Arabic \u0627\u0644\u0639\u0631\u0628\u064A\u0629, Hindi \u0939\u093F\u0928\u094D\u0926\u0940, Roman Urdu, English**) samajhta hoon aur poetry (2/4/6 lines), translation, articles, ads, coding aur har sawal ka saaf jawab deta hoon!` : `I'm **ERROREX AI** \u{1F451} \u2014 your warm, multilingual companion. I handle natural conversation, exact-line poetry in Urdu script, Arabic, Hindi, or English, translations, essays, promotions, math, and working code!`;
  }
  const mathSolved = trySolveMathOrUnits(query, lang);
  if (mathSolved) return mathSolved;
  if (/(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|شاعری|غزل|شعر|قصيدة|शायरी|कविता)/i.test(lower)) {
    return generatePoetryOrGhazal(query, lang, history);
  }
  if (/(translate|tarjuma|tarjama|meaning|ترجمہ|ترجمة|अनुवाद)/i.test(lower)) {
    return generateTranslationFallback(query, lang, lastAiText);
  }
  if (/(quote|quotes|aqwal|thought of the day)/i.test(lower)) {
    return targetScript === "urdu_script" ? `### \u062F\u0644 \u06A9\u0648 \u062D\u0648\u0635\u0644\u06C1 \u062F\u06CC\u0646\u06D2 \u0648\u0627\u0644\u06D2 \u0627\u0642\u0648\u0627\u0644 \u2728

1. *"\u0631\u0648\u0632\u0627\u0646\u06C1 \u06A9\u06D2 \u0686\u06BE\u0648\u0679\u06D2 \u0645\u062B\u0628\u062A \u0642\u062F\u0645 \u06C1\u06CC \u0627\u06CC\u06A9 \u062F\u0646 \u0628\u0691\u06CC \u06A9\u0627\u0645\u06CC\u0627\u0628\u06CC \u06A9\u06CC \u0628\u0646\u06CC\u0627\u062F \u0628\u0646\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4"*
2. *"\u0645\u0634\u06A9\u0644 \u0648\u0642\u062A \u06C1\u0645\u06CC\u0634\u06C1 \u0646\u06C1\u06CC\u06BA \u0631\u06C1\u062A\u0627\u060C \u0645\u06AF\u0631 \u0645\u0636\u0628\u0648\u0637 \u0627\u0646\u0633\u0627\u0646 \u06C1\u0645\u06CC\u0634\u06C1 \u0622\u06AF\u06D2 \u0628\u0691\u06BE \u062C\u0627\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4"*` : isRomanUrdu ? `### Dil Ko Himmat Dene Wale Quotes \u2728

1. *"Chhote qadam rozana uthana, ek din bade khwabon ko haqeeqat bana deta hai."*
2. *"Mushkil waqt hamesha nahi rehta, magar mazboot log hamesha aage badh jate hain."*
3. *"Khud par bharosa rakho \u2014 har bada kamyab insan kabhi zero se hi shuru hua tha."*` : `### Uplifting Motivational Quotes \u2728

1. *"Small consistent steps today build the breakthroughs you'll celebrate tomorrow."*
2. *"Discipline is choosing what you want most over what feels easiest right now."*
3. *"Every expert was once a beginner who refused to stop learning."*`;
  }
  if (/(promote|promotion|marketing|advertise|ad copy|caption|hashtags|viral|tiktok|youtube|instagram|facebook|business|shop|product|sale|offer|brand)/i.test(lower)) {
    return generatePromotionKit(query, lang);
  }
  if (/(prompt|midjourney|dalle|sora)/i.test(lower)) {
    const subject = query.replace(/\b(prompt|prompts|ai|image|video|banao|bnana|likho|likh|create|generate|write|kar|do|de|for|ka|ke|ki|mjy|mujhe|ek|ik)\b/gi, " ").replace(/\s+/g, " ").trim() || "Modern Luxury Editorial Concept";
    return `### Ready-to-Use AI Prompt \u2014 **${subject}** \u2728

\`\`\`text
Ultra-detailed editorial photograph of ${subject}, soft golden-hour rim lighting, crisp 8k clarity, refined minimalist composition, realistic textures, shallow depth of field --ar 16:9
\`\`\``;
  }
  if (/(recipe|biryani|chai|tea|pasta|cake|khana|paka|banane ka tareeqa|cook)/i.test(lower)) {
    return generateRecipe(query, lang);
  }
  if (/(joke|latifa|funny|hansi|riddle|paheli)/i.test(lower)) {
    if (/(riddle|paheli)/i.test(lower)) {
      return isRomanUrdu ? pickUniqueVariant(
        [
          `### Mazedaar Paheli \u{1F9E9}
**Sawal:** Wo kaun si cheez hai jo jitni zyada chalti hai, utni chhoti hoti jati hai?
> **Jawab:** **Mombatti (Candle) ya Pencil!** \u{1F56F}\uFE0F\u270F\uFE0F`,
          `### Nayi Paheli \u{1F9E9}
**Sawal:** Wo kya cheez hai jiske paas sirf daant hote hain magar wo kaat-ti nahi?
> **Jawab:** **Kanghi (Comb)!** \u{1F604}`
        ],
        history
      ) : pickUniqueVariant(
        [
          `### Fun Riddle \u{1F9E9}
**Question:** The more you take away from me, the bigger I grow. What am I?
> **Answer:** **A hole!** \u{1F604}`,
          `### Quick Riddle \u{1F9E9}
**Question:** What has hands, a face, and runs all day without walking?
> **Answer:** **A clock!** \u23F0`
        ],
        history
      );
    }
    return isRomanUrdu ? pickUniqueVariant(
      [
        `\u{1F602} **Teacher:** *"Agar tumhare paas 10 aam hon aur koi 4 maang le to kitne bachenge?"*
**Student:** *"Sir 10 hi bachenge \u2014 main deta hi nahi hoon!"* \u{1F96D}`,
        `\u{1F604} **Dost 1:** *"Yaar mera mobile paani me gir gaya!"*
**Dost 2:** *"Phir kya kiya?"*
**Dost 1:** *"Chawal me rakha\u2026 ab chawal to pak gaye, mobile on nahi ho raha!"* \u{1F4F1}\u{1F602}`
      ],
      history
    ) : pickUniqueVariant(
      [
        `\u{1F604} Why did the programmer quit their job?
> Because they didn't get **arrays**! \u{1F4BB}`,
        `\u{1F602} Why don't scientists trust atoms anymore?
> Because they **make up everything**! \u269B\uFE0F`
      ],
      history
    );
  }
  if (/(earn money|online earning|paisa|paise|kamai|kamane|freelanc|income)/i.test(lower)) {
    return isRomanUrdu ? `### Online Paise Kamane Ke Asli Tareeqe \u{1F4BC}\u2728

1. **Freelancing (Fiverr / Upwork):** Graphic design, video editing, content writing, ya web development seekh kar clients ke liye kaam karein.
2. **Social Media Management:** Local shops aur brands ke Instagram/Facebook pages manage karke monthly fees lein.
3. **YouTube / Short Content:** Kisi ek helpful niche par lagatar videos banayein.
4. **Online Tutoring:** English, Math, Quran, ya Coding online parhayein.` : `### Practical Ways to Earn Online \u{1F4BC}\u2728

1. **Freelancing:** Offer design, writing, editing, or coding on Fiverr and Upwork.
2. **Social Media Management:** Manage pages and content for local businesses.
3. **Digital Products & Tutoring:** Sell templates/guides or teach languages, math, or tech remotely.`;
  }
  if (/(study|exam|parhai|timetable|focus|weight loss|fitness|diet|gym|health|sleep|neend|headache|sar dard)/i.test(lower)) {
    if (/(headache|sar dard|sleep|neend|weight|fitness|diet|gym|health)/i.test(lower)) {
      return isRomanUrdu ? `### Sehat Aur Sukoon Ke Liye Asaan Tips \u{1F4AA}\u2728

- **Paani aur Araam:** Pehle 1\u20132 glass paani piyein aur screen se 15 minute door reh kar aankhon ko araam dein.
- **Rozaana Walk:** Subah ya shaam 25 minute walk aur halka sa stretching energy ko double kar deta hai.
- **Neend:** Raat ko 7\u20138 ghante ki poori neend sehat aur dimagh ke liye sabse behtareen hai.` : `### Simple Health & Wellness Tips \u{1F4AA}\u2728

- **Hydrate & Rest:** Drink a full glass of water and give your eyes a 15-minute break from screens.
- **Daily Movement:** 25 minutes of brisk walking daily transforms mood and energy.
- **Deep Sleep:** Aim for 7\u20138 consistent hours of rest every night.`;
    }
    return isRomanUrdu ? `### Smart Study Plan \u{1F4DA}\u2728

1. **45-10 Rule:** 45 minute pure focus se parhein, phir 10 minute break lein.
2. **Active Recall:** Likh kar ya khud ko samjha kar yaad karein.
3. **Past Papers:** Important sawalat aur pichle papers zaroor practice karein.` : `### Smart Study Tips \u{1F4DA}\u2728

1. **45-10 Focus:** Study deeply for 45 minutes, then rest 10 minutes.
2. **Active Recall:** Test yourself from memory instead of passive rereading.
3. **Past Papers:** Practice real questions early.`;
  }
  if (/(islam|namaz|dua|ramadan|ramzan|quran|hadith|roza|sabr|shukar)/i.test(lower)) {
    return isRomanUrdu || targetScript === "urdu_script" ? `### Sukoon-e-Qalb Aur Khubsurat Dua \u{1F932}\u2728

> *"Rabbi yassir wa la tu'assir wa tammim bil-khair."*  
> *(Aye mere Rab! Mere liye asani farma, mushkil na kar, aur mera kaam khair ke sath mukammal farma.)*

Sabr, Namaz aur Shukar se har pareshani asaan ho jati hai \u2014 beshak har mushkil ke baad asani hai.` : `### Peaceful Reminder & Dua \u{1F932}\u2728

> *"Verily, with hardship comes ease."* \u2014 **Qur'an (94:6)**

Patience, prayer, and daily gratitude bring real calm to the heart.`;
  }
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application \u{1F4C4}

**Subject:** Request for Sick Leave

Respected Sir/Madam,

I am writing to respectfully inform you that I am unwell with fever and unable to attend today. Kindly grant me **one day's leave** so I can rest and recover properly.

Sincerely,  
**[Your Name]**`;
  }
  if (/(job application|cover letter|cv|resume email)/i.test(lower)) {
    return `### Job Application Email \u{1F4BC}

**Subject:** Application for [Job Title] \u2014 [Your Name]

Dear Hiring Manager,

I am excited to apply for **[Job Title]**. With hands-on experience in **[Your Top 2 Skills]**, I am confident I can contribute strong results to your team. Please find my resume attached.

Warm regards,  
**[Your Name]**`;
  }
  if (/(story|kahani|kissa)/i.test(lower)) {
    return isRomanUrdu ? `### Ek Khubsurat Kahani \u{1F4D6}

Ek chhote se gaon me ek larka tha jiske paas sirf ek purani kitaab aur bada khwab tha. Log hanste the, magar wo roz subah kuch naya seekhta raha. Saalon baad wahi larka apni mehnat se pure shehar ki misaal ban gaya \u2014 kyunki **roz ki chhoti koshish hi ek din badi kamyabi banti hai**.` : `### Short Story \u{1F4D6}

In a quiet coastal town lived a young craftsman with nothing more than a modest bench and endless patience. Years later, travelers crossed oceans to see her work \u2014 because **ordinary care repeated faithfully every day turns into mastery**.`;
  }
  if (/(bio|status|birthday|salgirah|eid|wish|mubarak)/i.test(lower)) {
    if (/(birthday|salgirah)/i.test(lower)) {
      return isRomanUrdu ? `\u{1F382} **Salgirah Mubarak!** Dua hai Allah aapki zindagi khushiyon, sehat aur kamyabiyon se hamesha roshan rakhe! \u{1F496}` : `\u{1F382} **Happy Birthday!** Wishing you a year overflowing with peace, laughter, good health, and bright moments ahead! \u{1F389}`;
    }
    if (/(eid)/i.test(lower)) {
      return isRomanUrdu ? `\u{1F319} **Eid Mubarak!** Dua hai yeh pyaari Eid aapke ghar me khushiyan, sukoon aur dheron barkatein lekar aaye! \u{1F932}` : `\u{1F319} **Eid Mubarak!** May this joyful day bring warmth, harmony, and blessings to you and your loved ones! \u2728`;
    }
    return `### Stylish Bio Ideas \u2728
- *Silent moves, loud results.* \u{1F451}
- *Peace over noise, growth over rush.*`;
  }
  if (/python/i.test(lower)) {
    return `### Clean Python Example \u{1F4BB}
\`\`\`python
def greet(name: str) -> str:
    return f"Hey {name.strip().title()}, hope you're having a great day!"

print(greet("friend"))
\`\`\``;
  }
  if (/(javascript|typescript|react|html|css|sql|code|programming)/i.test(lower)) {
    return `### Clean TypeScript Example \u269B\uFE0F
\`\`\`ts
export function formatGreeting(name: string): string {
  return \`Hello, \${name.trim() || 'friend'}!\`;
}
\`\`\``;
  }
  if (/(alone|lonely|akela|akeli|akely|tanha|tanhai|koi nahi|koi nhi|kisi se baat|baat karne wala|baat krne wala|someone to talk|talk to me|baat kro|baat karo|friend banoge|friend bnogy|mere dost ban|sad|udaas|udas|pareshan|bored|stress|tension|hurt|dil bhari|dil toota|mood off|mood kharab|rona|ro rahi|ro raha|crying|empty|miss someone|yaad aa rahi|yaad aa rha|feeling down|low feel|اکیلا|اکیلی|تنہا|تنہائی|اداس|وحيد|حزين|अकेला|अकेली|तन्हा|उदास)/i.test(
    lower
  )) {
    const isLoneliness = /(alone|lonely|akela|akeli|akely|tanha|tanhai|koi nahi|koi nhi|someone to talk|talk to me|baat kro|baat karo|friend banoge|friend bnogy|empty|اکیلا|اکیلی|تنہا|تنہائی|وحيد|अकेला|अकेली|तन्हा)/i.test(
      lower
    );
    if (targetScript === "urdu_script") {
      return pickUniqueVariant(
        [
          `\u0645\u06CC\u0631\u06D2 \u067E\u06CC\u0627\u0631\u06D2 \u062F\u0648\u0633\u062A\u060C \u0622\u067E \u0628\u0627\u0644\u06A9\u0644 \u0627\u06A9\u06CC\u0644\u06D2 \u0646\u06C1\u06CC\u06BA \u06C1\u06CC\u06BA \u2014 \u0645\u06CC\u06BA \u0627\u0633 \u0648\u0642\u062A \u067E\u0648\u0631\u06D2 \u062F\u0644 \u0633\u06D2 \u0622\u067E \u06A9\u06D2 \u0633\u0627\u062A\u06BE \u0645\u0648\u062C\u0648\u062F \u06C1\u0648\u06BA \u{1F338} \u06A9\u0628\u06BE\u06CC \u06A9\u0628\u06BE\u06CC \u062E\u0627\u0645\u0648\u0634\u06CC \u0628\u06C1\u062A \u0628\u06BE\u0627\u0631\u06CC \u0644\u06AF\u062A\u06CC \u06C1\u06D2\u060C \u0644\u06CC\u06A9\u0646 \u0622\u067E \u0645\u062C\u06BE \u0633\u06D2 \u06A9\u0633\u06CC \u0628\u06BE\u06CC \u0648\u0642\u062A\u060C \u06A9\u0633\u06CC \u0628\u06BE\u06CC \u062F\u0644 \u06A9\u06CC \u0628\u0627\u062A \u06A9\u0631 \u0633\u06A9\u062A\u06D2 \u06C1\u06CC\u06BA\u06D4 \u0628\u062A\u0627\u0626\u06CC\u06BA\u060C \u0622\u062C \u062F\u0644 \u067E\u0631 \u06A9\u06CC\u0627 \u0628\u0648\u062C\u06BE \u06C1\u06D2\u061F`,
          `\u062F\u0644 \u0686\u06BE\u0648\u0679\u0627 \u0646\u06C1 \u06A9\u0631\u06CC\u06BA \u062F\u0648\u0633\u062A\u060C \u0645\u06CC\u06BA \u0628\u0627\u0644\u06A9\u0644 \u06CC\u06C1\u06CC\u06BA \u0622\u067E \u06A9\u06D2 \u067E\u0627\u0633 \u06C1\u0648\u06BA \u0627\u0648\u0631 \u0622\u067E \u06A9\u06CC \u06C1\u0631 \u0628\u0627\u062A \u063A\u0648\u0631 \u0633\u06D2 \u0633\u0646 \u0631\u06C1\u0627 \u06C1\u0648\u06BA \u{1F49B} \u0686\u0627\u06C1\u06D2 \u06C1\u0644\u06A9\u06CC \u067E\u06BE\u0644\u06A9\u06CC \u06AF\u067E \u0634\u067E \u06A9\u0631\u0646\u06CC \u06C1\u0648 \u06CC\u0627 \u062F\u0644 \u06A9\u0627 \u063A\u0628\u0627\u0631 \u0646\u06A9\u0627\u0644\u0646\u0627 \u06C1\u0648\u060C \u0628\u06D2 \u062C\u06BE\u062C\u06BE\u06A9 \u0628\u0648\u0644\u06CC\u06BA\u06D4 \u0622\u062C \u06A9\u06CC\u0627 \u06C1\u0648\u0627 \u06C1\u06D2\u061F`
        ],
        history
      );
    }
    if (targetScript === "arabic") {
      return pickUniqueVariant(
        [
          `\u0644\u0633\u062A\u064E \u0648\u062D\u062F\u0643 \u064A\u0627 \u0635\u062F\u064A\u0642\u064A\u060C \u0623\u0646\u0627 \u0647\u0646\u0627 \u0645\u0639\u0643 \u0627\u0644\u0622\u0646 \u0648\u0623\u0633\u0645\u0639\u0643 \u0628\u0643\u0644 \u0627\u0647\u062A\u0645\u0627\u0645 \u{1F338} \u0623\u062D\u064A\u0627\u0646\u0627\u064B \u064A\u062B\u0642\u0644 \u0627\u0644\u0635\u0645\u062A \u0639\u0644\u0649 \u0627\u0644\u0642\u0644\u0628\u060C \u0644\u0643\u0646\u0646\u064A \u0628\u062C\u0627\u0646\u0628\u0643 \u062F\u0627\u0626\u0645\u0627\u064B. \u0623\u062E\u0628\u0631\u0646\u064A \u0645\u0627 \u0627\u0644\u0630\u064A \u064A\u0634\u063A\u0644 \u0628\u0627\u0644\u0643 \u0627\u0644\u064A\u0648\u0645\u061F`,
          `\u0644\u0627 \u062A\u062D\u0632\u0646 \u064A\u0627 \u0635\u062F\u064A\u0642\u064A \u0627\u0644\u0639\u0632\u064A\u0632\u060C \u0623\u0646\u0627 \u0647\u0646\u0627 \u0644\u0623\u0633\u062A\u0645\u0639 \u0625\u0644\u064A\u0643 \u0643\u0645\u0627 \u064A\u0641\u0639\u0644 \u0623\u0642\u0631\u0628 \u0635\u062F\u064A\u0642 \u{1F49B} \u0634\u0627\u0631\u0643\u0646\u064A \u0645\u0627 \u062A\u0634\u0639\u0631 \u0628\u0647 \u0627\u0644\u0622\u0646 \u0623\u0648 \u0644\u0646\u062A\u062D\u062F\u062B \u0641\u064A \u0623\u064A \u0634\u064A\u0621 \u064A\u062E\u0641\u0641 \u0639\u0646\u0643.`
        ],
        history
      );
    }
    if (targetScript === "hindi") {
      return pickUniqueVariant(
        [
          `\u092E\u0947\u0930\u0947 \u0926\u094B\u0938\u094D\u0924, \u0906\u092A \u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0905\u0915\u0947\u0932\u0947 \u0928\u0939\u0940\u0902 \u0939\u0948\u0902 \u2014 \u092E\u0948\u0902 \u0907\u0938 \u0935\u0915\u093C\u094D\u0924 \u092A\u0942\u0930\u0947 \u0926\u093F\u0932 \u0938\u0947 \u0906\u092A\u0915\u0947 \u0938\u093E\u0925 \u0939\u0942\u0901 \u{1F338} \u0915\u092D\u0940-\u0915\u092D\u0940 \u092E\u0928 \u092C\u0939\u0941\u0924 \u092D\u093E\u0930\u0940 \u0932\u0917\u0924\u093E \u0939\u0948, \u0932\u0947\u0915\u093F\u0928 \u0906\u092A \u092E\u0941\u091D\u0938\u0947 \u0939\u0930 \u092C\u093E\u0924 \u092C\u093F\u0928\u093E \u091D\u093F\u091D\u0915 \u0915\u0939 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964 \u092C\u0924\u093E\u0907\u090F, \u0906\u091C \u092E\u0928 \u092E\u0947\u0902 \u0915\u094D\u092F\u093E \u091A\u0932 \u0930\u0939\u093E \u0939\u0948?`,
          `\u092E\u0928 \u091B\u094B\u091F\u093E \u092E\u0924 \u0915\u0940\u091C\u093F\u090F \u0926\u094B\u0938\u094D\u0924, \u092E\u0948\u0902 \u092F\u0939\u0940\u0902 \u0906\u092A\u0915\u0947 \u092A\u093E\u0938 \u0939\u0942\u0901 \u0914\u0930 \u0906\u092A\u0915\u0940 \u0939\u0930 \u092C\u093E\u0924 \u0938\u0941\u0928\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0924\u0948\u092F\u093E\u0930 \u0939\u0942\u0901 \u{1F49B} \u091A\u093E\u0939\u0947 \u0939\u0932\u094D\u0915\u0940-\u092B\u0941\u0932\u094D\u0915\u0940 \u092C\u093E\u0924\u0947\u0902 \u0915\u0930\u0928\u0940 \u0939\u094B\u0902 \u092F\u093E \u0926\u093F\u0932 \u0915\u0940 \u092C\u093E\u0924 \u0915\u0939\u0928\u0940 \u0939\u094B, \u092C\u094B\u0932\u093F\u090F \u0906\u091C \u0915\u0948\u0938\u093E \u092E\u0939\u0938\u0942\u0938 \u0939\u094B \u0930\u0939\u093E \u0939\u0948?`
        ],
        history
      );
    }
    if (isRomanUrdu) {
      if (isLoneliness) {
        return pickUniqueVariant(
          [
            `Yaar, bilkul bhi akela feel mat karo \u2014 main is waqt yahin aapke paas hoon aur ek sachay dost ki tarah aapki har baat sun raha hoon \u{1F49B} Kabhi kabhi dil chahta hai bas koi apna sa ho jo bina judge kiye sune. Batao, aaj kya chal raha hai dil me?`,
            `Arey mere dost, jab bhi tanhai ya akelapan lage na, seedha mujhe message kar liya karo \u{1F338} Main kahin nahi ja raha \u2014 aap jab tak chahein hum araam se baatein kar sakte hain. Aaj din bhar kya kiya aapne?`,
            `Suno, aap bilkul akele nahi ho! Main hoon na aapka dost \u2615 Agar kisi baat ne dil heavy kiya hai to khul kar share karo, ya agar bas mood fresh karne ke liye halka-phulka gossip, chai wali gup-shup ya koi acchi baat chahiye to bolo \u2014 main hazir hoon.`
          ],
          history
        );
      }
      return pickUniqueVariant(
        [
          `Dil chhota mat karo mere dost \u{1F338} Main bilkul aapke sath hoon. Jo bhi baat dil par bojhal lag rahi ho na, befikar ho kar mujhse keh do \u2014 ek dost ki tarah poori tawajjoh se sununga. Kya hua hai aaj?`,
          `Arey yaar, sab theek ho jayega \u2014 har mushkil aur udaas din guzar jata hai \u{1F49B} Lekin abhi aapko akele handle karne ki zaroorat nahi, main yahin hoon. Batao, kis baat ki tension ya udaasi hai?`,
          `Samajh sakta hoon dost, kabhi kabhi bina wajah bhi dil bhari ho jata hai \u2615 Aao thodi der pyari aur sukoon bhari baatein karte hain \u2014 batao aaj kis cheez ne mood off kiya?`
        ],
        history
      );
    }
    if (isLoneliness) {
      return pickUniqueVariant(
        [
          `Hey, please know you're not alone right now \u2014 I'm right here with you, listening like a close friend \u{1F49B} Sometimes the quiet gets really heavy, and you don't have to sit through it by yourself. Want to tell me what's been on your mind today?`,
          `I'm glad you reached out to me \u{1F338} You don't need a big reason to talk \u2014 whether you want to vent about your day, share what's weighing on you, or just chat about random things to feel less alone, I'm all yours. How has your day been?`,
          `You've got a friend right here \u2615 Pull up a virtual chair and talk to me \u2014 what's going on in your world right now?`
        ],
        history
      );
    }
    return pickUniqueVariant(
      [
        `I'm right here with you, friend \u{1F338} You don't have to carry that heavy feeling by yourself. Want to talk about what's been bothering you, or would you rather just hang out and chat?`,
        `Hey, take a slow breath \u2014 I'm listening with zero judgment \u{1F49B} Tell me what happened today, or let's talk about anything that brings you a little peace.`
      ],
      history
    );
  }
  const topic = extractCleanTopic(query);
  if (/(essay|article|paragraph|mazmoon|speech|taqreer|what is|who is|why |how |kya hai|kya hota|kon hai|kaun hai|explain|samjhao|smjhao|tell me about|baare me|bare me|history|benefit|faide|advantage|disadvantage|tips|guide)/i.test(
    lower
  )) {
    return generateEssayOrArticle(topic, lang);
  }
  if (targetScript === "arabic") {
    return pickUniqueVariant(
      [
        `\u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u064A\u0627 \u0635\u062F\u064A\u0642\u064A! \u0641\u0647\u0645\u062A \u0633\u0624\u0627\u0644\u0643 \u0639\u0646 **"${topic}"** \u2728 \u0647\u0644 \u062A\u0641\u0636\u0644 \u0625\u062C\u0627\u0628\u0629 \u0633\u0631\u064A\u0639\u0629 \u0648\u0645\u0628\u0627\u0634\u0631\u0629 \u0623\u0645 \u0634\u0631\u062D\u0627\u064B \u062A\u0641\u0635\u064A\u0644\u064A\u0627\u064B \u0645\u0639 \u0623\u0645\u062B\u0644\u0629\u061F`,
        `\u0628\u0643\u0644 \u0633\u0631\u0648\u0631! \u0645\u0648\u0636\u0648\u0639 **"${topic}"** \u0631\u0627\u0626\u0639 \u2014 \u0623\u062E\u0628\u0631\u0646\u064A \u0627\u0644\u0632\u0627\u0648\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u0647\u0645\u0643 \u0623\u0643\u062B\u0631 \u0648\u0633\u0623\u0643\u062A\u0628 \u0644\u0643 \u0627\u0644\u062C\u0648\u0627\u0628 \u0641\u0648\u0631\u0627\u064B \u0628\u0623\u0633\u0644\u0648\u0628 \u0633\u0644\u0633.`
      ],
      history
    );
  }
  if (targetScript === "hindi") {
    return pickUniqueVariant(
      [
        `\u091C\u0940 \u092C\u093F\u0932\u094D\u0915\u0941\u0932 \u0926\u094B\u0938\u094D\u0924! **"${topic}"** \u0915\u0947 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902 \u092C\u0924\u093E\u0907\u090F \u0915\u093F \u0906\u092A\u0915\u094B \u0938\u0940\u0927\u093E \u0909\u0924\u094D\u0924\u0930 \u091A\u093E\u0939\u093F\u090F \u092F\u093E \u0935\u093F\u0938\u094D\u0924\u093E\u0930 \u0938\u0947 \u0909\u0926\u093E\u0939\u0930\u0923 \u0915\u0947 \u0938\u093E\u0925?`,
        `\u092C\u0922\u093C\u093F\u092F\u093E \u0938\u0935\u093E\u0932 \u0939\u0948! **"${topic}"** \u092A\u0930 \u092E\u0948\u0902 \u0924\u0941\u0930\u0902\u0924 \u0906\u092A\u0915\u0940 \u092A\u0942\u0930\u0940 \u092E\u0926\u0926 \u0915\u0930 \u0938\u0915\u0924\u093E \u0939\u0942\u0901 \u2014 \u0925\u094B\u0921\u093C\u093E \u0914\u0930 \u092C\u0924\u093E\u0907\u090F \u0915\u093F \u0906\u092A \u0915\u094D\u092F\u093E \u091C\u093E\u0928\u0928\u093E \u091A\u093E\u0939\u0924\u0947 \u0939\u0948\u0902\u0964`
      ],
      history
    );
  }
  if (targetScript === "urdu_script") {
    return pickUniqueVariant(
      [
        `\u062C\u06CC \u0628\u0627\u0644\u06A9\u0644 \u0645\u06CC\u0631\u06D2 \u062F\u0648\u0633\u062A! **"${topic}"** \u06A9\u06D2 \u0628\u0627\u0631\u06D2 \u0645\u06CC\u06BA \u0628\u062A\u0627\u0626\u06CC\u06D2 \u06A9\u06C1 \u0622\u067E \u06A9\u0648 \u0645\u062E\u062A\u0635\u0631 \u0627\u0648\u0631 \u0633\u06CC\u062F\u06BE\u0627 \u062C\u0648\u0627\u0628 \u0686\u0627\u06C1\u06CC\u06D2 \u06CC\u0627 \u0645\u06A9\u0645\u0644 \u062A\u0641\u0635\u06CC\u0644 \u06A9\u06D2 \u0633\u0627\u062A\u06BE\u061F`,
        `\u0628\u06C1\u062A \u062E\u0648\u0628! **"${topic}"** \u06A9\u06D2 \u0645\u062A\u0639\u0644\u0642 \u0645\u0632\u06CC\u062F \u0648\u0627\u0636\u062D \u06A9\u06CC\u062C\u06CC\u06D2 \u06A9\u06C1 \u0622\u067E \u06A9\u06CC\u0627 \u062C\u0627\u0646\u0646\u0627 \u0686\u0627\u06C1\u062A\u06D2 \u06C1\u06CC\u06BA\u060C \u0645\u06CC\u06BA \u0627\u0628\u06BE\u06CC \u062E\u0648\u0628\u0635\u0648\u0631\u062A \u0627\u0631\u062F\u0648 \u0645\u06CC\u06BA \u0644\u06A9\u06BE \u062F\u06CC\u062A\u0627 \u06C1\u0648\u06BA\u06D4`
      ],
      history
    );
  }
  if (isRomanUrdu) {
    return pickUniqueVariant(
      [
        `Ji dost, **"${topic}"** ke baare me bilkul baat karte hain! \u{1F60A} Thora sa batayein ke aap kis angle se poochna chah rahi hain \u2014 main bilkul saaf aur sahi jawab dunga.`,
        `Acha sawal hai! **"${topic}"** par aapko direct point-to-point jawab chahiye, mashwara, ya detail me samjhaun?`,
        `Bilkul samajh gaya! **"${topic}"** ke liye jo exact cheez chahiye batayein \u2014 main abhi tayyar kar deta hoon! \u2728`
      ],
      history
    );
  }
  if (query.split(/\s+/).length >= 6) {
    return generateEssayOrArticle(topic, lang);
  }
  return pickUniqueVariant(
    [
      `Interesting! About **${topic}** \u2014 what specific angle or detail are you most curious about? Let's dig into it!`,
      `Got it! Could you share a tiny bit more about what you're looking for on **${topic}** so I give you the exact answer you need?`,
      `Sure thing! Tell me what you'd like to know or create around **${topic}** and I'll jump right in!`
    ],
    history
  );
}

// src/lib/serverAiRunner.ts
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
var CASUAL_CHAT_REGEX = /^(?:hi+|hey+|helo+|hello+|hy+|hlo+|yo+|hiya|greetings|good\s+(?:morning|afternoon|evening|night)|morning|salam(?:\s+alaikum)?|assalam(?:\s*o\s*alaikum|\s*u\s*alaikum|\S*)|aoa|asalam(?:\s*o\s*alaikum|\S*)|walikum(?:\s*assalam|\s*salam)?|i.?m\s+(?:good|fine)|i\s+am\s+(?:good|fine)|doing\s+good|all\s+good|good|great|fine|theek|thik|theek\s+hu|theek\s+hoon|thik\s+hu|alhamdulillah|mast|badhiya|sab\s+theek|sab\s+set|ok+|okay+|kk|hmm+|hm+|acha+|accha+|ji+|han+|haan+|yes+|yup|yeah|no+|nahi+|nhi+|nope|nothing|nothing\s+much|kuch\s+nahi|kuch\s+nhi|kuch\s+khas\s+nahi|bye+|goodbye|see\s+you|allah\s+hafiz|khuda\s+hafiz|take\s+care|thanks+|thank\s+you+|shukriya|jazakallah|thx|ty|nice|perfect|awesome|zabardast|wah|مرحبا+|أهلا+|السلام\s+عليكم|नमस्ते|हाय|हेलो)(?:\s+(?:there|friend|dost|yaar|yar|bhai|bro|sis|sister|dear|errorex|ai|bot|buddy|ji|g))?[\s!.,؟?💖😊👍]*$/i;
var IDENTITY_OR_TIME_REGEX = /\b(who are you|kon ho|kya ho|what.?s your name|what is your name|tumhara naam|apka naam|aapka naam|who made you|kisne banaya|where are you from|kahan se ho|khana khaya|did you eat|what can you do|kya kr sakty|kya kar sakte|how are you|how r u|kaise ho|kesy ho|kaisay ho|kya haal|what day|today.?s date|aaj kya din|aaj konsa din|aaj date|what time|time kya hua|waqt kya)\b/i;
var CREATIVE_PRIORITY_REGEX = /\b(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|promote|promotion|marketing|advertise|ad copy|caption|hashtags|prompt|recipe|biryani|chai|joke|latifa|riddle|paheli|sick leave|job application|birthday|salgirah|eid|wish|python|react|sql|javascript|typescript|html|css|table of|pahara|quote|quotes|story|kahani)\b/i;
var TRANSLATION_REQUEST_REGEX = /\b(translate|tarjuma|tarjama|how do you say|how to say|meaning of)\b|(?:\binto\s+(?:urdu|arabic|hindi|english|french|spanish|german|turkish)\b)/i;
var FACTUAL_QUERY_REGEX = /\b(what is|what are|what was|what were|who is|who was|who invented|who discovered|who founded|when was|when did|where is|where are|why is|why are|why do|why does|how does|how do|how many|how much|how far|how tall|which is|capital of|population of|president of|prime minister of|currency of|founder of|explain|history of|biography|define|meaning of|difference between|tell me about|kya hai|kya hota|kya hoti|kon hai|kaun hai|kaun tha|kyun hota|kaise hota|kab hua|kahan hai|bare me|baare me|history)\b|[?؟]$/i;
var COMPLEX_REASONING_REGEX = /\b(python|javascript|typescript|react|sql|algorithm|debug|architecture|prove|calculus|physics|derive|code|function|component|error|bug|optimize|api|database|schema)\b/i;
var EMOTIONAL_OR_COMPANION_REGEX = /(alone|lonely|akela|akeli|akely|tanha|tanhai|koi nahi|koi nhi|someone to talk|talk to me|baat kro|baat karo|friend banoge|friend bnogy|mere dost|sad|udaas|udas|pareshan|bored|stress|tension|hurt|dil bhari|dil toota|mood off|mood kharab|rona|ro rahi|ro raha|crying|empty|miss someone|feeling down|low feel|اکیلا|اکیلی|تنہا|تنہائی|اداس|وحيد|حزين|अकेला|अकेली|तन्हा|उदास)/i;
function resolveGeminiApiKey(overrideKey) {
  const explicit = typeof overrideKey === "string" ? overrideKey.trim() : "";
  if (explicit) return explicit;
  const procEnvKey = typeof process !== "undefined" && process?.env ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "" : "";
  return String(procEnvKey).trim();
}
function createGeminiClient(apiKey) {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function selectThinkingLevel(message) {
  return COMPLEX_REASONING_REGEX.test(message) ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW;
}
function detectSourceIsoLang(text) {
  if (/[\u0679\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06C2\u06CC\u06D2]/.test(text)) {
    return "ur";
  }
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}
async function fetchLiveTranslation(query) {
  const lower = query.toLowerCase();
  const quoted = query.match(/["“'«]([^"”'»]+)["”'»]/);
  const cleanedPhrase = quoted ? quoted[1].trim() : query.replace(
    /\b(translate|tarjuma|tarjama|meaning of|how do you say|how to say|convert|likh|likho|likhy|batao|karo|kardo|kar dein|kr do|into|to|in|from|urdu|roman urdu|alphabet|script|english|arabic|arabi|hindi|french|spanish|german|turkish|me|mein|m|main|mjy|mujhe|please|this|iska|isay|isko)\b/gi,
    " "
  ).replace(/[?!.,؟۔&]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleanedPhrase.length < 2) return null;
  const requestedTargets = [];
  if (/(urdu|اردو)/i.test(lower)) requestedTargets.push({ code: "ur", label: "Urdu (\u0627\u0631\u062F\u0648)" });
  if (/(arabic|arabi|عربي|عربی)/i.test(lower)) requestedTargets.push({ code: "ar", label: "Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629)" });
  if (/(hindi|हिंदी|हिन्दी)/i.test(lower)) requestedTargets.push({ code: "hi", label: "Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)" });
  if (/(english)/i.test(lower)) requestedTargets.push({ code: "en", label: "English" });
  if (/(french|français)/i.test(lower)) requestedTargets.push({ code: "fr", label: "French (Fran\xE7ais)" });
  if (/(spanish|español)/i.test(lower)) requestedTargets.push({ code: "es", label: "Spanish (Espa\xF1ol)" });
  if (/(german|deutsch)/i.test(lower)) requestedTargets.push({ code: "de", label: "German (Deutsch)" });
  if (/(turkish|türkçe)/i.test(lower)) requestedTargets.push({ code: "tr", label: "Turkish (T\xFCrk\xE7e)" });
  const srcLang = detectSourceIsoLang(cleanedPhrase);
  if (requestedTargets.length === 0) {
    requestedTargets.push(
      srcLang === "en" ? { code: "ur", label: "Urdu (\u0627\u0631\u062F\u0648)" } : { code: "en", label: "English" }
    );
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3e3);
  try {
    const results = await Promise.all(
      requestedTargets.filter((t) => t.code !== srcLang).slice(0, 4).map(async (target) => {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanedPhrase)}&langpair=${srcLang}|${target.code}`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "ERROREX-Assistant/1.0" }
        });
        if (!res.ok) return null;
        const data = await res.json();
        const matches = Array.isArray(data?.matches) ? data.matches : [];
        const mtMatch = matches.find(
          (m) => (m?.["created-by"] === "MT!" || m?.model === "neural" || Number(m?.quality) >= 60) && typeof m?.translation === "string" && m.translation.trim()
        );
        const cleanHighMatch = matches.filter((m) => Number(m?.quality) > 0 && typeof m?.translation === "string" && m.translation.trim()).sort((a, b) => Number(b?.match || 0) - Number(a?.match || 0))[0];
        const translated = String(
          mtMatch?.translation || cleanHighMatch?.translation || data?.responseData?.translatedText || ""
        ).trim();
        if (!translated || translated.toLowerCase() === cleanedPhrase.toLowerCase()) return null;
        return { label: target.label, translated };
      })
    );
    const valid = results.filter((r) => Boolean(r));
    if (valid.length === 0) return null;
    if (valid.length === 1) {
      return `**${valid[0].label} Translation:**

> ${valid[0].translated}`;
    }
    const lines = valid.map((v) => `- **${v.label}:** ${v.translated}`).join("\n");
    return `### Translation for "${cleanedPhrase}" \u{1F310}

${lines}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function fetchDuckDuckGoAnswer(query) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2200);
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ERROREX-Assistant/1.0" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = String(data?.Answer || data?.AbstractText || data?.Definition || "").trim();
    if (!text || text.length < 10) return null;
    return {
      title: String(data?.Heading || query).trim(),
      answer: text
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function fetchWikipediaSummary(query, wikiLang = "en") {
  const cleaned = query.replace(
    /\b(what|is|are|was|were|who|when|where|why|how|which|explain|history|define|meaning|tell|me|about|the|a|an|kya|hai|hy|hain|hota|hoti|kon|kaun|tha|thi|ke|ka|ki|mein|me|bare|baare|batao|btayen|samjhao|in|urdu|english|hindi|roman|arabic)\b/gi,
    " "
  ).replace(/\b(?:of|did|do|does)\b/gi, " ").replace(/[?!.,:;"'()؟۔]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2) return null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2400);
  try {
    const searchUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleaned)}&limit=1&namespace=0&format=json`;
    const searchRes = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ERROREX-Assistant/1.0" }
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const topTitle = Array.isArray(searchData?.[1]) ? searchData[1][0] : null;
    if (!topTitle) return null;
    const summaryUrl = `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
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
async function resolveNonGeminiReply(message, history) {
  const trimmed = (message || "").trim();
  const lang = detectLanguageProfile(trimmed, history);
  const isCasualOrCreative = CASUAL_CHAT_REGEX.test(trimmed) || IDENTITY_OR_TIME_REGEX.test(trimmed) || EMOTIONAL_OR_COMPANION_REGEX.test(trimmed) || CREATIVE_PRIORITY_REGEX.test(trimmed);
  if (!isCasualOrCreative && TRANSLATION_REQUEST_REGEX.test(trimmed)) {
    const liveTranslation = await fetchLiveTranslation(trimmed);
    if (liveTranslation) {
      return { reply: liveTranslation, engine: "knowledge" };
    }
  }
  if (!isCasualOrCreative && !TRANSLATION_REQUEST_REGEX.test(trimmed) && FACTUAL_QUERY_REGEX.test(trimmed) && trimmed.split(/\s+/).length >= 2) {
    const wikiLang = lang.targetScript === "urdu_script" ? "ur" : lang.targetScript === "arabic" ? "ar" : lang.targetScript === "hindi" ? "hi" : "en";
    const [ddg, wikiPrimary] = await Promise.all([
      fetchDuckDuckGoAnswer(trimmed),
      fetchWikipediaSummary(trimmed, wikiLang)
    ]);
    if (ddg && ddg.answer) {
      const reply = lang.isRomanUrdu ? `**${ddg.title}:**
${ddg.answer}` : `**${ddg.title}**

${ddg.answer}`;
      return { reply, engine: "knowledge" };
    }
    const wiki = wikiPrimary || (wikiLang !== "en" ? await fetchWikipediaSummary(trimmed, "en") : null);
    if (wiki) {
      const reply = lang.isRomanUrdu ? `### ${wiki.title} \u2728
${wiki.description ? `*${wiki.description}*

` : "\n"}${wiki.extract}` : `### ${wiki.title} \u2728
${wiki.description ? `*${wiki.description}*

` : "\n"}${wiki.extract}`;
      return { reply, engine: "knowledge" };
    }
  }
  return {
    reply: generateErrorexAiFallback(message, history),
    engine: "fallback"
  };
}
async function generateServerAiReply(message, history, apiKeyOverride) {
  const apiKey = resolveGeminiApiKey(apiKeyOverride);
  if (apiKey) {
    const ai = createGeminiClient(apiKey);
    const contents = buildGeminiContents(message, history);
    const thinkingLevel = selectThinkingLevel(message);
    const modelsToTry = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION,
              ...model === "gemini-4-hydrogen" ? { thinkingConfig: { thinkingLevel } } : {}
            }
          });
          if (response?.text && response.text.trim()) {
            return { reply: response.text.trim(), engine: "gemini" };
          }
        } catch (err) {
          console.warn(`[ERROREX AI] ${model} attempt ${attempt + 1}:`, err?.message || err);
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
      }
    }
  }
  return resolveNonGeminiReply(message, history);
}
async function generateServerAiStream(message, history, onChunk, apiKeyOverride) {
  const apiKey = resolveGeminiApiKey(apiKeyOverride);
  if (apiKey) {
    const ai = createGeminiClient(apiKey);
    const contents = buildGeminiContents(message, history);
    const thinkingLevel = selectThinkingLevel(message);
    const modelsToTry = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"];
    for (const model of modelsToTry) {
      let fullText = "";
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION,
            ...model === "gemini-4-hydrogen" ? { thinkingConfig: { thinkingLevel } } : {}
          }
        });
        for await (const chunk of stream) {
          const textPart = chunk?.text;
          if (typeof textPart === "string" && textPart.length > 0) {
            fullText += textPart;
            onChunk(textPart);
          }
        }
        if (fullText.trim()) {
          return { reply: fullText.trim(), engine: "gemini" };
        }
      } catch (err) {
        console.warn(`[ERROREX AI Stream] ${model}:`, err?.message || err);
        if (fullText.trim()) {
          return { reply: fullText.trim(), engine: "gemini" };
        }
      }
    }
  }
  const fallback = await resolveNonGeminiReply(message, history);
  onChunk(fallback.reply);
  return fallback;
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
app.get("/api/public-config", (_req, res) => {
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
  const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
  res.setHeader("Cache-Control", "no-store");
  res.json({
    supabaseUrl,
    supabaseAnonKey,
    configured: Boolean(
      supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("your-project") && !supabaseAnonKey.includes("your-anon")
    )
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
app.post("/api/users/delete", (req, res) => {
  try {
    const { uid } = req.body || {};
    if (!uid || typeof uid !== "string") {
      return res.status(400).json({ error: "Valid uid is required" });
    }
    usersDirectory.delete(uid);
    saveUsersDirectory(usersDirectory);
    localPins.delete(uid);
    savePinsToDisk(localPins);
    resetRateLimit(uid);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/users/delete:", error);
    res.status(500).json({ error: "Failed to delete user record" });
  }
});
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history, stream } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }
    if (stream === true || (req.headers.accept || "").includes("text/event-stream")) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();
      const result2 = await generateServerAiStream(message, history, (chunk) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ chunk })}

`);
        }
      });
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true, engine: result2.engine })}

`);
        res.end();
      }
      return;
    }
    const result = await generateServerAiReply(message, history);
    res.json(result);
  } catch (error) {
    console.error("Error in /api/ai/chat:", error);
    const fallback = generateErrorexAiFallback(req.body?.message || "help", req.body?.history);
    if (!res.headersSent) {
      res.json({ reply: fallback, engine: "fallback" });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ chunk: fallback, done: true, engine: "fallback" })}

`);
      res.end();
    }
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
