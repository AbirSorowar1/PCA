// Pure parsing/normalisation for the Creator Route spreadsheet (browser + server safe).
import { normalizeCountries, normalizeNationalities } from "./geo";

export const SPREADSHEET_ID = "13rYO0vdKnXapghF5YDom3SKhS2wEry1BbeGXXQTnKHc";
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;

export const STATUS_SHEET = { name: "CreatorStatus", gid: "1283688219" };
export const REGION_SHEETS = [
  { name: "USA & Canada", gid: "1387168914" },
  { name: "Oceania", gid: "952431665" },
  { name: "Asia", gid: "270993636" },
  { name: "Africa", gid: "1912253900" },
  { name: "UAE & Arab", gid: "714633970" },
  { name: "Bangladesh", gid: "1579122846" },
  { name: "EU", gid: "1538758336" },
];

export interface Creator {
  id: string;
  region: string;
  sl: string;
  name: string;
  gender: string;
  handle: string;
  followers: number | null;
  followersRaw: string;
  nationality: string;
  country: string;
  /** Clean, de-duplicated values (see geo.ts); empty = unknown. */
  countries: string[];
  nationalities: string[];
  content: string;
  categories: string[];
  platform: string;
  links: string;
  contact: string;
  notes: string;
  /** Every non-empty cell of the original sheet row, keyed by column header. */
  raw: Record<string, string>;
}

export interface StatusRow {
  id: string;
  date: string;
  sl: string;
  name: string;
  gender: string;
  handle: string;
  status: string;
  links: string;
  contact: string;
  country: string;
  countries: string[];
  nature: string;
  extra: string;
  messaging: string;
  raw: Record<string, string>;
}

export interface Dataset {
  creators: Creator[];
  status: StatusRow[];
  sheets: { name: string; rows: number }[];
  fetchedAt: string;
  errors: string[];
}

/** RFC4180-ish CSV parser (handles quotes, escaped quotes, newlines in cells). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** All non-empty cells of a row keyed by header (duplicate headers get a numeric suffix). */
export function rawRow(headers: string[], r: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((h, i) => {
    const v = (r[i] ?? "").trim();
    const label = clean(h);
    if (!v || !label) return;
    let k = label;
    for (let n = 2; k in out; n++) k = `${label} (${n})`;
    out[k] = v;
  });
  return out;
}

const SYN: Record<string, string[]> = {
  sl: ["sl", "serial number", "serial", "no", "sl no"],
  name: ["creator name", "full name", "name"],
  gender: ["gender"],
  handle: ["social media handle", "social media handle username", "handle", "username"],
  followers: ["follower count", "followers", "follower count k", "follower"],
  nationality: ["nationality", "nationality race", "race"],
  country: ["country of residence", "current country", "country"],
  content: ["type of content", "tupe of content", "content type", "content"],
  platform: ["social media platform", "platform"],
  links: ["social media links", "social media link", "links"],
  contact: ["contact info", "contact information", "contract information", "contact"],
  notes: ["extra notes", "notes", "extra"],
};

function mapHeaders(headers: string[]) {
  const idx: Record<string, number> = {};
  const used = new Set<number>();
  for (const key of Object.keys(SYN)) {
    for (const syn of SYN[key] ?? []) {
      const i = headers.findIndex((h, j) => !used.has(j) && norm(h) === syn);
      if (i >= 0) {
        idx[key] = i;
        used.add(i);
        break;
      }
    }
  }
  return idx;
}

/** "13,000" -> 13000, "1.2M" -> 1200000, "15K" -> 15000; inK treats small plain numbers (<1000) as thousands. */
export function parseFollowers(raw: string, inK = false): number | null {
  const s = clean(raw).toLowerCase().replace(/,/g, "");
  const m = s.match(/(\d+(?:\.\d+)?)\s*(k|m|b)?/);
  if (!m) return null;
  let n = parseFloat(m[1] ?? "0");
  const unit = m[2];
  if (unit === "k") n *= 1e3;
  else if (unit === "m") n *= 1e6;
  else if (unit === "b") n *= 1e9;
  else if (inK && n < 1000) n *= 1e3; // '(K)' column mixes thousands and full counts
  return Math.round(n);
}

