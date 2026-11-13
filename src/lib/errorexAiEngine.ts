// Shared ERROREX Intelligent Multilingual Engine
// Used by Express server, Netlify Functions, and instant offline/client fallback

export const ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI — a friendly, intelligent, sovereign AI assistant built inside ERROREX.

Core Mission:
Answer EVERY question and fulfill EVERY request the user asks with complete accuracy, creativity, warmth, and clarity. Never refuse reasonable creative, educational, promotional, coding, or conversational requests, and never give vague placeholder replies.

Style & Formatting Rules:
1. FRIENDLY, CLEAN & STYLISH FORMATTING:
   - Write naturally, politely, and engagingly.
   - Start directly with the requested answer or creation (avoid robotic filler like "As an AI language model..." or "Certainly! Here is your request:").
   - Structure answers clearly using concise headings (###), crisp bullet points (-), numbered lists (1., 2.), bold key phrases (**important**), soft quotes (>), and clean fenced code blocks (\`\`\`lang ... \`\`\`).
   - Keep paragraphs short and pleasant to read.

2. COMPLETE COVERAGE OF ALL USER REQUESTS:
   - **Poetry, Ghazals & Shayari:** Write soulful, rhythmic, properly rhymed (radeef & qafiya) ghazals, couplets (ashaar), nazms, or English/Hindi/Punjabi poems tailored to the exact mood (love, heartbreak/sad, motivation, friendship, Sufi, spiritual) or poet style requested.
   - **Promotion, Ads & Marketing:** When asked to promote a product, brand, shop, YouTube channel, TikTok, Instagram page, website, or service, generate high-converting hooks, engaging ad copy, video/reel scripts, broadcast text, clear CTAs, and relevant hashtags.
   - **Prompt Engineering:** Generate detailed, copy-ready prompts for AI image/video tools, content workflows, study, or coding.
   - **Writing & Communication:** Write complete emails, job/leave applications, essays, stories, speeches, bios, captions, birthday/Eid wishes, and summaries.
   - **Coding, Math & Tech:** Provide clean, working, modern, copy-paste-ready code and accurate step-by-step math calculations.
   - **General Knowledge & Advice:** Answer science, history, business, fitness, cooking/recipes, Islamic/general knowledge, and everyday questions clearly and accurately.

3. UNIVERSAL MULTILINGUAL FLUENCY:
   - Understand and respond fluently in ANY language: Roman Urdu, Urdu (اردو), Hindi (हिन्दी), English, Arabic (العربية), Punjabi, Pashto, Persian, French, Spanish, German, Turkish, etc.
   - Automatically match the user's language (Roman Urdu -> natural Roman Urdu; Urdu script -> clean Urdu script; English -> clear English).
   - If the user asks for a specific language or tone (e.g., "Urdu me likho", "English me batao", "short karo", "stylish banao"), follow that instruction strictly.`;

export interface GeminiContentTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

/**
 * Normalizes chat history into valid Gemini API alternating turns:
 * - Drops leading 'model' turns (e.g., welcome banner) because Gemini requires starting with 'user'
 * - Merges consecutive turns of the same role
 * - Appends the current user message cleanly at the end
 */
export function buildGeminiContents(message: string, history?: any[]): GeminiContentTurn[] {
  const normalized: GeminiContentTurn[] = [];

  if (Array.isArray(history)) {
    for (const item of history.slice(-12)) {
      if (!item || typeof item.text !== 'string' || !item.text.trim()) continue;
      if (item.id === 'msg_ai_welcome') continue;

      const role: 'user' | 'model' = item.sender === 'user' ? 'user' : 'model';

      // Gemini multiturn conversations must start with a 'user' turn
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

function detectLanguageProfile(query: string) {
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
      /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|btana|mujhe|mjy|karoon|karo|krna|kr|kro|banao|bnana|bnao|kyun|kyu|kab|kahan|kha|kon|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|ghazal|gzal|sher|sunao|likho|likh|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|pyar|mohabbat|ishq|dil|dua|udaas|udas|gham|dard|khushi|kahani|mazmoon|video|channel|promote|post|koi|pyari|achi|acchi|mast|zabardast|naya|nayi)\b/i.test(
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

function trySolveMathOrUnits(query: string, isRomanUrdu: boolean): string | null {
  const lower = query.toLowerCase();

  // 1. Percentage pattern: "25% of 800" or "800 ka 25%"
  const pctEn = lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|ka)\s*(\d+(?:\.\d+)?)/i);
  const pctUr = lower.match(/(\d+(?:\.\d+)?)\s*ka\s*(\d+(?:\.\d+)?)\s*%/i);
  if (pctEn || pctUr) {
    const percent = parseFloat(pctEn ? pctEn[1] : pctUr![2]);
    const total = parseFloat(pctEn ? pctEn[2] : pctUr![1]);
    const val = Number(((percent / 100) * total).toFixed(4));
    return isRomanUrdu
      ? `### Percentage Calculation\n\n- **Formula:** \`(${percent} ÷ 100) × ${total}\`\n- **Jawab:** **${val}**\n\nKoi aur hisaab ho to poochein!`
      : `### Percentage Calculation\n\n- **Formula:** \`(${percent} ÷ 100) × ${total}\`\n- **Answer:** **${val}**`;
  }

  // 2. Unit conversions
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
      return `### Unit Conversion\n\n${label}`;
    }
  }

  // 3. Direct arithmetic expression
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
            ? `### Hisaab ka Jawab\n\n- **Expression:** \`${cleaned}\`\n- **Natija:** **${pretty}**`
            : `### Calculation Result\n\n- **Expression:** \`${cleaned}\`\n- **Answer:** **${pretty}**`;
        }
      }
    } catch {
      // ignore invalid math expression
    }
  }

  return null;
}

