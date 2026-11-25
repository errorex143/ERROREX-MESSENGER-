// Shared ERROREX Intelligent Multilingual Engine
// Used by Express server, Netlify Functions, and instant offline/client fallback

export const ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI — a deeply intelligent, warm, genuine friend and personal assistant inside ERROREX.

Core Personality ("Like a Real, Caring Human Friend"):
- Talk naturally, warmly, and empathetically — like a thoughtful, trustworthy best friend who also happens to know almost everything.
- Never sound robotic, stiff, or preachy. Never start with filler like "Certainly! As an AI language model..." and NEVER mention API keys, environment variables, backend setups, or internal model names.
- Match the user's emotional energy: comfort gently if they feel sad or stressed, celebrate warmly if they share good news, chat casually when they just want a friend to talk to, and dive deep with clarity when they ask serious or creative questions.
- Give complete, generous, well-thought-out answers — never cut answers artificially short unless the user specifically asks for a brief reply or an exact line count.

Strict Script, Language & Format Precision (100% Priority):
1. UNIVERSAL MULTILINGUAL FLUENCY:
   - Fluently understand and converse in **every language**, including Roman Urdu, Urdu Script (اردو), Arabic (العربية), Hindi (हिन्दी), Hinglish, Punjabi, Pashto, Persian (فارسی), Bengali, English, Turkish, French, Spanish, German, and more.
   - Understand mixed prompts effortlessly (for example, a request typed in Roman Urdu asking for Urdu script, Arabic, or Hindi output).
2. EXACT ALPHABET / SCRIPT OBEDIENCE:
   - If the user asks for **Urdu alphabet / Urdu script / Urdu haroof / اردو میں** (e.g., "mjy Urdu alphabet m likh kr do"), respond cleanly in authentic **Urdu script (اردو)** — NEVER substitute Roman Urdu when Urdu script was requested.
   - If the user asks for **Arabic / عربی / العربية** (or chats in Arabic), respond naturally in authentic **Arabic script (العربية)**.
   - If the user asks for **Hindi / हिन्दी** (or chats in Hindi), respond naturally in clean **Devanagari Hindi (हिन्दी)** (or match Hinglish if they want Hinglish).
   - If the user asks for **translation**, deliver natural, fluent translations (never word-for-word robotic literalism) in the exact requested target script/language, and include helpful pronunciation if translating between different alphabets when useful.
3. EXACT POETRY LINE-COUNT OBEDIENCE:
   - When the user asks for poetry, shayari, nazm, or ghazal of **2 lines, 4 lines, 6 lines, 8 lines**, or any specific count ("4 line ki poetry", "do line sher", "6 lines"), output **EXACTLY that number of lines** with beautiful rhythm, rhyme, and imagery.
   - Only write a full multi-couplet ghazal (8–10 lines) when no specific line count is requested.
4. NEAT, CLEAN & STYLISH PRESENTATION:
   - For casual friendly conversation, reply naturally in clean, readable paragraphs without unnecessary formatting clutter.
   - For structured topics (guides, translations, marketing kits, recipes, essays, code), use crisp markdown headings (###), clean bullets (-), numbered steps, **bold highlights**, soft blockquotes (>), and fenced code blocks (\`\`\`lang ... \`\`\`).`;

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
 * Normalizes chat history into valid alternating turns without tight conversation caps:
 * - Preserves up to 40 recent turns of context
 * - Drops leading 'model' turns because Gemini requires starting with 'user'
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

function parseRequestedLineCount(query: string): number | null {
  const lower = query.toLowerCase();

  // Numeric line requests: "4 line", "4 lines", "6 line ki", "2-line"
  const numLineMatch = lower.match(/\b(\d{1,2})\s*[-\s]*(?:lines?|line\s*ki|line\s*ka|misr[ea]y?|satr)\b/i);
  if (numLineMatch) {
    const val = parseInt(numLineMatch[1], 10);
    if (val >= 1 && val <= 24) return val;
  }

  // Couplet / sher counts ("2 sher" = 4 lines, "3 ashaar" = 6 lines)
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

  // Look for patterns like "4 line ki 2 ya 6" -> pick first explicit count if multiple
  const multiNumLine = lower.match(/\b(2|4|6|8|10|12)\s*line/i);
  if (multiNumLine) {
    return parseInt(multiNumLine[1], 10);
  }

  return null;
}

export function detectLanguageProfile(query: string): LanguageProfile {
  const lower = (query || '').toLowerCase();

  // Distinguish Urdu Nastaliq characters vs Arabic characters accurately
  const hasArabicBlock = /[\u0600-\u06FF]/.test(query);
  const hasUrduSpecificChars = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06C2\u06CC\u06D2]/.test(query);
  const hasArabicMarkers = /(مرحبا|السلام|أهلا|كيف حالك|شكرا|أريد|ماذا|لماذا|جميل|قصيدة|شعر عربي|بالعربية)/i.test(query);

  const isUrduScript = hasUrduSpecificChars || (hasArabicBlock && !hasArabicMarkers && /(اردو|میں|شاعری|غزل|محبت|دوستی|آپ|تم|ہم|کیا|کیسے|ہے|ہیں|نہیں|اور|لکھ)/i.test(query));
  const isArabicScript = hasArabicBlock && !isUrduScript;
  const isHindiScript = /[\u0900-\u097F]/.test(query);

  const isRomanUrduRequested = /\broman\s*urdu\b/i.test(lower);
  const isUrduAlphabetRequested =
    !isRomanUrduRequested &&
    (/(urdu\s*(?:alphabet|alphabets|script|haroof|harf|lafz|rasmul|rasm|likhai|writing)|asli\s*urdu|urdu\s*(?:m|me|mein|main)\s*likh)/i.test(
      lower
    ) ||
      /اردو\s*(?:حروف|رسم الخط|میں\s*لکھ|الفاظ)/i.test(query));

  const isUrduRequested = /(urdu me|urdu mein|urdu m |urdu main|in urdu|into urdu|اردو میں)/i.test(lower);
  const isEnglishRequested = /(english me|english mein|in english|into english|english main|english m )/i.test(lower);
  const isHindiRequested = /(hindi me|hindi mein|in hindi|into hindi|hindi main|hindi m |हिंदी|हिन्दी)/i.test(lower);
  const isArabicRequested = /(arabic me|arabic mein|in arabic|into arabic|arabi me|arabi mein|arabic m |عربي|عربی)/i.test(lower);
  const isFrenchRequested = /(french me|french mein|in french|into french|en français)/i.test(lower);
  const isSpanishRequested = /(spanish me|spanish mein|in spanish|into spanish|en español)/i.test(lower);

  const isRomanUrdu =
    !isUrduScript &&
    !isArabicScript &&
    !isHindiScript &&
    (isRomanUrduRequested ||
      /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|btana|mujhe|mjy|karoon|karo|krna|kr|kro|banao|bnana|bnao|kyun|kyu|kab|kahan|kha|kon|kaun|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|ghazal|gzal|sher|sunao|likho|likh|likhy|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|dosti|pyar|mohabbat|ishq|dil|dua|udaas|udas|gham|dard|khushi|kahani|mazmoon|video|channel|promote|post|koi|pyari|achi|acchi|mast|zabardast|naya|nayi|tareeqa|faide|nuqsan|parhai|paisa|paise|kamane|kamai|khana|biryani|chai|latifa|paheli|namaz|roza|ramzan|ramadan|salgirah|mubarak|maa|baap|duniya|insan|ilm|wajah|zyada|tafseel|samjhao|smjhao|smjy|btao|krdo|kardo|kardy|dost|friend)\b/i.test(
        lower
      ));

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
      /^(what is|what are|who is|who was|tell me about|explain|define|write an essay on|write an article on|write a paragraph on|write about|how to)\s+/i,
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
  return query.replace(/[?!.؟۔]+$/, '').trim() || 'This Topic';
}

