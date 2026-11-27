import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  ERROREX_AI_SYSTEM_INSTRUCTION,
  buildGeminiContents,
  detectLanguageProfile,
  generateErrorexAiFallback
} from './errorexAiEngine';

const CASUAL_CHAT_REGEX =
  /^(?:hi+|hey+|helo+|hello+|hy+|hlo+|yo+|hiya|greetings|good\s+(?:morning|afternoon|evening|night)|morning|salam(?:\s+alaikum)?|assalam(?:\s*o\s*alaikum|\s*u\s*alaikum|\S*)|aoa|asalam(?:\s*o\s*alaikum|\S*)|walikum(?:\s*assalam|\s*salam)?|i.?m\s+(?:good|fine)|i\s+am\s+(?:good|fine)|doing\s+good|all\s+good|good|great|fine|theek|thik|theek\s+hu|theek\s+hoon|thik\s+hu|alhamdulillah|mast|badhiya|sab\s+theek|sab\s+set|ok+|okay+|kk|hmm+|hm+|acha+|accha+|ji+|han+|haan+|yes+|yup|yeah|no+|nahi+|nhi+|nope|nothing|nothing\s+much|kuch\s+nahi|kuch\s+nhi|kuch\s+khas\s+nahi|bye+|goodbye|see\s+you|allah\s+hafiz|khuda\s+hafiz|take\s+care|thanks+|thank\s+you+|shukriya|jazakallah|thx|ty|nice|perfect|awesome|zabardast|wah|مرحبا+|أهلا+|السلام\s+عليكم|नमस्ते|हाय|हेलो)(?:\s+(?:there|friend|dost|yaar|yar|bhai|bro|sis|sister|dear|errorex|ai|bot|buddy|ji|g))?[\s!.,؟?💖😊👍]*$/i;

const IDENTITY_OR_TIME_REGEX =
  /\b(who are you|kon ho|kya ho|what.?s your name|what is your name|tumhara naam|apka naam|aapka naam|who made you|kisne banaya|where are you from|kahan se ho|khana khaya|did you eat|what can you do|kya kr sakty|kya kar sakte|how are you|how r u|kaise ho|kesy ho|kaisay ho|kya haal|what day|today.?s date|aaj kya din|aaj konsa din|aaj date|what time|time kya hua|waqt kya)\b/i;

const CREATIVE_PRIORITY_REGEX =
  /\b(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|couplet|promote|promotion|marketing|advertise|ad copy|caption|hashtags|prompt|recipe|biryani|chai|joke|latifa|riddle|paheli|sick leave|job application|birthday|salgirah|eid|wish|python|react|sql|javascript|typescript|html|css|table of|pahara|quote|quotes|story|kahani)\b/i;

const TRANSLATION_REQUEST_REGEX =
  /\b(translate|tarjuma|tarjama|how do you say|how to say|meaning of)\b|(?:\binto\s+(?:urdu|arabic|hindi|english|french|spanish|german|turkish)\b)/i;

const FACTUAL_QUERY_REGEX =
  /\b(what is|what are|what was|what were|who is|who was|who invented|who discovered|who founded|when was|when did|where is|where are|why is|why are|why do|why does|how does|how do|how many|how much|how far|how tall|which is|capital of|population of|president of|prime minister of|currency of|founder of|explain|history of|biography|define|meaning of|difference between|tell me about|kya hai|kya hota|kya hoti|kon hai|kaun hai|kaun tha|kyun hota|kaise hota|kab hua|kahan hai|bare me|baare me|history)\b|[?؟]$/i;

const COMPLEX_REASONING_REGEX =
  /\b(python|javascript|typescript|react|sql|algorithm|debug|architecture|prove|calculus|physics|derive|code|function|component|error|bug|optimize|api|database|schema)\b/i;

