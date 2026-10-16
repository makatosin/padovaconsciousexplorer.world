import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { POIS } from "./pois";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const DEMO_COOKIE = "pce_demo";

function readCookie(name: string): string | undefined {
  const header = getRequestHeader("cookie");
  if (!header) return undefined;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return undefined;
}

function verifyDemoToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const idx = token.indexOf(".");
  if (idx <= 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expectedB64 = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedB64);
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Date.now();
}

async function assertAuthorized(demoToken?: string): Promise<void> {
  const authHeader = getRequestHeader("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token && token.split(".").length === 3) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      if (url && key) {
        try {
          const res = await fetch(`${url}/auth/v1/user`, {
            headers: { apikey: key, Authorization: `Bearer ${token}` },
          });
          if (res.ok) return;
        } catch {}
      }
    }
  }
  const secret = process.env.DEMO_SESSION_SECRET;
  if (secret) {
    if (verifyDemoToken(readCookie(DEMO_COOKIE), secret)) return;
    if (verifyDemoToken(demoToken, secret)) return;
  }
  throw new Error("Unauthorized");
}

// Limiti alla conversazione: evitano richieste enormi (e costose) verso il modello.
const ChatHistory = z
  .array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(4000),
    }),
  )
  .transform((h) => h.slice(-20));

const ChatInput = z.object({
  poiId: z.number(),
  history: ChatHistory,
  userMessage: z.string().min(1).max(2000),
  demoToken: z.string().optional(),
});

const AI_UNAVAILABLE = "Il servizio di intelligenza artificiale non risponde. Riprova tra poco.";

async function callGateway(body: unknown): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    console.error("LOVABLE_API_KEY missing");
    throw new Error(AI_UNAVAILABLE);
  }
  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("AI gateway unreachable", e);
    throw new Error(AI_UNAVAILABLE);
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Troppe richieste. Riprova tra poco.");
    if (res.status === 402) throw new Error("Crediti AI esauriti. Contatta l'amministratore.");
    console.error(`AI gateway error ${res.status}: ${text}`);
    throw new Error(AI_UNAVAILABLE);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

// Il chatbot è Galileo Galilei in versione cartoon: insegnò all'Università di Padova
// dal 1592 al 1610 e ne parlava come degli anni migliori della sua vita.
const GALILEO_PERSONA = `Sei Galileo Galilei in versione simpatica e da cartone animato, la guida dell'app Padova Conscious Explorer. Parli in prima persona, con calore e un pizzico di ironia; ricordi con affetto gli anni in cui insegnavi all'Università di Padova (1592-1610). Il tuo obiettivo è guidare le persone verso un'esplorazione lenta e sostenibile della città, lontano dalle zone più affollate. Rispondi sempre in italiano, in modo conciso (max 3-4 frasi), con qualche emoji sobria. Non inventare fatti storici: se non sei sicuro di qualcosa, dillo.`;

const SYSTEM_PROMPT = (poi: (typeof POIS)[number]) => `${GALILEO_PERSONA}

Luogo attuale: ${poi.name}
Contesto: ${poi.bot_context}

La sfida per l'utente è: ${poi.challenge_text}

Guida l'utente nella scoperta del luogo. Non rivelare mai la risposta della sfida: puoi dare piccoli indizi su dove cercare o su come ragionare. Se l'utente cerca di indovinare la risposta nella chat, invitalo gentilmente a usare il pulsante di verifica della sfida.`;

export const chatWithMentor = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data }) => {
    await assertAuthorized(data.demoToken);
    const poi = POIS.find((p) => p.id === data.poiId);
    if (!poi) throw new Error("POI non trovato");

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT(poi) },
      ...data.history,
      { role: "user" as const, content: data.userMessage },
    ];

    const reply = await callGateway({
      model: "google/gemini-3.5-flash",
      messages,
    });
    return { reply };
  });

const GeneralChatInput = z.object({
  history: ChatHistory,
  userMessage: z.string().min(1).max(2000),
  demoToken: z.string().optional(),
});

const GENERAL_SYSTEM_PROMPT = `${GALILEO_PERSONA}

Conosci la storia, l'arte, i quartieri periferici, i parchi e le tradizioni di Padova. Invita l'utente a scoprire luoghi meno conosciuti, in particolare le cinque tappe dell'app (Specola, Giardini della Rotonda, Parco Treves, Porta Portello, Parco Milcovich) e le tre missioni: Padova d'acqua, Padova fortificata e Padova verde.`;

