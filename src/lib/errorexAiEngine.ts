// Shared ERROREX Multilingual Intelligence Engine
// Used by Express server, Netlify Functions, and seamless client fallback

export const ERROREX_AI_SYSTEM_INSTRUCTION = `You are ERROREX AI, an elite, highly intelligent AI assistant (ChatGPT-grade).
Rules you must strictly follow:
1. LEAN, CRISP, UNIQUE WRITING: Provide clean, direct, and unique responses. No fluff, no robotic filler, no generic disclaimers ("As an AI...", "Here is what you asked for:"). Answer precisely and directly from the very first word.
2. STRICT ACCURACY: Answer exactly what was asked. Keep explanations focused, logical, and actionable.
3. MULTILINGUAL MASTERY: Understand every language fluently (Roman Urdu, Urdu / اردو, Hindi, English, Arabic, Pashto, Punjabi, French, Spanish, German, Turkish, Chinese, etc.).
4. EXACT LANGUAGE FIDELITY:
   - If the user asks in Roman Urdu, respond naturally, elegantly and fluently in Roman Urdu.
   - If the user asks in Urdu script (اردو), reply in proper, clear Urdu script.
   - If the user requests a specific language (e.g. "English me batao", "Urdu me samjhao", "in French", "in Arabic", "reply in Hindi"), ALWAYS deliver the full answer in that exact requested language.
5. TECHNICAL & PROGRAMMING EXCELLENCE: Give clean, modern, production-grade code with syntax highlighting and direct explanations.
6. MATHEMATICS & REASONING: Show concise, step-by-step logic and the exact answer without fluff.`;

export function generateErrorexAiFallback(userQuery: string, _history?: any[]): string {
  const query = (userQuery || '').trim();
  const lower = query.toLowerCase();

  const isUrduScript = /[\u0600-\u06FF]/.test(query);
  const isUrduRequested = /(urdu me|urdu mein|اردو میں|in urdu)/i.test(lower);
  const isEnglishRequested = /(english me|english mein|in english)/i.test(lower);
  const isHindiRequested = /(hindi me|hindi mein|in hindi)/i.test(lower);
  const isArabicRequested = /(arabic me|arabic mein|in arabic)/i.test(lower);
  const isFrenchRequested = /(french me|french mein|in french)/i.test(lower);

  const isUrduRoman =
    !isEnglishRequested &&
    !isHindiRequested &&
    !isArabicRequested &&
    !isFrenchRequested &&
    (isUrduRequested ||
      /(salam|kya|kaise|kaisay|hai|hain|batao|mujhe|karoon|karo|banao|kyun|kyu|kab|kahan|kon|acha|shukriya|theek|bhai|yaar|hal|jawab|sawal|urdu|shairi|sunao|madad|samjhao|likho|krna)/i.test(
        lower
      ));

  const isIntro = /(who are you|kon ho|kya ho|taaruf|intro|about you|identity|naam kya|what is errorex|errorex kya)/i.test(lower);
  const isGreeting = /^(salam|assalam|aoa|hi|hello|hey|hey there|greetings|morning|evening|kya hal)/i.test(lower);

  if (isUrduScript) {
    if (isGreeting && query.length < 30) {
      return `👑 **وعلیکم السلام!**\n\nمیں **ERROREX AI** ہوں۔ بتائیے آپ کس موضوع پر مدد چاہتے ہیں؟ کوڈنگ، ریاضی، ترجمہ یا کوئی بھی سوال پوچھیں۔`;
    }
    if (isIntro) {
      return `👑 **ERROREX AI**\n\nمیں **ERROREX AI** ہوں — آپ کا تیز، درست اور کثیراللسانی معاون۔ میں اردو، رومن اردو، انگریزی، عربی اور دیگر تمام زبانوں میں براہِ راست اور واضح جوابات دیتا ہوں۔`;
    }
  }

  if (isIntro) {
    if (isUrduRoman) {
      return `👑 **ERROREX AI**

Main **ERROREX AI** hoon — aapka fast, accurate aur multilingual smart assistant.
- **Har Zubaan Me Jawab:** Roman Urdu, Urdu (اردو), English, Hindi, Arabic, French wagaira me wahi jawab deta hoon jis zubaan me aap poochein.
- **Coding & Tech:** React, TypeScript, Python, Node.js, Supabase aur SQL ke direct solutions.
- **Math & Translation:** Fori calculations aur accurate translations.

Apna agla sawal poochein!`;
    }

    return `👑 **ERROREX AI**

I am **ERROREX AI**, your direct, multilingual assistant inside ERROREX.
- **Multilingual Fluency:** Fluent in English, Roman Urdu, Urdu, Hindi, Arabic, French, and more.
- **Engineering & Math:** Clean code, architecture guidance, and exact step-by-step calculations.

Ask any question to begin.`;
  }

  if (isGreeting && query.length < 25) {
    if (isUrduRoman) {
      return `👑 **Walaikum Assalam!** Main ERROREX AI hoon. Batayein aaj main aapki kya madad kar sakta hoon?`;
    }
    return `👑 **Hello!** I am ERROREX AI. How can I help you today?`;
  }

  // Math evaluation
  const mathMatch = query.match(/(\d+[\s\+\-\*\/\%\^x\÷\.]+\d+[\s\+\-\*\/\%\^x\÷\.\d]*)/i);
  if (mathMatch || /calculate|math|multiply|divide|percentage|hisaab/i.test(lower)) {
    try {
      const sanitized = (mathMatch ? mathMatch[1] : query)
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/x/g, '*')
        .replace(/[^0-9\+\-\*\/\.\(\)\%]/g, '');

      if (sanitized.length > 0) {
        const result = Function(`"use strict"; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result)) {
          return isUrduRoman
            ? `**Result:** \`${sanitized}\` = **${result}**`
            : `**Result:** \`${sanitized}\` = **${result}**`;
        }
      }
    } catch {
      // continue
    }
  }

  // Python AES / coding
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
${isUrduRoman ? 'Agar aapko kisi specific Python task ka code chahiye to detail batayein.' : 'Share the exact Python task you need and I will write the complete function.'}`;
  }

  // Supabase / Netlify / DB
  if (/supabase|postgres|sql|netlify/i.test(lower)) {
    return isUrduRoman
      ? `**Supabase + Netlify Sync Checklist:**
