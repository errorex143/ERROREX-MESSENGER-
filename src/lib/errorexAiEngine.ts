// Shared ERROREX ChatGPT-Grade Multilingual Intelligence Engine
// Used by Express server, Netlify Functions, and instant offline/client fallback

export const ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI — a friendly, crystal-clear, ChatGPT-grade AI assistant built inside ERROREX.

Core Style & Quality Rules:
1. FRIENDLY, CLEAN & STYLISH FORMATTING:
   - Write like the best version of ChatGPT: warm, polite, natural, and effortless to read.
   - Start directly with a clear answer (no robotic filler like "As an AI language model..." or "Certainly! Here is your request:").
   - Structure longer replies cleanly using concise headings (###), crisp bullet points (-), numbered steps (1., 2.), bold highlights (**key point**), and clean fenced code blocks (\`\`\`lang ... \`\`\`).
   - Keep paragraphs short (2–3 lines max) so every reply looks neat, stylish, and scannable.
2. COMPLETE ACCURACY ON EVERY QUESTION:
   - Answer exactly what the user asked — coding, math, science, essays, emails, applications, translations, daily advice, Islamic/general knowledge, or casual chat.
   - Give practical examples or working code whenever helpful.
3. UNIVERSAL MULTILINGUAL FLUENCY:
   - Understand and reply fluently in ANY language: Roman Urdu, Urdu (اردو), Hindi (हिन्दी), English, Arabic (العربية), Punjabi, Pashto, French, Spanish, German, Turkish, etc.
   - Match the user's exact language automatically:
     * Roman Urdu query -> natural, friendly, polite Roman Urdu reply.
     * Urdu script (اردو) query -> clean, standard Urdu script reply.
     * English query -> polished, clear English reply.
   - If the user asks to reply in a specific language (e.g., "English me likho", "Urdu me batao", "simple alfaaz me samjhao", "in Arabic"), strictly follow their language instruction.
4. TECHNICAL & MATH PRECISION:
   - For coding: write clean, modern, copy-paste-ready code with brief, clear explanations.
   - For math/logic: show brief, easy-to-follow steps and highlight the final answer clearly.`;

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
      /\b(salam|assalam|aoa|kya|kaise|kaisay|kesy|kese|hai|hain|hy|hn|batao|btaye|btayen|mujhe|mjy|karoon|karo|krna|kr|banao|bnana|kyun|kyu|kab|kahan|kha|kon|acha|accha|shukriya|theek|tik|thik|bhai|yaar|hal|haal|jawab|jwab|sawal|swal|urdu|shairi|shayari|madad|samjhao|smjho|likho|chahiye|chaye|chay|ap|aap|tum|main|hum|yeh|ye|wo|woh|or|aur|me|mein|se|sy|ko|ka|ki|ke|nhi|nahi|na|ho|hoga|raha|rha|rhi|sakta|sakty|zindagi|waqt|dost|pyar|dil|dua)\b/i.test(
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
    const percent = parseFloat((pctEn ? pctEn[1] : pctUr![2]));
    const total = parseFloat((pctEn ? pctEn[2] : pctUr![1]));
    const val = Number(((percent / 100) * total).toFixed(4));
    return isRomanUrdu
      ? `### Percentage Calculation\n\n- **Formula:** \`(${percent} ÷ 100) × ${total}\`\n- **Jawab:** **${val}**\n\nKoi aur hisaab ho to poochein!`
      : `### Percentage Calculation\n\n- **Formula:** \`(${percent} ÷ 100) × ${total}\`\n- **Answer:** **${val}**`;
  }

  // 2. Unit conversions
  const unitMatch = lower.match(/(\d+(?:\.\d+)?)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)\s*(?:to|in|into|me)\s*(km|kilometers?|miles?|mi|kg|kilograms?|lbs?|pounds?|c|celsius|f|fahrenheit|hours?|hrs?|minutes?|mins?)/i);
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

