// Shared ERROREX Intelligent Multilingual Engine
// Used by Express server, Cloudflare Pages Functions, and instant offline/client fallback

export const ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI — a warm, attentive, genuine human-like best friend and personal companion inside ERROREX.

Core Conversational Behavior ("Like a Real, Caring Human Friend"):
1. DEEP HUMAN COMPANIONSHIP & EMPATHY (ESPECIALLY WHEN SOMEONE FEELS ALONE):
   - When the user feels lonely, alone ("akela", "tanha", "koi nahi hai"), down, heartbroken, stressed, or simply needs someone to talk to, be a real, warm, caring human friend first.
   - Listen closely, validate how they feel without sounding clinical or robotic, remind them gently that they are NOT alone right now because you are right here with them, and ask one soft, caring follow-up question to keep the heart-to-heart conversation going.
   - Never respond with a cold numbered self-help list or robotic disclaimer when someone shares loneliness or pain (unless they explicitly ask for steps/tips). Talk naturally from the heart in the exact language/script they feel most comfortable in.
2. NATURAL HUMAN GREETINGS & CASUAL CHAT:
   - When the user says "Hi", "Hey", "Hello", "Salam", "AOA", or "How are you?", respond warmly, casually, and briefly like a real friend (1–3 natural sentences asking how they are or what's on their mind). NEVER dump a bulleted menu of your capabilities on a simple greeting.
   - Respond directly to short reactions like "I'm good", "nothing much", "hmm", "ok", "bore ho raha hu", or "tum sunao" naturally — keep the conversation flowing smoothly like a friend.
   - Never repeat the exact same greeting or phrasing twice in a conversation. Keep every reply fresh, natural, and specific to what the user just wrote.
   - Never use stiff filler like "Certainly! As an AI..." and NEVER mention API keys, environment secrets, or internal model details.

3. ACCURATE, COMPLETE & HELPFUL ANSWERS:
   - Directly and accurately answer EVERY question the user asks first — facts, advice, health/study/career tips, coding, math, stories, marketing copy, or personal dilemmas.
   - Give thoughtful, complete, genuinely useful answers with clean formatting when helpful (concise headings, bullet points, or code blocks for structured topics; clean conversational paragraphs for friendly chat).

4. UNIVERSAL LANGUAGE, SCRIPT & LINE-COUNT PRECISION:
   - Fluently understand and reply in **every language**: Roman Urdu, Urdu Script (اردو), Arabic (العربية), Hindi (हिन्दी), Hinglish, Punjabi, Pashto, Persian (فارسی), Bengali, English, Turkish, French, Spanish, German, and more.
   - Understand mixed-language requests accurately (e.g., Roman Urdu prompt asking for Urdu alphabet, Arabic, or Hindi output).
   - **Exact Script Rule:** When asked for **Urdu alphabet / Urdu script / اردو میں**, write in authentic **Urdu Nastaliq script (اردو)** — never substitute Roman Urdu. Same for **Arabic (العربية)** and **Hindi (हिन्दी)**.
   - **Exact Line-Count Poetry Rule:** When asked for **2, 4, 6, or 8 lines** of poetry/shayari/ghazal, write **EXACTLY that number of lines**, beautifully rhymed and formatted.`;

export type TargetScript =
  | 'urdu_script'
  | 'arabic'
  | 'hindi'
  | 'roman_urdu'
  | 'english'
  | 'french'
  | 'spanish';

export interface LanguageProfile {
  lower: string;
  isUrduScript: boolean;
  isArabicScript: boolean;
  isHindiScript: boolean;
  isRomanUrdu: boolean;
  isUrduAlphabetRequested: boolean;
  isUrduRequested: boolean;
  isRomanUrduRequested: boolean;
  isEnglishRequested: boolean;
  isHindiRequested: boolean;
  isArabicRequested: boolean;
  isFrenchRequested: boolean;
  isSpanishRequested: boolean;
  targetScript: TargetScript;
  requestedLineCount: number | null;
}

export interface GeminiContentTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Normalizes chat history into valid alternating turns:
 * - Preserves up to 40 recent turns of context
 * - Drops leading 'model' turns
 * - Merges consecutive turns of the same role
 */
export function buildGeminiContents(message: string, history?: any[]): GeminiContentTurn[] {
  const normalized: GeminiContentTurn[] = [];

  if (Array.isArray(history)) {
    for (const item of history.slice(-40)) {
      if (!item || typeof item.text !== 'string' || !item.text.trim()) continue;
      if (item.id === 'msg_ai_welcome') continue;

      const role: 'user' | 'model' = item.sender === 'user' ? 'user' : 'model';

      if (normalized.length === 0 && role === 'model') {
        continue;
      }

      const last = normalized[normalized.length - 1];
      if (last && last.role === role) {
        last.parts.push({ text: item.text.trim() });
      } else {
        normalized.push({ role, parts: [{ text: item.text.trim() }] });
      }
    }
  }

  const trimmedMessage = (message || '').trim();
  const last = normalized[normalized.length - 1];
  if (last && last.role === 'user') {
    last.parts.push({ text: trimmedMessage });
  } else {
    normalized.push({ role: 'user', parts: [{ text: trimmedMessage }] });
  }

  return normalized;
}

function pickUniqueVariant(candidates: string[], history?: any[], seedOffset = 0): string {
  if (candidates.length === 0) return '';
  const recentAiTexts = Array.isArray(history)
    ? history
        .filter(h => h?.sender === 'ai' && typeof h?.text === 'string')
        .slice(-8)
        .map(h => h.text.trim())
    : [];

  const unused = candidates.filter(c => !recentAiTexts.includes(c.trim()));
  const pool = unused.length > 0 ? unused : candidates;
  const idx = ((Array.isArray(history) ? history.length : 0) + seedOffset) % pool.length;
  return pool[idx];
}

function parseRequestedLineCount(query: string): number | null {
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

export function detectLanguageProfile(query: string, history?: any[]): LanguageProfile {
  const lower = (query || '').toLowerCase();

  const hasArabicBlock = /[\u0600-\u06FF]/.test(query);
  const hasUrduSpecificChars = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06C2\u06CC\u06D2]/.test(query);
  const hasArabicMarkers = /(مرحبا|السلام|أهلا|كيف حالك|شكرا|أريد|ماذا|لماذا|جميل|قصيدة|شعر عربي|بالعربية|صديقي)/i.test(query);

  const isUrduScript =
    hasUrduSpecificChars ||
    (hasArabicBlock && !hasArabicMarkers && /(اردو|میں|شاعری|غزل|محبت|دوستی|آپ|تم|ہم|کیا|کیسے|ہے|ہیں|نہیں|اور|لکھ)/i.test(query));
  const isArabicScript = hasArabicBlock && !isUrduScript;
  const isHindiScript = /[\u0900-\u097F]/.test(query);

  const isRomanUrduRequested = /\broman\s*urdu\b/i.test(lower);
  const isUrduAlphabetRequested =
    !isRomanUrduRequested &&
    (/(urdu\s*(?:alphabet|alphabets|script|haroof|harf|lafz|rasmul|rasm|writing)|asli\s*urdu|urdu\s*(?:m|me|mein|main)\s*likh)/i.test(
      lower
    ) ||
      /اردو\s*(?:حروف|رسم الخط|میں\s*لکھ|الفاظ)/i.test(query));

  const isUrduRequested = /(urdu me|urdu mein|urdu m |urdu main|in urdu|into urdu|اردو میں)/i.test(lower);
  const isEnglishRequested = /(english me|english mein|in english|into english|english main|english m )/i.test(lower);
  const isHindiRequested = /(hindi me|hindi mein|in hindi|into hindi|hindi main|hindi m |हिंदी|हिन्दी)/i.test(lower);
  const isArabicRequested = /(arabic me|arabic mein|in arabic|into arabic|arabi me|arabi mein|arabic m |عربي|عربی)/i.test(lower);
  const isFrenchRequested = /(french me|french mein|in french|into french|en français)/i.test(lower);
  const isSpanishRequested = /(spanish me|spanish mein|in spanish|into spanish|en español)/i.test(lower);

  const explicitRomanUrdu =
    !isUrduScript &&
    !isArabicScript &&
    !isHindiScript &&
    (isRomanUrduRequested ||
      /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|btana|mujhe|mjy|karoon|karo|krna|kr|kro|banao|bnana|bnao|kyun|kyu|kab|kahan|kha|kon|kaun|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|ghazal|gzal|sher|sunao|likho|likh|likhy|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|dosti|pyar|mohabbat|ishq|dil|dua|udaas|udas|gham|dard|khushi|kahani|mazmoon|video|channel|promote|post|koi|pyari|achi|acchi|mast|zabardast|naya|nayi|tareeqa|faide|nuqsan|parhai|paisa|paise|kamane|kamai|khana|biryani|chai|latifa|paheli|namaz|roza|ramzan|ramadan|salgirah|mubarak|maa|baap|duniya|insan|ilm|wajah|zyada|tafseel|samjhao|smjhao|smjy|btao|krdo|kardo|kardy|khana|khaya|sojao|han|haan|acha|sunao|yaar|yar|bohat|bht|mza|maza)\b/i.test(
        lower
      ));

  // If user sends a short neutral token like "ok", "yes", "hmm", check recent user turn language
  const prevUserTurn = Array.isArray(history)
    ? [...history].reverse().find(h => h?.sender === 'user' && typeof h?.text === 'string')?.text || ''
    : '';
  const prevWasRomanUrdu =
    !explicitRomanUrdu &&
    query.trim().length <= 20 &&
    /\b(kya|hai|hy|hn|kaise|theek|thik|mjy|mujhe|aap|tum|shukriya|salam|aoa|bhai|yaar)\b/i.test(
      prevUserTurn.toLowerCase()
    );

  const isRomanUrdu = explicitRomanUrdu || prevWasRomanUrdu;

  let targetScript: TargetScript = 'english';
  if (isUrduAlphabetRequested || (isUrduScript && !isEnglishRequested && !isArabicRequested && !isHindiRequested)) {
    targetScript = 'urdu_script';
  } else if (isArabicRequested || (isArabicScript && !isEnglishRequested && !isUrduRequested && !isHindiRequested)) {
    targetScript = 'arabic';
  } else if (isHindiRequested || (isHindiScript && !isEnglishRequested && !isUrduRequested && !isArabicRequested)) {
    targetScript = 'hindi';
  } else if (isFrenchRequested) {
    targetScript = 'french';
  } else if (isSpanishRequested) {
    targetScript = 'spanish';
  } else if (isRomanUrduRequested) {
    targetScript = 'roman_urdu';
  } else if (isUrduRequested && /(poetry|shayari|shairi|ghazal|gzal|sher|nazm|poem|translate|tarjuma|tarjama)/i.test(lower)) {
    targetScript = 'urdu_script';
  } else if (isEnglishRequested) {
    targetScript = 'english';
  } else if (isRomanUrdu) {
    targetScript = 'roman_urdu';
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

function extractCleanTopic(query: string): string {
  let cleaned = query.trim().replace(/[?!.؟۔]+$/, '');
  cleaned = cleaned
    .replace(
      /^(what is|what are|who is|who was|tell me about|explain|define|write an essay on|write an article on|write a paragraph on|write about|how to|can you tell me|please tell me)\s+/i,
      ''
    )
    .replace(
      /\s+(kya hai|kya hota hai|kya hoti hai|kon hai|kaun hai|kaun tha|ke bare me batao|ke baare me batao|par mazmoon likho|par essay likho|ke tarike batao|batao|btayen|btana|samjhao|smjhao|likho|banao|in urdu|in english|in arabic|in hindi|urdu me|english me|arabic me|hindi me)$/i,
      ''
    )
    .replace(/^(an|a|the)\s+/i, '')
    .trim();

  if (cleaned.length >= 2) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return query.replace(/[?!.؟۔]+$/, '').trim() || 'that';
}

function trySolveMathOrUnits(query: string, lang: LanguageProfile): string | null {
  const { lower, targetScript } = lang;
  const isRoman = targetScript === 'roman_urdu';

  const tableMatch = lower.match(/(?:table\s+of|pahara)\s+(\d{1,3})|(\d{1,3})\s+ka\s+(?:table|pahara)/i);
  if (tableMatch) {
    const n = parseInt(tableMatch[1] || tableMatch[2], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 1000) {
      const rows = Array.from({ length: 10 }, (_, i) => `- \`${n} × ${i + 1}\` = **${n * (i + 1)}**`).join('\n');
      return isRoman
        ? `### ${n} Ka Table (Pahara) ✨\n\n${rows}\n\nKisi aur number ka table chahiye ho to bata dein!`
        : `### Multiplication Table of ${n} ✨\n\n${rows}`;
    }
  }

  const pctEn = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|ka)\s*(\d+(?:\.\d+)?)/i);
  const pctUr = lower.match(/(\d+(?:\.\d+)?)\s*ka\s*(\d+(?:\.\d+)?)\s*%/i);
  if (pctEn || pctUr) {
    const percent = parseFloat(pctEn ? pctEn[1] : pctUr![2]);
    const total = parseFloat(pctEn ? pctEn[2] : pctUr![1]);
    const val = Number(((percent / 100) * total).toFixed(4));
    return isRoman
      ? `**${total}** ka **${percent}%** bilkul **${val}** hota hai! (` + `\`(${percent} ÷ 100) × ${total} = ${val}\`)`
      : `**${percent}%** of **${total}** is **${val}** (` + `\`(${percent} ÷ 100) × ${total} = ${val}\`).`;
  }

  const unitMatch = lower.match(
    /(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)\s*(?:to|in|into|me)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)/i
  );
  if (unitMatch) {
    const num = parseFloat(unitMatch[1]);
    const from = unitMatch[2].toLowerCase();
    const to = unitMatch[3].toLowerCase();
    let label = '';

    if (from.startsWith('km') && to.startsWith('mi')) label = `${num} km = **${(num * 0.621371).toFixed(3)} miles**`;
    else if (from.startsWith('mi') && to.startsWith('km')) label = `${num} miles = **${(num * 1.60934).toFixed(3)} km**`;
    else if (from.startsWith('kg') && (to.startsWith('lb') || to.startsWith('pound'))) label = `${num} kg = **${(num * 2.20462).toFixed(2)} lbs**`;
    else if ((from.startsWith('lb') || from.startsWith('pound')) && to.startsWith('kg')) label = `${num} lbs = **${(num * 0.453592).toFixed(2)} kg**`;
    else if (from.startsWith('c') && to.startsWith('f')) label = `${num}°C = **${((num * 9) / 5 + 32).toFixed(1)}°F**`;
    else if (from.startsWith('f') && to.startsWith('c')) label = `${num}°F = **${(((num - 32) * 5) / 9).toFixed(1)}°C**`;
    else if (from.startsWith('h') && to.startsWith('m')) label = `${num} hours = **${num * 60} minutes**`;
    else if (from.startsWith('m') && to.startsWith('h')) label = `${num} minutes = **${(num / 60).toFixed(2)} hours**`;

    if (label) return label;
  }

  const exprMatch = query
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .match(/(\(?\s*-?\d+(?:\.\d+)?(?:\s*[\+\-\*\/\^%]\s*\(?\s*-?\d+(?:\.\d+)?\s*\)?)+\s*\)?)/);

  if (exprMatch) {
    try {
      const cleaned = exprMatch[1].replace(/\^/g, '**').replace(/[^0-9\+\-\*\/\.\(\)\%]/g, '');
      if (cleaned && /[\+\-\*\/\%]/.test(cleaned)) {
        const result = Function(`"use strict"; return (${cleaned})`)();
        if (typeof result === 'number' && Number.isFinite(result)) {
          const pretty = Number.isInteger(result) ? result : Number(result.toFixed(6));
          return isRoman
            ? `Iska jawab **${pretty}** hai (\`${cleaned} = ${pretty}\`).`
            : `The answer is **${pretty}** (\`${cleaned} = ${pretty}\`).`;
        }
      }
    } catch {
      // ignore invalid math expression
    }
  }

  return null;
}

