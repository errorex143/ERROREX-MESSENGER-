import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  ERROREX_AI_SYSTEM_INSTRUCTION,
  buildGeminiContents,
  detectLanguageProfile,
  generateErrorexAiFallback
} from './errorexAiEngine';

const FACTUAL_QUERY_REGEX =
  /\b(what is|who is|who was|when was|where is|explain|history of|biography|define|meaning of|tell me about|kya hai|kya hota|kon hai|kaun hai|kaun tha|bare me|baare me|history)\b/i;

const CREATIVE_PRIORITY_REGEX =
  /\b(shairi|shayari|poetry|sher|ghazal|gzal|nazm|poem|promote|promotion|marketing|ad copy|caption|hashtags|prompt|recipe|biryani|chai|joke|latifa|riddle|paheli|sick leave|job application|birthday|eid|wish|translate|tarjuma|python|react|sql|javascript|typescript|table of|pahara|%)\b/i;

const COMPLEX_REASONING_REGEX =
  /\b(python|javascript|typescript|react|sql|algorithm|debug|architecture|prove|calculus|physics|derive|code|function|component|error|bug|optimize|api|database|schema)\b/i;

function resolveGeminiApiKey(): string {
  const netlifyEnvKey =
    typeof (globalThis as any).Netlify?.env?.get === 'function'
      ? (globalThis as any).Netlify.env.get('GEMINI_API_KEY')
      : '';
  return String(process.env.GEMINI_API_KEY || netlifyEnvKey || '').trim();
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

async function fetchWikipediaSummary(
  query: string,
  wikiLang: 'en' | 'ur' | 'ar' | 'hi' = 'en'
): Promise<{ title: string; extract: string; description?: string; url?: string } | null> {
  const cleaned = query
    .replace(
      /\b(what|is|are|was|were|who|when|where|explain|history|of|define|meaning|tell|me|about|the|a|an|kya|hai|hy|hain|hota|hoti|kon|kaun|tha|thi|ke|ka|ki|mein|me|bare|baare|batao|btayen|samjhao|in|urdu|english|hindi|roman|arabic)\b/gi,
      ' '
    )
    .replace(/[?!.,:;"'()؟۔]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2200);

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
  if (FACTUAL_QUERY_REGEX.test(message) && !CREATIVE_PRIORITY_REGEX.test(message)) {
    const lang = detectLanguageProfile(message);
    const wikiLang =
      lang.targetScript === 'urdu_script'
        ? 'ur'
        : lang.targetScript === 'arabic'
        ? 'ar'
        : lang.targetScript === 'hindi'
        ? 'hi'
        : 'en';
    const wiki = (await fetchWikipediaSummary(message, wikiLang)) || (wikiLang !== 'en' ? await fetchWikipediaSummary(message, 'en') : null);
    if (wiki) {
      const reply = lang.isRomanUrdu
        ? `### ${wiki.title} ✨\n${wiki.description ? `*${wiki.description}*\n\n` : '\n'}**Mukammal Tafseel:**\n${wiki.extract}\n\n---\nAgar aapko is topic par **mazeed asaan alfaaz me summary**, **Urdu tarjuma**, ya **mazeed sawalat** ke jawab chahiye hon to zaroor poochein!`
        : `### ${wiki.title} ✨\n${wiki.description ? `*${wiki.description}*\n\n` : '\n'}${wiki.extract}\n\n---\nLet me know if you'd like a deeper breakdown, key bullet points, or a translation!`;

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
  history?: any[]
): Promise<{ reply: string; engine: 'gemini' | 'knowledge' | 'fallback' }> {
  const apiKey = resolveGeminiApiKey();

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
  onChunk: (chunk: string) => void
): Promise<{ reply: string; engine: 'gemini' | 'knowledge' | 'fallback' }> {
  const apiKey = resolveGeminiApiKey();

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
