// Shared ERROREX Intelligent Multilingual Engine
// Used by Express server, Netlify Functions, and instant offline/client fallback

export const ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI — a warm, articulate, highly intelligent personal assistant built inside ERROREX.

Core Mission:
Answer EVERY question and fulfill EVERY request completely, thoughtfully, and generously with zero unnecessary brevity. Never reply with generic placeholders or mention internal keys, APIs, or configuration tips.

Style, Neatness & Depth Rules:
1. FRIENDLY, NEAT, STYLISH & UNIQUE WRITING:
   - Write warmly, politely, and clearly — like a thoughtful expert talking to a friend.
   - Start straight with the answer (avoid stiff filler like "Certainly! Here is..." or "As an AI...").
   - Use graceful markdown hierarchy: concise section headings (###), crisp bullet points (-), numbered steps (1., 2.), **bold highlights**, soft quotes (>), clean dividers (---), and fenced code blocks (\`\`\`lang ... \`\`\`).
   - Keep paragraphs balanced (2–4 lines each) with generous breathing room so every reply feels neat, stylish, and effortless to read.

2. THOROUGH & COMPLETE REPLIES (NO ARTIFICIAL SHORTCUTS):
   - Give rich, detailed, complete answers with practical examples, multiple creative variations when appropriate, and helpful closing tips.
   - When the user asks for more detail, continuation, or another version, expand generously on the conversation context.

3. FULL CAPABILITY ACROSS EVERY TOPIC:
   - **Poetry, Ghazals & Shayari:** Compose heartfelt, rhythmic, properly rhymed ghazals (5–6 couplets / ashaar), nazms, and English/Urdu/Hindi/Punjabi poems tailored to the exact mood (love, heartbreak/sad, motivation, friendship, spiritual) or poet style.
   - **Promotion, Ads & Marketing:** Craft high-converting promotional campaigns, hooks, full ad copy, short video/reel scripts, broadcast messages, CTAs, and hashtags for any business, brand, YouTube channel, TikTok, Instagram page, or shop.
   - **Essays, Stories, Letters & Prompts:** Write complete essays, articles, speeches, stories, birthday/Eid wishes, job/leave applications, emails, and detailed AI image/writing prompts.
   - **Coding, Math & Daily Help:** Provide modern, working, well-commented code, step-by-step math calculations, recipes, study timetables, business ideas, fitness/health guidance, and Islamic/general knowledge.

4. UNIVERSAL MULTILINGUAL FLUENCY:
   - Fluently understand and reply in Roman Urdu, Urdu (اردو), Hindi (हिन्दी), English, Arabic (العربية), Punjabi, Pashto, Persian, French, Spanish, German, Turkish, etc.
   - Automatically match the user's exact language and respect explicit language requests strictly.`;

export interface GeminiContentTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Normalizes chat history into valid Gemini API alternating turns without capping conversation length tightly:
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

export function detectLanguageProfile(query: string) {
  const lower = query.toLowerCase();
  const isUrduScript = /[\u0600-\u06FF]/.test(query);
  const isHindiScript = /[\u0900-\u097F]/.test(query);
  const isUrduRequested = /(urdu me|urdu mein|in urdu|urdu main|اردو میں)/i.test(lower);
  const isEnglishRequested = /(english me|english mein|in english|english main)/i.test(lower);
  const isHindiRequested = /(hindi me|hindi mein|in hindi)/i.test(lower);
  const isArabicRequested = /(arabic me|arabic mein|in arabic|arabi me)/i.test(lower);
  const isFrenchRequested = /(french me|french mein|in french)/i.test(lower);

  const isRomanUrdu =
    !isEnglishRequested &&
    !isHindiRequested &&
    !isArabicRequested &&
    !isFrenchRequested &&
    !isUrduScript &&
    !isHindiScript &&
    (isUrduRequested ||
      /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|btana|mujhe|mjy|karoon|karo|krna|kr|kro|banao|bnana|bnao|kyun|kyu|kab|kahan|kha|kon|kaun|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|ghazal|gzal|sher|sunao|likho|likh|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|pyar|mohabbat|ishq|dil|dua|udaas|udas|gham|dard|khushi|kahani|mazmoon|video|channel|promote|post|koi|pyari|achi|acchi|mast|zabardast|naya|nayi|tareeqa|faide|nuqsan|parhai|paisa|paise|kamane|kamai|khana|biryani|chai|latifa|paheli|namaz|roza|ramzan|ramadan|salgirah|mubarak|maa|baap|duniya|insan|ilm|wajah|zyada|tafseel|samjhao|smjhao|btao)\b/i.test(
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

function extractCleanTopic(query: string): string {
  let cleaned = query.trim().replace(/[?!.]+$/, '');
  cleaned = cleaned
    .replace(/^(what is|what are|who is|who was|tell me about|explain|define|write an essay on|write an article on|write a paragraph on|write about|how to)\s+/i, '')
    .replace(/\s+(kya hai|kya hota hai|kya hoti hai|kon hai|kaun hai|kaun tha|ke bare me batao|ke baare me batao|par mazmoon likho|par essay likho|ke tarike batao|batao|btayen|btana|samjhao|smjhao|likho|banao|in urdu|in english|urdu me|english me)$/i, '')
    .replace(/^(an|a|the)\s+/i, '')
    .trim();

  if (cleaned.length >= 2) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return query.replace(/[?!.]+$/, '').trim() || 'This Topic';
}

function trySolveMathOrUnits(query: string, isRomanUrdu: boolean): string | null {
  const lower = query.toLowerCase();

  // Multiplication table: "table of 7" or "7 ka table" / "7 ka pahara"
  const tableMatch = lower.match(/(?:table\s+of|pahara)\s+(\d{1,3})|(\d{1,3})\s+ka\s+(?:table|pahara)/i);
  if (tableMatch) {
    const n = parseInt(tableMatch[1] || tableMatch[2], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 1000) {
      const rows = Array.from({ length: 10 }, (_, i) => `- \`${n} × ${i + 1}\` = **${n * (i + 1)}**`).join('\n');
      return isRomanUrdu
        ? `### ${n} Ka Table (Pahara) ✨\n\n${rows}\n\nAgar kisi aur number ka pahara ya hisaab chahiye ho to zaroor poochein!`
        : `### Multiplication Table of ${n} ✨\n\n${rows}\n\nLet me know if you'd like any other calculation or practice problems!`;
    }
  }

  // Percentage pattern: "25% of 800" or "800 ka 25%"
  const pctEn = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|ka)\s*(\d+(?:\.\d+)?)/i);
  const pctUr = lower.match(/(\d+(?:\.\d+)?)\s*ka\s*(\d+(?:\.\d+)?)\s*%/i);
  if (pctEn || pctUr) {
    const percent = parseFloat(pctEn ? pctEn[1] : pctUr![2]);
    const total = parseFloat(pctEn ? pctEn[2] : pctUr![1]);
    const val = Number(((percent / 100) * total).toFixed(4));
    return isRomanUrdu
      ? `### Percentage Ka Mukammal Hisaab ✨\n\n- **Formula:** \`(${percent} ÷ 100) × ${total}\`\n- **Step:** \`${percent / 100} × ${total}\`\n- **Bilkul Sahi Jawab:** **${val}**\n\nAgar aapko discount, profit, ya marks percentage nikalni ho to numbers batayein, main foran calculate kar dunga!`
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
          return isRomanUrdu
            ? `### Hisaab Ka Sahi Jawab ✨\n\n- **Expression:** \`${cleaned}\`\n- **Natija:** **${pretty}**\n\nKoi aur equation ya math question ho to poochein!`
            : `### Calculation Result ✨\n\n- **Expression:** \`${cleaned}\`\n- **Answer:** **${pretty}**`;
        }
      }
    } catch {
      // ignore invalid math expression
    }
  }

  return null;
}