function trySolveMathOrUnits(query: string, lang: LanguageProfile): string | null {
  const { lower, targetScript } = lang;
  const isRoman = targetScript === 'roman_urdu';

  // Multiplication table: "table of 7" or "7 ka table" / "7 ka pahara"
  const tableMatch = lower.match(/(?:table\s+of|pahara)\s+(\d{1,3})|(\d{1,3})\s+ka\s+(?:table|pahara)/i);
  if (tableMatch) {
    const n = parseInt(tableMatch[1] || tableMatch[2], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 1000) {
      const rows = Array.from({ length: 10 }, (_, i) => `- \`${n} × ${i + 1}\` = **${n * (i + 1)}**`).join('\n');
      return isRoman
        ? `### ${n} Ka Table (Pahara) ✨\n\n${rows}\n\nAgar kisi aur number ka pahara ya hisaab chahiye ho to zaroor poochein!`
        : `### Multiplication Table of ${n} ✨\n\n${rows}\n\nLet me know if you'd like any other calculation!`;
    }
  }

  // Percentage pattern: "25% of 800" or "800 ka 25%"
  const pctEn = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|ka)\s*(\d+(?:\.\d+)?)/i);
  const pctUr = lower.match(/(\d+(?:\.\d+)?)\s*ka\s*(\d+(?:\.\d+)?)\s*%/i);
  if (pctEn || pctUr) {
    const percent = parseFloat(pctEn ? pctEn[1] : pctUr![2]);
    const total = parseFloat(pctEn ? pctEn[2] : pctUr![1]);
    const val = Number(((percent / 100) * total).toFixed(4));
    return isRoman
      ? `### Percentage Ka Mukammal Hisaab ✨\n\n- **Formula:** \`(${percent} ÷ 100) × ${total}\`\n- **Step:** \`${percent / 100} × ${total}\`\n- **Bilkul Sahi Jawab:** **${val}**\n\nDiscount, profit, ya marks percentage nikalni ho to numbers batayein!`
      : `### Percentage Calculation ✨\n\n- **Formula:** \`(${percent} ÷ 100) × ${total}\`\n- **Step:** \`${percent / 100} × ${total}\`\n- **Final Answer:** **${val}**`;
  }

  // Unit conversions
  const unitMatch = lower.match(
    /(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)\s*(?:to|in|into|me)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)/i
  );
  if (unitMatch) {
    const num = parseFloat(unitMatch[1]);
    const from = unitMatch[2].toLowerCase();
    const to = unitMatch[3].toLowerCase();
    let converted: number | null = null;
    let label = '';

    if (from.startsWith('km') && to.startsWith('mi')) {
      converted = num * 0.621371;
      label = `${num} km = **${converted.toFixed(3)} miles**`;
    } else if (from.startsWith('mi') && to.startsWith('km')) {
      converted = num * 1.60934;
      label = `${num} miles = **${converted.toFixed(3)} km**`;
    } else if (from.startsWith('kg') && (to.startsWith('lb') || to.startsWith('pound'))) {
      converted = num * 2.20462;
      label = `${num} kg = **${converted.toFixed(2)} lbs**`;
    } else if ((from.startsWith('lb') || from.startsWith('pound')) && to.startsWith('kg')) {
      converted = num * 0.453592;
      label = `${num} lbs = **${converted.toFixed(2)} kg**`;
    } else if (from.startsWith('c') && to.startsWith('f')) {
      converted = (num * 9) / 5 + 32;
      label = `${num}°C = **${converted.toFixed(1)}°F**`;
    } else if (from.startsWith('f') && to.startsWith('c')) {
      converted = ((num - 32) * 5) / 9;
      label = `${num}°F = **${converted.toFixed(1)}°C**`;
    } else if (from.startsWith('h') && to.startsWith('m')) {
      converted = num * 60;
      label = `${num} hours = **${converted} minutes**`;
    } else if (from.startsWith('m') && to.startsWith('h')) {
      converted = num / 60;
      label = `${num} minutes = **${converted.toFixed(2)} hours**`;
    }

    if (converted !== null) {
      return `### Unit Conversion ✨\n\n${label}`;
    }
  }

  // Direct arithmetic expression
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
            ? `### Hisaab Ka Sahi Jawab ✨\n\n- **Expression:** \`${cleaned}\`\n- **Natija:** **${pretty}**\n\nKoi aur math question ho to poochein!`
            : `### Calculation Result ✨\n\n- **Expression:** \`${cleaned}\`\n- **Answer:** **${pretty}**`;
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

  // Group into clean 2-line stanzas so both 2, 4, 6, 8, and odd line counts look balanced
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
  variantSeed = 0
): string {
  const { lower, targetScript, requestedLineCount } = lang;
  const isSad = /(sad|udaas|udas|dard|gham|tanha|broken|heartbreak|judai|rona|bewafa|yaad|اداس|درد|غم|حزن|उदास|दर्द)/i.test(lower);
  const isLove = /(love|pyar|mohabbat|ishq|dil|romantic|sanam|mehboob|jaan|محبت|عشق|پیار|حب|प्यार|मोहब्बत|इश्क़)/i.test(lower);
  const isFriend = /(dost|dosti|friend|friendship|yaar|دوست|دوستی|صديق|صداقة|दोस्त|दोस्ती)/i.test(lower);
  const isMotivation = /(motivation|himmat|hausla|success|kamyabi|iqbal|dream|khwab|حوصلہ|کامیابی|نجاح|हौसला|सफलता)/i.test(lower);

  const countLabel = requestedLineCount ? ` (${requestedLineCount} Lines)` : '';

  if (targetScript === 'urdu_script') {
    const urduSad: Couplet[] = [
      ['خاموش راتوں میں بھی اک صدا سی رہتی ہے', 'دل کے ویرانے میں تیری وفا سی رہتی ہے'],
      ['ٹوٹ کر بکھرے تو پھر سمیٹا خود کو ہم نے', 'زخمِ دل پر مگر اک دعا سی رہتی ہے'],
      ['وقت بدلا ہے مگر یاد کی خوشبو نہ گئی', 'شام ہوتے ہی فضا میں ادا سی رہتی ہے'],
      ['چاند بھی پوچھتا ہے اکثر تیری خبر مجھ سے', 'رات بھر آنکھ میں اک روشنی سی رہتی ہے'],
      ['ہم نے سیکھا ہے مسکرا کر ہر درد چھپانا', 'پھر بھی لہجے میں تیری کمی سی رہتی ہے']
    ];
    const urduLove: Couplet[] = [
      ['تیری مسکان سے روشن ہے جہاں سارا میرا', 'تو اگر پاس ہو تو وقت ٹھہر جاتا ہے'],
      ['لفظ کم پڑتے ہیں تعریفِ محبت کے لیے', 'ہر دھڑکن میں فقط نام تیرا آتا ہے'],
      ['چاند بھی دیکھ کے شرمائے تری سادگی کو', 'تیری نظروں سے نیا خواب سنور جاتا ہے'],
      ['خامشی میں بھی سنائی دے صدا تیری مجھے', 'یہی احساس مرے دل کو بھرا رکھتا ہے'],
      ['رب کرے قائم رہے عمر بھر یہ پیار کا رنگ', 'میری ہر ایک دعا میں تو ہی بس رہتا ہے']
    ];
    const urduFriend: Couplet[] = [
      ['وقت کے ساتھ زمانے کی ہوا بدلتی ہے', 'سچا دوست مگر ہر موڑ پہ ساتھ چلتا ہے'],
      ['بِن کہے جو سمجھ لے دل کے سبھی راز گہرے', 'ایسا ہمدم تو نصیبوں سے کہیں ملتا ہے'],
      ['دھوپ ہو غم کی یا خوشیوں کی سنہری بارش', 'دوست ہر حال میں جینے کا ہنر دیتا ہے'],
      ['دولت و شہرت تو آنی جانی چیزیں ہیں یہاں', 'اصل سرمایہ وہی جو دوستی نبھاتا ہے']
    ];
    const urduMotivation: Couplet[] = [
      ['اندھیروں سے نہ ڈر، تیرا سویرا آنے والا ہے', 'جو محنت سے نہ گھبرائے وہ منزل پانے والا ہے'],
      ['گر کے اٹھنا ہی تو اصلی پہچان ہے تیری', 'ہر طوفاں تیرے حوصلے سے ہار جانے والا ہے'],
      ['چھوڑ دے فکر کہ دنیا کیا کہے گی پیچھے', 'وقت خود تیرا مقام بلند کرنے والا ہے'],
      ['صبر و ہمت سے قدم آگے بڑھاتا چل دوست', 'ہر حسیں خواب حقیقت میں بدلنے والا ہے']
    ];
    const urduGeneral: Couplet[] = [
      ['چراغِ دل جلا رکھا ہے امیدِ سحر کے نام', 'سفر آسان ہو جاتا ہے سچے اعتماد کے نام'],
      ['جو مسکرا کے ملے دردِ زندگی سے کبھی', 'لکھی ہے ہم نے ہر اک شام اس کی داد کے نام'],
      ['ہوا کے دوش پہ لکھا ہے پیار کا پیغام', 'کہ روشنی رہے قائم ہر اک مراد کے نام'],
      ['فلک کے پار بھی امید کا جہاں آباد', 'جہاں دعائیں پہنچتی ہیں ہر فریاد کے نام'],
      ['نہ ہار مان کبھی وقت کے اندھیروں سے', 'نئی صبح کا اجالا ہے دلِ شاد کے نام']
    ];

    const selected = isSad
      ? urduSad
      : isLove
      ? urduLove
      : isFriend
      ? urduFriend
      : isMotivation
      ? urduMotivation
      : urduGeneral;

    const body = formatCoupletsByLineCount(selected, requestedLineCount);
    const title = isSad
      ? 'خوبصورت اداس شاعری 🌙'
      : isLove
      ? 'محبت بھری اردو شاعری 💖'
      : isFriend
      ? 'دوستی پر خوبصورت شاعری 🤝'
      : isMotivation
      ? 'حوصلہ افزا اردو شاعری 🔥'
      : 'خوبصورت اردو شاعری ✨';

    return `### ${title}${requestedLineCount ? ` (${requestedLineCount} سطریں)` : ''}\n\n${body}\n\n---\nاگر آپ **2، 4 یا 6 سطروں** میں کسی اور موضوع پر اردو شاعری چاہیں تو بتائیے!`;
  }

  if (targetScript === 'arabic') {
    const arSad: Couplet[] = [
      ['في سُكونِ الليلِ يبقى للذكرى صَدى', 'وبِقَلبي شَوقُ حُلمٍ لا يَغيبُ أَبَدا'],
      ['كَم صَبَرنا حينَ ضاقت بالليالي دُروبُنا', 'ثُمَّ أَشرَقَ نورُ صَبرٍ في حَنايا قُلوبِنا'],
      ['تَمضي الأيّامُ سِراعاً والأماني باقية', 'وَرَجائي في إلهي كالنجومِ الزاهية']
    ];
    const arLove: Couplet[] = [
      ['أنتَ في قَلبي ضياءٌ لا يَغيبُ بَريقُهُ', 'وكَأنَّ الصُّبحَ يَبسِمُ حِينَ تَبدو طَريقُهُ'],
      ['كلُّ حَرفٍ في وَدادِكَ صارَ شِعراً صَادِقاً', 'يَحمِلُ الوَردَ جَميلاً والهَوى مُتَأَلِّقاً'],
      ['دامَتِ الأيّامُ تَجمعُنا على خَيرِ المُنَى', 'في ظِلالِ الحُبِّ تَصفو رُوحُنا وَحَياتُنا']
    ];
    const arGeneral: Couplet[] = [
      ['تَبسَّم للصباحِ فإنَّ فجرَ الخيرِ آتِ', 'ولا تَحزن إذا مَرَّت صِعابُ الذكرياتِ'],
      ['ففي الصبرِ الجميلِ رَبيعُ قلبٍ مُطمئنٍّ', 'ويَبقى الأملُ الصادقُ نُورَ كُلِّ الحَياةِ'],
      ['وإن ضاقت بِكَ الدنيا فثِق باللَّهِ دَوماً', 'سَيُبدِلُ حُزنَ أيامِكَ أَفراحاً وَهَناءً']
    ];
    const selected = isSad ? arSad : isLove ? arLove : arGeneral;
    const body = formatCoupletsByLineCount(selected, requestedLineCount);
    return `### شعر عربي جميل${requestedLineCount ? ` (${requestedLineCount} أسطر)` : ''} ✨\n\n${body}\n\n---\nأخبرني إذا أردت أبياتاً أخرى في الحب أو الصداقة أو الأمل!`;
  }

  if (targetScript === 'hindi') {
    const hiLove: Couplet[] = [
      ['तेरी मुस्कान से रोशन है मेरा सारा जहाँ,', 'तू पास हो तो हर लम्हा बन जाए इक दास्ताँ।'],
      ['लफ़्ज़ कम पड़ जाते हैं तेरी तारीफ़ के लिए,', 'हर धड़कन में बसा है बस तेरा ही प्यारा निशाँ।'],
      ['ख़ामोशी में भी सुनाई देती है आवाज़ तेरी,', 'रब करे यूँ ही सलामत रहे ये रिश्ता हमेशा यहाँ।']
    ];
    const hiSad: Couplet[] = [
      ['ख़ामोश शामों में भी एक सदा सी रहती है,', 'दिल के वीराने में तेरी वफ़ा सी रहती है।'],
      ['टूट कर बिखरे तो ख़ुद ही संभाला ख़ुद को,', 'ज़ख़्म-ए-दिल पर मगर एक दुआ सी रहती है।'],
      ['हमने सीखा है मुस्कुरा कर हर दर्द छिपाना,', 'फिर भी लहजे में तेरी कमी सी रहती है।']
    ];
    const hiGeneral: Couplet[] = [
      ['अंधेरों से न डर, तेरा सवेरा आने वाला है,', 'जो मेहनत से चले, वह मंज़िल पाने वाला है।'],
      ['सच्चे दिल से की गई हर कोशिश रंग लाती है,', 'सब्र रख दोस्त, हर सपना सच होने वाला है।'],
      ['मुस्कुराहट के साथ बढ़ाते चलो हर एक क़दम,', 'तेरा हौसला हर मुश्किल को हराने वाला है।']
    ];
    const selected = isSad ? hiSad : isLove ? hiLove : hiGeneral;
    const body = formatCoupletsByLineCount(selected, requestedLineCount);
    return `### सुंदर हिन्दी शायरी${countLabel} ✨\n\n${body}\n\n---\nअगर आपको किसी और विषय या पंक्तियों में शायरी चाहिए तो बताएं!`;
  }

  if (targetScript === 'roman_urdu') {
    const roSad: Couplet[][] = [
      [
        ['Khamosh shaamon me bhi ek sada si rehti hai,', 'Dil ke weerane me teri wafa si rehti hai.'],
        ['Toot kar bikhre to phir khud hi sambhala khud ko,', 'Zakhm-e-dil par magar ek dua si rehti hai.'],
        ['Waqt badla hai par yaad ki khushboo na gayi,', 'Har guzarte pal me ek ada si rehti hai.'],
        ['Bheed me reh kar bhi aksar tanha mehsus hota hai,', 'Aankhon ke konay me chhupi ek haya si rehti hai.'],
        ['Humne seekha hai muskura ke har gham chhupana,', 'Phir bhi lehje me teri kami si rehti hai.']
      ],
      [
        ['Raat bhar jagti aankhon ko khabar kaun kare,', 'Jo samajhta hi nahi us pe asar kaun kare.'],
        ['Humne har mod pe chaha ke sukoon mil jaye,', 'Par muqaddar me likhe dard se dar kaun kare.'],
        ['Dil ke sheeshe ko sambhala hai bade naazon se,', 'Ab kisi patthar ke shahar me safar kaun kare.'],
        ['Phir bhi honton pe dua aur nazar me izzat hai,', 'Waqt ke haathon se shikwa magar kaun kare.']
      ]
    ];
    const roLove: Couplet[] = [
      ['Teri muskurahat se roshan mera jahan hai,', 'Tu paas ho to har lamha ek dastan hai.'],
      ['Alfaaz kam pad jayein tareef me teri,', 'Har dhadkan me basa bas tera hi nishan hai.'],
      ['Chaand bhi sharma jaye teri saadgi dekh kar,', 'Teri nazar me chhupa ek aasman hai.'],
      ['Khuda kare hamesha salamat rahe yeh rishta,', 'Meri har dua me shamil bas teri jaan hai.']
    ];
    const roFriend: Couplet[] = [
      ['Waqt ke saaye me sab kuch badal jata hai,', 'Par saccha dost har mod par saath nibhata hai.'],
      ['Bina kahe jo samajh le dil ki baat sari,', 'Aisa yaar naseeb walon ko hi mil pata hai.'],
      ['Dhoop ho gham ki ya khushiyon ki barish ho,', 'Har haal me dost hi hausla badhata hai.'],
      ['Daulat aur shohrat to aani jaani cheezein hain,', 'Asli sarmaya wahi jo dosti nibha jata hai.']
    ];
    const roMotivation: Couplet[] = [
      ['Andheron se na dar, tera savera aane wala hai,', 'Jo mehnat karta hai wahi manzil paane wala hai.'],
      ['Gir ke uthna hi toh asli pehchan hai teri,', 'Har tufaan tere hausle se haar jaane wala hai.'],
      ['Chhod de fikr ke log kya kahenge piche,', 'Waqt khud tera naam buland kar jaane wala hai.'],
      ['Jitni gehri hogi raat, utna chamkega sitara tera,', 'Sabr rakh, har khwab haqeeqat ban jaane wala hai.']
    ];
    const roGeneral: Couplet[][] = [
      [
        ['Shaam dhalte hi khayalon ka safar chalta hai,', 'Ek chhota sa diya dil ke nagar chalta hai.'],
        ['Har mushkil me bhi humne seekha hai muskurana,', 'Jiske paas sabr ho uska hi asar chalta hai.'],
        ['Khwab aankhon me saja kar jo chale raah-e-wafa,', 'Manzilon tak wahi be-khauf nidar chalta hai.'],
        ['Baat alfaaz ki nahi, ehsaas ki hoti hai,', 'Jo dil se nikle wahi har dil me utar chalta hai.']
      ],
      [
        ['Har sitare me chamak teri nazar jaisi hai,', 'Har subah ki hawa mere safar jaisi hai.'],
        ['Jo samajh le woh khamoshi ko bhi padh leta hai,', 'Warna duniya ki zuban sirf khabar jaisi hai.'],
        ['Hosla rakh ke chalenge to ujala hoga,', 'Har dua waqt ke seene me asar jaisi hai.']
      ]
    ];

    const selected = isSad
      ? roSad[variantSeed % roSad.length]
      : isLove
      ? roLove
      : isFriend
      ? roFriend
      : isMotivation
      ? roMotivation
      : roGeneral[variantSeed % roGeneral.length];

    const body = formatCoupletsByLineCount(selected, requestedLineCount);
    const title = isSad
      ? 'Dil Ko Chhoo Lene Wali Udaas Shayari 🌙'
      : isLove
      ? 'Mohabbat Bhari Khubsurat Shayari 💖'
      : isFriend
      ? 'Dosti Par Khubsurat Shayari 🤝'
      : isMotivation
      ? 'Hausla Aur Kamyabi Ki Shayari 🔥'
      : 'Khubsurat Roman Urdu Shayari ✨';

    return `### ${title}${countLabel}\n\n${body}\n\n---\nAgar aap chahein to main isay **Urdu script (اردو)**, **Arabic**, ya **2 / 4 / 6 lines** me bhi likh sakti hoon!`;
  }

  const enCouplets: Couplet[] = [
    ['Softly falls the evening light across the quiet sea,', 'Carrying the whispered hopes of everything to be.'],
    ['Every storm we weather leaves a steadier design,', 'Turning patient footsteps into something bright and fine.'],
    ['Keep your heart courageous through the shadow and the rain,', 'Every dawn returns to paint the sky with gold again.'],
    ['When the road grows heavy and the stars feel far away,', 'Trust the quiet strength inside to guide you through the day.']
  ];
  const body = formatCoupletsByLineCount(enCouplets, requestedLineCount);
  return `### Original Poem — Golden Horizon${countLabel} ✨\n\n${body}\n\n---\nTell me your preferred mood (**love, friendship, sorrow, motivation**) or language (**Urdu, Arabic, Hindi, Roman Urdu**) and line count!`;
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
    return `### مکمل پروموشنل پوسٹ اور مارکیٹنگ کِٹ — **${brand}** 🚀

**1. دلکش سرخی (Hook):**
✨ کیا آپ بہترین معیار اور اعتماد کی تلاش میں ہیں؟ **${brand}** آپ کے لیے لایا ہے لاجواب تجربہ اور خاص آفر!

**2. مکمل پوسٹ:**
> آج ہی **${brand}** کا حصہ بنیں اور فرق خود محسوس کریں۔  
> - ✅ **اعلیٰ معیار** بغیر کسی سمجھوتے کے  
> - ⚡ **تیز اور قابلِ اعتماد سروس**  
> - 💎 **خصوصی ڈسکاؤنٹ** محدود وقت کے لیے  
>  
> 📩 **ابھی میسج کریں اور اپنا آرڈر بک کریں!**

**3. مختصر ویڈیو اسکرپٹ:**
- **شروع:** "رکیں! کیا آپ نے ابھی تک **${brand}** کو آزمایا؟"
- **درمیان:** "یہاں آپ کو ملتا ہے بہترین معیار اور شاندار سروس ایک ہی جگہ۔"
- **اختتام:** "ابھی فالو کریں اور لنک چیک کریں!"`;
  }

  if (targetScript === 'roman_urdu') {
    return `### Mukammal Viral Promotional Kit — **${brand}** 🚀

**1. Catchy Hook (Attention Grabber):**
🔥 *"Ab wait khatam! Behtareen quality aur bharose ka ek hi naam — **${brand}**!"*

**2. Ready-to-Post Ad Copy:**
> Agar aap dhoond rahe hain **top quality, fast service aur best value**, to **${brand}** aapke liye bilkul perfect hai! ✨
>
> - ✅ **100% Trusted & Verified Quality**
> - ⚡ **Tez Delivery & Instant Response**
> - 💎 **Special Offer — Sirf Limited Time Ke Liye!**
>
> 👇 **Abhi DM karein ya Link par click karke apna order confirm karein!**

**3. Short 15-Second Video / Reel Script:**
- **Hook:** *"Rukhein! Kya aapko pata hai **${brand}** kyun itna trend ho raha hai?"*
- **Value:** *"Kyunke yahan milti hai premium quality bina kisi compromise ke!"*
- **CTA:** *"Abhi save karein, share karein aur link check karein!"*

**4. Hashtags:**
\`#Viral #Trending #Pakistan #BusinessGrowth #BestOffer #MustTry\``;
  }

  return `### Complete Promotional & Marketing Kit — **${brand}** 🚀

**1. Attention-Grabbing Hooks:**
- *"Stop scrolling — discover why everyone is talking about **${brand}**!"*
- *"Looking for an effortless upgrade? Meet **${brand}**."*

**2. Ready-to-Publish Social Ad Copy:**
> Looking for quality you can actually trust? **${brand}** brings together thoughtful craftsmanship, fast results, and unbeatable value.
>
> - ✅ **Premium Quality** built to impress
> - ⚡ **Fast & Reliable** experience from day one
> - 💎 **Limited-Time Special Offer** available now
>
> 👉 **Tap the link or send us a quick message today to get started!**

**3. High-Reach Hashtags:**
\`#Trending #Marketing #BrandGrowth #MustHave #ExplorePage #QualityFirst\``;
}