const PLATFORM_ALIASES: [RegExp, string][] = [
  [/insta|instg|instr|^ig$/, "Instagram"],
  [/tik ?to+k|tictok/, "TikTok"],
  [/you ?tube|^yt$/, "YouTube"],
  [/face ?bo+k|^fb$/, "Facebook"],
  [/twitter|^x$/, "X / Twitter"],
  [/snap/, "Snapchat"],
  [/linked/, "LinkedIn"],
  [/threads/, "Threads"],
  [/pinterest/, "Pinterest"],
];
export function normalizePlatform(raw: string, links = ""): string {
  const s = clean(raw).toLowerCase();
  const first = s.split(/[,/&]| and /)[0]?.trim() ?? "";
  for (const [re, name] of PLATFORM_ALIASES) if (re.test(first)) return name;
  const l = links.toLowerCase();
  if (l.includes("instagram")) return "Instagram";
  if (l.includes("tiktok")) return "TikTok";
  if (l.includes("youtube")) return "YouTube";
  if (l.includes("facebook")) return "Facebook";
  return first ? first.replace(/\b\w/g, (c) => c.toUpperCase()) : "Unknown";
}

const CATEGORY_RULES: [string, RegExp][] = [
  ["Fashion", /fashion|modest|outfit|style|hijab|abaya|cloth/],
  ["Beauty", /beauty|makeup|skin|cosmetic|hair/],
  ["Faith & Islamic", /islam|quran|muslim|deen|faith|dawah|spiritual|ramad|sunnah|hadith|scholar/],
  ["Food", /food|cook|recipe|baking|chef|restaurant/],
  ["Travel", /travel|tour|explor/],
  ["Fitness & Health", /fitness|gym|workout|health|wellness|mma|sport|yoga|nutrition/],
  ["Family & Parenting", /mom|mum|mother|parent|family|kids|baby/],
  ["Comedy", /comedy|humor|humour|funny|skit|meme/],
  ["Education", /educat|teach|learn|student|tutor|study|knowledge/],
  ["Tech & Gaming", /tech|gadget|gaming|game|review|ai\b/],
  ["Art & Crafts", /art|craft|diy|handmade|paint|calligraph|design|photograph|video/],
  ["Business", /business|entrepreneur|finance|marketing|brand|ugc/],
  ["Lifestyle & Vlog", /lifestyle|vlog|daily|life/],
];
export function categorize(content: string): string[] {
  const s = content.toLowerCase();
  const out = CATEGORY_RULES.filter(([, re]) => re.test(s)).map(([c]) => c);
  return out.length ? out : content ? ["Other"] : ["Uncategorized"];
}

export const FOLLOWER_BUCKETS = [
  { label: "Under 10K", min: 0, max: 10_000 },
  { label: "10K–25K", min: 10_000, max: 25_000 },
  { label: "25K–50K", min: 25_000, max: 50_000 },
  { label: "50K–100K", min: 50_000, max: 100_000 },
  { label: "100K+", min: 100_000, max: Infinity },
];
export function bucketOf(n: number | null) {
  if (n == null) return "Unknown";
  return FOLLOWER_BUCKETS.find((b) => n >= b.min && n < b.max)?.label ?? "Unknown";
}

const titleGender = (g: string) => {
  const s = clean(g).toLowerCase();
  if (s.startsWith("f")) return "Female";
  if (s.startsWith("m")) return "Male";
  return s ? clean(g) : "Unknown";
};

export function parseRegionSheet(region: string, csv: string): Creator[] {
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const headers = rows[0] ?? [];
  const idx = mapHeaders(headers);
  const fi = idx["followers"];
  const inK = fi != null && /\(k\)/i.test(headers[fi] ?? "");
  const g = (r: string[], k: string) => (idx[k] != null ? clean(r[idx[k]]) : "");
  return rows
    .slice(1)
    .filter((r) => g(r, "name") || g(r, "handle"))
    .map((r, i) => {
      const content = g(r, "content");
      const links = g(r, "links");
      return {
        id: `${region}-${i}`,
        region,
        sl: g(r, "sl"),
        name: g(r, "name") || g(r, "handle"),
        gender: titleGender(g(r, "gender")),
        handle: g(r, "handle").replace(/^@?/, "@"),
        followers: parseFollowers(g(r, "followers"), inK),
        followersRaw: g(r, "followers"),
        nationality: g(r, "nationality") || "Unknown",
        country: g(r, "country") || "Unknown",
        countries: normalizeCountries(g(r, "country")),
        nationalities: normalizeNationalities(g(r, "nationality")),
        content,
        categories: categorize(content),
        platform: normalizePlatform(g(r, "platform"), links),
        links,
        contact: g(r, "contact"),
        notes: g(r, "notes"),
        raw: rawRow(headers, r),
      };
    });
}