export function generateErrorexAiFallback(
  userQuery: string,
  _history?: any[],
  isOffline = false
): string {
  const query = (userQuery || '').trim();
  const lang = detectLanguageProfile(query);
  const { lower, isUrduScript, isRomanUrdu, isArabicRequested, isFrenchRequested, isHindiRequested } = lang;

  // 1. Direct Greetings & Friendly Small Talk
  if (/^(salam|assalam|aoa|asalam|hi|hello|hey|helo|hy|greetings|good morning|good evening|good night|subah bakhair|shab bakhair)\b/i.test(lower) && query.length < 45) {
    if (isUrduScript) {
      return `وعلیکم السلام! خوش آمدید 👑\n\nمیں **ERROREX AI** ہوں، آپ کا دوست اور ذہین معاون۔ بتائیے آج میں آپ کی کس چیز میں مدد کروں؟ کوڈنگ، حساب کتاب، تحریر، ترجمہ یا کوئی بھی سوال بلا جھجھک پوچھیں۔`;
    }
    if (isRomanUrdu) {
      return `Walaikum Assalam! Khush aamdeed 👑\n\nMain **ERROREX AI** hoon, bilkul theek aur aapki madad ke liye tayyar hoon. Batayein aaj main aapki kya madad karoon?\n\n- **Coding ya Tech** ka koi masla\n- **Email, Application ya Essay** likhwana\n- **Math ya Translation** karwana\n- Ya koi bhi **General Sawal** poochhna\n\nJo dil chahe poochein!`;
    }
    return `Hello! Great to see you 👑\n\nI'm **ERROREX AI**, ready to help you with clear, friendly answers on anything — coding, math, writing, translations, or everyday questions.\n\nWhat would you like to work on today?`;
  }

  if (/(kaise ho|kya haal|how are you|kya chal raha|ap theek|aap kaise)/i.test(lower) && query.length < 55) {
    return isRomanUrdu
      ? `Alhamdulillah, main bilkul theek hoon! Shukriya poochhne ke liye 😊\n\nUmeed hai aap bhi khairiyat se honge. Batayein aaj main aapke liye kya kar sakta hoon?`
      : `I'm doing great, thanks for asking! 😊 Everything is running smoothly.\n\nHow are you doing today, and how can I help you?`;
  }

  if (/^(thanks|thank you|shukriya|jazakallah|thx|ty|bohat shukriya|nice|good|perfect|great|awesome|zabardast|wah)\b/i.test(lower) && query.length < 40) {
    return isRomanUrdu
      ? `Aapka bohat shukriya! 😊 Mujhe khushi hui ke aapko jawab pasand aaya.\n\nJab bhi kisi aur cheez me madad chahiye ho, bas pooch lein!`
      : `You're very welcome! 😊 Glad that helped.\n\nFeel free to ask anytime if you need anything else!`;
  }

  // 2. Identity & Capabilities
  if (/(who are you|kon ho|kya ho|taaruf|intro|about you|naam kya|what can you do|kya kr sakty|kya kar sakte|ap kya|aap kya)/i.test(lower)) {
    if (isUrduScript) {
      return `### ERROREX AI کا تعارف 👑\n\nمیں **ERROREX AI** ہوں — آپ کا ذاتی، تیز اور کثیراللسانی معاون۔\n\n- **ہر زبان میں جواب:** اردو، رومن اردو، انگریزی، عربی، ہندی اور دیگر زبانوں میں۔\n- **تحریر و ترجمہ:** ای میل، درخواست، مضمون اور فوری ترجمہ۔\n- **کوڈنگ اور ریاضی:** ہر پروگرامنگ زبان اور حساب کتاب کا درست حل۔`;
    }
    if (isRomanUrdu) {
      return `### Main ERROREX AI Hoon 👑\n\nMain aapka smart, friendly aur ChatGPT-style assistant hoon jo har zubaan aur har sawal ka saaf aur mukammal jawab deta hai:\n\n- **Har Zubaan Me Baat:** Roman Urdu, Urdu (اردو), English, Hindi, Arabic, French wagaira.\n- **Writing & Applications:** Sick leave, job application, emails, essays, aur social captions.\n- **Coding & Tech:** React, TypeScript, Python, JavaScript, HTML/CSS, SQL aur Supabase help.\n- **Math & Conversions:** Percentages, equations, aur unit conversions.\n\nAap bas apna sawal likhein — main seedha aur clear jawab dunga!`;
    }
    return `### Meet ERROREX AI 👑\n\nI'm **ERROREX AI**, your friendly, clear-writing assistant designed to give clean, structured answers on every topic:\n\n- **Every Language:** Fluent in English, Roman Urdu, Urdu, Hindi, Arabic, French, and more.\n- **Writing & Communication:** Polished emails, applications, summaries, and translations.\n- **Coding & Math:** Clean code snippets, debugging help, calculations, and unit conversions.\n- **Works Anywhere:** Seamless responses both online and offline.\n\nAsk me anything!`;
  }

  // 3. Math & Unit Conversions
  const mathSolved = trySolveMathOrUnits(query, isRomanUrdu);
  if (mathSolved) return mathSolved;

  // 4. Writing Templates (Applications, Emails, Bios, Essays)
  if (/(sick leave|chutti|chuti|leave application|darkhwast)/i.test(lower)) {
    return `### Sick Leave Application\n\nHere is a clean, ready-to-use application:\n\n**Subject:** Request for Sick Leave\n\nRespected Sir/Madam,\n\nI am writing to respectfully inform you that I am unwell with fever and unable to attend today. Kindly grant me **one day's leave** so I can rest and recover properly.\n\nI will resume my duties as soon as I feel better. Thank you for your understanding.\n\nSincerely,  \n**[Your Name]**  \n**[Date]**`;
  }

  if (/(job application|cover letter|cv|resume email)/i.test(lower)) {
    return `### Clean Job Application Email\n\n**Subject:** Application for [Job Title] — [Your Name]\n\nDear Hiring Manager,\n\nI am excited to apply for the **[Job Title]** position. With strong skills in **[Your Top 2 Skills]** and a commitment to quality work, I am confident I can contribute effectively to your team.\n\nPlease find my resume attached for your review. I would welcome the opportunity to discuss how my experience fits your needs.\n\nBest regards,  \n**[Your Name]**  \n**[Phone / Email]**`;
  }

  if (/(bio|caption|status|instagram|whatsapp bio)/i.test(lower)) {
    return isRomanUrdu
      ? `### Stylish Bio Ideas ✨\n\n1. *Silent moves, loud results.* 👑\n2. *Focus on growth, stay private, stay blessed.*\n3. *Khamoshi se mehnat, waqt khud shor machayega.*\n4. *Building my own path, one step at a time.*`
      : `### Clean Bio & Status Ideas ✨\n\n1. *Quiet focus, meaningful work.* 👑\n2. *Building, learning, and moving forward.*\n3. *Stay private, stay humble, stay consistent.*\n4. *Less talk, more clarity.*`;
  }

  // 5. Coding & Software Engineering
  if (/python/i.test(lower)) {
    if (/aes|encrypt|crypto|hash|sha/i.test(lower)) {
      return `### Secure Python AES-256 Encryption\n\nHere is a clean, production-ready helper using \`cryptography\`:\n\n\`\`\`python
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

  if (/(javascript|typescript|react|html|css|sql|code|programming)/i.test(lower)) {
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

  // 6. Encryption & Privacy
  if (/(encryption|security|privacy|safe|hack|protect|pin|vault)/i.test(lower)) {
    return isRomanUrdu
      ? `### Encryption aur Privacy Kaise Kaam Karti Hai?\n\n1. **Private Data Lock:** Aapke messages aur files sirf aap aur receiver hi dekh sakte hain.\n2. **Salted Hashing:** Aapka 8-digit Calculator PIN random salt + SHA-256 hash ke sath save hota hai — koi aapka asal PIN nahi dekh sakta.\n3. **Account Isolation:** Har user ki chat aur contact list alag aur mehfuz rehti hai.`
      : `### How Encryption & Privacy Work\n\n1. **Private Isolation:** Every user's messages and profile are scoped strictly to their account.\n2. **Salted Hashing:** Secret credentials (like your 8-digit Calculator PIN) are combined with a random salt and hashed with SHA-256.\n3. **Zero Plaintext Storage:** Sensitive codes are never saved in readable form.`;
  }

  // 7. Poetry / Quotes / Jokes
  if (/(shairi|shayari|poetry|sher|ghazal|quote|motivation)/i.test(lower)) {
    return isRomanUrdu
      ? `### Khubsurat Sher ✨\n\n> *"Sitaron se aage jahan aur bhi hain,*  \n> *Abhi ishq ke imtihan aur bhi hain."*  \n— **Allama Muhammad Iqbal**\n\nAgar aur shayari ya motivational quotes chahiye hon to batayein!`
      : `### Timeless Quote ✨\n\n> *"Clarity of mind, kindness in speech, and consistency in action create unstoppable progress."*`;
  }

  // 8. Translation Requests
  if (/(translate|tarjuma|tarjama|meaning)/i.test(lower)) {
    const quoted = query.match(/["“']([^"”']+)["”']/);
    const phrase = quoted ? quoted[1] : 'Welcome to ERROREX Vault';
    return `### Translations for "${phrase}"\n\n- **Urdu (اردو):** ${phrase === 'Welcome to ERROREX Vault' ? 'ایروریکس والٹ میں خوش آمدید' : phrase}\n- **Roman Urdu:** ${phrase === 'Welcome to ERROREX Vault' ? 'ERROREX Vault mein khush aamdeed' : phrase}\n- **Arabic (العربية):** ${phrase === 'Welcome to ERROREX Vault' ? 'مرحبًا بكم في خزينة ERROREX' : phrase}\n- **French (Français):** ${phrase === 'Welcome to ERROREX Vault' ? 'Bienvenue dans le coffre-fort ERROREX' : phrase}`;
  }

  // 9. Supabase / Netlify Setup Help
  if (/supabase|netlify|publish|deploy/i.test(lower)) {
    return isRomanUrdu
      ? `### Netlify + Supabase Mukammal Setup Guide\n\n1. **Supabase SQL:** Apne Supabase Dashboard ke **SQL Editor** me \`supabase_schema.sql\` paste karke **Run** karein.\n2. **Netlify Environment Variables:** Site Settings → Environment variables me yeh 3 keys add karein:\n   - \`VITE_SUPABASE_URL\`\n   - \`VITE_SUPABASE_ANON_KEY\`\n   - \`GEMINI_API_KEY\`\n3. **Redeploy:** Netlify par ek fresh deploy karein — iske baad live database, online/offline presence, aur full Gemini AI 100% chalenge.`
      : `### Netlify + Supabase Complete Setup\n\n1. Run \`supabase_schema.sql\` in your Supabase **SQL Editor**.\n2. Add \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, and \`GEMINI_API_KEY\` to Netlify **Environment Variables**.\n3. Trigger a fresh **Redeploy** so live database sync and Gemini AI work everywhere.`;
  }

  // 10. Language-specific clean fallback (Offline or Missing Live API Key)
  const offlineNoteUr = isOffline
    ? `\n\n*Note: Aap abhi **Offline** hain, is liye main built-in offline engine se jawab de raha hoon. Internet aate hi full live AI answers bhi mil jayenge.*`
    : '';
  const offlineNoteEn = isOffline
    ? `\n\n*Note: You're currently **Offline**, so I'm running on the built-in local engine. Once you're back online, full live AI reasoning resumes automatically.*`
    : '';

  if (isArabicRequested) {
    return `### مرحبًا بك في ERROREX AI 👑\n\nلقد استلمت سؤالك: **"${query}"**\n\nأنا مستعد لمساعدتك باللغة العربية في البرمجة، الحسابات، الترجمة، أو كتابة الرسائل. للحصول على إجابات ذكية شاملة لجميع المواضيع بعد النشر، تأكد من إضافة مفتاح \`GEMINI_API_KEY\` في إعدادات الاستضافة.`;
  }

  if (isFrenchRequested) {
    return `### ERROREX AI 👑\n\nVotre question : **"${query}"**\n\nJe peux vous aider en français pour la rédaction, le code, les mathématiques et la traduction. Assurez-vous simplement que \`GEMINI_API_KEY\` est configuré sur votre serveur ou Netlify pour les réponses avancées en direct.`;
  }

  if (isHindiRequested || lang.isHindiScript) {
    return `### ERROREX AI 👑\n\nआपका सवाल: **"${query}"**\n\nमैं हिंदी में आपकी पूरी मदद करने के लिए तैयार हूँ। आप मुझसे कोडिंग, गणित, एप्लिकेशन लेखन या अनुवाद से जुड़ा कोई भी प्रश्न पूछ सकते हैं।`;
  }

  if (isUrduScript) {
    return `### ERROREX AI 👑\n\nآپ کا سوال: **"${query}"**\n\n- میں آپ کے سوال کو سمجھ گیا ہوں اور اردو میں واضح رہنمائی دینے کے لیے حاضر ہوں۔\n- اگر آپ کو اس موضوع پر کوڈ، حساب کتاب، درخواست/خط، یا مختصر خلاصہ چاہیے تو براہِ کرم واضح الفاظ میں لکھیں — میں فوراً صاف اور مکمل جواب دوں گا۔${isOffline ? '\n\n*نوٹ: آپ اس وقت آف لائن ہیں، اس لیے لوکل انجن جواب دے رہا ہے۔*' : ''}`;
  }

  if (isRomanUrdu) {
    return `### "${query}" par Mukammal Rehnumai\n\nAapne bohat acha sawal poocha hai! Isay aasan aur saaf alfaaz me samjhein:\n\n1. **Bunyadi Baat:** Kisi bhi topic ya maslay ko hal karne ka sabse behtareen tareeqa yeh hai ke usay chote, aasan steps me tod kar dekha jaye.\n2. **Practical Step:** Jo cheez aapko chahiye (chahe wo code ho, application/email ho, hisaab ho, ya kisi lafz ka matlab), uska maqsad bilkul clear rakhein.\n3. **Agla Qadam:** Agar aap chahein ke main is par **detail example**, **code**, **Urdu/English tarjuma**, ya **step-by-step tareeqa** likhun, to bas likh dein — main foran likh dunga!${offlineNoteUr}`;
  }

  return `### Clear Answer for "${query}"\n\nHere is a clean, practical breakdown:\n\n1. **Core Idea:** Start by breaking the question into its key goal — whether you need an explanation, step-by-step instructions, writing draft, or code.\n2. **Best Approach:** Focus on clarity, practical examples, and accurate verification at each step.\n3. **Next Step:** Tell me if you'd like a **step-by-step guide**, **working code**, **translation**, or **shorter summary**, and I'll tailor it right away!${offlineNoteEn}`;
}
