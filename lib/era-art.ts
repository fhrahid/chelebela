/**
 * Dated and era-associated photographs used on result cards. Sources and
 * licenses are recorded in docs/era-image-credits.md and displayed with each
 * result. Some era pools include a clearly-captioned visual motif rather than
 * a Bangladesh-specific archival photograph.
 */
export interface EraArt {
  art_id: string;
  src: string;
  caption_bn: string;
  title: string;
  artist: string;
  license: string;
  sourceUrl: string;
}

export const ERA_ART: Record<string, EraArt[]> = {
  "80s": [
    {
      art_id: "80s-saarc-1986",
      src: "/eras/80s.jpg",
      caption_bn: "ঢাকায় ১৯৮৬ সালের SAARC সম্মেলনের সংবর্ধনা — সাদা-কালো আর্কাইভ ছবি",
      title: "SAARC in Dhaka 1986",
      artist: "Incognito1980 (family album source)",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:SAARC_in_Dhaka_1986.jpg",
    },
    {
      art_id: "80s-cricket-1986",
      src: "/eras/80s-cricket.jpg",
      caption_bn: "১৯৮৬ এশিয়া কাপে বাংলাদেশের ঐতিহাসিক জাতীয় ক্রিকেট দলের ছবি — সাদা-কালো রূপ",
      title: "Bangladesh national cricket team 1986",
      artist: "Leemon2010",
      license: "CC BY-SA 3.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Bangladesh_national_cricket_team_1986.jpg",
    },
  ],
  "90s": [
    {
      art_id: "90s-bd-montage",
      src: "/eras/90s-bd-montage.png",
      caption_bn: "নব্বইয়ের দশকের বাংলাদেশের মানুষ, ঘটনা ও স্থাপনার ছবি-সংকলন",
      title: "BD90s Montage",
      artist: "Arman (Armanaziz), using credited archival sources",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:BD90s_Montage.png",
    },
    {
      art_id: "90s-cassette-still-life",
      src: "/eras/90s.jpg",
      caption_bn: "অডিও ক্যাসেট — নব্বই দশকের গান শোনার স্মৃতির প্রতীক",
      title: "Meredith Monk — Assorted Audio Cassette Tapes 02",
      artist: "BrillLyle",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Meredith_Monk_-_Assorted_Audio_Cassette_Tapes_02.jpg",
    },
  ],
  "2000s": [
    {
      art_id: "2000s-vintage-nokia",
      src: "/eras/2000s.jpg",
      caption_bn: "২০০০–২০০৬ সালের ভিন্টেজ নোকিয়া ফোনের সংগ্রহ",
      title: "Vintage Nokia Phones",
      artist: "ScottH-NP",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Vintage_Nokia_Phones.jpg",
    },
    {
      art_id: "2000s-dhaka-rickshaw-2005",
      src: "/eras/2000s-dhaka-rickshaw.jpg",
      caption_bn: "ঢাকায় রিকশা-পুলার, ২০০৫",
      title: "Rickshaw Puller, Dhaka (34444882)",
      artist: "Steve Evans",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Rickshaw_Puller,_Dhaka_(34444882).jpg",
    },
    {
      art_id: "2000s-dhaka-portrait-2005",
      src: "/eras/2000s-dhaka-portrait.jpg",
      caption_bn: "ঢাকার এক বাসিন্দার প্রতিকৃতি, ২০০৫",
      title: "Bangladesh Dhaka (34733097)",
      artist: "Steve Evans",
      license: "CC BY 2.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Bangladesh_Dhaka_(34733097).jpg",
    },
    {
      art_id: "2000s-clinton-hasina-2000",
      src: "/eras/2000s-clinton-hasina.jpg",
      caption_bn: "ঢাকায় বিল ক্লিনটন ও শেখ হাসিনার যৌথ বিবৃতি, ২০০০",
      title: "Clinton and Hasina joint statement, Dhaka, 2000",
      artist: "William Vasta",
      license: "Public domain (U.S. federal work)",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:US_President_Clinton_and_Prime_Minister_Sheikh_Hasina_make_a_joint_statement,_Prime_Minister%27s_office,_Bangladesh,_March_20,_2000.jpg",
    },
  ],
};

export function eraArtPool(eraId: string | undefined): EraArt[] {
  if (!eraId) return [];
  return ERA_ART[eraId] ?? [];
}

/** Pick a different Commons image randomly for each result-page visit. */
export function randomEraArt(eraId: string | undefined, random = Math.random): EraArt | null {
  const pool = eraArtPool(eraId);
  if (pool.length === 0) return null;
  return pool[Math.floor(random() * pool.length)];
}

export function eraArtById(artId: string | undefined): EraArt | null {
  if (!artId) return null;
  for (const pool of Object.values(ERA_ART)) {
    const match = pool.find((art) => art.art_id === artId);
    if (match) return match;
  }
  return null;
}