export function parseStatusSheet(csv: string): StatusRow[] {
  const rows = parseCsv(csv);
  if (!rows.length) return [];
  const h = (rows[0] ?? []).map(norm);
  const at = (name: string) => h.indexOf(name);
  const c = {
    date: at("date"), sl: at("serial number"), name: at("full name"), gender: at("gender"),
    handle: at("social media handle username"), status: at("creator status"),
    links: at("social media links"), contact: at("contact info"),
    country: at("country of residence"), nature: at("creator nature"), extra: at("extra"),
    messaging: at("messaging category"),
  };
  const g = (r: string[], i: number) => (i >= 0 ? clean(r[i]) : "");
  let lastDate = "";
  return rows
    .slice(1)
    .filter((r) => g(r, c.name) || g(r, c.handle))
    .map((r, i) => {
      const d = g(r, c.date);
      if (d) lastDate = d;
      return {
        id: `status-${i}`,
        date: d || lastDate,
        sl: g(r, c.sl),
        name: g(r, c.name),
        gender: titleGender(g(r, c.gender)),
        handle: g(r, c.handle),
        status: g(r, c.status) || "Unset",
        links: g(r, c.links),
        contact: g(r, c.contact),
        country: g(r, c.country) || "Unknown",
        countries: normalizeCountries(g(r, c.country)),
        nature: g(r, c.nature) || "Unset",
        extra: g(r, c.extra),
        messaging: g(r, c.messaging) || "Unassigned",
        raw: rawRow(rows[0] ?? [], r),
      };
    });
}

export function countBy<T>(items: T[], key: (t: T) => string | string[]) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    for (const v of Array.isArray(k) ? k : [k]) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export const fmt = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return String(n);
};

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0] ?? {});
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.map(esc).join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const firstLink = (links: string) => links.match(/https?:\/\/\S+/)?.[0] ?? "";

/** Identity key for duplicate detection: profile handle from the link, else the @handle, else the name. */
export function dupKey(r: { handle: string; links: string; name: string }): string {
  const link = firstLink(r.links).toLowerCase();
  const fbId = link.match(/[?&]id=(\d+)/)?.[1];
  const fromLink = fbId ? `fb:${fbId}` : link.match(/(?:instagram|tiktok|facebook|youtube)\.com\/(?:@)?([a-z0-9._-]+)/)?.[1];
  const bad = (x?: string) => !x || x.length < 3 || ["profile.php", "p", "reel", "reels", "share", "people", "watch", "channel"].includes(x);
  if (!bad(fromLink)) return fromLink as string;
  const h = (r.handle.split(/[\s/(]/)[0] || "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9._]/g, "");
  if (!bad(h)) return h;
  return link || r.name.toLowerCase().replace(/\s+/g, " ").trim();
}

export function findDuplicates<T extends { handle: string; links: string; name: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const k = dupKey(r);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1).map(([key, items]) => ({ key, items })).sort((a, b) => b.items.length - a.items.length);
  const extra = dupGroups.reduce((a, g) => a + g.items.length - 1, 0);
  return { groups: dupGroups, unique: groups.size, extra, keys: new Set(dupGroups.map((g) => g.key)) };
}

/** Groups creators whose "Creator Name" AND "Social Media Handle" both match (case/spacing/punctuation-insensitive). */
export function findNameDuplicates<T extends { name: string; handle: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  const n = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
  for (const r of rows) {
    const nm = n(r.name), h = n(r.handle);
    if (!nm || !h) continue;
    const k = `${nm} | ${h}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1).map(([key, items]) => ({ key, items })).sort((a, b) => b.items.length - a.items.length || a.key.localeCompare(b.key));
  return { groups: dupGroups, extra: dupGroups.reduce((a, g) => a + g.items.length - 1, 0) };
}
