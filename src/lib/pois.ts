export type Poi = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  geofence_radius_m: number;
  bot_context: string;
  challenge_type: "TRIVIA" | "FOTO" | "AUDIO";
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
  // Aiutini di Galileo, dal più vago al più esplicito: compaiono con il pulsante
  // lampadina, dopo una risposta sbagliata o se la sfida resta aperta a lungo.
  hints: string[];
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
      "Un suggestivo parco a terrazze a ridosso delle mura cinquecentesche di Padova, dove natura, ingegneria e storia si fondono.\n🐈 La Leggenda della Gatta: sorge sul \"Bastione della Gatta\". Il nome nasce nel 1509, quando i padovani beffarono le truppe imperiali assedianti esponendo una gatta viva su una pertica.\n💧 Il Serbatoio Monumentale: al centro dell'area c'è \"La Rotonda\", un imponente serbatoio idrico cilindrico alto 36 metri completato nel 1925, uno dei primi esempi di cemento armato a Padova.\n🕯️ Un Luogo della Memoria: alla base riposa una cappella in memoria di 96 cittadini uccisi da una bomba nel 1916 proprio in questo luogo.\n🌺 Design Liberty e Déco: cinque terrazze con fontane, ninfee, aiuole geometriche e cancelli in ferro battuto.",
    challenge_type: "FOTO",
    challenge_text:
      "Sali fino in cima al bastione e scatta una foto alla Rotonda (il grande serbatoio cilindrico) o a uno dei cancelli in ferro battuto in stile liberty.",
    expected_answer_or_validation:
      "Valida l'immagine se mostra una struttura cilindrica in cemento/pietra tipo torre-serbatoio, un cancello in ferro battuto in stile liberty, terrazze con fontane o mura cinquecentesche. Rifiuta selfie senza contesto, screenshot o luoghi chiaramente diversi.",
    hints: [
      "Sali le terrazze fino in cima al bastione: la Rotonda è il grande cilindro di cemento alto 36 metri, impossibile non vederla.",
      "Se la foto non viene accettata, fai qualche passo indietro e inquadra tutta la torre, oppure un cancello in ferro battuto con le sue decorazioni.",
    ],
    reward_xp: 100,
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
    challenge_type: "AUDIO",
    challenge_text:
      "🎧 Esperienza sensoriale sonora. Mettiti comodo sui gradini della scalinata che scende verso l'acqua, indossa le cuffie, chiudi gli occhi e lasciati trasportare dalla traccia audio nel Settecento del porto padovano.",
    expected_answer_or_validation: "Ascolto completato",
    audio_narration:
      "Chiudi gli occhi. Sei seduto sui gradini di pietra d'Istria di Porta Portello, nel 1750. Ascolta. Lo sciabordio lento dell'acqua del canale Piovego contro gli scalini. Il cigolio dei remi di un Burchiello che si prepara a partire per Venezia. Le voci dei barcaioli che caricano casse di stoffe e vino. Una risata di nobili in viaggio, il rintocco lontano di una campana. Respira l'aria umida del fiume. Sei nel cuore pulsante del porto di Padova. Quando sei pronto, apri gli occhi e conferma l'ascolto.",
    hints: [
      "Cerca la scalinata di pietra bianca che scende verso il canale Piovego, proprio accanto all'arco della porta.",
      "Se l'audio non parte, alza il volume e controlla la connessione: se proprio non va, potrai leggere il racconto e confermare.",
    ],
    reward_xp: 100,
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
    recommended_activity:
      "🎨 Durante la bella stagione il parco si anima con Arcella Bella: musica dal vivo, cinema all'aperto, street food e mercatini. https://www.arcellabella.it/",
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