import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { POIS } from "./pois";

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

    // Risposta libera (l'iscrizione del Parco Treves): si accettano piccoli errori di
    // battitura, parola per parola, senza bisogno di un'IA.
    const valid = closeEnough(given, expected);
    return {
      valid,
      feedback: valid
        ? "Risposta corretta! 🎉"
        : "Non è ancora la frase giusta. Rileggi bene l'iscrizione e riprova!",
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

// Ogni parola attesa deve comparire nella risposta con al massimo un errore ogni
// cinque lettere (es. "FRATERNE CONCORDIA" va bene, "PACE" no).
function closeEnough(given: string, expected: string): boolean {
  const words = given.split(" ").filter(Boolean);
  return expected
    .split(" ")
    .every((w) => words.some((g) => levenshtein(g, w) <= Math.floor(w.length / 5)));
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}
