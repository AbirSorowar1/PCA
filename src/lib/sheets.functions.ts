import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import {
  REGION_SHEETS,
  SPREADSHEET_ID,
  STATUS_SHEET,
  parseRegionSheet,
  parseStatusSheet,
  type Dataset,
} from "./creators";

async function fetchSheet(gid: string) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&_=${Date.now()}`;
  const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
  if (!res.ok) throw new Error(`Sheet ${gid} failed [${res.status}]`);
  const text = await res.text();
  if (text.trimStart().startsWith("<")) throw new Error(`Sheet ${gid} is not publicly readable`);
  return text;
}

export const getDataset = createServerFn({ method: "GET" }).handler(async (): Promise<Dataset> => {
  const errors: string[] = [];
  const all = [STATUS_SHEET, ...REGION_SHEETS];
  const texts = await Promise.all(
    all.map((s) =>
      fetchSheet(s.gid).catch((e: Error) => {
        errors.push(`${s.name}: ${e.message}`);
        return "";
      }),
    ),
  );
  const status = parseStatusSheet(texts[0] ?? "");
  const perRegion = REGION_SHEETS.map((s, i) => parseRegionSheet(s.name, texts[i + 1] ?? ""));
  return {
    status,
    creators: perRegion.flat(),
    sheets: [
      { name: STATUS_SHEET.name, rows: status.length },
      ...REGION_SHEETS.map((s, i) => ({ name: s.name, rows: perRegion[i]?.length ?? 0 })),
    ],
    fetchedAt: new Date().toISOString(),
    errors,
  };
});

export const LIVE_INTERVAL_MS = 30_000;

export const datasetQuery = queryOptions({
  queryKey: ["dataset"],
  queryFn: () => getDataset(),
  refetchInterval: LIVE_INTERVAL_MS,
  refetchOnWindowFocus: true,
  staleTime: 10_000,
});