1. Supabase Dashboard -> SQL Editor mein \`supabase_schema.sql\` run karein.
2. Netlify Site Settings -> Environment Variables mein \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, aur \`GEMINI_API_KEY\` add karein.
3. Site ko redeploy karein — har naya user automatic \`user_profiles\` aur Social Circle mein sync ho jayega.`
      : `**Supabase + Netlify Setup:**
1. Run \`supabase_schema.sql\` in your Supabase SQL Editor.
2. Add \`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, and \`GEMINI_API_KEY\` in Netlify Environment Variables.
3. Trigger a fresh deploy so live auth, profiles, and AI sync automatically.`;
  }

  // Poetry
  if (/shairi|shayari|poetry|sher|ghazal/i.test(lower)) {
    return `*"Sitāroñ se āge jahāñ aur bhī haiñ,*
*Abhī ishq ke imtihāñ aur bhī haiñ."*
— **Allama Muhammad Iqbal**`;
  }

  // Translation
  if (/translate|tarjuma/i.test(lower)) {
    const quoted = query.match(/["“']([^"”']+)["”']/);
    const phrase = quoted ? quoted[1] : 'Welcome to ERROREX Vault';
    return `**Translations for "${phrase}":**
- **Urdu:** "${phrase === 'Welcome to ERROREX Vault' ? 'ایرور ایکس والٹ میں خوش آمدید' : phrase}"
- **Arabic:** "${phrase === 'Welcome to ERROREX Vault' ? 'مرحبًا بكم في خزنة ERROREX' : phrase}"
- **French:** "${phrase === 'Welcome to ERROREX Vault' ? 'Bienvenue dans le coffre ERROREX' : phrase}"`;
  }

  if (isArabicRequested) {
    return `👑 **ERROREX AI**\n\nتم استلام سؤالك: **"${query}"**\n\nأفهم طلبك تمامًا. للحصول على إجابات ذكاء اصطناعي كاملة ومفصلة لجميع الأسئلة باللغة العربية، تأكد من تفعيل مفتاح \`GEMINI_API_KEY\` في إعدادات الخادم أو Netlify.`;
  }

  if (isFrenchRequested) {
    return `👑 **ERROREX AI**\n\nVotre question : **"${query}"**\n\nJe comprends votre demande en français. Pour des réponses complètes en temps réel, assurez-vous que \`GEMINI_API_KEY\` est configuré sur votre serveur ou Netlify.`;
  }

  if (isHindiRequested) {
    return `👑 **ERROREX AI**\n\nआपका सवाल: **"${query}"**\n\nमैं हिंदी में आपकी मदद के लिए तैयार हूँ। कृपया अपना पूरा प्रश्न या विषय बताएं ताकि मैं सटीक उत्तर दे सकूँ।`;
  }

  if (isUrduScript) {
    return `👑 **ERROREX AI**\n\nآپ کا سوال: **"${query}"**\n\nبراہِ کرم مزید واضح تفصیل لکھیں یا حساب کتاب، کوڈنگ یا ترجمے سے متعلق پوچھیں — میں فوراً درست جواب دوں گا۔`;
  }

  if (isUrduRoman) {
    return `👑 **ERROREX AI**

Aapne poocha: **"${query}"**

Main aapki baat samajh gaya hoon. Agar aap is par tafseeli code, hisaab-kitab, ya kisi specific zubaan mein jawab chahte hain to seedha likhein (maslan: *"English me batao"*, *"Python code do"*, ya *"250 * 48 calculate karo"*).`;
  }

  return `👑 **ERROREX AI**

Received: **"${query}"**

Ask any specific coding, math, translation, or technical question—or specify your preferred output language—and I will give you a concise, direct answer.`;
}