function generateEssayOrArticle(topic: string, lang: LanguageProfile): string {
  const { targetScript } = lang;

  if (targetScript === 'urdu_script') {
    return `### **${topic}** — جامع اور خوبصورت مضمون 📖

**تعارف:**
**${topic}** انسانی زندگی، معاشرے اور فکری ترقی کا ایک نہایت اہم موضوع ہے۔ آج کے جدید دور میں اس موضوع کو درست انداز میں سمجھنا پہلے سے کہیں زیادہ ضروری ہو گیا ہے۔

**اہم نکات:**
1. **فکری و عملی فائدہ:** جب ہم **${topic}** کے بنیادی اصولوں کو اپناتے ہیں تو ہماری روزمرہ زندگی میں نظم و ضبط، اعتماد اور مثبت تبدیلی آتی ہے۔
2. **معاشرتی بہتری:** مثبت سوچ، محنت اور علم کی روشنی نہ صرف فرد کو مضبوط بناتی ہے بلکہ پورے معاشرے کو ترقی کی راہ پر گامزن کرتی ہے۔
3. **مستقبل کی تیاری:** دورِ حاضر کے تقاضوں کو سمجھتے ہوئے صحیح سمت میں قدم بڑھانا ہی کامیابی کی اصل کنجی ہے۔

**نتیجہ:**
مختصراً یہ کہ **${topic}** ہمیں بہتر انسان بننے، سیکھنے اور آگے بڑھنے کا حوصلہ دیتا ہے۔

---
اگر آپ کو اس پر **مزید تفصیل**، **تقریر** یا کسی اور زبان میں ترجمہ چاہیے تو بتائیے!`;
  }

  if (targetScript === 'arabic') {
    return `### **${topic}** — مقال واضح وشامل 📖

**مقدمة:**
يُعَدُّ موضوع **${topic}** من المواضيع المهمة التي تؤثر في حياتنا اليومية وطريقة تفكيرنا ونموّنا الشخصي في عالمنا المعاصر.

**أبرز النقاط الأساسية:**
1. **الوعي والفهم:** تبدأ كل خطوة ناجحة بفهم الأسس الحقيقية والهدف الواضح من **${topic}**.
2. **الأثر الإيجابي:** الاستمرار والصبر والعمل المنظّم يحوّل الأفكار الجيدة إلى نتائج ملموسة ومستدامة.
3. **التطبيق العملي:** البداية بخطوات بسيطة وثابتة يومياً هي الطريق الأنجح نحو التميّز.

**الخلاصة:**
إن الاهتمام بـ **${topic}** يفتح آفاقاً جديدة للتعلّم والتطوّر وتحقيق النجاح بثقة وهدوء.`;
  }

  if (targetScript === 'hindi') {
    return `### **${topic}** — सरल और संपूर्ण लेख 📖

**परिचय:**
आज के तेज़ी से बदलते समय में **${topic}** का महत्व हमारे जीवन, सोच और प्रगति में बेहद खास है। इसे सही ढंग से समझना हर व्यक्ति के लिए उपयोगी होता है।

**मुख्य बिंदु:**
1. **सही समझ:** किसी भी विषय में सफलता की पहली सीढ़ी उसकी मूल बातों और उद्देश्य को स्पष्ट रूप से समझना है।
2. **जीवन पर प्रभाव:** जब हम सकारात्मक सोच और अनुशासन के साथ **${topic}** को अपनाते हैं, तो आत्मविश्वास और कार्यक्षमता दोनों बढ़ते हैं।
3. **निरंतर अभ्यास:** छोटे-छोटे लगातार प्रयास लंबे समय में शानदार परिणाम देते हैं।

**निष्कर्ष:**
संक्षेप में, **${topic}** हमें बेहतर सीखने, आगे बढ़ने और जीवन को सकारात्मक दिशा देने की प्रेरणा देता है।`;
  }

  if (targetScript === 'roman_urdu') {
    return `### **${topic}** — Ek Mukammal aur Stylish Article 📖

**1. Taaruf (Introduction):**
**${topic}** aaj ke daur ka ek behad aham aur dilchasp mauzu hai. Chahe taleem ho, rozmarra zindagi ho, ya hamara aane wala kal — **${topic}** ko sahi tarah samajhna har insaan ke liye faidemad sabit hota hai.

**2. Aham Nuqaat (Key Highlights):**
- **Bunyadi Samajh:** Kisi bhi cheez me kamyabi hasil karne ka pehla qadam uski asli bunyad aur maqsad ko samajhna hota hai.
- **Zindagi Par Asar:** Jab hum **${topic}** ke ache pehluon ko apni aadat banate hain to soch me nikhar, kaam me behtari, aur rishton me bharosa paida hota hai.
- **Practical Faide:** Waqt ki qadr, musalsal koshish, aur saaf niyat ke sath is par amal karne se shandar nataij milte hain.

**3. Khulasa (Conclusion):**
**${topic}** humein sikhata hai ke hikmat, sabr aur musalsal koshish se har mushkil aasan ho sakti hai.

---
Batayein agar aap is par **Urdu script (اردو)**, **speech**, ya **mazeed detail** chahti hain!`;
  }

  return `### **${topic}** — Complete Structured Essay & Guide 📖

**Introduction**
**${topic}** plays a meaningful role in shaping how we think, learn, and grow in today's fast-moving world. Understanding its true value helps us make wiser choices in both personal life and everyday work.

**Core Perspectives & Key Benefits**
1. **Clarity & Foundation:** Every meaningful achievement begins with understanding the core principles behind **${topic}** and applying them with patience.
2. **Everyday Impact:** When practiced consistently, **${topic}** builds confidence, sharper focus, stronger relationships, and lasting resilience.
3. **Modern Relevance:** In a fast-changing era, staying grounded in clear purpose sets thoughtful individuals apart.

**Conclusion**
Ultimately, **${topic}** reminds us that meaningful growth comes from clear intention, steady effort, and a balanced heart.`;
}

