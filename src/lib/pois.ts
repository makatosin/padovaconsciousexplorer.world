export type Poi = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  geofence_radius_m: number;
  bot_context: string;
  challenge_type: "TRIVIA" | "FOTO" | "AUDIO" | "CACCIA";
  challenge_text: string;
  expected_answer_or_validation: string;
  reward_xp: number;
  recommended_activity: string | null;
  audio_narration?: string;
  ordering?: {
    prompt: string;
    items: { key: string; label: string }[];
  };
  choices?: { key: string; label: string }[];
  // Caccia al dettaglio: indizi da risolvere uno alla volta guardando il luogo dal vivo.
  // Ogni passo ha le risposte accettate, un aiutino e la curiosità che Galileo racconta
  // quando il dettaglio è trovato.
  hunt?: { clue: string; answers: string[]; hint: string; found: string }[];
  // Aiutini di Galileo, dal più vago al più esplicito: compaiono con il pulsante
  // lampadina, dopo una risposta sbagliata o se la sfida resta aperta a lungo.
  hints: string[];
  // A tappa completata Galileo consiglia, con un fumetto e dei link, un approfondimento
  // o un evento del luogo (gli stessi di recommended_activity, detti a modo suo).
  galileo_tip?: { text: string; links: { label: string; url: string }[] };
};

export type Badge = {
  id: string;
  title: string;
  description: string;
  art: string;
  unlock: (visited: number[]) => boolean;
};