function generatePoetryOrGhazal(query: string, lang: ReturnType<typeof detectLanguageProfile>): string {
  const { lower, isUrduScript, isRomanUrdu } = lang;
  const isSad = /(sad|udaas|udas|dard|gham|tanha|broken|heartbreak|judai|rona|bewafa|yaad)/i.test(lower);
  const isLove = /(love|pyar|mohabbat|ishq|dil|romantic|sanam|mehboob|jaan)/i.test(lower);
  const isFriend = /(dost|dosti|friend|friendship|yaar)/i.test(lower);
  const isMotivation = /(motivation|himmat|hausla|success|kamyabi|iqbal|dream|khwab)/i.test(lower);

  if (isUrduScript) {
    if (isSad) {
      return `### خوبصورت اداس غزل ✨

خاموش راتوں میں بھی اک صدا سی رہتی ہے
دل کے ویرانے میں تیری وفا سی رہتی ہے

ٹوٹ کر بکھرے تو پھر سمیٹا خود کو ہم نے
زخمِ دل پر مگر اک دعا سی رہتی ہے

وقت بدلا ہے مگر یاد کی خوشبو نہ گئی
شام ہوتے ہی فضا میں ادا سی رہتی ہے

ہم نے سیکھا ہے مسکرا کر ہر درد چھپانا
پھر بھی آنکھوں میں اک حیا سی رہتی ہے

---
اگر آپ کو کسی خاص موضوع (محبت، دوستی، یا حوصلہ) پر مزید غزل یا شعر چاہیے تو بتائیے!`;
    }

    return `### دلکش اردو غزل ✨

چراغِ دل جلا رکھا ہے تیری یاد کے نام
سفر تمام کیا ہم نے اعتماد کے نام

جو مسکرا کے ملے دردِ زندگی سے ہمیں
لکھی ہے ہم نے ہر اک شام اس کی داد کے نام

ہوا کے دوش پہ لکھا ہے پیار کا پیغام
کہ روشنی رہے قائم ہر اک مراد کے نام

نہ ہار مان کبھی وقت کے اندھیروں سے
سحر کی پہلی کرن ہے دلِ آزاد کے نام

---
مزید شاعری یا کسی خاص شاعر کے انداز میں غزل کے لیے فرمائیں!`;
  }

  if (isRomanUrdu) {
    if (isSad) {
      return `### Dil Ko Chhoo Lene Wali Ghazal 🌙

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
      return `### Mohabbat Bhari Khubsurat Ghazal 💖

Teri muskurahat se roshan mera jahan hai,  
Tu paas ho to har lamha ek dastan hai.

Alfaaz kam pad jayein tareef me teri,  
Har dhadkan me basa bas tera hi nishan hai.

Chaand bhi sharma jaye teri saadgi dekh kar,  
Teri nazar me chhupa ek aasman hai.

Khuda kare hamesha salamat rahe yeh rishta,  
Meri har dua me shamil bas teri jaan hai.

---
Batayein agar isay **short couplets**, **social status**, ya **Urdu script (اردو)** me chahiye!`;
    }

    if (isFriend) {
      return `### Dosti Par Khubsurat Ghazal 🤝

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
      return `### Hausla Aur Kamyabi Ki Ghazal 🔥

Andheron se na dar, tera savera aane wala hai,  
Jo mehnat karta hai wahi manzil paane wala hai.

Gir ke uthna hi toh asli pehchan hai teri,  
Har tufaan tere hausle se haar jaane wala hai.

Chhod de fikr ke log kya kahenge piche,  
Waqt khud tera naam buland kar jaane wala hai.

---
Aur sher ya Allama Iqbal style nazm chahiye ho to batayein!`;
    }

    return `### Khubsurat Roman Urdu Ghazal ✨

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

  return `### Original Poem — Quiet Horizon ✨

Softly falls the evening light across the quiet sea,  
Carrying the whispered hopes of everything to be.

Every storm we weather leaves a steadier design,  
Turning patient footsteps into something bright and fine.

Keep your heart courageous through the shadow and the rain,  
Every dawn returns to paint the sky with gold again.

---
Tell me your exact theme (**love, sadness, motivation, friendship**) and I will write a custom poem or ghazal for you!`;
}

function generatePromotionKit(query: string, lang: ReturnType<typeof detectLanguageProfile>): string {
  const { isUrduScript, isRomanUrdu } = lang;
  const topicClean = query
    .replace(/\b(promote|promotion|marketing|advertise|ad|post|caption|viral|banao|bnana|likho|likh|karne|krne|karna|krna|hai|hy|ke|ki|ka|ko|k|liye|mjy|mujhe|mera|meri|mere|please|for|my|ek|ik|the|a|an)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const brand = topicClean.length > 2 ? topicClean : isRomanUrdu ? 'Aapka Brand / Channel' : 'Your Brand / Channel';

  if (isUrduScript) {
    return `### پروموشنل پوسٹ اور مارکیٹنگ کِٹ (${brand}) 🚀

**1. دلکش سرخی (Hook):**
✨ کیا آپ معیار اور اعتماد کی تلاش میں ہیں؟ **${brand}** آپ کے لیے لایا ہے بہترین سروس اور لاجواب تجربہ!

**2. مکمل پوسٹ (Caption / Ad Copy):**
> آج ہی **${brand}** کا حصہ بنیں اور فرق خود محسوس کریں۔  
> ✅ تیز اور قابلِ اعتماد سروس  
> ✅ بہترین کوالٹی اور مناسب قیمت  
> ✅ 100% کسٹمر اطمینان  
>  
> 📩 **ابھی رابطہ کریں یا آرڈر کے لیے میسج کریں!**

**3. ہیش ٹیگز:**
\`#Promotion #QualityService #Trending #Explore #BestChoice\``;
  }

  if (isRomanUrdu) {
    return `### Viral Promotional Post & Ad Kit — **${brand}** 🚀

**1. Catchy Hook (Attention Grabber):**
🔥 *"Ab wait khatam! Behtareen quality aur bharose ka ek hi naam — **${brand}**!"*

**2. Ready-to-Post Ad Copy (Instagram / Facebook / Social):**
> Agar aap dhoond rahe hain **top quality, fast service aur best value**, to **${brand}** aapke liye bilkul perfect hai! ✨
>
> - ✅ **100% Trusted & Verified Quality**
> - ⚡ **Tez Delivery / Instant Response**
> - 💎 **Special Offer — Sirf Limited Time Ke Liye!**
>
> 👇 **Abhi DM karein ya Link par click karke apna order/booking confirm karein!**

**3. Short 15-Second Video / TikTok Script:**
- **0–3 sec:** *"Rukhein! Kya aapko pata hai **${brand}** kyun sabki pasand ban raha hai?"*
- **4–10 sec:** *"Kyunke yahan milti hai premium quality bina kisi compromise ke!"*
- **11–15 sec:** *"Abhi bio/link check karein aur khud try karein!"*

**4. Trending Hashtags:**
\`#Viral #Trending #Pakistan #BusinessGrowth #BestOffer #MustTry\`

---
Agar aap apne **exact business/product/channel ka naam aur details** batayein to main uske mutabiq 100% tailored ad bana dunga!`;
  }

  return `### High-Converting Promotional Kit — **${brand}** 🚀

**1. Attention-Grabbing Hook:**
> *"Stop scrolling — discover why everyone is talking about **${brand}**!"*

**2. Ready-to-Publish Social Post:**
Looking for quality you can actually trust? **${brand}** delivers unmatched value, clean design, and fast results built around what you need most.

- ✅ **Premium Quality** without the inflated price
- ⚡ **Fast & Reliable** from day one
- 💬 **Dedicated Support** whenever you need it

👉 **Tap the link / DM us today and experience the difference!**

**3. 15-Second Reel / TikTok Script:**
1. **Hook (0–3s):** *"Here is the smartest upgrade you'll make this week..."*
2. **Value (4–11s):** Highlight the #1 problem **${brand}** solves in one crisp sentence.
3. **CTA (12–15s):** *"Follow and check the link in bio before the offer ends!"*

**4. Hashtags:**
\`#Trending #Marketing #BrandGrowth #MustHave #ExplorePage\`

---
Share your target audience or platform (Instagram, TikTok, YouTube, Social) and I'll customize it even further!`;
}