const EMOTIONAL_OR_COMPANION_REGEX =
  /(alone|lonely|akela|akeli|akely|tanha|tanhai|koi nahi|koi nhi|someone to talk|talk to me|baat kro|baat karo|friend banoge|friend bnogy|mere dost|sad|udaas|udas|pareshan|bored|stress|tension|hurt|dil bhari|dil toota|mood off|mood kharab|rona|ro rahi|ro raha|crying|empty|miss someone|feeling down|low feel|اکیلا|اکیلی|تنہا|تنہائی|اداس|وحيد|حزين|अकेला|अकेली|तन्हा|उदास)/i;

function resolveGeminiApiKey(overrideKey?: string): string {
  const explicit = typeof overrideKey === 'string' ? overrideKey.trim() : '';
  if (explicit) return explicit;

  const procEnvKey =
    typeof process !== 'undefined' && process?.env
      ? process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
      : '';
  return String(procEnvKey).trim();
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function selectThinkingLevel(message: string): ThinkingLevel {
  return COMPLEX_REASONING_REGEX.test(message) ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW;
}

function detectSourceIsoLang(text: string): 'ur' | 'ar' | 'hi' | 'en' {
  if (/[\u0679\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06C2\u06CC\u06D2]/.test(text)) {
    return 'ur';
  }
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

async function fetchLiveTranslation(query: string): Promise<string | null> {
  const lower = query.toLowerCase();
  const quoted = query.match(/["“'«]([^"”'»]+)["”'»]/);
  const cleanedPhrase = quoted
    ? quoted[1].trim()
    : query
        .replace(
          /\b(translate|tarjuma|tarjama|meaning of|how do you say|how to say|convert|likh|likho|likhy|batao|karo|kardo|kar dein|kr do|into|to|in|from|urdu|roman urdu|alphabet|script|english|arabic|arabi|hindi|french|spanish|german|turkish|me|mein|m|main|mjy|mujhe|please|this|iska|isay|isko)\b/gi,
          ' '
        )
        .replace(/[?!.,؟۔&]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

  if (cleanedPhrase.length < 2) return null;

  const requestedTargets: Array<{ code: 'ur' | 'ar' | 'hi' | 'en' | 'fr' | 'es' | 'de' | 'tr'; label: string }> = [];
  if (/(urdu|اردو)/i.test(lower)) requestedTargets.push({ code: 'ur', label: 'Urdu (اردو)' });
  if (/(arabic|arabi|عربي|عربی)/i.test(lower)) requestedTargets.push({ code: 'ar', label: 'Arabic (العربية)' });
  if (/(hindi|हिंदी|हिन्दी)/i.test(lower)) requestedTargets.push({ code: 'hi', label: 'Hindi (हिन्दी)' });
  if (/(english)/i.test(lower)) requestedTargets.push({ code: 'en', label: 'English' });
  if (/(french|français)/i.test(lower)) requestedTargets.push({ code: 'fr', label: 'French (Français)' });
  if (/(spanish|español)/i.test(lower)) requestedTargets.push({ code: 'es', label: 'Spanish (Español)' });
  if (/(german|deutsch)/i.test(lower)) requestedTargets.push({ code: 'de', label: 'German (Deutsch)' });
  if (/(turkish|türkçe)/i.test(lower)) requestedTargets.push({ code: 'tr', label: 'Turkish (Türkçe)' });

  const srcLang = detectSourceIsoLang(cleanedPhrase);
  if (requestedTargets.length === 0) {
    requestedTargets.push(
      srcLang === 'en'
        ? { code: 'ur', label: 'Urdu (اردو)' }
        : { code: 'en', label: 'English' }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const results = await Promise.all(
      requestedTargets
        .filter(t => t.code !== srcLang)
        .slice(0, 4)
        .map(async target => {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanedPhrase)}&langpair=${srcLang}|${target.code}`;
          const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'ERROREX-Assistant/1.0' }
          });
          if (!res.ok) return null;
          const data = (await res.json()) as any;
          const matches = Array.isArray(data?.matches) ? data.matches : [];
          const mtMatch = matches.find(
            (m: any) =>
              (m?.['created-by'] === 'MT!' || m?.model === 'neural' || Number(m?.quality) >= 60) &&
              typeof m?.translation === 'string' &&
              m.translation.trim()
          );
          const cleanHighMatch = matches
            .filter((m: any) => Number(m?.quality) > 0 && typeof m?.translation === 'string' && m.translation.trim())
            .sort((a: any, b: any) => Number(b?.match || 0) - Number(a?.match || 0))[0];

          const translated = String(
            mtMatch?.translation || cleanHighMatch?.translation || data?.responseData?.translatedText || ''
          ).trim();
          if (!translated || translated.toLowerCase() === cleanedPhrase.toLowerCase()) return null;
          return { label: target.label, translated };
        })
    );

    const valid = results.filter((r): r is { label: string; translated: string } => Boolean(r));
    if (valid.length === 0) return null;

    if (valid.length === 1) {
      return `**${valid[0].label} Translation:**\n\n> ${valid[0].translated}`;
    }

    const lines = valid.map(v => `- **${v.label}:** ${v.translated}`).join('\n');
    return `### Translation for "${cleanedPhrase}" 🌐\n\n${lines}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchDuckDuckGoAnswer(
  query: string
): Promise<{ title: string; answer: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2200);

  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ERROREX-Assistant/1.0' }
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = String(data?.Answer || data?.AbstractText || data?.Definition || '').trim();
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

async function fetchWikipediaSummary(
  query: string,
  wikiLang: 'en' | 'ur' | 'ar' | 'hi' = 'en'
): Promise<{ title: string; extract: string; description?: string; url?: string } | null> {
  const cleaned = query
    .replace(
      /\b(what|is|are|was|were|who|when|where|why|how|which|explain|history|define|meaning|tell|me|about|the|a|an|kya|hai|hy|hain|hota|hoti|kon|kaun|tha|thi|ke|ka|ki|mein|me|bare|baare|batao|btayen|samjhao|in|urdu|english|hindi|roman|arabic)\b/gi,
      ' '
    )
    .replace(/\b(?:of|did|do|does)\b/gi, ' ')
    .replace(/[?!.,:;"'()؟۔]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2400);

  try {
    const searchUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleaned)}&limit=1&namespace=0&format=json`;
    const searchRes = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ERROREX-Assistant/1.0' }
    });
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as any[];
    const topTitle = Array.isArray(searchData?.[1]) ? searchData[1][0] : null;
    if (!topTitle) return null;

    const summaryUrl = `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
    const sumRes = await fetch(summaryUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ERROREX-Assistant/1.0' }
    });
    if (!sumRes.ok) return null;
    const sumData = (await sumRes.json()) as any;
    if (!sumData?.extract || sumData.type === 'disambiguation') return null;

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

async function resolveNonGeminiReply(
  message: string,
  history?: any[]
): Promise<{ reply: string; engine: 'knowledge' | 'fallback' }> {
  const trimmed = (message || '').trim();
  const lang = detectLanguageProfile(trimmed, history);

  // Guard: casual greetings, reactions, identity/time, emotional companion chats, and creative prompts stay warm & instant
  const isCasualOrCreative =
    CASUAL_CHAT_REGEX.test(trimmed) ||
    IDENTITY_OR_TIME_REGEX.test(trimmed) ||
    EMOTIONAL_OR_COMPANION_REGEX.test(trimmed) ||
    CREATIVE_PRIORITY_REGEX.test(trimmed);

  if (!isCasualOrCreative && TRANSLATION_REQUEST_REGEX.test(trimmed)) {
    const liveTranslation = await fetchLiveTranslation(trimmed);
    if (liveTranslation) {
      return { reply: liveTranslation, engine: 'knowledge' };
    }
  }

  if (
    !isCasualOrCreative &&
    !TRANSLATION_REQUEST_REGEX.test(trimmed) &&
    FACTUAL_QUERY_REGEX.test(trimmed) &&
    trimmed.split(/\s+/).length >= 2
  ) {
    const wikiLang =
      lang.targetScript === 'urdu_script'
        ? 'ur'
        : lang.targetScript === 'arabic'
        ? 'ar'
        : lang.targetScript === 'hindi'
        ? 'hi'
        : 'en';

    const [ddg, wikiPrimary] = await Promise.all([
      fetchDuckDuckGoAnswer(trimmed),
      fetchWikipediaSummary(trimmed, wikiLang)
    ]);

    if (ddg && ddg.answer) {
      const reply = lang.isRomanUrdu
        ? `**${ddg.title}:**\n${ddg.answer}`
        : `**${ddg.title}**\n\n${ddg.answer}`;
      return { reply, engine: 'knowledge' };
    }

    const wiki =
      wikiPrimary || (wikiLang !== 'en' ? await fetchWikipediaSummary(trimmed, 'en') : null);
    if (wiki) {
      const reply = lang.isRomanUrdu
        ? `### ${wiki.title} ✨\n${wiki.description ? `*${wiki.description}*\n\n` : '\n'}${wiki.extract}`
        : `### ${wiki.title} ✨\n${wiki.description ? `*${wiki.description}*\n\n` : '\n'}${wiki.extract}`;
      return { reply, engine: 'knowledge' };
    }
  }

  return {
    reply: generateErrorexAiFallback(message, history),
    engine: 'fallback'
  };
}

export async function generateServerAiReply(
  message: string,
  history?: any[],
  apiKeyOverride?: string
): Promise<{ reply: string; engine: 'gemini' | 'knowledge' | 'fallback' }> {
  const apiKey = resolveGeminiApiKey(apiKeyOverride);

  if (apiKey) {
    const ai = createGeminiClient(apiKey);
    const contents = buildGeminiContents(message, history);
    const thinkingLevel = selectThinkingLevel(message);
    const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];

    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION,
              ...(model === 'gemini-4-hydrogen'
                ? { thinkingConfig: { thinkingLevel } }
                : {})
            }
          });

          if (response?.text && response.text.trim()) {
            return { reply: response.text.trim(), engine: 'gemini' };
          }
        } catch (err: any) {
          console.warn(`[ERROREX AI] ${model} attempt ${attempt + 1}:`, err?.message || err);
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }
      }
    }
  }

  return resolveNonGeminiReply(message, history);
}