export const POIS: Poi[] = [
  {
    id: 1,
    name: "Specola",
    latitude: 45.40203,
    longitude: 11.86852,
    geofence_radius_m: 150,
    bot_context:
      "🔭 Scopri La Specola di Padova! Da cupa prigione medievale a tempio dell'astronomia: ecco la storia di una delle torri più affascinanti della città.\n🏰 Un passato oscuro: Alta 50 metri (preparati a salire 252 gradini!), nasce come Torlonga, un'antica torre difensiva tristemente nota per essere stata la prigione e sala di tortura del tiranno Ezzelino III.\n🌟 La rinascita: Nel 1761, grazie al Senato Veneziano e all'abate Toaldo, la torre rinasce come Osservatorio Astronomico. Curiosità: nel 1773 venne installato qui il primo parafulmine di tutta la Repubblica di Venezia!\n✈️ Il Novecento: Usata come punto di avvistamento aereo durante la Prima Guerra Mondiale, ha guardato le stelle fino al 1942, quando le osservazioni furono trasferite nella sede di Asiago.\n🏛️ Cosa vedere oggi: Attuale polo di ricerca INAF, dal 1994 la torre ospita il suggestivo Museo La Specola.",
    challenge_type: "TRIVIA",
    challenge_text:
      "Riordina la macchina del tempo. Rimetti in ordine questi eventi dal più antico al più recente, poi verifica la sequenza.",
    expected_answer_or_validation: "C,D,A,B",
    ordering: {
      prompt: "Trascina o usa le frecce per ordinare dal più antico al più recente.",
      items: [
        { key: "A", label: "Chiusura delle attività di osservazione celeste e trasferimento ad Asiago." },
        { key: "B", label: "L'inaugurazione dell'intero edificio come \"Museo La Specola\"." },
        { key: "C", label: "L'utilizzo della torre come prigione da parte di Ezzelino III." },
        { key: "D", label: "L'installazione del primo parafulmine pubblico della Repubblica di Venezia." },
      ],
    },
    hints: [
      "Pensa a come è cambiata la torre nei secoli: prima è servita per punire, poi per guardare il cielo, e solo alla fine è diventata un museo.",
      "Ezzelino III visse nel Duecento, il parafulmine arrivò nel 1773 e le osservazioni si spostarono ad Asiago nel 1942. Il museo è la cosa più recente!",
    ],
    reward_xp: 100,
    galileo_tip: {
      text: "Ho un debole per questa torre, lo ammetto! Da maggio a ottobre il Museo La Specola apre anche di sera, per esplorare l'osservatorio sotto le stelle. Ai miei tempi il cannocchiale dovevo costruirmelo da solo: tu trovi già tutto pronto! 🔭",
      links: [{ label: "Visite serali alla Specola", url: "https://www.beniculturali.inaf.it/eventi/visite-serali-2026/" }],
    },
    recommended_activity:
      "🌌 Visite Serali al Museo La Specola: da maggio a ottobre puoi esplorare l'antico Osservatorio Astronomico sotto le stelle. https://www.beniculturali.inaf.it/eventi/visite-serali-2026/",
  },
  {
    id: 2,
    name: "Giardini della Rotonda",
    latitude: 45.41671,
    longitude: 11.87442,
    geofence_radius_m: 150,
    bot_context:
      "Un suggestivo parco a terrazze a ridosso delle mura cinquecentesche di Padova, dove natura, ingegneria e storia si fondono.\n🐈 La Leggenda della Gatta: sorge sul \"Bastione della Gatta\". Il nome nasce da una beffa del 1509 ai danni delle truppe imperiali che assediavano la città. Come andò? Lo scopri nella sfida qui sotto.\n💧 Il Serbatoio Monumentale: al centro dell'area c'è \"La Rotonda\", un imponente serbatoio idrico cilindrico alto 36 metri completato nel 1925, uno dei primi esempi di cemento armato a Padova.\n🕯️ Un Luogo della Memoria: alla base riposa una cappella in memoria di 96 cittadini uccisi da una bomba nel 1916 proprio in questo luogo.\n🌺 Design Liberty e Déco: cinque terrazze con fontane, ninfee, aiuole geometriche e cancelli in ferro battuto.",
    challenge_type: "TRIVIA",
    challenge_text:
      "🐈 La beffa del 1509. Sei sul Bastione della Gatta: durante l'assedio delle truppe imperiali, come si presero gioco del nemico i padovani, dando il nome a questo bastione?",
    expected_answer_or_validation: "C",
    choices: [
      { key: "A", label: "Liberarono cento gatti nell'accampamento nemico" },
      { key: "B", label: "Dipinsero una gatta gigante sulle mura" },
      { key: "C", label: "Esposero una gatta viva su una pertica" },
    ],
    hints: [
      "Il nome del bastione è già un indizio: la protagonista è una sola gatta, non un esercito di gatti.",
      "I padovani la issarono in alto, ben visibile dal campo nemico, in cima a un lungo bastone.",
    ],
    reward_xp: 100,
    galileo_tip: {
      text: "Ben fatto! Se vuoi tutta la storia della beffa, te la racconta il sito delle Mura di Padova. E un consiglio da amico: d'estate torna qui di sera, perché in cima al bastione c'è il cinema all'aperto. Io guardavo le stelle, tu goditi un bel film! 🎬",
      links: [
        { label: "Il Bastione della Gatta", url: "https://www.muradipadova.it/le-mura-rinascimentali/i-bastioni/bastione-della-gatta" },
        { label: "Cinema sul bastione", url: "https://www.cuc-cinemauno.it/" },
      ],
    },
    recommended_activity:
      "🎬 In estate la sommità del bastione si trasforma in un cinema all'aperto. https://www.cuc-cinemauno.it/",
  },
  {
    id: 3,
    name: "Parco Treves",
    latitude: 45.40345,
    longitude: 11.88463,
    geofence_radius_m: 100,
    bot_context:
      "Un angolo nascosto di Padova, ideale per godersi la città lontano dalla folla.\n🕰️ Le Origini: progettato tra il 1829 e il 1835 da Giuseppe Jappelli. Nato come orto botanico privato, è stato il primo parco padovano in stile romantico all'inglese.\n📍 Dove si trova: ingresso in via Bartolomeo d'Alviano, incastonato lungo le mura cinquecentesche.\n🌳 L'Atmosfera: labirinto di sentieri irregolari, saliscendi, ponticelli e viste inaspettate.\n✨ La Rinascita: quasi distrutto durante la Seconda Guerra Mondiale, restaurato tra il 1996 e il 2002.\n🏛️ Cosa vedere oggi: alberi rari, rose antiche, il Tempietto neoclassico e l'antica ghiacciaia.",
    challenge_type: "TRIVIA",
    challenge_text:
      "Trova la frase e risolvi l'enigma: 'Procul, o procul este profani!' (Lontani, restate lontani, o profani!). Qualcuno ha lasciato questo antico monito in questo luogo... ma per chi sa guardare, c'è una risposta che riporta la pace. Esplora il parco e cerca un'iscrizione nascosta tra le pietre per completare il messaggio.",
    expected_answer_or_validation: "FRATERNAE CONCORDIAE",
    hints: [
      "Attraversa i ponticelli e dirigiti verso il teatro antico: l'iscrizione è incisa nella pietra, lì vicino. Guarda bene in basso!",
      "La risposta è in latino ed è fatta di due parole: la prima parla di fratelli, la seconda di armonia.",
      "Comincia con FRATERNAE… ora ti manca solo la parola che significa “concordia”!",
    ],
    reward_xp: 100,
    recommended_activity: null,
  },
  {
    id: 4,
    name: "Porta Portello",
    latitude: 45.40971,
    longitude: 11.89266,
    geofence_radius_m: 60,
    bot_context:
      "🚣 Benvenuto a Porta Portello, la porta d'acqua di Padova!\nRealizzata nel 1518 in magnifica pietra d'Istria, non era un semplice passaggio ma il porto principale della città. Da qui partivano e arrivavano i Burchielli, le tipiche imbarcazioni veneziane che viaggiavano lungo il canale Piovego verso la Laguna di Venezia.\nImmagina questo luogo nel '700: un andirivieni di barcaioli, nobili in viaggio, mercanti lungo gli argini.",
    challenge_type: "CACCIA",
    challenge_text:
      "🔍 Caccia al dettaglio. Porta Portello nasconde particolari che quasi nessuno nota. Trova dal vivo i tre dettagli che ti indica Galileo e scrivi la risposta: si parte dal ponte sul canale.",
    expected_answer_or_validation: "Caccia completata",
    hunt: [
      {
        clue: "🕰️ Dal ponte alza lo sguardo alla torretta. L'orologio ha due giri di numeri: romani per le ore e arabi per i minuti. Qual è il numero arabo più alto?",
        answers: ["60", "SESSANTA"],
        hint: "Segui i numeri arabi sul bordo esterno, di cinque in cinque: l'ultimo sta proprio in cima, accanto al XII.",
        found: "Esatto, 60! Un quadrante con i minuti scritti per esteso: io ho passato la vita a misurare il tempo con i pendoli, questo orologio lo approvo. ⏱️",
      },
      {
        clue: "🔤 Sopra l'arco, due parole latine incise danno alla porta il suo nome ufficiale. Scrivi la prima.",
        answers: ["OMNIVM", "OMNIUM"],
        hint: "Le lettere sono tutte maiuscole. Occhio: i Romani scrivevano la U come una V.",
        found: "OMNIVM SANCTORVM, cioè \"di Ognissanti\": il nome ufficiale è Porta Ognissanti. Portello, il \"porticciolo\", è il nome che le ha dato il porto sul Piovego.",
      },
      {
        clue: "🚶 Ora attraversa l'arco ed entra in città: sei sul lato sud. Voltati verso la porta. Dal lato dell'acqua c'era una cosa che sul lato sud manca: che cosa?",
        answers: ["OROLOGIO", "QUADRANTE"],
        hint: "Alza lo sguardo alla torretta: da qui vedi la campana, ma non puoi sapere che ore sono.",
        found: "Proprio così: l'orologio guarda solo verso il canale, verso chi arrivava in barca. Già che sei qui, osserva i due fregi ai lati dell'arco: in quello di destra due faccine ti fanno la smorfia dall'alto. 😄",
      },
    ],
    hints: [],
    reward_xp: 100,
    galileo_tip: {
      text: "D'estate su queste gradinate arriva il River Film Festival, con lo schermo che galleggia sull'acqua. Un cinema sul canale: nemmeno con il mio cannocchiale avrei visto tanto lontano! 🎬",
      links: [{ label: "River Film Festival", url: "https://riverfilmfestival.org/" }],
    },
    recommended_activity:
      "🎬 In estate le storiche gradinate di Porta Portello ospitano il River Film Festival, con uno schermo galleggiante sull'acqua. https://riverfilmfestival.org/",
  },
  {
    id: 5,
    name: "Parco Milcovich",
    latitude: 45.41899,
    longitude: 11.88846,
    geofence_radius_m: 200,
    bot_context:
      "Benvenuto al Parco Milcovich! Quasi 40.000 m² di verde, vero cuore dell'Arcella.\nUn tempo qui c'erano solo campi e fabbriche, oggi è un punto di ritrovo vivo per il quartiere, con orti condivisi, aree per lo sport e tantissimi alberi. Oltre a essere un posto perfetto per rilassarsi lontano dalla folla del centro, il parco gioca un ruolo fondamentale per rendere la città più fresca e sostenibile.",
    challenge_type: "TRIVIA",
    challenge_text:
      "🌡️ Il potere refrigerante del verde. In una calda giornata estiva a Padova, di quanti gradi centigradi può essere più bassa la temperatura percepita sotto la chioma degli alberi di questo parco rispetto all'asfalto delle strade circostanti?",
    expected_answer_or_validation: "B",
    choices: [
      { key: "A", label: "Circa 1-2 °C" },
      { key: "B", label: "Fino a 4-8 °C" },
      { key: "C", label: "Non c'è alcuna differenza" },
    ],
    hints: [
      "Gli alberi non fanno solo ombra: traspirano acqua e rinfrescano l'aria attorno a loro, come piccoli condizionatori naturali.",
      "Pensa a quanto scotta l'asfalto in agosto: la differenza con l'ombra degli alberi è di parecchi gradi, non di uno o due.",
    ],
    reward_xp: 100,
    galileo_tip: {
      text: "Nella bella stagione questo parco si accende con Arcella Bella: musica dal vivo, cinema all'aperto, street food e mercatini. Se passi di sera, salutami le stelle! ✨",
      links: [{ label: "Arcella Bella", url: "https://www.arcellabella.com/" }],
    },
    recommended_activity:
      "🎨 Durante la bella stagione il parco si anima con Arcella Bella: musica dal vivo, cinema all'aperto, street food e mercatini. https://www.arcellabella.com/",
  },
];

