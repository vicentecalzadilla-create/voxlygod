// Lightweight language detector for ES / EN / FR / PT / IT / DE.
// Uses stopword frequency + diacritic/character heuristics. No dependencies.

export type DetectedLang = 'es' | 'en' | 'fr' | 'pt' | 'it' | 'de';

export const LANG_META: Record<DetectedLang, { label: string; flag: string }> = {
  es: { label: 'Español', flag: '🇪🇸' },
  en: { label: 'English', flag: '🇬🇧' },
  fr: { label: 'Français', flag: '🇫🇷' },
  pt: { label: 'Português', flag: '🇵🇹' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
};

const STOPWORDS: Record<DetectedLang, string[]> = {
  es: ['el','la','los','las','de','del','que','en','con','por','para','un','una','y','o','pero','es','son','su','lo','le','se','yo','tu','no','sí','muy','más','como','cuando','donde','porque','sobre','entre','hasta','desde','sin','ser','está','están','este','esta','ese','esa','dios','señor','jesús','cristo','amén','santo','santa'],
  en: ['the','of','and','to','a','in','that','is','was','for','on','with','as','by','this','it','at','from','or','an','be','are','have','has','not','but','they','you','we','his','her','their','which','who','what','when','where','why','how','god','lord','jesus','christ','amen','holy'],
  fr: ['le','la','les','de','des','du','et','un','une','que','qui','dans','pour','avec','sur','par','est','sont','ne','pas','plus','mais','ou','où','comme','quand','parce','sans','vous','nous','ils','elle','elles','son','sa','ses','ce','cette','dieu','seigneur','jésus','christ','amen','saint','sainte'],
  pt: ['o','a','os','as','de','do','da','dos','das','que','em','com','para','por','um','uma','e','ou','mas','é','são','não','sim','muito','mais','como','quando','onde','porque','sobre','entre','até','desde','sem','ser','está','estão','deus','senhor','jesus','cristo','amém','santo','santa'],
  it: ['il','lo','la','i','gli','le','di','del','della','che','in','con','per','un','una','e','o','ma','è','sono','non','sì','più','come','quando','dove','perché','su','tra','fra','senza','dio','signore','gesù','cristo','amen','santo','santa'],
  de: ['der','die','das','und','oder','aber','ist','sind','ein','eine','mit','von','zu','für','auf','im','in','den','dem','des','nicht','ja','sehr','mehr','wie','wenn','wo','warum','über','zwischen','ohne','sein','gott','herr','jesus','christus','amen','heilig'],
};

const DIACRITIC_BIAS: Array<{ lang: DetectedLang; re: RegExp; weight: number }> = [
  { lang: 'es', re: /[ñ¡¿]/g, weight: 3 },
  { lang: 'es', re: /[áéíóúü]/g, weight: 0.5 },
  { lang: 'fr', re: /[àâçéèêëîïôûùüÿœæ]/g, weight: 1 },
  { lang: 'fr', re: /\b(c'|d'|l'|j'|qu'|n'|s'|t')/gi, weight: 2 },
  { lang: 'pt', re: /[ãõâêôç]/g, weight: 1.5 },
  { lang: 'it', re: /\b(gli|degli|della|nello|sull')/gi, weight: 2 },
  { lang: 'de', re: /[äöüß]/g, weight: 2 },
];

export function detectLanguage(text: string): { lang: DetectedLang; confidence: number } {
  const clean = (text || '').toLowerCase().trim();
  if (clean.length < 3) return { lang: 'es', confidence: 0 };

  const words = clean.replace(/[.,;:!?¡¿"'()«»\-–—\n]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return { lang: 'es', confidence: 0 };

  const scores: Record<DetectedLang, number> = { es: 0, en: 0, fr: 0, pt: 0, it: 0, de: 0 };

  for (const w of words) {
    for (const lang of Object.keys(STOPWORDS) as DetectedLang[]) {
      if (STOPWORDS[lang].includes(w)) scores[lang] += 1;
    }
  }

  for (const { lang, re, weight } of DIACRITIC_BIAS) {
    const matches = clean.match(re);
    if (matches) scores[lang] += matches.length * weight;
  }

  // Pick best
  let best: DetectedLang = 'es';
  let bestScore = -1;
  let total = 0;
  for (const lang of Object.keys(scores) as DetectedLang[]) {
    total += scores[lang];
    if (scores[lang] > bestScore) { bestScore = scores[lang]; best = lang; }
  }
  const confidence = total > 0 ? bestScore / total : 0;
  // If almost nothing matched (e.g. very short / proper nouns only), default to ES with low confidence
  if (bestScore < 1) return { lang: 'es', confidence: 0 };
  return { lang: best, confidence };
}
