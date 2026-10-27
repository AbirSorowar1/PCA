// Shared normalisation for Country / Nationality values. Raw sheet values are never modified;
// these functions return the clean, de-duplicated list used by every dropdown, chart and count.

const UNKNOWN = /^(not publicly (verified|listed|stated|confirmed|specified)|not stated|not specified|not available|n\/?a|-+|unknown|none)$/i;

const strip = (s: string) =>
  s
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "")
    .trim();

const title = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()).replace(/\bAnd\b/g, "and");

const COUNTRY_ALIASES: Record<string, string> = {
  uk: "United Kingdom", "u.k": "United Kingdom", "u.k.": "United Kingdom", "united kingdom": "United Kingdom",
  usa: "United States", us: "United States", "u.s": "United States", "u.s.a": "United States", "united states": "United States",
  "united states of america": "United States", "dallas-austin": "United States",
  uae: "United Arab Emirates", "united arab emirates": "United Arab Emirates", dubai: "United Arab Emirates",
  hongkong: "Hong Kong", "hong kong": "Hong Kong",
  pakistani: "Pakistan", paksitan: "Pakistan",
  indonesian: "Indonesia", uzbek: "Uzbekistan",
  canda: "Canada", canadian: "Canada", toronto: "Canada",
  qatat: "Qatar", melbourne: "Australia", australian: "Australia",
  german: "Germany", bosnia: "Bosnia and Herzegovina",
};
const VAGUE_REGION = /^(europe|middle east( region)?|asia|africa|gcc|international|worldwide|global)$/i;

export function normalizeCountries(raw: string): string[] {
  const s = strip(raw ?? "");
  if (!s || UNKNOWN.test(s)) return [];
  const out = new Set<string>();
  for (let part of s.split(/\s*(?:\/|&|,|;|\band\b)\s*/i)) {
    part = part.trim().replace(/\.+$/, "");
    if (!part || UNKNOWN.test(part) || VAGUE_REGION.test(part)) continue;
    const k = part.toLowerCase();
    if (k.startsWith("morocco")) out.add("Morocco");
    else out.add(COUNTRY_ALIASES[k] ?? title(part));
  }
  return [...out];
}

const NAT_ALIASES: Record<string, string> = {
  pakistan: "Pakistani", uzbekistan: "Uzbek", iraq: "Iraqi", jordan: "Jordanian", egypt: "Egyptian",
  palestine: "Palestinian", palestiniani: "Palestinian",
  saudi: "Saudi Arabian", "saudi arabia": "Saudi Arabian",
  uae: "Emirati", emirates: "Emirati", emiraties: "Emirati", dubai: "Emirati",
  usa: "American", amreican: "American", us: "American", uk: "British",
  afghanistan: "Afghan", afgan: "Afghan", pashtun: "Afghan",
  lebanease: "Lebanese", lebaniese: "Lebanese", moroccoan: "Moroccan",
  "south korean": "Korean", filipina: "Filipino", greece: "Greek",
  azerbaijan: "Azerbaijani", kazakhstani: "Kazakh", "iraqi kurdish": "Iraqi",
};
const BROAD = /^(arab|south asian|asian|african|european|north african|middle eastern|levantine|international|latina|latino|south asian diaspora)$/i;

export function normalizeNationalities(raw: string): string[] {
  let s = strip(raw ?? "");
  if (!s || UNKNOWN.test(s)) return [];
  s = s.replace(/\b(descent|heritage|diaspora|muslim|with)\b/gi, " ").replace(/\s+/g, " ").trim();
  const whole = NAT_ALIASES[s.toLowerCase()];
  if (whole) return [whole];
  const out = new Set<string>();
  for (let part of s.split(/\s*(?:-|\/|&|,|\bor\b|\band\b)\s*/i)) {
    part = part.trim().replace(/\.+$/, "");
    if (!part || UNKNOWN.test(part) || BROAD.test(part)) continue;
    out.add(NAT_ALIASES[part.toLowerCase()] ?? title(part));
  }
  return [...out];
}

/** Count clean values; rows with none go to an "Unknown" bucket (charts only). */
export function countValues<T>(items: T[], get: (t: T) => string[], withUnknown = true) {
  const m = new Map<string, number>();
  for (const it of items) {
    const v = get(it);
    for (const k of v.length ? v : withUnknown ? ["Unknown"] : []) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Alphabetical dropdown options with counts, excluding Unknown. */
export function optionList<T>(items: T[], get: (t: T) => string[]) {
  return countValues(items, get, false).sort((a, b) => a.name.localeCompare(b.name));
}
