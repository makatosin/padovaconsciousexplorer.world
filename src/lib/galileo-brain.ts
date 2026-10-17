import { MISSIONS, POIS, type Poi } from "./pois";

// Galileo senza intelligenza artificiale: risponde con testi scritti in anticipo, scelti
// sul telefono in base alle parole della domanda. Non consuma crediti e i messaggi non
// lasciano il dispositivo. I fatti sono solo quelli già presenti nelle schede delle tappe.

type Entry = {
  keywords: string[];
  answer: string;
};

export type Suggestion = { label: string; question: string };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const GREETING: Entry = {
  keywords: ["ciao", "salve", "buongiorno", "buonasera", "ehi", "hey"],
  answer: "Salve a te, esploratore! 🔭 Chiedimi pure: sono qui per guidarti verso la Padova meno affollata.",
};

const THANKS: Entry = {
  keywords: ["grazie", "gentile", "perfetto", "ottimo"],
  answer: "È un piacere! Come dicevo ai miei studenti: osservate con i vostri occhi. Buona esplorazione! ✨",
};

const GENERAL: Entry[] = [
  GREETING,
  THANKS,
  {
    keywords: ["chi sei", "galileo", "te stesso", "presentati", "tua storia", "professore", "insegnato"],
    answer:
      "Sono Galileo Galilei! Dal 1592 al 1610 ho insegnato all'Università di Padova: li ho sempre ricordati come gli anni migliori della mia vita. Qui ho puntato il cannocchiale verso il cielo… ora ti aiuto a puntarlo verso gli angoli nascosti della città. 🔭",
  },
  {
    keywords: ["perche", "app", "tappe", "scopo", "tesi", "folla", "affollat", "turisti", "overtourism"],
    answer:
      "Il centro e i grandi monumenti sono spesso pieni di gente, mentre altri luoghi bellissimi restano quasi vuoti. Questa app ti propone cinque di questi luoghi per distribuire meglio i visitatori e farti scoprire una Padova diversa. Sei sempre libero di scegliere tu dove andare! 🗺️",
  },
  {
    keywords: ["missione", "missioni", "consigli", "iniziare", "inizio", "partire", "da dove"],
    answer: `Ci sono tre missioni: ${MISSIONS.map((m) => `${m.emoji} ${m.title}`).join(", ")}. Puoi sceglierne una dalla legenda della mappa: se hai attivato la posizione, ti consiglio quella con la tappa più vicina a te.`,
  },
  {
    keywords: ["badge", "punti", "premio", "premi", "xp", "medaglia"],
    answer:
      "Ogni tappa completata vale 100 punti. Completando tutte le tappe di una missione ottieni il suo badge, e con tutte e tre le missioni diventi Esploratore Consapevole. Tocca la barra dei progressi nel Profilo per vederli! 🏅",
  },
  {
    keywords: ["sfida", "sbloccare", "sblocca", "geofence", "posizione", "gps", "vicino"],
    answer:
      "Quando arrivi vicino a una tappa la sua sfida si sblocca da sola: può essere un quiz, una sequenza da riordinare o una caccia al dettaglio. Se ti blocchi, tocca la lampadina e ti darò un aiutino. 💡",
  },
  {
    keywords: ["acqua", "piovego", "fiume", "canale", "porto"],
    answer: `💧 ${MISSIONS.find((m) => m.id === "acqua")?.description} Le tappe sono Porta Portello e i Giardini della Rotonda.`,
  },
  {
    keywords: ["mura", "fortificat", "difesa", "bastione", "torre", "ezzelino"],
    answer: `🏰 ${MISSIONS.find((m) => m.id === "mura")?.description} Le tappe sono la Specola, i Giardini della Rotonda e il Parco Treves.`,
  },
  {
    keywords: ["verde", "parco", "parchi", "alberi", "natura", "giardino"],
    answer: `🌳 ${MISSIONS.find((m) => m.id === "verde")?.description} Le tappe sono il Parco Treves e il Parco Milcovich.`,
  },
  {
    keywords: ["curiosita", "sorprendimi", "qualcosa di interessante", "fatto strano"],
    answer:
      "Lo sai che nel 1509 i padovani beffarono l'esercito che assediava la città esponendo una gatta viva su una pertica, sul bastione che oggi si chiama proprio “della Gatta”? Lo trovi ai Giardini della Rotonda! 🐈",
  },
  ...POIS.map((p) => ({
    keywords: poiKeywords(p),
    answer: `${firstParagraph(p)} Se vuoi saperne di più, apri la tappa ${p.name} sulla mappa e chiedimelo lì!`,
  })),
];