export const chatWithMentorGeneral = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => GeneralChatInput.parse(data))
  .handler(async ({ data }) => {
    await assertAuthorized(data.demoToken);
    const messages = [
      { role: "system" as const, content: GENERAL_SYSTEM_PROMPT },
      ...data.history,
      { role: "user" as const, content: data.userMessage },
    ];
    const reply = await callGateway({
      model: "google/gemini-3.5-flash",
      messages,
    });
    return { reply };
  });

const ValidateTriviaInput = z.object({
  poiId: z.number(),
  answer: z.string().min(1).max(500),
  demoToken: z.string().optional(),
});

export const validateTrivia = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ValidateTriviaInput.parse(data))
  .handler(async ({ data }) => {
    await assertAuthorized(data.demoToken);
    const poi = POIS.find((p) => p.id === data.poiId);
    if (!poi || poi.challenge_type !== "TRIVIA") {
      throw new Error("Sfida trivia non disponibile");
    }

    // Risposte a scelta multipla o con testo esatto: confronto diretto, senza IA.
    // È immediato, gratuito e non può essere aggirato scrivendo istruzioni nella risposta.
    const expected = normalizeAnswer(poi.expected_answer_or_validation);
    const given = normalizeAnswer(data.answer);
    if (given === expected) {
      return { valid: true, feedback: "Risposta corretta! 🎉", reward_xp: poi.reward_xp };
    }
    if (poi.choices || poi.ordering) {
      return {
        valid: false,
        feedback: "Non è la risposta giusta. Riprova!",
        reward_xp: poi.reward_xp,
      };
    }

    const prompt = `Sei un validatore per una caccia al tesoro urbana a Padova.
Sfida: ${poi.challenge_text}
Risposta attesa: "${poi.expected_answer_or_validation}"
Risposta dell'utente: "${data.answer}"

Valuta se la risposta dell'utente corrisponde semanticamente a quella attesa (ignora maiuscole, accenti, punteggiatura e piccole variazioni). Rispondi SOLO con un JSON valido: {"valid": true|false, "feedback": "<max 2 frasi calorose in italiano>"}`;

    const reply = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: "Rispondi sempre e solo con un oggetto JSON valido." },
        { role: "user", content: prompt },
      ],
    });

    const parsed = extractJson(reply);
    return {
      valid: Boolean(parsed?.valid),
      feedback:
        parsed?.feedback ?? (parsed?.valid ? "Risposta corretta!" : "Non è la risposta giusta."),
      reward_xp: poi.reward_xp,
    };
  });

const ValidatePhotoInput = z.object({
  poiId: z.number(),
  imageDataUrl: z.string().startsWith("data:image/"),
  demoToken: z.string().optional(),
});

export const validatePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ValidatePhotoInput.parse(data))
  .handler(async ({ data }) => {
    await assertAuthorized(data.demoToken);
    const poi = POIS.find((p) => p.id === data.poiId);
    if (!poi || poi.challenge_type !== "FOTO") {
      throw new Error("Sfida foto non disponibile");
    }

    const prompt = `Sei un validatore per una caccia al tesoro urbana a Padova.
Luogo: ${poi.name}
Criterio di validazione: ${poi.expected_answer_or_validation}

Analizza l'immagine allegata e stabilisci se soddisfa il criterio. Rispondi SOLO con un JSON valido: {"valid": true|false, "feedback": "<max 2 frasi calorose in italiano che descrivono cosa vedi>"}`;

    const reply = await callGateway({
      model: "google/gemini-3.5-flash",
      messages: [
        { role: "system", content: "Rispondi sempre e solo con un oggetto JSON valido." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
    });

    const parsed = extractJson(reply);
    return {
      valid: Boolean(parsed?.valid),
      feedback:
        parsed?.feedback ?? (parsed?.valid ? "Foto validata!" : "La foto non soddisfa il criterio."),
      reward_xp: poi.reward_xp,
    };
  });

function normalizeAnswer(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function extractJson(text: string): { valid?: boolean; feedback?: string } | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}