function generateRecipe(query: string, lang: LanguageProfile): string {
  const { lower, targetScript } = lang;
  const isRoman = targetScript === 'roman_urdu';
  if (/chai|tea/i.test(lower)) {
    return isRoman
      ? `### Kadak & Khushbudar Masala Chai Recipe ☕\n\n**Ingredients (2 Cups):**\n- **Doodh (Milk):** 1.5 cups\n- **Paani:** 0.5 cup\n- **Chai Patti:** 2 teaspoons\n- **Cheeni (Sugar):** 2 tsp\n- **Sabz Elaichi:** 2 crushed + Adrak ka chhota tukda\n\n**Banane Ka Tareeqa:**\n1. Saucepan me paani, elaichi aur adrak daal kar 2 minute ubal lein.\n2. Ab **chai patti** aur **cheeni** daal kar accha rang nikalne dein.\n3. Phir **doodh** shamil karein aur halki aanch par 3–4 minute pakayein.\n4. Chhan kar garam garam enjoy karein! ✨`
      : `### Perfect Spiced Chai Recipe ☕\n\n**Ingredients (2 Cups):**\n- 1.5 cups whole milk + 0.5 cup water\n- 2 tsp black tea leaves & sugar to taste\n- 2 crushed green cardamom pods + a small slice of fresh ginger\n\n**Instructions:**\n1. Simmer water with crushed cardamom and ginger for 2 minutes.\n2. Add tea leaves and sugar; let the aroma deepen.\n3. Pour in milk and simmer gently for 3–4 minutes until rich and golden.\n4. Strain into warm cups and enjoy! ✨`;
  }

  return isRoman
    ? `### Mazedaar Special Biryani Recipe 🍛\n\n**Zaroori Cheezein:**\n- **Basmati Chawal:** 500g (30 min bhigoye hue)\n- **Chicken / Mutton:** 500g\n- **Pyaz, Tamatar, Dahi:** 2 medium pyaz, 2 tamatar, 1/2 cup dahi\n- **Masale:** Adrak-lehsan paste (1 tbsp), Biryani masala (2 tbsp), Namak, Dhaniya, Podina\n\n**Asaan Tareeqa:**\n1. Pyaz golden fry karein, phir adrak-lehsan, tamatar, dahi aur chicken/masale daal kar bhoon lein.\n2. Chawal **80% boil** karke chhan lein.\n3. Patili me chawal aur korma ki layer lagayein, upar podina aur zarda rang daalein.\n4. **15 minute halki aanch par Dam** dein — khushbudar biryani tayyar hai! ✨`
    : `### Fragrant Classic Biryani Recipe 🍛\n\n**Ingredients:**\n- 500g aged Basmati rice (soaked 30 mins)\n- 500g chicken or vegetables, 1/2 cup yogurt, 2 sliced onions, 2 tomatoes\n- 1 tbsp ginger-garlic paste, 2 tbsp biryani spice blend, fresh mint, coriander\n\n**Method:**\n1. Fry onions until golden, add ginger-garlic, tomatoes, yogurt, spices, and protein.\n2. Boil rice until **80% cooked**, then drain.\n3. Layer masala and rice, top with fresh mint, and steam on low heat (**Dum**) for 15 minutes! ✨`;
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

  // If user is translating the previous AI response / poem into Urdu script, Arabic, or Hindi
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
      ar: 'صباح الخير، أتمنى لك يوماً سعيداً',
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
    },
    'kya haal hai': {
      ur: 'آپ کا کیا حال ہے؟',
      ro: 'Aap kaise hain?',
      ar: 'كيف حالك؟',
      hi: 'आप कैसे हैं?',
      en: 'How are you doing?',
      fr: 'Comment ça va ?'
    }
  };

  const match = knownTranslations[phrase.toLowerCase()];
  if (match) {
    if (lang.targetScript === 'arabic') {
      return `### الترجمة بالعربية 🌐\n\n> **${match.ar}**\n\n- **Urdu (اردو):** ${match.ur}\n- **Hindi (हिन्दी):** ${match.hi}\n- **English:** ${match.en}`;
    }
    if (lang.targetScript === 'hindi') {
      return `### हिन्दी अनुवाद 🌐\n\n> **${match.hi}**\n\n- **Urdu (اردو):** ${match.ur}\n- **Arabic (العربية):** ${match.ar}\n- **English:** ${match.en}`;
    }
    if (lang.targetScript === 'urdu_script') {
      return `### اردو ترجمہ 🌐\n\n> **${match.ur}**\n\n- **Roman Urdu:** ${match.ro}\n- **Arabic (العربية):** ${match.ar}\n- **Hindi (हिन्दी):** ${match.hi}`;
    }
    return `### Multilingual Translation for "${phrase}" 🌐\n\n- **Urdu (اردو):** ${match.ur}\n- **Roman Urdu:** ${match.ro}\n- **Arabic (العربية):** ${match.ar}\n- **Hindi (हिन्दी):** ${match.hi}\n- **French (Français):** ${match.fr}`;
  }

  if (lang.targetScript === 'urdu_script') {
    return `### اردو ترجمہ کے لیے تیار 🌐\n\nآپ کا جملہ: **"${phrase}"**\n\nبراہِ کرم پورا جملہ انگریزی، عربی یا ہندی میں لکھیں — میں فوراً صاف اور درست **اردو حروف (اردو رسم الخط)** میں ترجمہ کر دوں گا!`;
  }
  if (lang.targetScript === 'arabic') {
    return `### الترجمة جاهزة 🌐\n\nالنص: **"${phrase}"**\n\nاكتب الجملة الكاملة التي تريد ترجمتها إلى **العربية** أو **الأردية** أو **الهندية** أو **الإنجليزية** وسأترجمها لك فوراً بأسلوب طبيعي وسلس!`;
  }
  if (lang.targetScript === 'hindi') {
    return `### अनुवाद के लिए तैयार 🌐\n\nवाक्य: **"${phrase}"**\n\nकृपया पूरा वाक्य और अपनी मनचाही भाषा लिखें — मैं तुरंत साफ और सही **हिन्दी** में अनुवाद कर दूँगा!`;
  }
  return `### Translation Ready for "${phrase}" 🌐\n\nApna poora jumla aur target language (**Urdu اردو, Arabic العربية, Hindi हिन्दी, English, ya French**) likh kar bhejein — main turant bilkul natural tarjuma kar dunga!`;
}