function poiKeywords(p: Poi): string[] {
  const extra: Record<number, string[]> = {
    1: ["specola", "osservatorio", "torlonga", "astronomia", "stelle"],
    2: ["rotonda", "gatta", "serbatoio", "terrazze"],
    3: ["treves", "jappelli", "romantico", "tempietto", "ghiacciaia"],
    4: ["portello", "burchiell", "porta"],
    5: ["milcovich", "arcella", "orti"],
  };
  return extra[p.id] ?? [normalize(p.name)];
}

function firstParagraph(p: Poi): string {
  return p.bot_context.split("\n")[0].trim();
}

// Una voce per ciascun paragrafo della scheda: le parole chiave sono quelle del
// paragrafo stesso, più i sinonimi delle domande più comuni.
function poiEntries(poi: Poi): Entry[] {
  const paragraphs = poi.bot_context
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const entries: Entry[] = paragraphs.map((text) => ({
    keywords: normalize(text)
      .split(" ")
      .filter((w) => w.length >= 5),
    answer: text,
  }));
  entries.push(
    {
      keywords: ["storia", "origini", "quando", "costruit", "nato", "nasce", "passato", "antico"],
      answer: paragraphs.slice(0, 2).join("\n"),
    },
    {
      keywords: ["cosa vedere", "vedo", "visitare", "oggi", "guardare", "cosa c"],
      answer: paragraphs[paragraphs.length - 1],
    },
    {
      keywords: ["curiosita", "sorprendimi", "interessante", "aneddoto", "leggenda"],
      answer: paragraphs[Math.min(1, paragraphs.length - 1)],
    },
    {
      keywords: ["indizio", "aiuto", "aiutino", "suggerimento", "risposta", "soluzione", "non trovo", "bloccato"],
      answer: poi.hints[0]
        ? `${poi.hints[0]} Se ti serve un altro aiutino, tocca la lampadina nella sfida. 💡`
        : "Tocca la lampadina nella sfida e ti darò un aiutino. 💡",
    },
  );
  if (poi.recommended_activity) {
    entries.push({
      keywords: ["evento", "eventi", "estate", "fare", "attivita", "sera"],
      answer: poi.recommended_activity,
    });
  }
  return entries;
}

function score(question: string, entry: Entry): number {
  let s = 0;
  for (const k of entry.keywords) {
    const key = normalize(k);
    if (!key) continue;
    if (question.includes(key)) s += key.includes(" ") ? 3 : 2;
  }
  return s;
}

function fallback(suggestions: Suggestion[]): string {
  return `Ahimè, su questo il mio cannocchiale non arriva! 🔭 Prova a chiedermi: ${suggestions
    .map((s) => `“${s.question}”`)
    .join(", ")}.`;
}

export const GENERAL_SUGGESTIONS: Suggestion[] = [
  { label: "Chi sei?", question: "Chi sei?" },
  { label: "Perché queste tappe?", question: "Perché queste tappe?" },
  { label: "Da quale missione parto?", question: "Da quale missione parto?" },
  { label: "Come funzionano i badge?", question: "Come funzionano i badge?" },
  { label: "Una curiosità", question: "Raccontami una curiosità" },
];

export const POI_SUGGESTIONS: Suggestion[] = [
  { label: "La storia", question: "Raccontami la storia" },
  { label: "Cosa vedo qui?", question: "Cosa vedo qui?" },
  { label: "Una curiosità", question: "Raccontami una curiosità" },
  { label: "Un indizio", question: "Mi dai un indizio?" },
];

export function answerGeneral(question: string): string {
  return pickAnswer(question, GENERAL, GENERAL_SUGGESTIONS);
}

export function answerAboutPoi(poi: Poi, question: string): string {
  return pickAnswer(question, [GREETING, THANKS, ...poiEntries(poi)], POI_SUGGESTIONS);
}

function pickAnswer(question: string, entries: Entry[], suggestions: Suggestion[]): string {
  const q = normalize(question);
  let best: Entry | null = null;
  let bestScore = 0;
  for (const e of entries) {
    const s = score(q, e);
    if (s > bestScore) {
      best = e;
      bestScore = s;
    }
  }
  return best ? best.answer : fallback(suggestions.slice(0, 3));
}