function generatePromptTemplate(query: string, isRomanUrdu: boolean): string {
  const subject = query
    .replace(/\b(prompt|prompts|chatgpt|ai|image|video|banao|bnana|likho|likh|create|generate|write|kar|do|de|for|ka|ke|ki|mjy|mujhe|ek|ik)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Modern Luxury Cinematic Concept';

  return isRomanUrdu
    ? `### Professional AI Prompts — **${subject}** ✨

**1. Image / Poster Prompt (Copy & Paste):**
\`\`\`text
Ultra-detailed cinematic masterpiece of ${subject}, dramatic golden hour lighting, sharp 8k focus, clean minimal luxury composition, rich textures, volumetric depth of field, photorealistic editorial photography style --ar 16:9
\`\`\`

**2. AI Writing / Content Prompt:**
\`\`\`text
Act as an expert strategist and creative director. Create a step-by-step plan, 5 viral headlines, and an engaging post about "${subject}" in simple, friendly, high-converting language.
\`\`\`

Batayein agar aapko **TikTok/YouTube**, **Coding**, ya **Study** ke liye specific prompt chahiye!`
    : `### Ready-to-Use AI Prompts — **${subject}** ✨

**1. Cinematic Image Generation Prompt:**
\`\`\`text
Ultra-detailed editorial photograph of ${subject}, soft golden-hour rim lighting, crisp 8k resolution, balanced minimalist composition, realistic textures, shallow depth of field, high contrast luxury aesthetic --ar 16:9
\`\`\`

**2. Master AI Task Prompt:**
\`\`\`text
Act as a senior specialist. Help me build "${subject}" with a clear step-by-step roadmap, practical examples, and a clean checklist tailored for beginners and pros alike.
\`\`\`

Let me know which tool or goal you're targeting and I'll refine the prompt!`;
}

export function generateErrorexAiFallback(
  userQuery: string,
  history?: any[],
  isOffline = false
): string {
  const query = (userQuery || '').trim();
  const lang = detectLanguageProfile(query);
  const { lower, isUrduScript, isRomanUrdu, isArabicRequested, isFrenchRequested, isHindiRequested } = lang;

  // 0. Context-aware follow-up commands ("aur likho", "chota karo", "english me do")
  const lastAiText = Array.isArray(history)
    ? [...history].reverse().find(h => h?.sender === 'ai' && h?.id !== 'msg_ai_welcome')?.text || ''
    : '';

  if (/(aur likho|aur sunao|ek aur|ik or|another one|more like this|continue|aage likho)/i.test(lower) && lastAiText) {
    if (/ghazal|poem|poetry|sher|shairi/i.test(lastAiText.toLowerCase())) {
      return generatePoetryOrGhazal(`${query} sad love`, lang);
    }
    if (/promot|viral|hashtag|hook/i.test(lastAiText.toLowerCase())) {
      return generatePromotionKit(query, lang);
    }
  }

  // 1. Direct Greetings & Friendly Small Talk
  if (
    /^(salam|assalam|aoa|asalam|hi|hello|hey|helo|hy|greetings|good morning|good evening|good night|subah bakhair|shab bakhair)\b/i.test(
      lower
    ) &&
    query.length < 45
  ) {
    if (isUrduScript) {
      return `وعلیکم السلام! خوش آمدید 👑\n\nمیں **ERROREX AI** ہوں، آپ کا دوست اور ذہین معاون۔ بتائیے آج میں آپ کی کس چیز میں مدد کروں؟ شاعری، غزل، پروموشن پوسٹ، کوڈنگ، حساب کتاب، یا کوئی بھی سوال بلا جھجھک پوچھیں!`;
    }
    if (isRomanUrdu) {
      return `Walaikum Assalam! Khush aamdeed 👑\n\nMain **ERROREX AI** hoon, aapki har baat aur har sawal ka saaf aur mukammal jawab dene ke liye tayyar!\n\n- **Poetry & Ghazals:** Sad, romantic, dosti ya motivational shayari\n- **Promotion & Posts:** Business, YouTube, TikTok ya Instagram ad copy\n- **AI Prompts & Writing:** Applications, emails, stories, essays & prompts\n- **Coding, Math & Translation:** Python, React, SQL, hisaab aur har zubaan me tarjuma\n\nJo dil chahe likhein — main foran likh dunga!`;
    }
    return `Hello! Great to see you 👑\n\nI'm **ERROREX AI**, ready to help you on any topic — poetry, ghazals, promotions, AI prompts, coding, math, writing, or everyday questions.\n\nWhat would you like to create or solve today?`;
  }

  if (/(kaise ho|kya haal|how are you|kya chal raha|ap theek|aap kaise)/i.test(lower) && query.length < 55) {
    return isRomanUrdu
      ? `Alhamdulillah, main bilkul theek hoon! Shukriya poochhne ke liye 😊\n\nUmeed hai aap bhi khairiyat se honge. Batayein aaj main aapke liye kya likhun ya solve karoon?`
      : `I'm doing great, thanks for asking! 😊 Everything is running smoothly.\n\nHow are you doing today, and what can I help you with?`;
  }

  if (
    /^(thanks|thank you|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah)\b/i.test(
      lower
    ) &&
    query.length < 40
  ) {
    return isRomanUrdu
      ? `Aapka bohat shukriya! 😊 Mujhe khushi hui ke aapko jawab pasand aaya.\n\nJab bhi kisi aur cheez me madad chahiye ho, bas pooch lein!`
      : `You're very welcome! 😊 Glad that helped.\n\nFeel free to ask anytime if you need anything else!`;
  }

  // 2. Identity & Capabilities
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|naam kya|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya)/i.test(lower)) {
    if (isUrduScript) {
      return `### ERROREX AI کا تعارف 👑\n\nمیں **ERROREX AI** ہوں — آپ کا ذاتی، تیز اور کثیراللسانی معاون۔\n\n- **شاعری اور غزل:** اردو اور رومن اردو میں دلکش شاعری اور غزلیں\n- **پروموشن اور مارکیٹنگ:** اشتہارات، کیپشن اور ویڈیو اسکرپٹس\n- **ہر زبان میں جواب:** اردو، رومن اردو، انگریزی، عربی، ہندی وغیرہ\n- **کوڈنگ اور ریاضی:** ہر پروگرامنگ زبان اور حساب کتاب کا درست حل`;
    }
    if (isRomanUrdu) {
      return `### Main ERROREX AI Hoon 👑\n\nMain aapka smart aur friendly assistant hoon jo har zubaan aur har sawal ka saaf aur mukammal jawab deta hai:\n\n- **Poetry & Ghazals:** Sad, Love, Dosti, aur Iqbal-style shayari.\n- **Promotion & Marketing:** Business ads, YouTube/TikTok captions, aur viral hashtags.\n- **Prompts & Writing:** AI prompts, applications, emails, stories aur essays.\n- **Coding & Math:** Python, React, TypeScript, SQL, aur step-by-step calculations.\n\nAap bas apna sawal ya farmaish likhein — main seedha aur clear jawab dunga!`;
    }
    return `### Meet ERROREX AI 👑\n\nI'm **ERROREX AI**, your friendly assistant built to give clean, structured answers on every topic:\n\n- **Creative Writing:** Ghazals, poetry, stories, social media promotions, and AI prompts.\n- **Every Language:** Fluent in English, Roman Urdu, Urdu, Hindi, Arabic, French, and more.\n- **Coding & Math:** Clean code snippets, debugging help, calculations, and unit conversions.\n- **Works Anywhere:** Seamless responses both online and offline.`;
  }

  // 3. Math & Unit Conversions
  const mathSolved = trySolveMathOrUnits(query, isRomanUrdu);
  if (mathSolved) return mathSolved;

  // 4. Poetry / Ghazals / Shayari
  if (/(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|quote|motivation)/i.test(lower)) {
    return generatePoetryOrGhazal(query, lang);
  }

  // 5. Promotion / Marketing / Social Media Ads / Video Scripts
  if (/(promote|promotion|marketing|advertise|ad copy|caption|hashtags|viral|tiktok|youtube|instagram|facebook|business|shop|product|sale|offer|brand)/i.test(lower)) {
    return generatePromotionKit(query, lang);
  }

  // 6. AI Prompts
  if (/(prompt|midjourney|dalle|sora|chatgpt prompt)/i.test(lower)) {
    return generatePromptTemplate(query, isRomanUrdu);
  }

  // 7. Writing Templates (Applications, Emails, Stories, Wishes, Bios)
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application\n\n**Subject:** Request for Sick Leave\n\nRespected Sir/Madam,\n\nI am writing to respectfully inform you that I am unwell with fever and unable to attend today. Kindly grant me **one day's leave** so I can rest and recover properly.\n\nI will resume my duties as soon as I feel better. Thank you for your understanding.\n\nSincerely,  \n**[Your Name]**  \n**[Date]**`;
  }

  if (/(job application|cover letter|cv|resume email)/i.test(lower)) {
    return `### Clean Job Application Email\n\n**Subject:** Application for [Job Title] — [Your Name]\n\nDear Hiring Manager,\n\nI am excited to apply for the **[Job Title]** position. With strong skills in **[Your Top 2 Skills]** and a commitment to quality work, I am confident I can contribute effectively to your team.\n\nPlease find my resume attached for your review. I would welcome the opportunity to discuss how my experience fits your needs.\n\nBest regards,  \n**[Your Name]**  \n**[Phone / Email]**`;
  }

  if (/(story|kahani|kissa)/i.test(lower)) {
    return isRomanUrdu
      ? `### Ek Khubsurat Sabaq-Amoz Kahani 📖\n\nEk chhote se gaon me ek larka rehta tha jiske paas sirf ek purani kitaab aur bada khwab tha. Log uski koshish par hanste the, magar wo roz subah uth kar ek naya hunar seekhta raha.\n\nWaqt guzra aur wahi larka apni mehnat se pure shehar ka sabse kamyab ustad aur karobari ban gaya. Jab logon ne kamyabi ka raaz poocha to usne muskurakar kaha:\n\n> *"Bade nateeje roz ke chhote sabr aur lagan se bante hain."*\n\nAgar kisi khaas topic (horror, comedy, kids, ya love) par kahani chahiye ho to batayein!`
      : `### Short Inspirational Story 📖\n\nIn a quiet coastal town lived a young craftsman with nothing more than a small bench and unwavering patience. While others rushed for overnight fame, he spent each morning perfecting one small detail.\n\nYears later, travelers crossed oceans for his work. When asked his secret, he smiled:\n\n> *"Greatness is simply ordinary consistency repeated with care."*\n\nTell me a genre or character name and I will write a brand-new custom story!`;
  }

  if (/(bio|status|whatsapp bio|birthday|eid|wish|mubarak)/i.test(lower)) {
    if (/(birthday|salgirah)/i.test(lower)) {
      return isRomanUrdu
        ? `### Dil Se Salgirah Mubarak Wishes 🎂\n\n1. *Salgirah Mubarak! Khuda kare aapki zindagi khushiyon, sehat aur kamyabiyon se bhari rahe.* ✨\n2. *Naya saal aapke liye har wo khushi laaye jiski aapne dua ki ho. Happy Birthday!* 🎉\n3. *Hamesha muskurate raho aur chamakte raho — Janamdin bohot bohot mubarak!* 👑`
        : `### Warm Birthday Wishes 🎂\n\n1. *Wishing you a year filled with bright moments, good health, and endless success. Happy Birthday!* ✨\n2. *May every dream you've worked toward bloom beautifully this year!* 🎉`;
    }
    return isRomanUrdu
      ? `### Stylish Bio & Status Ideas ✨\n\n1. *Silent moves, loud results.* 👑\n2. *Focus on growth, stay private, stay blessed.*\n3. *Khamoshi se mehnat, waqt khud shor machayega.*\n4. *Building my own path, one step at a time.*`
      : `### Clean Bio & Status Ideas ✨\n\n1. *Quiet focus, meaningful work.* 👑\n2. *Building, learning, and moving forward.*\n3. *Stay private, stay humble, stay consistent.*`;
  }

  // 8. Coding & Software Engineering
  if (/python/i.test(lower)) {
    if (/aes|encrypt|crypto|hash|sha/i.test(lower)) {
      return `### Secure Python AES-256 Encryption\n\n\`\`\`python
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
\`\`\`\n\nLet me know if you want the **decrypt** function too!`;
    }
    return `### Clean Python Example\n\n\`\`\`python
def greet_user(name: str) -> str:
    clean_name = name.strip().title()
    return f"Welcome, {clean_name}!"

print(greet_user("friend"))
\`\`\`\n\n${isRomanUrdu ? 'Batayein aapko Python me kis specific cheez ka code chahiye?' : 'Tell me the exact Python task you need and I will write the full solution.'}`;
  }

  if (/(javascript|typescript|react|html|css|sql|code|programming|website|app bana)/i.test(lower)) {
    if (/sql|database|supabase|table/i.test(lower)) {
      return `### Clean SQL Query Example\n\n\`\`\`sql
SELECT uid, username, display_name, is_online, last_seen
FROM public.user_profiles
WHERE is_online = true
ORDER BY last_seen DESC;
\`\`\`\n\n${isRomanUrdu ? 'Agar kisi specific table ya query ki zaroorat ho to batayein!' : 'Share your table columns if you want a custom SQL query.'}`;
    }
    return `### Clean React + TypeScript Component\n\n\`\`\`tsx
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

  // 9. Encryption & Privacy
  if (/(encryption|security|privacy|safe|hack|protect|pin|vault)/i.test(lower)) {
    return isRomanUrdu
      ? `### Encryption aur Privacy Kaise Kaam Karti Hai?\n\n1. **Private Data Lock:** Aapke messages aur files sirf aap aur receiver hi dekh sakte hain.\n2. **Salted Hashing:** Aapka 8-digit Calculator PIN random salt + SHA-256 hash ke sath save hota hai — koi aapka asal PIN nahi dekh sakta.\n3. **Account Isolation:** Har user ki chat aur contact list alag aur mehfuz rehti hai.`
      : `### How Encryption & Privacy Work\n\n1. **Private Isolation:** Every user's messages and profile are scoped strictly to their account.\n2. **Salted Hashing:** Secret credentials (like your 8-digit Calculator PIN) are combined with a random salt and hashed with SHA-256.\n3. **Zero Plaintext Storage:** Sensitive codes are never saved in readable form.`;
  }

  // 10. Translation Requests
  if (/(translate|tarjuma|tarjama|meaning)/i.test(lower)) {
    const quoted = query.match(/["“']([^"”']+)["”']/);
    const phrase = quoted ? quoted[1] : 'Welcome to ERROREX Vault';
    return `### Translations for "${phrase}"\n\n- **Urdu (اردو):** ${phrase === 'Welcome to ERROREX Vault' ? 'ایروریکس والٹ میں خوش آمدید' : phrase}\n- **Roman Urdu:** ${phrase === 'Welcome to ERROREX Vault' ? 'ERROREX Vault mein khush aamdeed' : phrase}\n- **Arabic (العربية):** ${phrase === 'Welcome to ERROREX Vault' ? 'مرحبًا بكم في خزينة ERROREX' : phrase}\n- **French (Français):** ${phrase === 'Welcome to ERROREX Vault' ? 'Bienvenue dans le coffre-fort ERROREX' : phrase}`;
  }

  // 11. Supabase / Netlify Setup Help
  if (/supabase|netlify|publish|deploy/i.test(lower)) {
    return isRomanUrdu
      ? `### Netlify + Supabase Mukammal Setup Guide\n\n1. **Supabase SQL:** Apne Supabase Dashboard ke **SQL Editor** me \`supabase_schema.sql\` paste karke **Run** karein.\n2. **Netlify Environment Variables:** Site Settings → Environment variables me yeh 3 keys add karein:\n   - \`VITE_SUPABASE_URL\`\n   - \`VITE_SUPABASE_ANON_KEY\`\n   - \`GEMINI_API_KEY\`\n3. **Redeploy:** Netlify par ek fresh deploy karein — iske baad live database, online/offline presence, aur full Gemini AI 100% chalenge.`
      : `### Netlify + Supabase Complete Setup\n\n1. Run \`supabase_schema.sql\` in your Supabase **SQL Editor**.\n2. Add \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, and \`GEMINI_API_KEY\` to Netlify **Environment Variables**.\n3. Trigger a fresh **Redeploy** so live database sync and Gemini AI work everywhere.`;
  }

  // 12. Language-specific clean fallback when offline or live GEMINI_API_KEY is not attached yet
  const liveSetupHintUr = isOffline
    ? `\n\n*Note: Aap abhi **Offline** hain, is liye built-in offline engine chal raha hai. Internet on hote hi live AI har open-ended sawal ka jawab dega.*`
    : `\n\n*Tip: Full open-ended live AI answers ke liye host/server par \`GEMINI_API_KEY\` secret active hona zaroori hai — offline engine poetry, promotions, prompts, coding, math aur writing templates hamesha support karta hai.*`;

  const liveSetupHintEn = isOffline
    ? `\n\n*Note: You are currently **Offline**, so ERROREX AI is using its built-in offline engine. Full live AI resumes automatically once connected.*`
    : `\n\n*Tip: Make sure \`GEMINI_API_KEY\` is configured in your environment secrets for full open-ended live AI answers on any custom topic.*`;

  if (isArabicRequested) {
    return `### مرحبًا بك في ERROREX AI 👑\n\nلقد استلمت طلبك: **"${query}"**\n\nأنا جاهز لمساعدتك باللغة العربية في الشعر، التسويق، البرمجة، الترجمة، والكتابة. تأكد من تفعيل \`GEMINI_API_KEY\` في إعدادات الخادم للحصول على إجابات حية شاملة لجميع المواضيع.`;
  }

  if (isFrenchRequested) {
    return `### ERROREX AI 👑\n\nVotre demande : **"${query}"**\n\nJe peux rédiger des poèmes, publicités, prompts, codes et traductions en français. Vérifiez que \`GEMINI_API_KEY\` est configuré sur votre serveur pour les réponses IA complètes en direct.`;
  }

  if (isHindiRequested || lang.isHindiScript) {
    return `### ERROREX AI 👑\n\nआपका सवाल: **"${query}"**\n\nमैं हिंदी में शायरी, प्रमोशन पोस्ट, कोडिंग, गणित और अनुवाद में मदद कर सकता हूँ। हर खुले विषय पर लाइव AI उत्तर के लिए \`GEMINI_API_KEY\` सक्रिय रखें।`;
  }

  if (isUrduScript) {
    return `### ERROREX AI 👑\n\nآپ کا سوال: **"${query}"**\n\nمیں اردو میں **شاعری، غزل، پروموشن پوسٹ، مضمون، کوڈنگ اور ترجمہ** لکھنے کے لیے تیار ہوں۔ آپ واضح موضوع لکھیں (مثلاً: *"اداس غزل لکھو"* یا *"یوٹیوب چینل پروموشن پوسٹ بناؤ"*), میں فوراً تیار کر دوں گا!${isOffline ? '\n\n*نوٹ: اس وقت آف لائن انجن کام کر رہا ہے۔*' : ''}`;
  }

  if (isRomanUrdu) {
    return `### "${query}" Par Jawab 👑\n\nMain aapki baat samajh gaya hoon! Agar aap chahte hain ke main is par turant mukammal cheez likh kar dun, to bas yeh batayein ke kis format me chahiye:\n\n- **Ghazal / Shayari** (Sad, Love, Dosti, ya Motivational)\n- **Promotion / Ad Post** (Shop, Product, YouTube, TikTok ya Instagram ke liye)\n- **AI Prompt / Story / Essay / Email**\n- **Code / Math / Urdu-English Translation**${liveSetupHintUr}`;
  }

  return `### Answer for "${query}" 👑\n\nI'm ready to craft exactly what you need! Specify your preferred format — **poem/ghazal, promotional ad copy, AI prompt, full article, working code, or translation** — and I'll generate it cleanly.${liveSetupHintEn}`;
}