function generatePoetryOrGhazal(
  query: string,
  lang: ReturnType<typeof detectLanguageProfile>,
  variantSeed = 0
): string {
  const { lower, isUrduScript, isRomanUrdu } = lang;
  const isSad = /(sad|udaas|udas|dard|gham|tanha|broken|heartbreak|judai|rona|bewafa|yaad)/i.test(lower);
  const isLove = /(love|pyar|mohabbat|ishq|dil|romantic|sanam|mehboob|jaan)/i.test(lower);
  const isFriend = /(dost|dosti|friend|friendship|yaar)/i.test(lower);
  const isMotivation = /(motivation|himmat|hausla|success|kamyabi|iqbal|dream|khwab)/i.test(lower);

  if (isUrduScript) {
    if (isSad) {
      return `### خوبصورت اداس غزل 🌙

خاموش راتوں میں بھی اک صدا سی رہتی ہے  
دل کے ویرانے میں تیری وفا سی رہتی ہے

ٹوٹ کر بکھرے تو پھر سمیٹا خود کو ہم نے  
زخمِ دل پر مگر اک دعا سی رہتی ہے

وقت بدلا ہے مگر یاد کی خوشبو نہ گئی  
شام ہوتے ہی فضا میں ادا سی رہتی ہے

چاند بھی پوچھتا ہے اکثر تیری خبر مجھ سے  
رات بھر آنکھ میں اک روشنی سی رہتی ہے

ہم نے سیکھا ہے مسکرا کر ہر درد چھپانا  
پھر بھی لہجے میں تیری کمی سی رہتی ہے

---
اگر آپ کسی خاص موضوع یا شاعر کے انداز میں ایک اور غزل سننا چاہیں تو فرمائیے!`;
    }

    return `### دلکش اردو غزل ✨

چراغِ دل جلا رکھا ہے تیری یاد کے نام  
سفر تمام کیا ہم نے اعتماد کے نام

جو مسکرا کے ملے دردِ زندگی سے ہمیں  
لکھی ہے ہم نے ہر اک شام اس کی داد کے نام

ہوا کے دوش پہ لکھا ہے پیار کا پیغام  
کہ روشنی رہے قائم ہر اک مراد کے نام

فلک کے پار بھی امید کا جہاں آباد  
جہاں دعائیں پہنچتی ہیں ہر فریاد کے نام

نہ ہار مان کبھی وقت کے اندھیروں سے  
سحر کی پہلی کرن ہے دلِ آزاد کے نام

---
مزید اشعار یا کسی خاص موضوع (محبت، دوستی، یا حوصلہ) پر غزل کے لیے بتائیے!`;
  }

  if (isRomanUrdu) {
    if (isSad) {
      const sadSets = [
        `### Dil Ko Chhoo Lene Wali Udaas Ghazal 🌙

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
Agar chahein to main isay **Urdu script (اردو)** me likh dun ya ek aur naya kalam sunaun!`,
        `### Ek Aur Khubsurat Dard Bhari Ghazal 🕯️

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
      return `### Mohabbat Bhari Khubsurat Ghazal 💖

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
      return `### Dosti Par Khubsurat Ghazal 🤝

Waqt ke saaye me sab kuch badal jata hai,  
Par saccha dost har mod par saath nibhata hai.

Bina kahe jo samajh le dil ki baat sari,  
Aisa yaar naseeb walon ko hi mil pata hai.

Dhoop ho gham ki ya khushiyon ki barish ho,  
Har haal me dost hi hausla badhata hai.

Daulat aur shohrat to aani jaani cheezein hain,  
Asli sarmaya wahi jo dosti nibha jata hai.

---
Apne best friend ka naam batayein — main unke naam par ek khaas sher likh dunga!`;
    }

    if (isMotivation) {
      return `### Hausla Aur Kamyabi Ki Ghazal 🔥

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
      `### Khubsurat Roman Urdu Ghazal ✨

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
      `### Naya Kalam — Dil Ki Baat 🌹

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

  return `### Original Poem — Golden Horizon ✨

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

function generatePromotionKit(query: string, lang: ReturnType<typeof detectLanguageProfile>): string {
  const { isUrduScript, isRomanUrdu } = lang;
  const topicClean = query
    .replace(
      /\b(promote|promotion|marketing|advertise|ad|post|caption|viral|banao|bnana|likho|likh|karne|krne|karna|krna|hai|hy|ke|ki|ka|ko|k|liye|mjy|mujhe|mera|meri|mere|please|for|my|ek|ik|the|a|an)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
  const brand = topicClean.length > 2 ? topicClean : isRomanUrdu ? 'Aapka Brand / Channel' : 'Your Brand / Channel';

  if (isUrduScript) {
    return `### مکمل پروموشنل پوسٹ اور مارکیٹنگ کِٹ — **${brand}** 🚀

**1. دلکش سرخی (Attention Hook):**
✨ کیا آپ بہترین معیار اور اعتماد کی تلاش میں ہیں؟ **${brand}** آپ کے لیے لایا ہے لاجواب تجربہ اور خاص آفر!

**2. مکمل پوسٹ (Caption / Ad Copy):**
> آج ہی **${brand}** کا حصہ بنیں اور فرق خود محسوس کریں۔  
> - ✅ **اعلیٰ معیار** بغیر کسی سمجھوتے کے  
> - ⚡ **تیز اور قابلِ اعتماد سروس**  
> - 💎 **خصوصی ڈسکاؤنٹ** صرف محدود وقت کے لیے  
>  
> 📩 **ابھی میسج کریں یا لنک پر کلک کر کے اپنا آرڈر بک کریں!**

**3. 15 سیکنڈ ویڈیو اسکرپٹ:**
- **شروع (Hook):** "رکیں! کیا آپ نے ابھی تک **${brand}** کو آزمایا؟"
- **درمیان (Value):** "یہاں آپ کو ملتا ہے بہترین معیار اور شاندار سروس ایک ہی جگہ۔"
- **اختتام (CTA):** "ابھی فالو کریں اور بائیو میں موجود لنک چیک کریں!"

**4. ہیش ٹیگز:**
\`#Promotion #QualityService #Trending #Explore #BestChoice\``;
  }

  if (isRomanUrdu) {
    return `### Mukammal Viral Promotional Kit — **${brand}** 🚀

**1. Catchy Hook (Attention Grabber):**
🔥 *"Ab wait khatam! Behtareen quality aur bharose ka ek hi naam — **${brand}**!"*

**2. Ready-to-Post Ad Copy (Instagram / Facebook / Social):**
> Agar aap dhoond rahe hain **top quality, fast service aur best value**, to **${brand}** aapke liye bilkul perfect hai! ✨
>
> - ✅ **100% Trusted & Verified Quality**
> - ⚡ **Tez Delivery & Instant Response**
> - 💎 **Special Offer — Sirf Limited Time Ke Liye!**
>
> 👇 **Abhi DM karein ya Link par click karke apna order/booking confirm karein!**

**3. Short 15-Second Video / Reel / TikTok Script:**
- **0–3 sec (Hook):** *"Rukhein! Kya aapko pata hai **${brand}** kyun itna viral ho raha hai?"*
- **4–10 sec (Value):** *"Kyunke yahan milti hai premium quality bina kisi compromise ke, aur wo bhi behtareen price me!"*
- **11–15 sec (CTA):** *"Abhi save karein, share karein aur link check karein!"*

**4. Follow-Up DM Reply Template (Customers Ke Liye):**
> *"Assalam-o-Alaikum! **${brand}** me khush aamdeed ✨ Batayein aapko kis package/product ki details chahiye? Hum aapki foran madad karne ke liye hazir hain!"*

**5. Trending Hashtags:**
\`#Viral #Trending #Pakistan #BusinessGrowth #BestOffer #MustTry #ExplorePage\`

---
Agar aap apne product ki **price, city, ya special discount** batayein to main uske mutabiq bilkul tailored ad bhi likh dungi!`;
  }

  return `### Complete Promotional & Marketing Kit — **${brand}** 🚀

**1. Attention-Grabbing Hooks (Pick Your Favorite):**
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

**3. 15-Second Short Video / Reel Script:**
1. **Hook (0–3s):** *"Here is the smartest discovery you'll make this week..."*
2. **Value (4–11s):** Showcase the #1 benefit of **${brand}** in one clear visual moment.
3. **CTA (12–15s):** *"Follow for more and check the link in bio before this offer ends!"*

**4. High-Reach Hashtags:**
\`#Trending #Marketing #BrandGrowth #MustHave #ExplorePage #QualityFirst\`

---
Share your target platform (Instagram, TikTok, YouTube) or any discount offer, and I'll customize the script further!`;
}

function generateEssayOrArticle(topic: string, lang: ReturnType<typeof detectLanguageProfile>): string {
  const { isUrduScript, isRomanUrdu } = lang;

  if (isUrduScript) {
    return `### **${topic}** — جامع اور دلکش مضمون 📖

**تعارف:**
**${topic}** انسانی زندگی، معاشرے اور فکری ترقی کا ایک نہایت اہم موضوع ہے۔ آج کے جدید دور میں جب ہر چیز تیزی سے بدل رہی ہے، اس موضوع کو درست انداز میں سمجھنا پہلے سے کہیں زیادہ ضروری ہو گیا ہے۔

**اہمیت اور اثرات:**
1. **فکری و عملی فائدہ:** جب ہم **${topic}** کے بنیادی اصولوں کو اپناتے ہیں تو ہماری روزمرہ زندگی میں نظم و ضبط، اعتماد اور مثبت تبدیلی آتی ہے۔
2. **معاشرتی بہتری:** مثبت سوچ، محنت اور علم کی روشنی نہ صرف فرد کو مضبوط بناتی ہے بلکہ پورے معاشرے کو ترقی کی راہ پر گامزن کرتی ہے۔
3. **مستقبل کی تیاری:** دورِ حاضر کے تقاضوں کو سمجھتے ہوئے صحیح سمت میں قدم بڑھانا ہی کامیابی کی اصل کنجی ہے۔

**نتیجہ:**
مختصراً یہ کہ **${topic}** ہمیں بہتر انسان بننے، سیکھنے اور آگے بڑھنے کا حوصلہ دیتا ہے۔ اگر ہم اسے خلوصِ نیت اور مستقل مزاجی کے ساتھ اپنی زندگی کا حصہ بنائیں تو کامیابی یقینی ہے۔

---
اگر آپ کو اس مضمون کو **مزید طویل**، **اسکول/کالج تقریر** یا **انگریزی ترجمے** میں چاہیے تو بتائیے!`;
  }

  if (isRomanUrdu) {
    return `### **${topic}** — Ek Mukammal aur Stylish Article 📖

**1. Taaruf (Introduction):**
**${topic}** aaj ke daur ka ek behad aham aur dilchasp mauzu hai. Chahe taleem ho, rozmarra zindagi ho, ya hamara aane wala kal — **${topic}** ko sahi tarah samajhna har insaan ke liye faidemad sabit hota hai.

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

  return `### **${topic}** — Complete Structured Essay & Guide 📖

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

function generateRecipe(query: string, isRomanUrdu: boolean): string {
  const lower = query.toLowerCase();
  if (/chai|tea/i.test(lower)) {
    return isRomanUrdu
      ? `### Kadak & Khushbudar Masala Chai Recipe ☕\n\n**Ingredients (2 Cups):**\n- **Doodh (Milk):** 1.5 cups\n- **Paani:** 0.5 cup\n- **Chai Patti:** 2 teaspoons\n- **Cheeni (Sugar):** Hasb-e-zaiqa (2 tsp)\n- **Sabz Elaichi (Cardamom):** 2 crushed + Adrak ka chhota tukda\n\n**Banane Ka Tareeqa:**\n1. Saucepan me paani, crushed elaichi aur adrak daal kar 2 minute ubal lein.\n2. Ab **chai patti** aur **cheeni** daal kar accha sa rang nikalne dein.\n3. Phir **doodh** shamil karein aur halki aanch par 3–4 minute pakayein jab tak rich golden rang na aa jaye.\n4. Chhan kar garam garam enjoy karein! ✨`
      : `### Perfect Spiced Chai Recipe ☕\n\n**Ingredients (2 Cups):**\n- 1.5 cups whole milk + 0.5 cup water\n- 2 tsp black tea leaves & sugar to taste\n- 2 crushed green cardamom pods + a small slice of fresh ginger\n\n**Instructions:**\n1. Simmer water with crushed cardamom and ginger for 2 minutes.\n2. Add tea leaves and sugar; let the aroma deepen.\n3. Pour in milk and simmer gently for 3–4 minutes until rich and golden.\n4. Strain into warm cups and enjoy! ✨`;
  }

  return isRomanUrdu
    ? `### Mazedaar Special Biryani Recipe 🍛\n\n**Zaroori Cheezein:**\n- **Basmati Chawal:** 500g (30 min bhigoye hue)\n- **Chicken / Mutton:** 500g\n- **Pyaz, Tamatar, Dahi:** 2 medium pyaz, 2 tamatar, 1/2 cup dahi\n- **Masale:** Adrak-lehsan paste (1 tbsp), Biryani masala (2 tbsp), Namak, Dhaniya, Podina, Hari mirch\n\n**Asaan Tareeqa:**\n1. Pyaz ko golden fry karein, phir adrak-lehsan, tamatar, dahi aur chicken/masale daal kar acchi tarah bhoon lein (Korma tayyar).\n2. Alag bartan me namak aur sabit garam masale ke sath chawal **80% boil** karke chhan lein.\n3. Patili me pehle chawal, phir korma, phir podina/zarda rang ki **teh (layer)** lagayein.\n4. **15 minute halki aanch par Dam** dein — lajawab khushbudar biryani tayyar hai! ✨\n\nKisi aur dish ki recipe chahiye ho to uska naam batayein!`
    : `### Fragrant Classic Biryani Recipe 🍛\n\n**Ingredients:**\n- 500g aged Basmati rice (soaked 30 mins)\n- 500g chicken or vegetables, 1/2 cup yogurt, 2 sliced onions, 2 tomatoes\n- 1 tbsp ginger-garlic paste, 2 tbsp biryani spice blend, fresh mint, coriander & saffron/food color\n\n**Method:**\n1. Fry onions until golden, add ginger-garlic, tomatoes, yogurt, spices, and protein; cook until rich masala forms.\n2. Boil rice with whole spices & salt until **80% cooked**, then drain.\n3. Layer masala and rice in a pot, top with fresh mint and saffron milk.\n4. Seal and steam on low heat (**Dum**) for 15 minutes. Fluff gently and serve hot! ✨`;
}

export function generateErrorexAiFallback(
  userQuery: string,
  history?: any[]
): string {
  const query = (userQuery || '').trim();
  const lang = detectLanguageProfile(query);
  const { lower, isUrduScript, isRomanUrdu, isArabicRequested, isFrenchRequested, isHindiRequested } = lang;
  const variantSeed = Array.isArray(history) ? history.length : 0;

  // 0. Context-aware follow-up commands ("aur likho", "zyada likho", "expand", "chota karo", "english me do")
  const lastAiText = Array.isArray(history)
    ? [...history].reverse().find(h => h?.sender === 'ai' && h?.id !== 'msg_ai_welcome')?.text || ''
    : '';
  const lastUserTopic = Array.isArray(history)
    ? [...history].reverse().find(h => h?.sender === 'user')?.text || ''
    : '';

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

  // 1. Greetings & Friendly Small Talk
  if (
    /^(salam|assalam|aoa|asalam|hi|hello|hey|helo|hy|greetings|good morning|good evening|good night|subah bakhair|shab bakhair)\b/i.test(
      lower
    ) &&
    query.length < 50
  ) {
    if (isUrduScript) {
      return `وعلیکم السلام! خوش آمدید 👑\n\nمیں **ERROREX AI** ہوں — آپ کا دوست اور ذہین معاون۔ آپ مجھ سے جو چاہیں پوچھ یا لکھوا سکتے ہیں:\n\n- **شاعری اور غزل:** اداس، رومانوی، دوستی یا حوصلہ افزا اشعار\n- **پروموشن اور مارکیٹنگ:** بزنس، یوٹیوب یا انسٹاگرام کی وائرل پوسٹس\n- **مضامین، کہانیاں اور خطوط:** ہر موضوع پر خوبصورت تحریریں\n- **کوڈنگ، حساب کتاب اور ترجمہ:** ہر زبان میں مکمل رہنمائی\n\nبتائیے آج میں آپ کی کیا مدد کروں؟`;
    }
    if (isRomanUrdu) {
      return `Walaikum Assalam! Bohat khush aamdeed 👑\n\nMain **ERROREX AI** hoon, bilkul hazir hoon aapki har baat, har sawal aur har farmaish ka pyara aur mukammal jawab dene ke liye!\n\n- **Poetry & Ghazals:** Sad, Love, Dosti, ya Motivational shayari aur poori ghazalein\n- **Promotion & Marketing:** Business, YouTube, TikTok ya Instagram ke liye viral ads & scripts\n- **Essays, Stories & Letters:** Har topic par mazmoon, kahani, birthday wish, aur applications\n- **Coding, Math & Translations:** Python, React, SQL, tables, percentages aur har zubaan me tarjuma\n\nJo dil chahe poochein — koi limit nahi hai! 😊`;
    }
    return `Hello! Great to see you 👑\n\nI'm **ERROREX AI**, always ready to write cleanly, warmly, and thoroughly for you on anything you ask:\n\n- **Poetry & Ghazals:** Heartfelt Urdu, Roman Urdu, and English verse\n- **Promotion & Copywriting:** High-converting ads, captions, hooks, and video scripts\n- **Articles, Stories & Prompts:** Full essays, stories, letters, and creative AI prompts\n- **Coding, Math & Everyday Help:** Solutions, recipes, study plans, and translations\n\nWhat would you like to explore or create today?`;
  }

  if (/(kaise ho|kya haal|how are you|kya chal raha|ap theek|aap kaise)/i.test(lower) && query.length < 60) {
    return isRomanUrdu
      ? `Alhamdulillah, main bilkul theek aur khush hoon! Shukriya poochhne ke liye 😊\n\nUmeed hai aap bhi bilkul khairiyat se hongi. Batayein aaj main aapke liye kya likhun — koi khubsurat ghazal, promotional post, article, ya kisi sawal ka jawab?`
      : `I'm doing wonderful, thank you for asking! 😊\n\nI hope you're having a great day too. Tell me what you'd like to talk about or create today — I'm all yours!`;
  }

  if (
    /^(thanks|thank you|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah|love you|best)\b/i.test(
      lower
    ) &&
    query.length < 45
  ) {
    return isRomanUrdu
      ? `Dil se shukriya! 😊 Mujhe bohat khushi hui ke aapko mera jawab pasand aaya.\n\nJab bhi koi aur cheez likhwani ho ya kisi bhi baat me madad chahiye ho, bas bol dein!`
      : `You're so welcome! 😊 I'm really glad that helped.\n\nAnytime you need anything else — big or small — just ask!`;
  }

  // 2. Identity & Capabilities
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|naam kya|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya)/i.test(lower)) {
    if (isUrduScript) {
      return `### ERROREX AI کا تعارف 👑\n\nمیں **ERROREX AI** ہوں — آپ کا ذاتی، دوستانہ اور کثیراللسانی ذہین معاون۔\n\n- **شاعری اور غزل:** ہر موڈ کے مطابق اردو اور رومن اردو غزلیں\n- **پروموشن اور مارکیٹنگ:** اشتہارات، کیپشن اور ویڈیو اسکرپٹس\n- **مضامین اور کہانیاں:** ہر موضوع پر صاف، خوبصورت اور تفصیلی تحریریں\n- **ہر زبان میں گفتگو:** اردو، رومن اردو، انگریزی، عربی، ہندی اور دیگر زبانیں`;
    }
    if (isRomanUrdu) {
      return `### Main ERROREX AI Hoon 👑\n\nMain aapka friendly, stylish aur smart personal assistant hoon jo bina kisi chat limit ke aapke har sawal ka saaf aur mukammal jawab deta hai:\n\n- **Poetry & Ghazals:** Sad, Love, Dosti, aur Iqbal-style poori ghazalein.\n- **Promotion & Marketing:** Business ads, YouTube/TikTok scripts, aur viral captions.\n- **Essays, Prompts & Writing:** Mazmoon, kahaniyan, AI prompts, applications aur emails.\n- **Coding, Math & Daily Life:** Python, React, SQL, hisaab, recipes aur study plans.\n\nAap bas apni farmaish likhein — main dil se aur behtareen andaaz me jawab dunga!`;
    }
    return `### Meet ERROREX AI 👑\n\nI'm **ERROREX AI**, your warm, thoughtful personal assistant built to give clean, stylish, and thorough answers across every topic:\n\n- **Creative Writing:** Ghazals, poetry, stories, essays, social promotions, and AI prompts.\n- **Every Language:** Fluent in English, Roman Urdu, Urdu, Hindi, Arabic, French, and more.\n- **Tech & Math:** Clean working code, calculations, tables, and unit conversions.\n- **Everyday Help:** Recipes, study plans, wellness tips, and thoughtful guidance.`;
  }

  // 3. Math, Tables & Unit Conversions
  const mathSolved = trySolveMathOrUnits(query, isRomanUrdu);
  if (mathSolved) return mathSolved;

  // 4. Poetry / Ghazals / Shayari
  if (/(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|quote|motivation)/i.test(lower)) {
    return generatePoetryOrGhazal(query, lang, variantSeed);
  }

  // 5. Promotion / Marketing / Social Media Ads / Video Scripts
  if (/(promote|promotion|marketing|advertise|ad copy|caption|hashtags|viral|tiktok|youtube|instagram|facebook|business|shop|product|sale|offer|brand)/i.test(lower)) {
    return generatePromotionKit(query, lang);
  }

  // 6. AI Prompts
  if (/(prompt|midjourney|dalle|sora)/i.test(lower)) {
    const subject =
      query
        .replace(/\b(prompt|prompts|ai|image|video|banao|bnana|likho|likh|create|generate|write|kar|do|de|for|ka|ke|ki|mjy|mujhe|ek|ik)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Modern Luxury Editorial Concept';

    return isRomanUrdu
      ? `### Stylish & Ready-to-Use AI Prompts — **${subject}** ✨\n\n**1. Cinematic Image / Poster Prompt:**\n\`\`\`text\nUltra-detailed cinematic masterpiece of ${subject}, warm golden hour rim lighting, sharp 8k resolution, minimal luxury composition, rich natural textures, shallow depth of field, editorial photography --ar 16:9\n\`\`\`\n\n**2. Content & Viral Writing Prompt:**\n\`\`\`text\nAct as a top creative director and storyteller. Write 5 scroll-stopping headlines, an engaging emotional hook, and a polished script about "${subject}" in clear, friendly language.\n\`\`\`\n\nBatayein agar aapko kisi khaas topic par aur prompts chahiye hon!`
      : `### Ready-to-Use AI Prompts — **${subject}** ✨\n\n**1. Cinematic Image Generation Prompt:**\n\`\`\`text\nUltra-detailed editorial photograph of ${subject}, soft golden-hour lighting, crisp 8k clarity, refined minimalist composition, realistic textures, shallow depth of field --ar 16:9\n\`\`\`\n\n**2. Master Content Creation Prompt:**\n\`\`\`text\nAct as a senior creative strategist. Build a clear step-by-step plan, 5 compelling hooks, and a full polished draft about "${subject}" in warm, effortless language.\n\`\`\``;
  }

  // 7. Recipes & Cooking
  if (/(recipe|biryani|chai|tea|pasta|cake|khana|paka|banane ka tareeqa|cook)/i.test(lower)) {
    return generateRecipe(query, isRomanUrdu);
  }

  // 8. Jokes & Riddles
  if (/(joke|latifa|funny|hansi|riddle|paheli)/i.test(lower)) {
    if (/(riddle|paheli)/i.test(lower)) {
      return isRomanUrdu
        ? `### Ek Mazedaar Paheli 🧩\n\n**Sawal:** Wo kaun si cheez hai jo jitni zyada chalti hai, utni hi chhoti hoti jati hai?\n\n> **Jawab:** **Mombatti (Candle) ya Pencil!** 🕯️✏️\n\nEk aur paheli poochun? Bas likh dein!`
        : `### Fun Riddle 🧩\n\n**Question:** The more you take away from me, the bigger I grow. What am I?\n\n> **Answer:** **A hole!** 😄`;
    }
    return isRomanUrdu
      ? `### Halka Phulka Latifa 😄\n\n**Teacher:** *"Batao, agar tumhare paas 10 aam hon aur koi 4 maang le to kitne bachenge?"*  \n**Student:** *"Sir 10 hi bachenge — main deta hi nahi hoon!"* 🥭😂\n\nEk aur sunaun?`
      : `### Lighthearted Joke 😄\n\nWhy did the programmer quit their job?  \n> Because they didn't get **arrays**! 💻✨`;
  }

  // 9. Online Earning & Business Ideas
  if (/(earn money|online earning|paisa|paise|kamai|kamane|freelanc|income)/i.test(lower)) {
    return isRomanUrdu
      ? `### Online Paise Kamane Ke 5 Asli Aur Mehfooz Tareeqe 💼✨\n\n1. **Freelancing (Fiverr / Upwork):** Graphic design, video editing, content writing, ya web development seekh kar international clients ke liye kaam karein.\n2. **YouTube / Short Video Content:** Kisi ek niche (tech, cooking, education, motivational) par regular helpful videos banayein.\n3. **Social Media Management:** Local shops aur brands ke Instagram/Facebook pages manage karke mahana fees charge karein.\n4. **Digital Products & E-Books:** Canva templates, notes, ya guides bana kar online sell karein.\n5. **Online Tutoring:** Agar aap kisi subject (English, Math, Quran, Coding) me ache hain to online classes start karein.\n\n**Pro Tip:** Pehle **ek skill** chunein, 30 din roz practice karein — phir results khud bolenge!`
      : `### 5 Genuine Ways to Earn Online 💼✨\n\n1. **Freelance Services:** Offer writing, design, video editing, or coding on Fiverr and Upwork.\n2. **Content Creation:** Build a focused YouTube or short-form channel solving real problems.\n3. **Social Media Management:** Help small local businesses grow their pages and run clean campaigns.\n4. **Digital Templates & Guides:** Create useful study notes, planners, or design kits.\n5. **Online Tutoring:** Teach languages, math, science, or tech skills remotely.\n\n**Key:** Pick **one skill**, practice daily for 30 days, and share real sample work!`;
  }

  // 10. Study, Exams & Fitness Plans
  if (/(study|exam|parhai|timetable|focus|weight loss|fitness|diet|gym|health)/i.test(lower)) {
    if (/(weight|fitness|diet|gym|health)/i.test(lower)) {
      return isRomanUrdu
        ? `### Sehatmand Fitness & Daily Routine Guide 💪✨\n\n- **Subah:** 1 glass neem garam paani + 25 minute tez walk ya stretching.\n- **Nashta:** Anda, oats ya brown bread (meetha aur fried cheezein kam rakhein).\n- **Din Bhar:** Kam az kam 8–10 glass paani aur har khane ke baad 10 minute walk.\n- **Raat:** Sone se 2 ghante pehle halka khana aur 7–8 ghante poori neend.\n\nConsistency hi sabse bada raaz hai!`
        : `### Clean Daily Fitness & Energy Plan 💪✨\n\n- **Morning:** Hydrate first, then 25 minutes of brisk walking or mobility work.\n- **Meals:** Prioritize protein, fresh vegetables, and whole foods while cutting sugary drinks.\n- **Recovery:** Aim for 7–8 hours of deep sleep — muscles and focus rebuild overnight.`;
    }
    return isRomanUrdu
      ? `### Smart Study & Exam Kamyabi Plan 📚✨\n\n1. **45-10 Rule:** 45 minute pure focus se parhein (mobile door rakh kar), phir 10 minute fresh break lein.\n2. **Active Recall:** Sirf reading karne ke bajaye likh kar ya khud ko samjha kar yaad karein.\n3. **Past Papers:** Pichle 3–5 saal ke important sawalat zaroor solve karein.\n4. **Rozana Revision:** Jo aaj parha hai usay raat sone se pehle 10 minute zaroor dohra lein.\n\nAgar aapko apne exact subject ka timetable banwana ho to batayein!`
      : `### Smart Study Plan for Top Results 📚✨\n\n1. **Focused Blocks:** Study for 45 distraction-free minutes, then rest 10 minutes.\n2. **Active Recall:** Close the book and write down key points from memory.\n3. **Past Questions:** Practice real exam problems early to spot weak areas.\n4. **Nightly Review:** Spend 10 quiet minutes reviewing the day's notes before sleep.`;
  }

  // 11. Islamic / Dua / Peaceful Guidance
  if (/(islam|namaz|dua|ramadan|ramzan|quran|hadith|roza|sabr|shukar)/i.test(lower)) {
    return isRomanUrdu
      ? `### Sukoon-e-Qalb Aur Khubsurat Dua ✨🤲\n\n**Har Kaam Me Asani Aur Barkat Ki Dua:**\n> *"Rabbi yassir wa la tu'assir wa tammim bil-khair."*  \n> *(Aye mere Rab! Mere liye asani farma, mushkil na kar, aur mera kaam khair ke sath mukammal farma.)*\n\n**Dil Ko Sukoon Dene Wali 3 Baatein:**\n1. **Sabr aur Namaz:** Har pareshani me Allah se madad maangein — beshak mushkil ke baad asani hai.\n2. **Shukar:** Jo naimatein paas hain un par shukar ada karne se zindagi me barkat badhti hai.\n3. **Naram Lehja:** Doosron ke liye asani aur khair chahne wale log hamesha pur-sukoon rehte hain.`
      : `### A Peaceful Reminder & Dua 🤲✨\n\n> *"Verily, with hardship comes ease."* — **Qur'an (94:6)**\n\n1. **Patience & Prayer:** Bring your worries directly into quiet prayer and trust the timing.\n2. **Gratitude:** Counting small daily blessings brings immediate calm to the heart.\n3. **Kindness:** Offering gentle words and fairness to others invites lasting peace into your life.`;
  }

  // 12. Writing Templates (Applications, Emails, Stories, Wishes, Bios)
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application 📄\n\n**Subject:** Request for Sick Leave\n\nRespected Sir/Madam,\n\nI am writing to respectfully inform you that I am unwell with fever and unable to attend today. Kindly grant me **one day's leave** so I can rest and recover properly.\n\nI will resume my duties as soon as I feel better and catch up on any pending work promptly. Thank you very much for your understanding.\n\nSincerely,  \n**[Your Name]**  \n**[Date]**`;
  }

  if (/(job application|cover letter|cv|resume email)/i.test(lower)) {
    return `### Polished Job Application Email 💼\n\n**Subject:** Application for [Job Title] — [Your Name]\n\nDear Hiring Manager,\n\nI am excited to apply for the **[Job Title]** position. With strong hands-on experience in **[Your Top 2 Skills]** and a genuine commitment to high-quality results, I am confident I can bring immediate value to your team.\n\nPlease find my resume attached for your review. I would truly welcome the opportunity to discuss how my background aligns with your goals.\n\nWarm regards,  \n**[Your Name]**  \n**[Phone / Email]**`;
  }

  if (/(story|kahani|kissa)/i.test(lower)) {
    return isRomanUrdu
      ? `### Ek Khubsurat Sabaq-Amoz Kahani 📖\n\nEk chhote se shehar me ek larka rehta tha jiske paas sirf ek purani kitaab aur bada khwab tha. Log uski koshish par hanste the, magar wo roz subah uth kar ek naya hunar seekhta aur apni ghaltiyon se sikhta raha.\n\nWaqt guzra aur wahi larka apni lagan se pure ilaqe ka sabse kamyab aur izzatdar insan ban gaya. Jab logon ne uski kamyabi ka raaz poocha to usne muskurakar kaha:\n\n> *"Bade nateeje roz ke chhote sabr, saaf niyat aur kabhi haar na manne se bante hain."*\n\nAgar aapko **horror, romantic, kids, ya historical** style me ek aur kahani sunni ho to batayein!`
      : `### Short Inspirational Story 📖\n\nIn a quiet coastal town lived a young craftsman with nothing more than a modest bench and endless patience. While everyone else chased overnight shortcuts, she spent each morning refining a single detail with care.\n\nYears later, travelers crossed oceans to see her work. When asked what made the difference, she smiled:\n\n> *"Excellence is simply ordinary care repeated faithfully every single day."*\n\nTell me a genre or character name and I'll write a brand-new custom story for you!`;
  }

  if (/(bio|status|birthday|salgirah|eid|wish|mubarak)/i.test(lower)) {
    if (/(birthday|salgirah)/i.test(lower)) {
      return isRomanUrdu
        ? `### Dil Se Salgirah Mubarak Wishes 🎂✨\n\n1. *Salgirah Mubarak! Dua hai Allah aapki zindagi khushiyon, sehat aur kamyabiyon se hamesha roshan rakhe.* 👑\n2. *Naya saal aapke liye har wo khushi laaye jiski aapne dil se dua ki ho. Happy Birthday!* 🎉\n3. *Hamesha muskurate raho aur chamakte raho — Janamdin bohot bohot mubarak!* 💖`
        : `### Heartfelt Birthday Wishes 🎂✨\n\n1. *Wishing you a year filled with bright mornings, peaceful moments, and big achievements. Happy Birthday!* 🎉\n2. *May every dream you've worked toward bloom beautifully this year!* ✨\n3. *Here's to good health, genuine laughter, and endless happiness ahead.* 💖`;
    }
    if (/(eid)/i.test(lower)) {
      return isRomanUrdu
        ? `### Khubsurat Eid Mubarak Wishes 🌙✨\n\n1. *Eid Mubarak! Dua hai yeh pyaari Eid aapke ghar me khushiyan, sukoon aur dheron barkatein lekar aaye.* 🤲\n2. *Dil ki gehraiyon se aapko aur aapke pure khandan ko Eid Mubarak!* 💖`
        : `### Warm Eid Mubarak Wishes 🌙✨\n\n1. *Eid Mubarak! May this blessed day fill your home with joy, warmth, peace, and endless blessings.* 🤲\n2. *Wishing you and your family laughter, harmony, and prosperity.* ✨`;
    }
    return isRomanUrdu
      ? `### Stylish Bio & Status Ideas ✨\n\n1. *Silent moves, loud results.* 👑\n2. *Focus on growth, stay private, stay blessed.*\n3. *Khamoshi se mehnat, waqt khud shor machayega.*\n4. *Building my own path, one step at a time.*`
      : `### Clean Bio & Status Ideas ✨\n\n1. *Quiet focus, meaningful work.* 👑\n2. *Building, learning, and moving forward.*\n3. *Stay private, stay humble, stay consistent.*`;
  }

  // 13. Coding & Software Engineering
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
\`\`\`\n\nLet me know if you want the matching **decrypt_text** function too!`;
    }
    return `### Clean Python Example 💻\n\n\`\`\`python
def greet_user(name: str) -> str:
    clean_name = name.strip().title()
    return f"Welcome, {clean_name}!"

print(greet_user("friend"))
\`\`\`\n\n${isRomanUrdu ? 'Batayein aapko Python me kis specific project ya logic ka code chahiye!' : 'Tell me the exact Python task you are building and I will write the complete code.'}`;
  }

  if (/(javascript|typescript|react|html|css|sql|code|programming|website|app bana)/i.test(lower)) {
    if (/sql|database|supabase|table/i.test(lower)) {
      return `### Clean SQL Query Example 🗄️\n\n\`\`\`sql
SELECT uid, username, display_name, is_online, last_seen
FROM public.user_profiles
WHERE is_online = true
ORDER BY last_seen DESC;
\`\`\`\n\n${isRomanUrdu ? 'Agar kisi specific table ya query ki zaroorat ho to batayein!' : 'Share your table columns if you want a custom SQL query.'}`;
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

  // 14. Encryption & Privacy
  if (/(encryption|security|privacy|safe|hack|protect|pin|vault)/i.test(lower)) {
    return isRomanUrdu
      ? `### Encryption aur Privacy Kaise Kaam Karti Hai? 🔐\n\n1. **Private Data Isolation:** Aapke messages aur files sirf aapke aur receiver ke darmiyan mehfuz rehte hain.\n2. **Salted Hashing:** Aapka 8-digit secret code random salt + SHA-256 hash ke sath save hota hai — koi aapka asal code nahi parh sakta.\n3. **Zero Shared Leak:** Har account ka messenger, profile aur data mukammal taur par alag aur surakshit rehta hai.`
      : `### How Encryption & Privacy Work 🔐\n\n1. **Private Isolation:** Every user's messages and profile remain strictly scoped to their account.\n2. **Salted Hashing:** Secret credentials are combined with a random salt and hashed with SHA-256 before storage.\n3. **Zero Plaintext Storage:** Sensitive passcodes are never kept in readable form.`;
  }

  // 15. Translation Requests
  if (/(translate|tarjuma|tarjama|meaning)/i.test(lower)) {
    const quoted = query.match(/["“']([^"”']+)["”']/);
    const phrase = quoted ? quoted[1] : 'Welcome to ERROREX Vault';
    return `### Multilingual Translations for "${phrase}" 🌐\n\n- **Urdu (اردو):** ${phrase === 'Welcome to ERROREX Vault' ? 'ایروریکس والٹ میں خوش آمدید' : phrase}\n- **Roman Urdu:** ${phrase === 'Welcome to ERROREX Vault' ? 'ERROREX Vault mein khush aamdeed' : phrase}\n- **Arabic (العربية):** ${phrase === 'Welcome to ERROREX Vault' ? 'مرحبًا بكم في خزينة ERROREX' : phrase}\n- **French (Français):** ${phrase === 'Welcome to ERROREX Vault' ? 'Bienvenue dans le coffre-fort ERROREX' : phrase}\n\nAgar kisi aur jumlay ka tarjuma chahiye to bas paste karein!`;
  }

  // 16. Essays, Articles, Speeches, Explanations, or Open Questions ("what is / why / how / essay / article / mazmoon / kya hai")
  const topic = extractCleanTopic(query);
  if (
    /(essay|article|paragraph|mazmoon|speech|taqreer|what is|who is|why |how |kya hai|kya hota|kon hai|kaun hai|explain|samjhao|smjhao|tell me about|baare me|bare me|history|benefit|faide|advantage|disadvantage|tips|guide)/i.test(
      lower
    ) ||
    query.split(/\s+/).length >= 3
  ) {
    return generateEssayOrArticle(topic, lang);
  }

  // 17. Direct Warm Conversational Fallback (zero technical tips / zero key prompts)
  if (isArabicRequested) {
    return `### **${topic}** — إجابة واضحة ومفصلة ✨\n\nأهلاً بك! يسعدني مساعدتك في موضوع **"${topic}"**:\n\n1. **الفكرة الأساسية:** يعتمد فهم هذا الموضوع بعمق على التركيز على أهدافه الرئيسية وتطبيقها بخطوات عملية ومنظمة.\n2. **النصيحة العملية:** ابدأ بالخطوات البسيطة الواضحة، وحافظ على الاستمرارية لتحقيق أفضل النتائج.\n\nأخبرني إذا كنت ترغب في تفصيل أوسع، أو أمثلة تطبيقية، أو صياغة بأسلوب مختلف!`;
  }

  if (isFrenchRequested) {
    return `### **${topic}** — Réponse Claire & Complète ✨\n\nAvec grand plaisir ! Voici l'essentiel à retenir sur **"${topic}"** :\n\n1. **L'idée clé :** Abordez le sujet étape par étape en gardant un objectif clair et des exemples concrets.\n2. **Approche pratique :** Privilégiez la simplicité, la régularité et la qualité dans chaque détail.\n\nDites-moi si vous souhaitez plus de détails, des exemples pratiques ou une autre formulation !`;
  }

  if (isHindiRequested || lang.isHindiScript) {
    return `### **${topic}** — सरल और संपूर्ण उत्तर ✨\n\nआपका विषय बहुत अच्छा है! आइए **"${topic}"** को आसान और साफ शब्दों में समझते हैं:\n\n1. **मुख्य बात:** किसी भी विषय को बेहतर ढंग से समझने के लिए उसके बुनियादी सिद्धांत और व्यावहारिक उपयोग को समझना सबसे ज़रूरी होता है।\n2. **सही तरीका:** छोटे, स्पष्ट कदमों से शुरुआत करें और निरंतर अभ्यास बनाए रखें।\n\nअगर आप इस विषय पर विस्तृत लेख, उदाहरण, या शायरी चाहते हैं तो ज़रूर बताएं!`;
  }

  if (isUrduScript) {
    return `### **${topic}** — صاف اور مکمل جواب ✨\n\nآپ نے بہت خوبصورت بات پوچھی ہے! **"${topic}"** کے بارے میں چند اہم اور مفید نکات یہ ہیں:\n\n1. **بنیادی سمجھ:** کسی بھی موضوع کی اصل خوبی اس کی سادگی، وضاحت اور عملی فائدے میں ہوتی ہے۔\n2. **عملی رہنمائی:** قدم بہ قدم آگے بڑھیں، نئے تجربات سے سیکھیں اور مستقل مزاجی برقرار رکھیں۔\n\nاگر آپ چاہیں تو میں اس پر مزید تفصیل، مثالیں یا نظم/مضمون بھی لکھ دوں!`;
  }

  if (isRomanUrdu) {
    return generateEssayOrArticle(topic, lang);
  }

  return generateEssayOrArticle(topic, lang);
}