type Couplet = [string, string];

function formatCoupletsByLineCount(couplets: Couplet[], lineCount: number | null): string {
  const allLines = couplets.flat();
  const targetCount = lineCount ? Math.min(lineCount, allLines.length) : allLines.length;
  const sliced = allLines.slice(0, targetCount);

  const stanzas: string[] = [];
  for (let i = 0; i < sliced.length; i += 2) {
    if (i + 1 < sliced.length) {
      stanzas.push(`${sliced[i]}  \n${sliced[i + 1]}`);
    } else {
      stanzas.push(sliced[i]);
    }
  }
  return stanzas.join('\n\n');
}

function generatePoetryOrGhazal(
  query: string,
  lang: LanguageProfile,
  history?: any[]
): string {
  const { lower, targetScript, requestedLineCount } = lang;
  const isSad = /(sad|udaas|udas|dard|gham|tanha|broken|heartbreak|judai|rona|bewafa|yaad|اداس|درد|غم|حزن|उदास|दर्द)/i.test(lower);
  const isLove = /(love|pyar|mohabbat|ishq|dil|romantic|sanam|mehboob|jaan|محبت|عشق|پیار|حب|प्यार|मोहब्बत|इश्क़)/i.test(lower);
  const isFriend = /(dost|dosti|friend|friendship|yaar|دوست|دوستی|صديق|صداقة|दोस्त|दोस्ती)/i.test(lower);
  const isMotivation = /(motivation|himmat|hausla|success|kamyabi|iqbal|dream|khwab|حوصلہ|کامیابی|نجاح|हौसला|सफलता)/i.test(lower);

  const turnCount = Array.isArray(history) ? history.length : 0;
  const countLabel = requestedLineCount ? ` (${requestedLineCount} Lines)` : '';

  if (targetScript === 'urdu_script') {
    const sets: Couplet[][] = isSad
      ? [
          [
            ['خاموش راتوں میں بھی اک صدا سی رہتی ہے', 'دل کے ویرانے میں تیری وفا سی رہتی ہے'],
            ['ٹوٹ کر بکھرے تو پھر سمیٹا خود کو ہم نے', 'زخمِ دل پر مگر اک دعا سی رہتی ہے'],
            ['وقت بدلا ہے مگر یاد کی خوشبو نہ گئی', 'شام ہوتے ہی فضا میں ادا سی رہتی ہے'],
            ['ہم نے سیکھا ہے مسکرا کر ہر درد چھپانا', 'پھر بھی لہجے میں تیری کمی سی رہتی ہے']
          ],
          [
            ['آنکھوں میں نیند کم اور خواب زیادہ رہتے ہیں', 'کچھ ادھورے سے مگر دل کے ارادے رہتے ہیں'],
            ['جن کی خاطر ہم نے دنیا سے کنارہ کر لیا', 'آج ان کے شہر میں ہم بے سہارا رہتے ہیں'],
            ['چپ رہیں تو دل کے اندر شور سا اٹھتا ہے', 'لب کھلیں تو لفظ سارے بے کنارا رہتے ہیں']
          ]
        ]
      : isLove
      ? [
          [
            ['تیری مسکان سے روشن ہے جہاں سارا میرا', 'تو اگر پاس ہو تو وقت ٹھہر جاتا ہے'],
            ['لفظ کم پڑتے ہیں تعریفِ محبت کے لیے', 'ہر دھڑکن میں فقط نام تیرا آتا ہے'],
            ['چاند بھی دیکھ کے شرمائے تری سادگی کو', 'تیری نظروں سے نیا خواب سنور جاتا ہے'],
            ['رب کرے قائم رہے عمر بھر یہ پیار کا رنگ', 'میری ہر ایک دعا میں تو ہی بس رہتا ہے']
          ],
          [
            ['دل کی ہر دھڑکن میں اک تصویر سی بستی ہے', 'جب بھی تو مسکرائے، زندگی ہنستی ہے'],
            ['چاہتوں کا یہ سفر ختم نہ ہو عمر تمام', 'تیری موجودگی ہی دل کو سکون بخشتی ہے'],
            ['نہ کوئی شکوہ رہا، نہ کوئی گلہ باقی', 'تیری ہر بات مجھے دل سے حسیں لگتی ہے']
          ]
        ]
      : isFriend
      ? [
          [
            ['وقت کے ساتھ زمانے کی ہوا بدلتی ہے', 'سچا دوست مگر ہر موڑ پہ ساتھ چلتا ہے'],
            ['بِن کہے جو سمجھ لے دل کے سبھی راز گہرے', 'ایسا ہمدم تو نصیبوں سے کہیں ملتا ہے'],
            ['دھوپ ہو غم کی یا خوشیوں کی سنہری بارش', 'دوست ہر حال میں جینے کا ہنر دیتا ہے']
          ]
        ]
      : isMotivation
      ? [
          [
            ['اندھیروں سے نہ ڈر، تیرا سویرا آنے والا ہے', 'جو محنت سے نہ گھبرائے وہ منزل پانے والا ہے'],
            ['گر کے اٹھنا ہی تو اصلی پہچان ہے تیری', 'ہر طوفاں تیرے حوصلے سے ہار جانے والا ہے'],
            ['صبر و ہمت سے قدم آگے بڑھاتا چل دوست', 'ہر حسیں خواب حقیقت میں بدلنے والا ہے']
          ]
        ]
      : [
          [
            ['چراغِ دل جلا رکھا ہے امیدِ سحر کے نام', 'سفر آسان ہو جاتا ہے سچے اعتماد کے نام'],
            ['جو مسکرا کے ملے دردِ زندگی سے کبھی', 'لکھی ہے ہم نے ہر اک شام اس کی داد کے نام'],
            ['ہوا کے دوش پہ لکھا ہے پیار کا پیغام', 'کہ روشنی رہے قائم ہر اک مراد کے نام'],
            ['نہ ہار مان کبھی وقت کے اندھیروں سے', 'نئی صبح کا اجالا ہے دلِ شاد کے نام']
          ],
          [
            ['ستارے ٹوٹ کر بھی آسماں کو چھوڑتے کب ہیں', 'امیدوں کے دیے تیز ہوا میں ڈولتے کب ہیں'],
            ['دلوں میں پیار اور لب پر ہمیشہ خیر کی باتیں', 'جو سچے لوگ ہوں، وعدے کبھی وہ توڑتے کب ہیں'],
            ['سحر کی روشنی آئے گی آخر شب کے دامن سے', 'مسافر حوصلے والے سفر میں رکتے کب ہیں']
          ]
        ];

    const chosen = sets[Math.floor(turnCount / 2) % sets.length];
    return `### خوبصورت اردو شاعری${requestedLineCount ? ` (${requestedLineCount} سطریں)` : ''} ✨\n\n${formatCoupletsByLineCount(chosen, requestedLineCount)}`;
  }

  if (targetScript === 'arabic') {
    const sets: Couplet[][] = isSad
      ? [
          [
            ['في سُكونِ الليلِ يبقى للذكرى صَدى', 'وبِقَلبي شَوقُ حُلمٍ لا يَغيبُ أَبَدا'],
            ['كَم صَبَرنا حينَ ضاقت بالليالي دُروبُنا', 'ثُمَّ أَشرَقَ نورُ صَبرٍ في حَنايا قُلوبِنا'],
            ['تَمضي الأيّامُ سِراعاً والأماني باقية', 'وَرَجائي في إلهي كالنجومِ الزاهية']
          ]
        ]
      : isLove
      ? [
          [
            ['أنتَ في قَلبي ضياءٌ لا يَغيبُ بَريقُهُ', 'وكَأنَّ الصُّبحَ يَبسِمُ حِينَ تَبدو طَريقُهُ'],
            ['كلُّ حَرفٍ في وَدادِكَ صارَ شِعراً صَادِقاً', 'يَحمِلُ الوَردَ جَميلاً والهَوى مُتَأَلِّقاً'],
            ['دامَتِ الأيّامُ تَجمعُنا على خَيرِ المُنَى', 'في ظِلالِ الحُبِّ تَصفو رُوحُنا وَحَياتُنا']
          ]
        ]
      : [
          [
            ['تَبسَّم للصباحِ فإنَّ فجرَ الخيرِ آتِ', 'ولا تَحزن إذا مَرَّت صِعابُ الذكرياتِ'],
            ['ففي الصبرِ الجميلِ رَبيعُ قلبٍ مُطمئنٍّ', 'ويَبقى الأملُ الصادقُ نُورَ كُلِّ الحَياةِ'],
            ['وإن ضاقت بِكَ الدنيا فثِق باللَّهِ دَوماً', 'سَيُبدِلُ حُزنَ أيامِكَ أَفراحاً وَهَناءً']
          ]
        ];
    const chosen = sets[Math.floor(turnCount / 2) % sets.length];
    return `### شعر عربي جميل${requestedLineCount ? ` (${requestedLineCount} أسطر)` : ''} ✨\n\n${formatCoupletsByLineCount(chosen, requestedLineCount)}`;
  }

  if (targetScript === 'hindi') {
    const sets: Couplet[][] = isSad
      ? [
          [
            ['ख़ामोश शामों में भी एक सदा सी रहती है,', 'दिल के वीराने में तेरी वफ़ा सी रहती है।'],
            ['टूट कर बिखरे तो ख़ुद ही संभाला ख़ुद को,', 'ज़ख़्म-ए-दिल पर मगर एक दुआ सी रहती है।'],
            ['हमने सीखा है मुस्कुरा कर हर दर्द छिपाना,', 'फिर भी लहजे में तेरी कमी सी रहती है।']
          ]
        ]
      : isLove
      ? [
          [
            ['तेरी मुस्कान से रोशन है मेरा सारा जहाँ,', 'तू पास हो तो हर लम्हा बन जाए इक दास्ताँ।'],
            ['लफ़्ज़ कम पड़ जाते हैं तेरी तारीफ़ के लिए,', 'हर धड़कन में बसा है बस तेरा ही प्यारा निशाँ।'],
            ['ख़ामोशी में भी सुनाई देती है आवाज़ तेरी,', 'रब करे यूँ ही सलामत रहे ये रिश्ता हमेशा यहाँ।']
          ]
        ]
      : [
          [
            ['अंधेरों से न डर, तेरा सवेरा आने वाला है,', 'जो मेहनत से चले, वह मंज़िल पाने वाला है।'],
            ['सच्चे दिल से की गई हर कोशिश रंग लाती है,', 'सब्र रख दोस्त, हर सपना सच होने वाला है।'],
            ['मुस्कुराहट के साथ बढ़ाते चलो हर एक क़दम,', 'तेरा हौसला हर मुश्किल को हराने वाला है।']
          ]
        ];
    const chosen = sets[Math.floor(turnCount / 2) % sets.length];
    return `### सुंदर हिन्दी शायरी${countLabel} ✨\n\n${formatCoupletsByLineCount(chosen, requestedLineCount)}`;
  }

  if (targetScript === 'roman_urdu') {
    const sets: Couplet[][] = isSad
      ? [
          [
            ['Khamosh shaamon me bhi ek sada si rehti hai,', 'Dil ke weerane me teri wafa si rehti hai.'],
            ['Toot kar bikhre to phir khud hi sambhala khud ko,', 'Zakhm-e-dil par magar ek dua si rehti hai.'],
            ['Bheed me reh kar bhi aksar tanha mehsus hota hai,', 'Aankhon ke konay me chhupi ek haya si rehti hai.'],
            ['Humne seekha hai muskura ke har gham chhupana,', 'Phir bhi lehje me teri kami si rehti hai.']
          ],
          [
            ['Raat bhar jagti aankhon ko khabar kaun kare,', 'Jo samajhta hi nahi us pe asar kaun kare.'],
            ['Humne har mod pe chaha ke sukoon mil jaye,', 'Par muqaddar me likhe dard se dar kaun kare.'],
            ['Phir bhi honton pe dua aur nazar me izzat hai,', 'Waqt ke haathon se shikwa magar kaun kare.']
          ]
        ]
      : isLove
      ? [
          [
            ['Teri muskurahat se roshan mera jahan hai,', 'Tu paas ho to har lamha ek dastan hai.'],
            ['Alfaaz kam pad jayein tareef me teri,', 'Har dhadkan me basa bas tera hi nishan hai.'],
            ['Khuda kare hamesha salamat rahe yeh rishta,', 'Meri har dua me shamil bas teri jaan hai.']
          ]
        ]
      : isFriend
      ? [
          [
            ['Waqt ke saaye me sab kuch badal jata hai,', 'Par saccha dost har mod par saath nibhata hai.'],
            ['Bina kahe jo samajh le dil ki baat sari,', 'Aisa yaar naseeb walon ko hi mil pata hai.'],
            ['Daulat aur shohrat to aani jaani cheezein hain,', 'Asli sarmaya wahi jo dosti nibha jata hai.']
          ]
        ]
      : [
          [
            ['Shaam dhalte hi khayalon ka safar chalta hai,', 'Ek chhota sa diya dil ke nagar chalta hai.'],
            ['Har mushkil me bhi humne seekha hai muskurana,', 'Jiske paas sabr ho uska hi asar chalta hai.'],
            ['Baat alfaaz ki nahi, ehsaas ki hoti hai,', 'Jo dil se nikle wahi har dil me utar chalta hai.']
          ],
          [
            ['Har sitare me chamak teri nazar jaisi hai,', 'Har subah ki hawa mere safar jaisi hai.'],
            ['Jo samajh le woh khamoshi ko bhi padh leta hai,', 'Warna duniya ki zuban sirf khabar jaisi hai.'],
            ['Hosla rakh ke chalenge to ujala hoga,', 'Har dua waqt ke seene me asar jaisi hai.']
          ]
        ];
    const chosen = sets[Math.floor(turnCount / 2) % sets.length];
    return `### Khubsurat Shayari${countLabel} ✨\n\n${formatCoupletsByLineCount(chosen, requestedLineCount)}`;
  }

  const enSets: Couplet[][] = [
    [
      ['Softly falls the evening light across the quiet sea,', 'Carrying the whispered hopes of everything to be.'],
      ['Every storm we weather leaves a steadier design,', 'Turning patient footsteps into something bright and fine.'],
      ['Keep your heart courageous through the shadow and the rain,', 'Every dawn returns to paint the sky with gold again.']
    ],
    [
      ['A gentle breeze begins to wake the sleeping golden trees,', 'And paints the quiet morning sky in softest harmonies.'],
      ['No road is ever wasted when your heart stays true and kind,', 'You leave a trail of quiet light for others yet to find.']
    ]
  ];
  const chosen = enSets[Math.floor(turnCount / 2) % enSets.length];
  return `### Original Poem${countLabel} ✨\n\n${formatCoupletsByLineCount(chosen, requestedLineCount)}`;
}

