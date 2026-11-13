/**
 * Era artwork for the result screen — real photographs from Wikimedia Commons,
 * all CC BY-SA 4.0 (attribution shown next to each image; see credits below).
 * Chosen per dominant era of the user's result.
 */
export interface EraArt {
  src: string;
  caption_bn: string;
  title: string;
  artist: string;
  license: string;
  sourceUrl: string;
}

export const ERA_ART: Record<string, EraArt> = {
  "80s": {
    src: "/eras/80s.jpg",
    caption_bn: "ঢাকায় ১৯৮৬ সালের SAARC সম্মেলনের সংবর্ধনা — সাদা-কালো রূপ",
    title: "SAARC in Dhaka 1986",
    artist: "Incognito1980",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:SAARC_in_Dhaka_1986.jpg",
  },
  "90s": {
    src: "/eras/90s.jpg",
    caption_bn: "অডিও ক্যাসেট — নব্বই দশকের গান শোনার স্মৃতির প্রতীক",
    title: "Meredith Monk — Assorted Audio Cassette Tapes 02",
    artist: "BrillLyle",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Meredith_Monk_-_Assorted_Audio_Cassette_Tapes_02.jpg",
  },
  "2000s": {
    src: "/eras/2000s.jpg",
    caption_bn: "পুরোনো নোকিয়া ফোন — দুই হাজার দশকের শুরু",
    title: "Vintage Nokia Phones",
    artist: "ScottH-NP",
    license: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Vintage_Nokia_Phones.jpg",
  },
};

export function eraArtFor(eraId: string | undefined): EraArt | null {
  if (!eraId) return null;
  return ERA_ART[eraId] ?? null;
}