// Missioni tematiche (par. 2.4.3 della tesi): fili narrativi che collegano luoghi
// dispersi. Completare tutte le tappe di una missione sblocca il racconto finale
// e un badge dedicato.
export type Mission = {
  id: string;
  title: string;
  emoji: string;
  badgeTitle: string;
  badgeArt: string;
  description: string;
  poiIds: number[];
  finale: string;
};

export const MISSIONS: Mission[] = [
  {
    id: "acqua",
    badgeArt: "/art/badge-acqua.svg",
    badgeTitle: "Custode dell'Acqua",
    title: "Padova d'acqua",
    emoji: "💧",
    description:
      "Segui l'acqua che ha fatto la storia della città: il porto fluviale verso Venezia e il grande serbatoio che dal 1925 la disseta.",
    poiIds: [4, 2],
    finale:
      "Hai unito i due volti dell'acqua padovana: il Piovego, che per secoli ha portato burchielli, merci e viaggiatori verso la Laguna, e la Rotonda, il serbatoio che nel Novecento ha portato l'acqua nelle case. La città è cresciuta attorno all'acqua, anche dove oggi non la vedi.",
  },
  {
    id: "mura",
    badgeArt: "/art/badge-mura.svg",
    badgeTitle: "Sentinella delle Mura",
    title: "Padova fortificata",
    emoji: "🏰",
    description:
      "Dalla torre di Ezzelino ai bastioni del Cinquecento: scopri come la città si difendeva.",
    poiIds: [1, 2, 3],
    finale:
      "Torlonga, Bastione della Gatta, mura lungo il Parco Treves: hai attraversato secoli di difese. Oggi quegli stessi luoghi ospitano un museo dell'astronomia, giardini a terrazze e un parco romantico: la città fortificata è diventata la città da esplorare.",
  },
  {
    id: "verde",
    badgeArt: "/art/badge-verde.svg",
    badgeTitle: "Anima Verde",
    title: "Padova verde",
    emoji: "🌳",
    description:
      "Due polmoni verdi lontani dalla folla, dal giardino romantico al grande parco di quartiere.",
    poiIds: [3, 5],
    finale:
      "Dal giardino all'inglese di Jappelli ai quasi 40.000 m² dell'Arcella: hai visto come il verde rende la città più fresca e vivibile, anche lontano dal centro.",
  },
];