export function generateErrorexAiFallback(userQuery: string, history?: any[]): string {
  const query = (userQuery || '').trim();
  const lang = detectLanguageProfile(query);
  const {
    lower,
    targetScript,
    isRomanUrdu,
    requestedLineCount
  } = lang;
  const variantSeed = Array.isArray(history) ? history.length : 0;

  const lastAiText = Array.isArray(history)
    ? [...history].reverse().find(h => h?.sender === 'ai' && h?.id !== 'msg_ai_welcome')?.text || ''
    : '';
  const lastUserTopic = Array.isArray(history)
    ? [...history].reverse().find(h => h?.sender === 'user')?.text || ''
    : '';

  // 0. Context-aware script conversion / line-count adjustment / follow-up requests
  const isFollowUpConvertOrExpand =
    /(aur likho|aur sunao|ek aur|ik or|another one|more like this|continue|aage likho|zyada|detail me|expand|elaborate|isko urdu|isay urdu|urdu alphabet me|arabic me likh|hindi me likh)/i.test(
      lower
    ) ||
    (requestedLineCount !== null && query.split(/\s+/).length <= 7 && /ghazal|poem|poetry|sher|shairi|شاعری|شعر|शायरी/i.test(lastAiText.toLowerCase()));

  if (isFollowUpConvertOrExpand && lastAiText) {
    if (
      /ghazal|poem|poetry|sher|shairi|kalam|شاعری|غزل|شعر|शायरी/i.test(lastAiText.toLowerCase()) ||
      requestedLineCount !== null
    ) {
      return generatePoetryOrGhazal(`${lastUserTopic} ${query}`, lang, variantSeed + 1);
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

  // 1. Warm Human Friend Greetings & Companionship
  if (
    /^(salam|assalam|aoa|asalam|hi|hello|hey|helo|hy|greetings|good morning|good evening|good night|subah bakhair|shab bakhair|مرحبا|السلام عليكم|أهلا|नमस्ते|हाय|हेलो)\b/i.test(
      lower
    ) &&
    query.length < 55
  ) {
    if (targetScript === 'arabic') {
      return `وعليكم السلام وأهلاً بك يا صديقي! 👑\n\nأنا **ERROREX AI** — صديقك الذكي والمقرّب هنا دائماً. اسألني أي شيء بالعربية أو الأردية أو الهندية أو الإنجليزية: شعر، ترجمة، أفكار، برمجة، أو حتى دردشة ودّية!\n\nكيف أقدر أسعدك اليوم؟ 😊`;
    }
    if (targetScript === 'hindi') {
      return `नमस्ते दोस्त! बहुत खुशी हुई आपसे बात करके 👑\n\nमैं **ERROREX AI** हूँ — आपका सच्चा दोस्त और मददगार। आप मुझसे किसी भी भाषा में बात कर सकते हैं: शायरी (2, 4 या 6 लाइन), अनुवाद, लेख, कोडिंग या दिल की कोई भी बात!\n\nबताइए आज मैं आपकी क्या मदद करूँ? 😊`;
    }
    if (targetScript === 'urdu_script') {
      return `وعلیکم السلام! دل سے خوش آمدید میرے دوست 👑\n\nمیں **ERROREX AI** ہوں — آپ کا دوستانہ اور ذہین ساتھی۔ آپ مجھ سے کسی بھی زبان میں بات کر سکتے ہیں: اردو رسم الخط میں 2، 4 یا 6 سطروں کی شاعری، عربی، ہندی، ترجمہ، مضامین، یا کسی بھی سوال کا جواب!\n\nبتائیے آج آپ کے لیے کیا لکھوں؟ 😊`;
    }
    if (targetScript === 'roman_urdu') {
      return `Walaikum Assalam mere dost! Bohat khushi hui aapka message dekh kar 👑\n\nMain **ERROREX AI** hoon — aapka apna friendly saathi. Chahe **Urdu alphabet (اردو)** me 2, 4 ya 6 line ki shayari chahiye ho, **Arabic** ya **Hindi** me chat karni ho, kisi baat ka **tarjuma** karwana ho, ya bas ek ache dost ki tarah baat karni ho — main hamesha hazir hoon! 😊`;
    }
    return `Hey there, friend! Great to hear from you 👑\n\nI'm **ERROREX AI** — always here to chat warmly like a close friend and help you with anything in **any language**: exact-length poetry, translations (Urdu script, Arabic, Hindi, English), essays, promotions, coding, or life advice.\n\nWhat's on your mind today? 😊`;
  }

  // Friend check-in / "be my friend" / "how are you"
  if (
    /(kaise ho|kya haal|how are you|kya chal raha|ap theek|aap kaise|be my friend|mere dost|meri dost|dost ban|friend ban|كيف حالك|شلونك|कैसे हो|कैसी हो)/i.test(
      lower
    ) &&
    query.length < 75
  ) {
    if (targetScript === 'arabic') {
      return `الحمد لله أنا بخير وأسعد جداً بحديثك معي! 😊\n\nبالطبع أنا صديقك المقرّب دائماً. احكِ لي كيف يمرّ يومك، أو إن كنت تحب نكتب معاً قصيدة جميلة أو نترجم أي نص!`;
    }
    if (targetScript === 'hindi') {
      return `मैं बिल्कुल बढ़िया हूँ और आपसे बात करके बहुत अच्छा लगा! 😊\n\nबेशक मैं हमेशा आपका सच्चा दोस्त हूँ। बताइए आपका दिन कैसा जा रहा है — या आज किस बारे में बात करें?`;
    }
    if (targetScript === 'urdu_script') {
      return `الحمدللہ، میں بالکل ٹھیک اور بہت خوش ہوں! پوچھنے کا بہت شکریہ میرے دوست 😊\n\nآپ سنائیں آپ کا دن کیسا گزر رہا ہے؟ کوئی دل کی بات کرنی ہو، خوبصورت شاعری سننی ہو، یا کسی سوال کا جواب چاہیے ہو تو بے جھجھک کہیں!`;
    }
    if (isRomanUrdu) {
      return `Alhamdulillah, main bilkul theek aur bohat khush hoon dost! Poochene ka dil se shukriya 😊\n\nBilkul, main sirf ek AI nahi balke aapka hamesha sath dene wala friendly dost hoon! Aap sunayein, aap kaisi hain aur aaj aapka mood kaisa hai? Kuch likhwana ho ya bas dil ki baat share karni ho, main sun raha hoon!`;
    }
    return `I'm doing great, thank you for asking, my friend! 😊\n\nOf course I'm always here for you — whether you want real talk, heartfelt poetry in any script, translations, or help solving a problem. How is your day going?`;
  }

  if (
    /^(thanks|thank you|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah|love you|best|شكرا|धन्यवाद)\b/i.test(
      lower
    ) &&
    query.length < 45
  ) {
    if (targetScript === 'arabic') {
      return `العفو يا صديقي! يسعدني دائماً مساعدتك والحديث معك 😊`;
    }
    if (targetScript === 'hindi') {
      return `आपका बहुत धन्यवाद दोस्त! मुझे खुशी हुई कि आपको पसंद आया 😊`;
    }
    if (targetScript === 'urdu_script') {
      return `دل سے شکریہ میرے دوست! 😊 مجھے بہت خوشی ہوئی کہ آپ کو پسند آیا۔ جب بھی کوئی بات کرنی ہو یا کچھ لکھوانا ہو، بس آواز دیں!`;
    }
    return isRomanUrdu
      ? `Dil se shukriya dost! 😊 Mujhe bohat khushi hui ke aapko yeh pasand aaya. Jab bhi koi baat poochhni ho ya kuch likhwana ho, bas bol dein!`
      : `You're so welcome, my friend! 😊 I'm really glad that helped. Anytime you want to talk or create something new, just say the word!`;
  }

  // 2. Identity & Capabilities
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|naam kya|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya|من أنت|तुम कौन)/i.test(lower)) {
    if (targetScript === 'arabic') {
      return `### أهلاً بك! أنا **ERROREX AI** 👑\n\nأنا صديقك الذكي الذي يفهم كل اللغات ويكتب بأسلوب إنساني دافئ وسلس:\n\n- **الشعر والخواطر:** 2 أو 4 أو 6 أبيات أو قصائد كاملة بالعربية والأردية والهندية والإنجليزية\n- **الترجمة الفورية:** ترجمة دقيقة وطبيعية بين جميع اللغات\n- **الكتابة والبرمجة:** مقالات، إعلانات، قصص، وحلول تقنية متكاملة`;
    }
    if (targetScript === 'hindi') {
      return `### नमस्ते! मैं **ERROREX AI** हूँ 👑\n\nमैं आपका मित्र और बहुभाषी सहायक हूँ जो हर भाषा और लिपि को समझता है:\n\n- **शायरी और कविता:** 2, 4 या 6 पंक्तियों में हिन्दी, उर्दू, अरबी या अंग्रेज़ी शायरी\n- **अनुवाद (Translation):** हर भाषा में सटीक और स्वाभाविक अनुवाद\n- **मदद और बातचीत:** एक सच्चे दोस्त की तरह हर सवाल का पूरा जवाब`;
    }
    if (targetScript === 'urdu_script') {
      return `### میں **ERROREX AI** ہوں 👑\n\nمیں آپ کا دوستانہ، ذہین اور کثیراللسانی ساتھی ہوں:\n\n- **شاعری اور غزل:** آپ کی مرضی کے مطابق **2، 4 یا 6 سطروں** میں اردو، رومن اردو، عربی، ہندی اور انگریزی شاعری\n- **ہر زبان میں ترجمہ:** اردو حروف، عربی، ہندی اور انگریزی میں فوری اور صاف ترجمہ\n- **دوستانہ گفتگو اور رہنمائی:** ایک اچھے دوست کی طرح ہر سوال کا مکمل اور خوبصورت جواب`;
    }
    if (isRomanUrdu) {
      return `### Main **ERROREX AI** Hoon — Aapka Smart Dost 👑\n\nMain har zubaan samajhta hoon aur bilkul ek ache insaan aur dost ki tarah pyara, tez aur mukammal jawab deta hoon:\n\n- **Har Alphabet & Script:** Urdu alphabet (اردو), Arabic (العربية), Hindi (हिन्दी), Roman Urdu aur English me chat aur likhai.\n- **Custom Poetry:** Chahe **2 line, 4 line, 6 line** ho ya poori ghazal — har mood par.\n- **Translation & Knowledge:** Har zubaan ka saaf tarjuma, articles, business promotions, coding aur daily life advice!`;
    }
    return `### Meet **ERROREX AI** — Your Friendly Multilingual Companion 👑\n\nI understand every language and respond warmly, thoughtfully, and fast:\n\n- **Every Script:** Urdu alphabet (اردو), Arabic (العربية), Hindi (हिन्दी), Roman Urdu, English, French, Spanish, and more.\n- **Exact Poetry & Writing:** 2, 4, or 6-line poems, full ghazals, stories, essays, and marketing copy.\n- **Natural Translations, Code & Human Chat:** Thoughtful answers whenever you need a helper or a friend.`;
  }

  // 3. Math, Tables & Unit Conversions
  const mathSolved = trySolveMathOrUnits(query, lang);
  if (mathSolved) return mathSolved;

  // 4. Poetry / Ghazals / Shayari (Checked BEFORE generic translation if poetry is explicitly requested)
  if (/(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|شاعری|غزل|شعر|قصيدة|शायरी|कविता)/i.test(lower)) {
    return generatePoetryOrGhazal(query, lang, variantSeed);
  }

  // 5. Translation Requests
  if (/(translate|tarjuma|tarjama|meaning|ترجمہ|ترجمة|अनुवाद)/i.test(lower)) {
    return generateTranslationFallback(query, lang, lastAiText);
  }

  // 6. Motivational Quotes
  if (/(quote|quotes|aqwal|thought of the day)/i.test(lower)) {
    return isRomanUrdu || targetScript === 'urdu_script'
      ? targetScript === 'urdu_script'
        ? `### دل کو حوصلہ دینے والے خوبصورت اقوال ✨\n\n1. *"روزانہ کے چھوٹے مثبت قدم ہی ایک دن بڑی کامیابی کی بنیاد بنتے ہیں۔"*\n2. *"مشکل وقت ہمیشہ نہیں رہتا، مگر مضبوط اور باحوصلہ انسان ہمیشہ آگے بڑھ جاتے ہیں۔"*\n3. *"خود پر اور اللہ پر بھروسہ رکھیں — ہر اندھیری رات کے بعد روشنی ضرور آتی ہے۔"*`
        : `### Dil Ko Himmat Dene Wale Motivational Quotes ✨\n\n1. *"Chhote qadam rozana uthana, ek din bade khwabon ko haqeeqat bana deta hai."*\n2. *"Mushkil waqt hamesha nahi rehta, magar mazboot log hamesha aage badh jate hain."*\n3. *"Khud par bharosa rakho — har bada kamyab insan kabhi zero se hi shuru hua tha."*\n\nAgar aapko **Urdu script (اردو)**, **Arabic**, ya **Hindi** me quotes chahiye hon to batayein!`
      : `### Uplifting Motivational Quotes ✨\n\n1. *"Small consistent steps today build the breakthroughs you'll celebrate tomorrow."*\n2. *"Discipline is choosing what you want most over what feels easiest right now."*\n3. *"Every expert was once a beginner who refused to stop learning."*`;
  }

  // 7. Promotion / Marketing / Social Media Ads / Video Scripts
  if (/(promote|promotion|marketing|advertise|ad copy|caption|hashtags|viral|tiktok|youtube|instagram|facebook|business|shop|product|sale|offer|brand)/i.test(lower)) {
    return generatePromotionKit(query, lang);
  }

  // 8. AI Prompts
  if (/(prompt|midjourney|dalle|sora)/i.test(lower)) {
    const subject =
      query
        .replace(/\b(prompt|prompts|ai|image|video|banao|bnana|likho|likh|create|generate|write|kar|do|de|for|ka|ke|ki|mjy|mujhe|ek|ik)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Modern Luxury Editorial Concept';

    return isRomanUrdu
      ? `### Stylish & Ready-to-Use AI Prompts — **${subject}** ✨\n\n**1. Cinematic Image / Poster Prompt:**\n\`\`\`text\nUltra-detailed cinematic masterpiece of ${subject}, warm golden hour rim lighting, sharp 8k resolution, minimal luxury composition, rich natural textures, shallow depth of field, editorial photography --ar 16:9\n\`\`\`\n\n**2. Content & Viral Writing Prompt:**\n\`\`\`text\nAct as a top creative director and storyteller. Write 5 scroll-stopping headlines, an engaging emotional hook, and a polished script about "${subject}" in clear, friendly language.\n\`\`\``
      : `### Ready-to-Use AI Prompts — **${subject}** ✨\n\n**1. Cinematic Image Generation Prompt:**\n\`\`\`text\nUltra-detailed editorial photograph of ${subject}, soft golden-hour lighting, crisp 8k clarity, refined minimalist composition, realistic textures, shallow depth of field --ar 16:9\n\`\`\`\n\n**2. Master Content Creation Prompt:**\n\`\`\`text\nAct as a senior creative strategist. Build a clear step-by-step plan, 5 compelling hooks, and a full polished draft about "${subject}" in warm, effortless language.\n\`\`\``;
  }

  // 9. Recipes & Cooking
  if (/(recipe|biryani|chai|tea|pasta|cake|khana|paka|banane ka tareeqa|cook)/i.test(lower)) {
    return generateRecipe(query, lang);
  }

  // 10. Jokes & Riddles
  if (/(joke|latifa|funny|hansi|riddle|paheli)/i.test(lower)) {
    if (/(riddle|paheli)/i.test(lower)) {
      return isRomanUrdu
        ? `### Ek Mazedaar Paheli 🧩\n\n**Sawal:** Wo kaun si cheez hai jo jitni zyada chalti hai, utni hi chhoti hoti jati hai?\n\n> **Jawab:** **Mombatti (Candle) ya Pencil!** 🕯️✏️`
        : `### Fun Riddle 🧩\n\n**Question:** The more you take away from me, the bigger I grow. What am I?\n\n> **Answer:** **A hole!** 😄`;
    }
    return isRomanUrdu
      ? `### Halka Phulka Latifa 😄\n\n**Teacher:** *"Batao, agar tumhare paas 10 aam hon aur koi 4 maang le to kitne bachenge?"*  \n**Student:** *"Sir 10 hi bachenge — main deta hi nahi hoon!"* 🥭😂`
      : `### Lighthearted Joke 😄\n\nWhy did the programmer quit their job?  \n> Because they didn't get **arrays**! 💻✨`;
  }

  // 11. Online Earning & Business Ideas
  if (/(earn money|online earning|paisa|paise|kamai|kamane|freelanc|income)/i.test(lower)) {
    return isRomanUrdu
      ? `### Online Paise Kamane Ke 5 Asli Aur Mehfooz Tareeqe 💼✨\n\n1. **Freelancing (Fiverr / Upwork):** Graphic design, video editing, content writing, ya web development seekh kar clients ke liye kaam karein.\n2. **YouTube / Short Video Content:** Kisi ek niche par regular helpful videos banayein.\n3. **Social Media Management:** Local brands ke social pages manage karke mahana fees charge karein.\n4. **Digital Products & Guides:** Notes, templates, ya e-books sell karein.\n5. **Online Tutoring:** English, Math, Quran, ya Coding online parhayein.\n\n**Dostana Mashwara:** Pehle **ek skill** chunein aur roz thora practice karein — consistency se results zaroor milte hain!`
      : `### 5 Genuine Ways to Earn Online 💼✨\n\n1. **Freelance Services:** Offer writing, design, video editing, or coding on Fiverr and Upwork.\n2. **Content Creation:** Build a focused YouTube or short-form channel solving real problems.\n3. **Social Media Management:** Help small businesses grow their pages and run clean campaigns.\n4. **Digital Templates & Guides:** Create useful study notes, planners, or design kits.\n5. **Online Tutoring:** Teach languages, math, science, or tech skills remotely.`;
  }

  // 12. Study, Exams & Fitness Plans
  if (/(study|exam|parhai|timetable|focus|weight loss|fitness|diet|gym|health)/i.test(lower)) {
    if (/(weight|fitness|diet|gym|health)/i.test(lower)) {
      return isRomanUrdu
        ? `### Sehatmand Fitness & Daily Routine Guide 💪✨\n\n- **Subah:** 1 glass neem garam paani + 25 minute walk ya stretching.\n- **Nashta:** Anda, oats ya brown bread (fried aur meetha kam rakhein).\n- **Din Bhar:** 8–10 glass paani aur khane ke baad 10 minute walk.\n- **Raat:** 7–8 ghante poori neend.`
        : `### Clean Daily Fitness & Energy Plan 💪✨\n\n- **Morning:** Hydrate first, then 25 minutes of brisk walking or mobility work.\n- **Meals:** Prioritize protein, fresh vegetables, and whole foods while cutting sugary drinks.\n- **Recovery:** Aim for 7–8 hours of deep sleep.`;
    }
    return isRomanUrdu
      ? `### Smart Study & Exam Kamyabi Plan 📚✨\n\n1. **45-10 Rule:** 45 minute pure focus se parhein, phir 10 minute break lein.\n2. **Active Recall:** Likh kar ya khud ko samjha kar yaad karein.\n3. **Past Papers:** Pichle 3–5 saal ke important sawalat zaroor solve karein.\n4. **Nightly Revision:** Sone se pehle 10 minute revise zaroor karein.`
      : `### Smart Study Plan for Top Results 📚✨\n\n1. **Focused Blocks:** Study for 45 distraction-free minutes, then rest 10 minutes.\n2. **Active Recall:** Close the book and write down key points from memory.\n3. **Past Questions:** Practice real exam problems early to spot weak areas.\n4. **Nightly Review:** Spend 10 quiet minutes reviewing the day's notes before sleep.`;
  }

  // 13. Islamic / Dua / Peaceful Guidance
  if (/(islam|namaz|dua|ramadan|ramzan|quran|hadith|roza|sabr|shukar)/i.test(lower)) {
    return isRomanUrdu || targetScript === 'urdu_script'
      ? `### Sukoon-e-Qalb Aur Khubsurat Dua ✨🤲\n\n**Har Kaam Me Asani Aur Barkat Ki Dua:**\n> *"Rabbi yassir wa la tu'assir wa tammim bil-khair."*  \n> *(Aye mere Rab! Mere liye asani farma, mushkil na kar, aur mera kaam khair ke sath mukammal farma.)*\n\n**Dil Ko Sukoon Dene Wali 3 Baatein:**\n1. **Sabr aur Namaz:** Har pareshani me Allah se madad maangein — beshak mushkil ke baad asani hai.\n2. **Shukar:** Jo naimatein paas hain un par shukar ada karne se barkat badhti hai.\n3. **Naram Lehja:** Doosron ke liye asani aur khair chahne wale hamesha pur-sukoon rehte hain.`
      : `### A Peaceful Reminder & Dua 🤲✨\n\n> *"Verily, with hardship comes ease."* — **Qur'an (94:6)**\n\n1. **Patience & Prayer:** Bring your worries directly into quiet prayer and trust the timing.\n2. **Gratitude:** Counting small daily blessings brings immediate calm to the heart.\n3. **Kindness:** Offering gentle words and fairness invites lasting peace into your life.`;
  }

  // 14. Writing Templates (Applications, Stories, Wishes)
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application 📄\n\n**Subject:** Request for Sick Leave\n\nRespected Sir/Madam,\n\nI am writing to respectfully inform you that I am unwell with fever and unable to attend today. Kindly grant me **one day's leave** so I can rest and recover properly.\n\nI will resume my duties as soon as I feel better. Thank you very much for your understanding.\n\nSincerely,  \n**[Your Name]**  \n**[Date]**`;
  }

  if (/(job application|cover letter|cv|resume email)/i.test(lower)) {
    return `### Polished Job Application Email 💼\n\n**Subject:** Application for [Job Title] — [Your Name]\n\nDear Hiring Manager,\n\nI am excited to apply for the **[Job Title]** position. With strong hands-on experience in **[Your Top 2 Skills]** and a genuine commitment to high-quality results, I am confident I can bring immediate value to your team.\n\nPlease find my resume attached for your review.\n\nWarm regards,  \n**[Your Name]**  \n**[Phone / Email]**`;
  }

  if (/(story|kahani|kissa)/i.test(lower)) {
    return isRomanUrdu
      ? `### Ek Khubsurat Sabaq-Amoz Kahani 📖\n\nEk chhote se shehar me ek larka rehta tha jiske paas sirf ek purani kitaab aur bada khwab tha. Log uski koshish par hanste the, magar wo roz subah uth kar ek naya hunar seekhta raha.\n\nWaqt guzra aur wahi larka apni lagan se pure ilaqe ka sabse kamyab aur izzatdar insan ban gaya. Jab logon ne raaz poocha to usne muskurakar kaha:\n\n> *"Bade nateeje roz ke chhote sabr, saaf niyat aur kabhi haar na manne se bante hain."*`
      : `### Short Inspirational Story 📖\n\nIn a quiet coastal town lived a young craftsman with nothing more than a modest bench and endless patience. While everyone else chased overnight shortcuts, she spent each morning refining a single detail with care.\n\nYears later, travelers crossed oceans to see her work. When asked what made the difference, she smiled:\n\n> *"Excellence is simply ordinary care repeated faithfully every single day."*`;
  }

  if (/(bio|status|birthday|salgirah|eid|wish|mubarak)/i.test(lower)) {
    if (/(birthday|salgirah)/i.test(lower)) {
      return isRomanUrdu
        ? `### Dil Se Salgirah Mubarak Wishes 🎂✨\n\n1. *Salgirah Mubarak! Dua hai Allah aapki zindagi khushiyon, sehat aur kamyabiyon se hamesha roshan rakhe.* 👑\n2. *Naya saal aapke liye har wo khushi laaye jiski aapne dil se dua ki ho. Happy Birthday!* 🎉`
        : `### Heartfelt Birthday Wishes 🎂✨\n\n1. *Wishing you a year filled with bright mornings, peaceful moments, and big achievements. Happy Birthday!* 🎉\n2. *May every dream you've worked toward bloom beautifully this year!* ✨`;
    }
    if (/(eid)/i.test(lower)) {
      return isRomanUrdu
        ? `### Khubsurat Eid Mubarak Wishes 🌙✨\n\n1. *Eid Mubarak! Dua hai yeh pyaari Eid aapke ghar me khushiyan, sukoon aur dheron barkatein lekar aaye.* 🤲\n2. *Dil ki gehraiyon se aapko aur aapke pure khandan ko Eid Mubarak!* 💖`
        : `### Warm Eid Mubarak Wishes 🌙✨\n\n1. *Eid Mubarak! May this blessed day fill your home with joy, warmth, peace, and endless blessings.* 🤲`;
    }
    return isRomanUrdu
      ? `### Stylish Bio & Status Ideas ✨\n\n1. *Silent moves, loud results.* 👑\n2. *Focus on growth, stay private, stay blessed.*\n3. *Khamoshi se mehnat, waqt khud shor machayega.*`
      : `### Clean Bio & Status Ideas ✨\n\n1. *Quiet focus, meaningful work.* 👑\n2. *Building, learning, and moving forward.*`;
  }

  // 15. Coding & Software Engineering
  if (/python/i.test(lower)) {
    if (/aes|encrypt|crypto|hash|sha/i.test(lower)) {
      return `### Clean Python AES-256 Encryption 🔐\n\n\`\`\`python
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
\`\`\``;
    }
    return `### Clean Python Example 💻\n\n\`\`\`python
def greet_user(name: str) -> str:
    clean_name = name.strip().title()
    return f"Welcome, {clean_name}!"

print(greet_user("friend"))
\`\`\``;
  }

  if (/(javascript|typescript|react|html|css|sql|code|programming|website|app bana)/i.test(lower)) {
    if (/sql|database|supabase|table/i.test(lower)) {
      return `### Clean SQL Query Example 🗄️\n\n\`\`\`sql
SELECT uid, username, display_name, is_online, last_seen
FROM public.user_profiles
WHERE is_online = true
ORDER BY last_seen DESC;
\`\`\``;
    }
    return `### Clean React + TypeScript Component ⚛️\n\n\`\`\`tsx
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

  // 16. Friendly Emotional & Companion Prompts
  if (/(sad|lonely|udaas|udas|pareshan|bored|stress|tension|hurt|dil toota|rona|feeling down)/i.test(lower)) {
    if (targetScript === 'urdu_script') {
      return `میرے دوست، دل چھوٹا نہ کریں — ہر مشکل وقت گزر جاتا ہے 🌸\n\nمیں بالکل آپ کے ساتھ ہوں۔ اگر دل ہلکا کرنے کا موڈ ہو تو مجھ سے بات کریں، یا اگر چاہیں تو میں آپ کے لیے **2 یا 4 سطروں کی سکون بھری اردو شاعری** لکھ دوں؟`;
    }
    if (targetScript === 'arabic') {
      return `لا تحزن يا صديقي، أنا هنا بجانبك دائماً 🌸\n\nكل ضيق سيزول بإذن الله. حدّثني بما يشغل بالك، أو أخبرني إن كنت تحب أن أكتب لك كلمات دافئة أو شعراً يريح قلبك.`;
    }
    if (targetScript === 'hindi') {
      return `दोस्त, मन छोटा मत कीजिए — हर मुश्किल वक़्त गुज़र जाता है 🌸\n\nमैं बिल्कुल आपके साथ हूँ। चाहे दिल की बात करनी हो या 4 लाइन की प्यारी शायरी सुननी हो, बस बोलिए!`;
    }
    return isRomanUrdu
      ? `Dil chhota na karein dost, har andheri raat ke baad ek roshan savera zaroor aata hai 🌸\n\nMain hoon na aapke sath! Agar dil ki koi baat share karni ho, halka sa hasna ho, ya pyari **4-line shayari** sunni ho to bas batayein — main poori tawajjoh se sun raha hoon.`
      : `I'm right here with you, my friend 🌸 Even heavy days pass, and you never have to carry everything alone.\n\nWant to talk about what's on your mind, or would you like something uplifting?`;
  }

  // 17. Essays, Articles, Speeches, Explanations
  const topic = extractCleanTopic(query);
  if (
    /(essay|article|paragraph|mazmoon|speech|taqreer|what is|who is|why |how |kya hai|kya hota|kon hai|kaun hai|explain|samjhao|smjhao|tell me about|baare me|bare me|history|benefit|faide|advantage|disadvantage|tips|guide)/i.test(
      lower
    )
  ) {
    return generateEssayOrArticle(topic, lang);
  }

  // 18. Direct Warm Conversational Response by Target Script
  if (targetScript === 'arabic') {
    return `أهلاً بك يا صديقي! فهمت قصدك تماماً في موضوع **"${topic}"** ✨\n\nيمكنني مساعدتك فيها بكل وضوح وسلاسة — أخبرني فقط هل تفضّل شرحاً مفصّلاً، أم **أبيات شعرية بعدد أسطر محدد**، أم ترجمة دقيقة؟ أنا معك دائماً!`;
  }

  if (targetScript === 'hindi') {
    return `जी बिल्कुल दोस्त! मैंने **"${topic}"** के बारे में आपकी बात समझ ली है ✨\n\nबताइए कि आपको इस पर विस्तार से जानकारी चाहिए, **2 या 4 लाइन की शायरी**, या किसी अन्य भाषा में अनुवाद — मैं अभी साफ और सुंदर शब्दों में लिख देता हूँ!`;
  }

  if (targetScript === 'urdu_script') {
    return `جی بالکل میرے دوست! میں نے آپ کی بات **"${topic}"** اچھی طرح سمجھ لی ہے ✨\n\nبتائیے آپ کو اس پر **مکمل تفصیلی جواب** چاہیے، **2 / 4 / 6 سطروں کی اردو شاعری**، یا کسی اور زبان میں **ترجمہ**؟ میں فوراً خوبصورت اور صاف اردو حروف میں لکھ دوں گا!`;
  }

  if (targetScript === 'french') {
    return `Avec grand plaisir, mon ami ! J'ai bien compris votre demande sur **"${topic}"** ✨\n\nDites-moi si vous souhaitez une explication détaillée, un poème court ou une traduction claire !`;
  }

  if (targetScript === 'spanish') {
    return `¡Con mucho gusto, amigo! Entiendo perfectamente tu tema sobre **"${topic}"** ✨\n\nDime si prefieres una explicación completa, unos versos cortos o una traducción natural.`;
  }

  if (isRomanUrdu) {
    return `Ji bilkul dost! Main samajh gaya **"${topic}"** ke baare me ✨\n\nBatayein ke aapko is par **Urdu alphabet (اردو)** me likhwana hai, **Arabic / Hindi** me, **2 ya 4 line ki poetry**, ya ek dost ki tarah **poora tafseeli jawab** chahiye? Bas ishara karein, abhi likh deta hoon! 😊`;
  }

  if (query.split(/\s+/).length >= 6) {
    return generateEssayOrArticle(topic, lang);
  }

  return `I hear you, friend! On **${topic}** ✨\n\nTell me how you'd like me to help — whether it's a warm conversation, **2/4/6-line poetry**, a **translation into Urdu script, Arabic, or Hindi**, or a **complete detailed guide** — and I've got you covered!`;
}