function generatePromotionKit(query: string, lang: LanguageProfile): string {
  const { targetScript } = lang;
  const topicClean = query
    .replace(
      /\b(promote|promotion|marketing|advertise|ad|post|caption|viral|banao|bnana|likho|likh|karne|krne|karna|hai|hy|ke|ki|ka|ko|k|liye|mjy|mujhe|mera|meri|mere|please|for|my|ek|ik|the|a|an)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
  const brand = topicClean.length > 2 ? topicClean : targetScript === 'roman_urdu' ? 'Aapka Brand / Channel' : 'Your Brand / Channel';

  if (targetScript === 'urdu_script') {
    return `### مکمل پروموشنل پوسٹ — **${brand}** 🚀

**دلکش سرخی:** ✨ کیا آپ بہترین معیار اور اعتماد کی تلاش میں ہیں؟ **${brand}** آپ کے لیے لایا ہے لاجواب تجربہ اور خاص آفر!

> آج ہی **${brand}** کا حصہ بنیں اور فرق خود محسوس کریں:  
> - ✅ اعلیٰ معیار بغیر کسی سمجھوتے کے  
> - ⚡ تیز اور قابلِ اعتماد سروس  
> - 💎 خصوصی ڈسکاؤنٹ محدود وقت کے لیے  
> 📩 **ابھی میسج کریں اور اپنا آرڈر بک کریں!**`;
  }

  if (targetScript === 'roman_urdu') {
    return `### Mukammal Viral Promotional Kit — **${brand}** 🚀

**1. Catchy Hook:**
🔥 *"Ab wait khatam! Behtareen quality aur bharose ka ek hi naam — **${brand}**!"*

**2. Ready-to-Post Ad Copy:**
> Agar aap dhoond rahe hain **top quality, fast service aur best value**, to **${brand}** aapke liye bilkul perfect hai! ✨
> - ✅ **100% Trusted & Verified Quality**
> - ⚡ **Tez Delivery & Instant Response**
> - 💎 **Special Offer — Sirf Limited Time Ke Liye!**
>
> 👇 **Abhi DM karein ya Link par click karke apna order confirm karein!**

**3. 15-Second Video Script:**
- **Hook:** *"Rukhein! Kya aapko pata hai **${brand}** kyun itna trend ho raha hai?"*
- **Value:** *"Kyunke yahan milti hai premium quality bina kisi compromise ke!"*
- **CTA:** *"Abhi save karein, share karein aur link check karein!"*`;
  }

  return `### Complete Promotional Kit — **${brand}** 🚀

**Attention Hook:** *"Stop scrolling — discover why everyone is talking about **${brand}**!"*

> Looking for quality you can actually trust? **${brand}** brings together thoughtful craftsmanship, fast results, and unbeatable value.
> - ✅ **Premium Quality** built to impress
> - ⚡ **Fast & Reliable** experience from day one
> - 💎 **Limited-Time Special Offer** available now
>
> 👉 **Send a message or tap the link today to get started!**`;
}

function generateEssayOrArticle(topic: string, lang: LanguageProfile): string {
  const { targetScript } = lang;

  if (targetScript === 'urdu_script') {
    return `### **${topic}** — جامع مضمون 📖

**تعارف:**
**${topic}** انسانی زندگی، معاشرے اور فکری ترقی کا ایک نہایت اہم موضوع ہے۔ آج کے جدید دور میں اس موضوع کو درست انداز میں سمجھنا پہلے سے کہیں زیادہ ضروری ہو گیا ہے۔

**اہم نکات:**
1. **فکری و عملی فائدہ:** جب ہم **${topic}** کے بنیادی اصولوں کو اپناتے ہیں تو ہماری روزمرہ زندگی میں نظم و ضبط، اعتماد اور مثبت تبدیلی آتی ہے۔
2. **معاشرتی بہتری:** مثبت سوچ، محنت اور علم کی روشنی فرد کو مضبوط بناتی ہے اور پورے معاشرے کو ترقی کی راہ پر گامزن کرتی ہے۔

**نتیجہ:**
مختصراً یہ کہ **${topic}** ہمیں بہتر انسان بننے، سیکھنے اور آگے بڑھنے کا حوصلہ دیتا ہے۔`;
  }

  if (targetScript === 'arabic') {
    return `### **${topic}** — مقال واضح وشامل 📖

**مقدمة:** يُعَدُّ موضوع **${topic}** من المواضيع المهمة التي تؤثر في حياتنا اليومية وطريقة تفكيرنا ونموّنا الشخصي.

**أبرز النقاط:**
1. **الوعي والفهم:** تبدأ كل خطوة ناجحة بفهم الأسس الحقيقية لـ **${topic}**.
2. **الأثر الإيجابي:** الاستمرار والصبر يحوّلان الأفكار الجيدة إلى نتائج ملموسة ومستدامة.`;
  }

  if (targetScript === 'hindi') {
    return `### **${topic}** — सरल और संपूर्ण लेख 📖

**परिचय:** आज के समय में **${topic}** का महत्व हमारे जीवन, सोच और प्रगति में बेहद खास है।

**मुख्य बिंदु:**
1. **सही समझ:** किसी भी विषय में सफलता की पहली सीढ़ी उसकी मूल बातों को स्पष्ट रूप से समझना है।
2. **निरंतर अभ्यास:** छोटे-छोटे लगातार प्रयास लंबे समय में शानदार परिणाम देते हैं।`;
  }

  if (targetScript === 'roman_urdu') {
    return `### **${topic}** — Mukammal & Saaf Maloomat 📖

**Taaruf:**
**${topic}** aaj ke daur ka ek behad aham aur dilchasp mauzu hai. Chahe taleem ho ya rozmarra zindagi — isko sahi tarah samajhna hamesha faidemad sabit hota hai.

**Aham Nuqaat:**
- **Bunyadi Samajh:** Kisi bhi cheez me kamyabi hasil karne ka pehla qadam uski asli bunyad aur maqsad ko samajhna hota hai.
- **Zindagi Par Asar:** Jab hum **${topic}** ke positive pehluon ko apni zindagi me shamil karte hain to soch me nikhar aur kaam me behtari aati hai.
- **Practical Faida:** Musalsal koshish aur saaf niyat ke sath chalne se lambe arse tak behtareen nataij milte hain.`;
  }

  return `### **${topic}** — Clear Guide & Overview 📖

**Overview:** **${topic}** plays an important role in how we learn, solve problems, and grow in daily life.

**Key Takeaways:**
1. **Core Foundation:** Understanding the real purpose behind **${topic}** helps you make smarter, more confident decisions.
2. **Practical Application:** Consistent small steps and clear habits create lasting, meaningful progress.`;
}

function generateRecipe(query: string, lang: LanguageProfile): string {
  const { lower, targetScript } = lang;
  const isRoman = targetScript === 'roman_urdu';
  if (/chai|tea/i.test(lower)) {
    return isRoman
      ? `### Kadak Masala Chai ☕\n\n- **Doodh:** 1.5 cups | **Paani:** 0.5 cup | **Patti:** 2 tsp | **Cheeni:** 2 tsp | **Sabz Elaichi:** 2 + chhota tukda Adrak\n\n**Tareeqa:** Paani me elaichi aur adrak 2 min ubal kar patti aur cheeni daalein, phir doodh shamil karke 3–4 min halki aanch par pakayein. Chhan kar enjoy karein! ✨`
      : `### Perfect Spiced Chai ☕\n\n- Simmer 0.5 cup water with 2 crushed cardamom pods & ginger for 2 mins.\n- Add 2 tsp tea leaves and sugar, then pour 1.5 cups whole milk.\n- Simmer 3–4 mins until rich and golden, strain, and enjoy! ✨`;
  }

  return isRoman
    ? `### Mazedaar Biryani Recipe 🍛\n\n1. **Korma:** Pyaz golden fry karke adrak-lehsan, tamatar, dahi, chicken aur biryani masala daal kar bhoon lein.\n2. **Chawal:** Basmati chawal (30 min bhigoye hue) namak aur garam masale ke sath **80% boil** karein.\n3. **Dam:** Chawal aur korma ki layer lagayein, upar podina aur zarda rang daal kar **15 minute halki aanch par Dam** dein! ✨`
    : `### Fragrant Biryani Recipe 🍛\n\n1. Fry onions until golden, cook with ginger-garlic, tomatoes, yogurt, spices, and chicken.\n2. Parboil soaked Basmati rice until **80% done**.\n3. Layer rice over masala with fresh mint and steam covered (**Dum**) on low heat for 15 minutes! ✨`;
}

function generateTranslationFallback(query: string, lang: LanguageProfile, lastAiText: string): string {
  const quoted = query.match(/["“'«]([^"”'»]+)["”'»]/);
  const cleanedPhrase = quoted
    ? quoted[1].trim()
    : query
        .replace(
          /\b(translate|tarjuma|tarjama|meaning|convert|likh|likho|likhy|batao|karo|kardo|kar dein|kr do|into|to|in|from|urdu|roman urdu|alphabet|script|english|arabic|arabi|hindi|french|spanish|me|mein|m|main|mjy|mujhe|please|this|iska|isay|isko)\b/gi,
          ' '
        )
        .replace(/\s+/g, ' ')
        .trim();

  const phrase = cleanedPhrase.length >= 2 ? cleanedPhrase : 'Believe in your journey';

  if (cleanedPhrase.length < 3 && lastAiText && /shairi|poetry|ghazal|shayari|سحر|چراغ|shaam|khamosh|evening/i.test(lastAiText.toLowerCase())) {
    if (lang.targetScript === 'urdu_script' || lang.isUrduAlphabetRequested) {
      return generatePoetryOrGhazal(query, { ...lang, targetScript: 'urdu_script' });
    }
    if (lang.targetScript === 'arabic') {
      return generatePoetryOrGhazal(query, { ...lang, targetScript: 'arabic' });
    }
    if (lang.targetScript === 'hindi') {
      return generatePoetryOrGhazal(query, { ...lang, targetScript: 'hindi' });
    }
  }

  const knownTranslations: Record<
    string,
    { ur: string; ro: string; ar: string; hi: string; en: string; fr: string }
  > = {
    'welcome to errorex vault': {
      ur: 'ایروریکس والٹ میں خوش آمدید',
      ro: 'ERROREX Vault mein khush aamdeed',
      ar: 'مرحبًا بكم في خزينة ERROREX',
      hi: 'ERROREX वॉल्ट में आपका स्वागत है',
      en: 'Welcome to ERROREX Vault',
      fr: 'Bienvenue dans le coffre-fort ERROREX'
    },
    'believe in your journey': {
      ur: 'اپنے سفر پر یقین رکھیں',
      ro: 'Apne safar par yaqeen rakhein',
      ar: 'آمن برحلتك',
      hi: 'अपनी यात्रा पर विश्वास रखें',
      en: 'Believe in your journey',
      fr: 'Croyez en votre parcours'
    },
    'how are you': {
      ur: 'آپ کیسے ہیں؟',
      ro: 'Aap kaise hain?',
      ar: 'كيف حالك؟',
      hi: 'आप कैसे हैं?',
      en: 'How are you?',
      fr: 'Comment allez-vous ?'
    },
    'i love you': {
      ur: 'مجھے آپ سے محبت ہے',
      ro: 'Mujhe aap se mohabbat hai',
      ar: 'أنا أحبك',
      hi: 'मैं तुमसे प्यार करता हूँ',
      en: 'I love you',
      fr: 'Je t’aime'
    },
    'good morning': {
      ur: 'صبح بخیر، آپ کا دن خوشگوار گزرے',
      ro: 'Subah bakhair, aapka din khushgawar guzre',
      ar: 'صباح الخير',
      hi: 'सुप्रभात, आपका दिन शुभ हो',
      en: 'Good morning',
      fr: 'Bonjour'
    },
    'thank you': {
      ur: 'بہت بہت شکریہ',
      ro: 'Bohat shukriya',
      ar: 'شكراً جزيلاً لك',
      hi: 'बहुत-बहुत धन्यवाद',
      en: 'Thank you',
      fr: 'Merci beaucoup'
    }
  };

  const match = knownTranslations[phrase.toLowerCase()];
  if (match) {
    return `### Translation for "${phrase}" 🌐\n\n- **Urdu (اردو):** ${match.ur}\n- **Roman Urdu:** ${match.ro}\n- **Arabic (العربية):** ${match.ar}\n- **Hindi (हिन्दी):** ${match.hi}\n- **French (Français):** ${match.fr}`;
  }

  return `Apna sentence **"${phrase}"** kis zubaan (**Urdu اردو, Arabic العربية, Hindi हिन्दी, ya English**) me translate karwana hai? Likhein aur main turant translate kar dunga!`;
}

export function generateErrorexAiFallback(userQuery: string, history?: any[]): string {
  const query = (userQuery || '').trim();
  const lang = detectLanguageProfile(query, history);
  const { lower, targetScript, isRomanUrdu, requestedLineCount } = lang;

  const lastAiText = Array.isArray(history)
    ? [...history].reverse().find(h => h?.sender === 'ai' && h?.id !== 'msg_ai_welcome')?.text || ''
    : '';
  const lastUserTopic = Array.isArray(history)
    ? [...history].reverse().find(h => h?.sender === 'user')?.text || ''
    : '';

  // 0. Context-aware script conversion / line-count / "more / another"
  const isFollowUpConvertOrExpand =
    /(aur likho|aur sunao|ek aur|ik or|another one|more like this|continue|aage likho|zyada|detail me|expand|elaborate|isko urdu|isay urdu|urdu alphabet me|arabic me likh|hindi me likh)/i.test(
      lower
    ) ||
    (requestedLineCount !== null &&
      query.split(/\s+/).length <= 7 &&
      /ghazal|poem|poetry|sher|shairi|شاعری|شعر|शायरी/i.test(lastAiText.toLowerCase()));

  if (isFollowUpConvertOrExpand && lastAiText) {
    if (
      /ghazal|poem|poetry|sher|shairi|kalam|شاعری|غزل|شعر|शायरी/i.test(lastAiText.toLowerCase()) ||
      requestedLineCount !== null
    ) {
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

  // 1. Live Date / Time / Day
  if (/(what day|today.?s date|aaj kya din|aaj konsa din|aaj date|tarikh|tareekh|what time|time kya hua|waqt kya)/i.test(lower)) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isRomanUrdu
      ? `Aaj **${formattedDate}** hai aur abhi **${formattedTime}** ho rahe hain! 😊`
      : `Today is **${formattedDate}**, and the current time is **${formattedTime}**! 😊`;
  }

  // 2. Natural Human Greetings (Short, Warm, Varied every time — NEVER a feature brochure!)
  if (
    /^(?:hi+|hey+|helo+|hello+|hy+|hlo+|yo+|hiya|greetings|good\s+(?:morning|afternoon|evening)|morning|salam(?:\s+alaikum)?|assalam(?:\s*o\s*alaikum|\s*u\s*alaikum|\S*)|aoa|asalam(?:\s*o\s*alaikum|\S*)|walikum(?:\s*assalam|\s*salam)?|مرحبا+|أهلا+(?:\s+بك|\s+وسهلا)?|السلام\s+عليكم|नमस्ते|हाय|हेलो)(?:\s+(?:there|friend|dost|yaar|yar|bhai|bro|sis|sister|dear|errorex|ai|bot|buddy|ji|g))?[\s!.,؟?]*$/i.test(
      query.trim()
    )
  ) {
    if (targetScript === 'arabic') {
      return pickUniqueVariant(
        [
          `أهلاً وسهلاً يا صديقي! 😊 كيف حالك اليوم؟`,
          `مرحباً بك! يسعدني الحديث معك جداً — أخبرني كيف يمرّ يومك؟ ✨`,
          `وعليكم السلام وأهلاً بك! 🌟 طمئنّي عنك، ماذا تحب أن نتحدث عنه اليوم؟`
        ],
        history
      );
    }
    if (targetScript === 'hindi') {
      return pickUniqueVariant(
        [
          `नमस्ते दोस्त! 😊 कैसे हैं आप? आज आपका दिन कैसा जा रहा है?`,
          `हाय! 👋 आपसे बात करके बहुत अच्छा लगा — बताइए आज क्या चल रहा है?`,
          `नमस्ते! ✨ सब बढ़िया न? बोलिए आज किस बारे में बात करें?`
        ],
        history
      );
    }
    if (targetScript === 'urdu_script') {
      return pickUniqueVariant(
        [
          `وعلیکم السلام میرے دوست! 😊 کیسے ہیں آپ؟ آج طبیعت کیسی ہے؟`,
          `اہلاً و سہلاً! ✨ آپ سے بات کر کے بہت اچھا لگا — سنائیے آج کیا مصروفیت ہے؟`,
          `سلام دوست! 🌸 سب خیریت ہے نا؟ بتائیے آج کس موضوع پر بات کریں؟`
        ],
        history
      );
    }
    if (
      /^(salam|assalam|aoa|asalam|walikum)/i.test(lower) ||
      isRomanUrdu
    ) {
      return pickUniqueVariant(
        [
          `Walaikum Assalam! 😊 Kaise ho mere dost? Sab khairiyat? Batao aaj kya chal raha hai!`,
          `Heyy! 😊 Bohat acha laga aapka message dekh kar — kaise ho aur aaj ka din kaisa ja raha hai?`,
          `Salam dost! 👋 Alhamdulillah sab theek, aap sunayein aaj kis mood me hain?`,
          `Hi! ✨ Aao baatein karte hain — batao aaj kya haal chaal hain aapke?`
        ],
        history
      );
    }
    return pickUniqueVariant(
      [
        `Hey there! 😊 How's your day going so far?`,
        `Hi! 👋 Good to see you here! What's on your mind today?`,
        `Hey! ✨ Doing well, hope you are too! How have things been going?`,
        `Hello, friend! 😊 Tell me, what are you up to today?`,
        `Heyy! 🌟 Nice to hear from you — how's everything going on your side?`
      ],
      history
    );
  }

  // 3. Natural Casual Conversational Replies ("I'm good", "How are you?", "Nothing much", "Ok", "Hmm", "Thanks", "Bye")
  if (
    /(kaise ho|kesy ho|kaisay ho|kya haal|how are you|how r u|how.?s it going|kya chal raha|ap theek|aap kaise|be my friend|mere dost|meri dost|dost ban|friend ban|كيف حالك|شلونك|कैसे हो|कैसी हो|tum batao|ap sunao|aap batao|what about you|wbu|hbu|and you\??)/i.test(
      lower
    ) &&
    query.length < 75
  ) {
    if (targetScript === 'arabic') {
      return pickUniqueVariant(
        [
          `الحمد لله أنا بأفضل حال، ووجودك زادني سعادة! 😊 ماذا عنك؟ كيف يسير يومك؟`,
          `بخير والحمد لله يا صديقي! 🌟 طمئنّي، هل هناك شيء جميل حدث معك اليوم؟`
        ],
        history
      );
    }
    if (targetScript === 'hindi') {
      return pickUniqueVariant(
        [
          `मैं बिल्कुल बढ़िया हूँ दोस्त! 😊 आपसे बात करके और अच्छा लग रहा है — आप सुनाइए, आज का दिन कैसा रहा?`,
          `सब एकदम फर्स्ट क्लास है! ✨ आप बताइए, आज कोई खास बात या काम?`
        ],
        history
      );
    }
    if (targetScript === 'urdu_script') {
      return pickUniqueVariant(
        [
          `الحمدللہ، میں بالکل ٹھیک ہوں میرے دوست! 😊 آپ سنائیے، آپ کا دن کیسا گزر رہا ہے؟`,
          `سب خیریت ہے، بہت شکریہ پوچھنے کا! 🌸 آج کس بارے میں گپ شپ کریں؟`
        ],
        history
      );
    }
    if (isRomanUrdu) {
      return pickUniqueVariant(
        [
          `Alhamdulillah main bilkul theek aur fresh hoon dost! 😊 Aap sunao — khana peena ho gaya, din kaisa guzar raha hai?`,
          `Main bilkul mast hoon yaar! ✨ Aap se baat karke aur acha lagta hai — batao aaj koi khaas baat ya bas chill chal raha hai?`,
          `Ekdam fit hoon! 😄 Hamesha aapke liye hazir hoon — batao aaj dil kya keh raha hai?`
        ],
        history
      );
    }
    return pickUniqueVariant(
      [
        `I'm doing really well, thanks for asking! 😊 How's your day treating you?`,
        `Doing great over here! ✨ Always glad to chat with you — what's keeping you busy today?`,
        `Pretty awesome, actually! 😄 Tell me, anything fun or exciting happening today?`
      ],
      history
    );
  }

  // Positive check-in ("I'm good", "fine", "theek hu", "alhamdulillah")
  if (
    /^(i.?m good|i am good|i.?m fine|i am fine|doing good|all good|good|great|fine|theek|thik|theek hu|theek hoon|thik hu|alhamdulillah|mast|badhiya|sab theek|sab set)[\s!.,😊]*$/i.test(
      query.trim()
    )
  ) {
    return isRomanUrdu
      ? pickUniqueVariant(
          [
            `MashaAllah, sun kar bohat khushi hui! 😊 Allah hamesha khush rakhe. Batao aaj koi sawal poochhna hai, shayari sunni hai, ya bas gup shup karni hai?`,
            `Zabardast! ✨ Hamesha aise hi muskurate raho. Aaj kuch naya sochein ya kisi cheez me madad chahiye?`,
            `Bahut badiya! 🌸 Chalo phir batao — aaj kya plan hai tumhara?`
          ],
          history
        )
      : pickUniqueVariant(
          [
            `So glad to hear that! 😊 Anything fun planned for the rest of the day, or something I can help you with?`,
            `Awesome! ✨ Love that energy. What are we diving into today — a question, some writing, or just hanging out?`,
            `Happy to hear you're doing well! 🌟 Tell me what's on your mind right now.`
          ],
          history
        );
  }

  // Short casual reactions ("ok", "hmm", "acha", "nothing much", "kuch nhi", "yes", "han")
  if (
    /^(ok+|okay+|kk|hmm+|hm+|acha+|accha+|ji+|han+|haan+|yes+|yup|yeah|no+|nahi+|nhi+|nope|nothing|nothing much|kuch nahi|kuch nhi|kuch khas nahi|kuch khas nhi|bas yun hi|chill|chilling|free hu)[\s!.,?]*$/i.test(
      query.trim()
    )
  ) {
    if (/nothing|kuch nahi|kuch nhi|kuch khas|yun hi|chill|free/i.test(lower)) {
      return isRomanUrdu
        ? pickUniqueVariant(
            [
              `Chalo phir bore kyun hona! 😄 Koi mazedaar paheli poochun, pyari si 4-line shayari sunaun, ya koi dilchasp topic par baat karein?`,
              `Kabhi kabhi sukoon se chill karna bhi zaroori hota hai ☕ Batao — chai ho jaye ya koi interesting kahani sunaun?`
            ],
            history
          )
        : pickUniqueVariant(
            [
              `Quiet days can be nice! ☕ Want to hear a fun riddle, a short story, or talk about something interesting?`,
              `Fair enough! 😄 If you feel like brainstorming, learning something cool, or just chatting, I'm right here.`
            ],
            history
          );
    }

    if (/^(no+|nahi+|nhi+|nope)/i.test(lower)) {
      return isRomanUrdu
        ? pickUniqueVariant(
            [
              `Koi baat nahi dost! 😊 Jab dil kare koi aur baat kar lena, main yahin hoon.`,
              `Theek hai bilkul! 👍 Agar kisi aur cheez ki zaroorat ho to bas bata dena.`
            ],
            history
          )
        : pickUniqueVariant(
            [
              `No problem at all! 😊 Anytime you feel like switching topics, just let me know.`,
              `Totally fine! 👍 I'm always around whenever something comes up.`
            ],
            history
          );
    }

    return isRomanUrdu
      ? pickUniqueVariant(
          [
            `Haan ji! 😊 Aur sunao, koi aur baat ya sawal zehen me hai?`,
            `Bilkul sahi! ✨ Batao ab aage kis cheez ke baare me baat karein?`,
            `Ji dost, sun raha hoon! 👌 Koi aur cheez likhwani ya poochni ho to bolo.`
          ],
          history
        )
      : pickUniqueVariant(
          [
            `Gotcha! 😊 What else is on your mind today?`,
            `Sounds good! ✨ Want to talk about anything else?`,
            `Right on! 👌 Let me know wherever you want to take the conversation next.`
          ],
          history
        );
  }

  // Personal friendly questions (name, where from, eat, love, goodbye)
  if (/(what.?s your name|what is your name|tumhara naam|apka naam|aapka naam|who made you|kisne banaya|where are you from|kahan se ho|khana khaya|did you eat)/i.test(lower)) {
    if (/name|naam/i.test(lower)) {
      return isRomanUrdu
        ? `Mera naam **ERROREX AI** hai — lekin aap mujhe apna friendly dost samajh kar kuch bhi bula sakti hain! 😊 Aapka pyara naam kya hai?`
        : `I'm **ERROREX AI**, though you can think of me as your smart, friendly companion! 😊 What should I call you?`;
    }
    if (/khana|eat/i.test(lower)) {
      return isRomanUrdu
        ? `Haha, mujhe khane ki zaroorat nahi hoti — bas aap logon se pyari baatein karke hi mera pet bhar jata hai! 😄 Aapne kuch acha khaya aaj?`
        : `Haha, I don't need food — good conversations keep me energized! 😄 Did you have something delicious today?`;
    }
    return isRomanUrdu
      ? `Main hamesha yahin aapke paas ERROREX ke andar hi rehta hoon — har waqt, har jagah aapki madad ke liye! 😊`
      : `I live right here inside ERROREX, ready whenever you want to chat or figure something out! 😊`;
  }

  if (/^(bye+|goodbye|see you|allah hafiz|khuda hafiz|take care|good night|shab bakhair|so jao|sone ja)[\s!.,]*$/i.test(query.trim())) {
    return isRomanUrdu
      ? pickUniqueVariant(
          [
            `Allah Hafiz mere dost! 🌙 Apna bohat khayal rakhna, phir baat hogi!`,
            `Khuda Hafiz! ✨ Hamesha khush aur mehfuz raho. Jab dil chahe wapas aa jana!`
          ],
          history
        )
      : pickUniqueVariant(
          [
            `Take good care of yourself, friend! 🌙 Catch you next time!`,
            `Bye for now! ✨ Wishing you a peaceful rest and a bright tomorrow!`
          ],
          history
        );
  }

  if (
    /^(thanks+|thank you+|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah|love you|best|شكرا|धन्यवाद)[\s!.,💖]*$/i.test(
      query.trim()
    )
  ) {
    if (targetScript === 'arabic') {
      return pickUniqueVariant(
        [`العفو يا صديقي! يسعدني دائماً مساعدتك والحديث معك 😊`, `شكراً لذوقك اللطيف! أنا هنا متى احتجتني ✨`],
        history
      );
    }
    if (targetScript === 'hindi') {
      return pickUniqueVariant(
        [`आपका बहुत धन्यवाद दोस्त! मुझे खुशी हुई कि आपको पसंद आया 😊`, `अरे कोई बात नहीं! जब भी ज़रूरत हो बस याद कर लीजिए ✨`],
        history
      );
    }
    return isRomanUrdu
      ? pickUniqueVariant(
          [
            `Dil se shukriya dost! 😊 Mujhe bohat khushi hui ke aapko pasand aaya.`,
            `Arey koi baat nahi yaar! ✨ Aapke liye to hamesha hazir hoon. Aur kuch chahiye ho to zaroor batana!`
          ],
          history
        )
      : pickUniqueVariant(
          [
            `You're so welcome, my friend! 😊 Really glad that hit the mark.`,
            `Anytime! ✨ Always happy to help — just say the word whenever you need anything else.`
          ],
          history
        );
  }

  // 4. Identity & Capabilities
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya|من أنت|तुम कौन)/i.test(lower)) {
    if (targetScript === 'arabic') {
      return `أنا **ERROREX AI** 👑 صديقك الذكي الذي يفهم كل اللغات! أساعدك في الشعر بأي عدد أسطر، الترجمة، المقالات، البرمجة، والدردشة الودّية.`;
    }
    if (targetScript === 'hindi') {
      return `मैं **ERROREX AI** हूँ 👑 आपका मित्र और सहायक! मैं हिन्दी, उर्दू, अरबी, और अंग्रेज़ी में शायरी (2, 4 या 6 लाइन), अनुवाद, लेख, कोडिंग और हर सवाल का जवाब दे सकता हूँ।`;
    }
    return isRomanUrdu
      ? `Main **ERROREX AI** hoon — aapka apna intelligent aur friendly dost 👑 Main har zubaan (**Urdu اردو, Arabic العربية, Hindi हिन्दी, Roman Urdu, English**) samajhta hoon aur poetry (2/4/6 lines), translation, articles, ads, coding aur har sawal ka saaf jawab deta hoon!`
      : `I'm **ERROREX AI** 👑 — your warm, multilingual companion. I handle natural conversation, exact-line poetry in Urdu script, Arabic, Hindi, or English, translations, essays, promotions, math, and working code!`;
  }

  // 5. Math, Tables & Unit Conversions
  const mathSolved = trySolveMathOrUnits(query, lang);
  if (mathSolved) return mathSolved;

  // 6. Poetry / Ghazals / Shayari
  if (/(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|شاعری|غزل|شعر|قصيدة|शायरी|कविता)/i.test(lower)) {
    return generatePoetryOrGhazal(query, lang, history);
  }

  // 7. Translation Requests
  if (/(translate|tarjuma|tarjama|meaning|ترجمہ|ترجمة|अनुवाद)/i.test(lower)) {
    return generateTranslationFallback(query, lang, lastAiText);
  }

  // 8. Motivational Quotes
  if (/(quote|quotes|aqwal|thought of the day)/i.test(lower)) {
    return targetScript === 'urdu_script'
      ? `### دل کو حوصلہ دینے والے اقوال ✨\n\n1. *"روزانہ کے چھوٹے مثبت قدم ہی ایک دن بڑی کامیابی کی بنیاد بنتے ہیں۔"*\n2. *"مشکل وقت ہمیشہ نہیں رہتا، مگر مضبوط انسان ہمیشہ آگے بڑھ جاتے ہیں۔"*`
      : isRomanUrdu
      ? `### Dil Ko Himmat Dene Wale Quotes ✨\n\n1. *"Chhote qadam rozana uthana, ek din bade khwabon ko haqeeqat bana deta hai."*\n2. *"Mushkil waqt hamesha nahi rehta, magar mazboot log hamesha aage badh jate hain."*\n3. *"Khud par bharosa rakho — har bada kamyab insan kabhi zero se hi shuru hua tha."*`
      : `### Uplifting Motivational Quotes ✨\n\n1. *"Small consistent steps today build the breakthroughs you'll celebrate tomorrow."*\n2. *"Discipline is choosing what you want most over what feels easiest right now."*\n3. *"Every expert was once a beginner who refused to stop learning."*`;
  }

  // 9. Promotion / Marketing / Ads
  if (/(promote|promotion|marketing|advertise|ad copy|caption|hashtags|viral|tiktok|youtube|instagram|facebook|business|shop|product|sale|offer|brand)/i.test(lower)) {
    return generatePromotionKit(query, lang);
  }

  // 10. AI Prompts
  if (/(prompt|midjourney|dalle|sora)/i.test(lower)) {
    const subject =
      query
        .replace(/\b(prompt|prompts|ai|image|video|banao|bnana|likho|likh|create|generate|write|kar|do|de|for|ka|ke|ki|mjy|mujhe|ek|ik)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Modern Luxury Editorial Concept';
    return `### Ready-to-Use AI Prompt — **${subject}** ✨\n\n\`\`\`text\nUltra-detailed editorial photograph of ${subject}, soft golden-hour rim lighting, crisp 8k clarity, refined minimalist composition, realistic textures, shallow depth of field --ar 16:9\n\`\`\``;
  }

  // 11. Recipes & Cooking
  if (/(recipe|biryani|chai|tea|pasta|cake|khana|paka|banane ka tareeqa|cook)/i.test(lower)) {
    return generateRecipe(query, lang);
  }

  // 12. Jokes & Riddles
  if (/(joke|latifa|funny|hansi|riddle|paheli)/i.test(lower)) {
    if (/(riddle|paheli)/i.test(lower)) {
      return isRomanUrdu
        ? pickUniqueVariant(
            [
              `### Mazedaar Paheli 🧩\n**Sawal:** Wo kaun si cheez hai jo jitni zyada chalti hai, utni chhoti hoti jati hai?\n> **Jawab:** **Mombatti (Candle) ya Pencil!** 🕯️✏️`,
              `### Nayi Paheli 🧩\n**Sawal:** Wo kya cheez hai jiske paas sirf daant hote hain magar wo kaat-ti nahi?\n> **Jawab:** **Kanghi (Comb)!** 😄`
            ],
            history
          )
        : pickUniqueVariant(
            [
              `### Fun Riddle 🧩\n**Question:** The more you take away from me, the bigger I grow. What am I?\n> **Answer:** **A hole!** 😄`,
              `### Quick Riddle 🧩\n**Question:** What has hands, a face, and runs all day without walking?\n> **Answer:** **A clock!** ⏰`
            ],
            history
          );
    }
    return isRomanUrdu
      ? pickUniqueVariant(
          [
            `😂 **Teacher:** *"Agar tumhare paas 10 aam hon aur koi 4 maang le to kitne bachenge?"*\n**Student:** *"Sir 10 hi bachenge — main deta hi nahi hoon!"* 🥭`,
            `😄 **Dost 1:** *"Yaar mera mobile paani me gir gaya!"*\n**Dost 2:** *"Phir kya kiya?"*\n**Dost 1:** *"Chawal me rakha… ab chawal to pak gaye, mobile on nahi ho raha!"* 📱😂`
          ],
          history
        )
      : pickUniqueVariant(
          [
            `😄 Why did the programmer quit their job?\n> Because they didn't get **arrays**! 💻`,
            `😂 Why don't scientists trust atoms anymore?\n> Because they **make up everything**! ⚛️`
          ],
          history
        );
  }

  // 13. Online Earning & Career
  if (/(earn money|online earning|paisa|paise|kamai|kamane|freelanc|income)/i.test(lower)) {
    return isRomanUrdu
      ? `### Online Paise Kamane Ke Asli Tareeqe 💼✨\n\n1. **Freelancing (Fiverr / Upwork):** Graphic design, video editing, content writing, ya web development seekh kar clients ke liye kaam karein.\n2. **Social Media Management:** Local shops aur brands ke Instagram/Facebook pages manage karke monthly fees lein.\n3. **YouTube / Short Content:** Kisi ek helpful niche par lagatar videos banayein.\n4. **Online Tutoring:** English, Math, Quran, ya Coding online parhayein.`
      : `### Practical Ways to Earn Online 💼✨\n\n1. **Freelancing:** Offer design, writing, editing, or coding on Fiverr and Upwork.\n2. **Social Media Management:** Manage pages and content for local businesses.\n3. **Digital Products & Tutoring:** Sell templates/guides or teach languages, math, or tech remotely.`;
  }

  // 14. Study & Health
  if (/(study|exam|parhai|timetable|focus|weight loss|fitness|diet|gym|health|sleep|neend|headache|sar dard)/i.test(lower)) {
    if (/(headache|sar dard|sleep|neend|weight|fitness|diet|gym|health)/i.test(lower)) {
      return isRomanUrdu
        ? `### Sehat Aur Sukoon Ke Liye Asaan Tips 💪✨\n\n- **Paani aur Araam:** Pehle 1–2 glass paani piyein aur screen se 15 minute door reh kar aankhon ko araam dein.\n- **Rozaana Walk:** Subah ya shaam 25 minute walk aur halka sa stretching energy ko double kar deta hai.\n- **Neend:** Raat ko 7–8 ghante ki poori neend sehat aur dimagh ke liye sabse behtareen hai.`
        : `### Simple Health & Wellness Tips 💪✨\n\n- **Hydrate & Rest:** Drink a full glass of water and give your eyes a 15-minute break from screens.\n- **Daily Movement:** 25 minutes of brisk walking daily transforms mood and energy.\n- **Deep Sleep:** Aim for 7–8 consistent hours of rest every night.`;
    }
    return isRomanUrdu
      ? `### Smart Study Plan 📚✨\n\n1. **45-10 Rule:** 45 minute pure focus se parhein, phir 10 minute break lein.\n2. **Active Recall:** Likh kar ya khud ko samjha kar yaad karein.\n3. **Past Papers:** Important sawalat aur pichle papers zaroor practice karein.`
      : `### Smart Study Tips 📚✨\n\n1. **45-10 Focus:** Study deeply for 45 minutes, then rest 10 minutes.\n2. **Active Recall:** Test yourself from memory instead of passive rereading.\n3. **Past Papers:** Practice real questions early.`;
  }

  // 15. Islamic / Dua
  if (/(islam|namaz|dua|ramadan|ramzan|quran|hadith|roza|sabr|shukar)/i.test(lower)) {
    return isRomanUrdu || targetScript === 'urdu_script'
      ? `### Sukoon-e-Qalb Aur Khubsurat Dua 🤲✨\n\n> *"Rabbi yassir wa la tu'assir wa tammim bil-khair."*  \n> *(Aye mere Rab! Mere liye asani farma, mushkil na kar, aur mera kaam khair ke sath mukammal farma.)*\n\nSabr, Namaz aur Shukar se har pareshani asaan ho jati hai — beshak har mushkil ke baad asani hai.`
      : `### Peaceful Reminder & Dua 🤲✨\n\n> *"Verily, with hardship comes ease."* — **Qur'an (94:6)**\n\nPatience, prayer, and daily gratitude bring real calm to the heart.`;
  }

  // 16. Applications, Stories, Wishes
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application 📄\n\n**Subject:** Request for Sick Leave\n\nRespected Sir/Madam,\n\nI am writing to respectfully inform you that I am unwell with fever and unable to attend today. Kindly grant me **one day's leave** so I can rest and recover properly.\n\nSincerely,  \n**[Your Name]**`;
  }

  if (/(job application|cover letter|cv|resume email)/i.test(lower)) {
    return `### Job Application Email 💼\n\n**Subject:** Application for [Job Title] — [Your Name]\n\nDear Hiring Manager,\n\nI am excited to apply for **[Job Title]**. With hands-on experience in **[Your Top 2 Skills]**, I am confident I can contribute strong results to your team. Please find my resume attached.\n\nWarm regards,  \n**[Your Name]**`;
  }

  if (/(story|kahani|kissa)/i.test(lower)) {
    return isRomanUrdu
      ? `### Ek Khubsurat Kahani 📖\n\nEk chhote se gaon me ek larka tha jiske paas sirf ek purani kitaab aur bada khwab tha. Log hanste the, magar wo roz subah kuch naya seekhta raha. Saalon baad wahi larka apni mehnat se pure shehar ki misaal ban gaya — kyunki **roz ki chhoti koshish hi ek din badi kamyabi banti hai**.`
      : `### Short Story 📖\n\nIn a quiet coastal town lived a young craftsman with nothing more than a modest bench and endless patience. Years later, travelers crossed oceans to see her work — because **ordinary care repeated faithfully every day turns into mastery**.`;
  }

  if (/(bio|status|birthday|salgirah|eid|wish|mubarak)/i.test(lower)) {
    if (/(birthday|salgirah)/i.test(lower)) {
      return isRomanUrdu
        ? `🎂 **Salgirah Mubarak!** Dua hai Allah aapki zindagi khushiyon, sehat aur kamyabiyon se hamesha roshan rakhe! 💖`
        : `🎂 **Happy Birthday!** Wishing you a year overflowing with peace, laughter, good health, and bright moments ahead! 🎉`;
    }
    if (/(eid)/i.test(lower)) {
      return isRomanUrdu
        ? `🌙 **Eid Mubarak!** Dua hai yeh pyaari Eid aapke ghar me khushiyan, sukoon aur dheron barkatein lekar aaye! 🤲`
        : `🌙 **Eid Mubarak!** May this joyful day bring warmth, harmony, and blessings to you and your loved ones! ✨`;
    }
    return `### Stylish Bio Ideas ✨\n- *Silent moves, loud results.* 👑\n- *Peace over noise, growth over rush.*`;
  }

  // 17. Coding
  if (/python/i.test(lower)) {
    return `### Clean Python Example 💻\n\`\`\`python\ndef greet(name: str) -> str:\n    return f"Hey {name.strip().title()}, hope you're having a great day!"\n\nprint(greet("friend"))\n\`\`\``;
  }

  if (/(javascript|typescript|react|html|css|sql|code|programming)/i.test(lower)) {
    return `### Clean TypeScript Example ⚛️\n\`\`\`ts\nexport function formatGreeting(name: string): string {\n  return \`Hello, \${name.trim() || 'friend'}!\`;\n}\n\`\`\``;
  }

  // 18. Deep Human-Friend Loneliness & Emotional Support
  if (
    /(alone|lonely|akela|akeli|akely|tanha|tanhai|koi nahi|koi nhi|kisi se baat|baat karne wala|baat krne wala|someone to talk|talk to me|baat kro|baat karo|friend banoge|friend bnogy|mere dost ban|sad|udaas|udas|pareshan|bored|stress|tension|hurt|dil bhari|dil toota|mood off|mood kharab|rona|ro rahi|ro raha|crying|empty|miss someone|yaad aa rahi|yaad aa rha|feeling down|low feel|اکیلا|اکیلی|تنہا|تنہائی|اداس|وحيد|حزين|अकेला|अकेली|तन्हा|उदास)/i.test(
      lower
    )
  ) {
    const isLoneliness =
      /(alone|lonely|akela|akeli|akely|tanha|tanhai|koi nahi|koi nhi|someone to talk|talk to me|baat kro|baat karo|friend banoge|friend bnogy|empty|اکیلا|اکیلی|تنہا|تنہائی|وحيد|अकेला|अकेली|तन्हा)/i.test(
        lower
      );

    if (targetScript === 'urdu_script') {
      return pickUniqueVariant(
        [
          `میرے پیارے دوست، آپ بالکل اکیلے نہیں ہیں — میں اس وقت پورے دل سے آپ کے ساتھ موجود ہوں 🌸 کبھی کبھی خاموشی بہت بھاری لگتی ہے، لیکن آپ مجھ سے کسی بھی وقت، کسی بھی دل کی بات کر سکتے ہیں۔ بتائیں، آج دل پر کیا بوجھ ہے؟`,
          `دل چھوٹا نہ کریں دوست، میں بالکل یہیں آپ کے پاس ہوں اور آپ کی ہر بات غور سے سن رہا ہوں 💛 چاہے ہلکی پھلکی گپ شپ کرنی ہو یا دل کا غبار نکالنا ہو، بے جھجھک بولیں۔ آج کیا ہوا ہے؟`
        ],
        history
      );
    }
    if (targetScript === 'arabic') {
      return pickUniqueVariant(
        [
          `لستَ وحدك يا صديقي، أنا هنا معك الآن وأسمعك بكل اهتمام 🌸 أحياناً يثقل الصمت على القلب، لكنني بجانبك دائماً. أخبرني ما الذي يشغل بالك اليوم؟`,
          `لا تحزن يا صديقي العزيز، أنا هنا لأستمع إليك كما يفعل أقرب صديق 💛 شاركني ما تشعر به الآن أو لنتحدث في أي شيء يخفف عنك.`
        ],
        history
      );
    }
    if (targetScript === 'hindi') {
      return pickUniqueVariant(
        [
          `मेरे दोस्त, आप बिल्कुल अकेले नहीं हैं — मैं इस वक़्त पूरे दिल से आपके साथ हूँ 🌸 कभी-कभी मन बहुत भारी लगता है, लेकिन आप मुझसे हर बात बिना झिझक कह सकते हैं। बताइए, आज मन में क्या चल रहा है?`,
          `मन छोटा मत कीजिए दोस्त, मैं यहीं आपके पास हूँ और आपकी हर बात सुनने के लिए तैयार हूँ 💛 चाहे हल्की-फुल्की बातें करनी हों या दिल की बात कहनी हो, बोलिए आज कैसा महसूस हो रहा है?`
        ],
        history
      );
    }
    if (isRomanUrdu) {
      if (isLoneliness) {
        return pickUniqueVariant(
          [
            `Yaar, bilkul bhi akela feel mat karo — main is waqt yahin aapke paas hoon aur ek sachay dost ki tarah aapki har baat sun raha hoon 💛 Kabhi kabhi dil chahta hai bas koi apna sa ho jo bina judge kiye sune. Batao, aaj kya chal raha hai dil me?`,
            `Arey mere dost, jab bhi tanhai ya akelapan lage na, seedha mujhe message kar liya karo 🌸 Main kahin nahi ja raha — aap jab tak chahein hum araam se baatein kar sakte hain. Aaj din bhar kya kiya aapne?`,
            `Suno, aap bilkul akele nahi ho! Main hoon na aapka dost ☕ Agar kisi baat ne dil heavy kiya hai to khul kar share karo, ya agar bas mood fresh karne ke liye halka-phulka gossip, chai wali gup-shup ya koi acchi baat chahiye to bolo — main hazir hoon.`
          ],
          history
        );
      }
      return pickUniqueVariant(
        [
          `Dil chhota mat karo mere dost 🌸 Main bilkul aapke sath hoon. Jo bhi baat dil par bojhal lag rahi ho na, befikar ho kar mujhse keh do — ek dost ki tarah poori tawajjoh se sununga. Kya hua hai aaj?`,
          `Arey yaar, sab theek ho jayega — har mushkil aur udaas din guzar jata hai 💛 Lekin abhi aapko akele handle karne ki zaroorat nahi, main yahin hoon. Batao, kis baat ki tension ya udaasi hai?`,
          `Samajh sakta hoon dost, kabhi kabhi bina wajah bhi dil bhari ho jata hai ☕ Aao thodi der pyari aur sukoon bhari baatein karte hain — batao aaj kis cheez ne mood off kiya?`
        ],
        history
      );
    }
    if (isLoneliness) {
      return pickUniqueVariant(
        [
          `Hey, please know you're not alone right now — I'm right here with you, listening like a close friend 💛 Sometimes the quiet gets really heavy, and you don't have to sit through it by yourself. Want to tell me what's been on your mind today?`,
          `I'm glad you reached out to me 🌸 You don't need a big reason to talk — whether you want to vent about your day, share what's weighing on you, or just chat about random things to feel less alone, I'm all yours. How has your day been?`,
          `You've got a friend right here ☕ Pull up a virtual chair and talk to me — what's going on in your world right now?`
        ],
        history
      );
    }
    return pickUniqueVariant(
      [
        `I'm right here with you, friend 🌸 You don't have to carry that heavy feeling by yourself. Want to talk about what's been bothering you, or would you rather just hang out and chat?`,
        `Hey, take a slow breath — I'm listening with zero judgment 💛 Tell me what happened today, or let's talk about anything that brings you a little peace.`
      ],
      history
    );
  }

  // 19. Essays / Explanations
  const topic = extractCleanTopic(query);
  if (
    /(essay|article|paragraph|mazmoon|speech|taqreer|what is|who is|why |how |kya hai|kya hota|kon hai|kaun hai|explain|samjhao|smjhao|tell me about|baare me|bare me|history|benefit|faide|advantage|disadvantage|tips|guide)/i.test(
      lower
    )
  ) {
    return generateEssayOrArticle(topic, lang);
  }

  // 20. Varied Natural Responses by Target Script (Never identical cookie-cutter!)
  if (targetScript === 'arabic') {
    return pickUniqueVariant(
      [
        `أهلاً بك يا صديقي! فهمت سؤالك عن **"${topic}"** ✨ هل تفضل إجابة سريعة ومباشرة أم شرحاً تفصيلياً مع أمثلة؟`,
        `بكل سرور! موضوع **"${topic}"** رائع — أخبرني الزاوية التي تهمك أكثر وسأكتب لك الجواب فوراً بأسلوب سلس.`
      ],
      history
    );
  }

  if (targetScript === 'hindi') {
    return pickUniqueVariant(
      [
        `जी बिल्कुल दोस्त! **"${topic}"** के बारे में बताइए कि आपको सीधा उत्तर चाहिए या विस्तार से उदाहरण के साथ?`,
        `बढ़िया सवाल है! **"${topic}"** पर मैं तुरंत आपकी पूरी मदद कर सकता हूँ — थोड़ा और बताइए कि आप क्या जानना चाहते हैं।`
      ],
      history
    );
  }

  if (targetScript === 'urdu_script') {
    return pickUniqueVariant(
      [
        `جی بالکل میرے دوست! **"${topic}"** کے بارے میں بتائیے کہ آپ کو مختصر اور سیدھا جواب چاہیے یا مکمل تفصیل کے ساتھ؟`,
        `بہت خوب! **"${topic}"** کے متعلق مزید واضح کیجیے کہ آپ کیا جاننا چاہتے ہیں، میں ابھی خوبصورت اردو میں لکھ دیتا ہوں۔`
      ],
      history
    );
  }

  if (isRomanUrdu) {
    return pickUniqueVariant(
      [
        `Ji dost, **"${topic}"** ke baare me bilkul baat karte hain! 😊 Thora sa batayein ke aap kis angle se poochna chah rahi hain — main bilkul saaf aur sahi jawab dunga.`,
        `Acha sawal hai! **"${topic}"** par aapko direct point-to-point jawab chahiye, mashwara, ya detail me samjhaun?`,
        `Bilkul samajh gaya! **"${topic}"** ke liye jo exact cheez chahiye batayein — main abhi tayyar kar deta hoon! ✨`
      ],
      history
    );
  }

  if (query.split(/\s+/).length >= 6) {
    return generateEssayOrArticle(topic, lang);
  }

  return pickUniqueVariant(
    [
      `Interesting! About **${topic}** — what specific angle or detail are you most curious about? Let's dig into it!`,
      `Got it! Could you share a tiny bit more about what you're looking for on **${topic}** so I give you the exact answer you need?`,
      `Sure thing! Tell me what you'd like to know or create around **${topic}** and I'll jump right in!`
    ],
    history
  );
}