export function missionsForPoi(poiId: number): Mission[] {
  return MISSIONS.filter((m) => m.poiIds.includes(poiId));
}

// Quattro badge: uno per ogni missione, con una grafica dedicata, e un badge finale
// per chi completa tutte e tre le missioni (e quindi tutte e cinque le tappe).
export const FINAL_BADGE_ID = "all-missions";

export const BADGES: Badge[] = [
  ...MISSIONS.map((m) => ({
    id: `mission-${m.id}`,
    title: m.badgeTitle,
    description: `Completa la missione ${m.title}.`,
    art: m.badgeArt,
    unlock: (v: number[]) => m.poiIds.every((id) => v.includes(id)),
  })),
  {
    id: FINAL_BADGE_ID,
    title: "Esploratore Consapevole",
    description: "Completa tutte e tre le missioni e visita tutti e cinque i luoghi.",
    art: "/art/badge-finale.svg",
    unlock: (v) => MISSIONS.every((m) => m.poiIds.every((id) => v.includes(id))),
  },
];

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// Oltre questa distanza dalla tappa più vicina l'utente non è ancora a Padova e la
// missione non viene consigliata.
const FAR_FROM_PADOVA_M = 15_000;

export type MissionSuggestion = {
  mission: Mission;
  poi: Poi;
  distance: number;
  far: boolean;
};