export async function generateServerAiStream(
  message: string,
  history: any[] | undefined,
  onChunk: (chunk: string) => void,
  apiKeyOverride?: string
): Promise<{ reply: string; engine: 'gemini' | 'knowledge' | 'fallback' }> {
  const apiKey = resolveGeminiApiKey(apiKeyOverride);

  if (apiKey) {
    const ai = createGeminiClient(apiKey);
    const contents = buildGeminiContents(message, history);
    const thinkingLevel = selectThinkingLevel(message);
    const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];

    for (const model of modelsToTry) {
      let fullText = '';
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: ERROREX_AI_SYSTEM_INSTRUCTION,
            ...(model === 'gemini-4-hydrogen'
              ? { thinkingConfig: { thinkingLevel } }
              : {})
          }
        });

        for await (const chunk of stream) {
          const textPart = chunk?.text;
          if (typeof textPart === 'string' && textPart.length > 0) {
            fullText += textPart;
            onChunk(textPart);
          }
        }

        if (fullText.trim()) {
          return { reply: fullText.trim(), engine: 'gemini' };
        }
      } catch (err: any) {
        console.warn(`[ERROREX AI Stream] ${model}:`, err?.message || err);
        if (fullText.trim()) {
          return { reply: fullText.trim(), engine: 'gemini' };
        }
      }
    }
  }

  const fallback = await resolveNonGeminiReply(message, history);
  onChunk(fallback.reply);
  return fallback;
}