// Missione consigliata in base alla posizione: quella con la tappa non ancora visitata
// più vicina all'utente. A parità (il Parco Treves è in due missioni) vince quella le cui
// tappe rimanenti sono in media più vicine. Il calcolo avviene solo sul telefono.
export function suggestMission(
  pos: { lat: number; lng: number },
  visited: number[],
): MissionSuggestion | null {
  let best: (MissionSuggestion & { avg: number }) | null = null;
  for (const mission of MISSIONS) {
    const remaining = POIS.filter((p) => mission.poiIds.includes(p.id) && !visited.includes(p.id));
    if (remaining.length === 0) continue;
    const dists = remaining.map((p) => haversineMeters(pos.lat, pos.lng, p.latitude, p.longitude));
    const distance = Math.min(...dists);
    const avg = dists.reduce((a, b) => a + b, 0) / dists.length;
    if (!best || distance < best.distance - 1 || (Math.abs(distance - best.distance) <= 1 && avg < best.avg)) {
      best = { mission, poi: remaining[dists.indexOf(distance)], distance, avg, far: distance > FAR_FROM_PADOVA_M };
    }
  }
  if (!best) return null;
  const { avg: _avg, ...suggestion } = best;
  return suggestion;
}

// "alla Specola", "ai Giardini della Rotonda"…: per gli avvisi di arrivo in italiano corretto.
const AT_POI: Record<number, string> = {
  1: "alla Specola",
  2: "ai Giardini della Rotonda",
  3: "al Parco Treves",
  4: "a Porta Portello",
  5: "al Parco Milcovich",
};

export function atPoi(poi: Poi): string {
  return AT_POI[poi.id] ?? `a ${poi.name}`;
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

export type NextPoi = { poi: Poi; distance: number; mission: Mission | null };

// Dopo una tappa completata: la più vicina tra quelle ancora da fare della stessa
// missione, altrimenti la più vicina tra tutte le altre. Null se le ha fatte tutte.
export function nextPoiAfter(current: Poi, visited: number[]): NextPoi | null {
  const done = new Set([...visited, current.id]);
  const nearest = (ids: number[]) =>
    POIS.filter((p) => ids.includes(p.id) && !done.has(p.id))
      .map((p) => ({
        poi: p,
        distance: haversineMeters(current.latitude, current.longitude, p.latitude, p.longitude),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  for (const m of missionsForPoi(current.id)) {
    const n = nearest(m.poiIds);
    if (n) return { ...n, mission: m };
  }
  const n = nearest(POIS.map((p) => p.id));
  return n ? { ...n, mission: null } : null;
}
