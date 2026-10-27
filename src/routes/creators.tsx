import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownUp, Download, Search } from "lucide-react";
import { datasetQuery } from "@/lib/sheets.functions";
import { bucketOf, downloadCsv, fmt, FOLLOWER_BUCKETS, type Creator } from "@/lib/creators";
import { Chip, FilterSelect, PageHeader, useDataset } from "@/components/dash/kit";
import { optionList } from "@/lib/geo";
import { CreatorSheet } from "@/components/dash/CreatorSheet";

export const Route = createFileRoute("/creators")({
  head: () => ({
    meta: [
      { title: "Creators · Creator Intelligence Dashboard" },
      { name: "description", content: "Search, filter, sort and export every creator from the live Google Sheet." },
      { property: "og:title", content: "Creators directory" },
      { property: "og:description", content: "Searchable live creator directory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(datasetQuery),
  component: CreatorsPage,
});

type SortKey = "name" | "followers" | "country" | "region" | "platform";
const uniq = (a: string[]) => [...new Set(a)].filter(Boolean).sort();

function CreatorsPage() {
  const { data } = useDataset();
  const all = data.creators;
  const [q, setQ] = useState("");
  const [f, setF] = useState({ region: "", platform: "", gender: "", category: "", tier: "", country: "", nationality: "" });
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "followers", dir: -1 });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [sel, setSel] = useState<Creator | null>(null);

  const opts = useMemo(
    () => ({
      region: uniq(all.map((c) => c.region)),
      platform: uniq(all.map((c) => c.platform)),
      gender: uniq(all.map((c) => c.gender)),
      category: uniq(all.flatMap((c) => c.categories)),
      country: optionList(all, (c) => c.countries),
      nationality: optionList(all, (c) => c.nationalities),
    }),
    [all],
  );

  const rows = useMemo(() => {
    const term = q.toLowerCase().trim();
    const out = all.filter(
      (c) =>
        (!f.region || c.region === f.region) &&
        (!f.platform || c.platform === f.platform) &&
        (!f.gender || c.gender === f.gender) &&
        (!f.country || c.countries.includes(f.country)) &&
        (!f.nationality || c.nationalities.includes(f.nationality)) &&
        (!f.category || c.categories.includes(f.category)) &&
        (!f.tier || bucketOf(c.followers) === f.tier) &&
        (!term || [c.name, c.handle, c.content, c.country, c.nationality, c.notes].some((v) => v.toLowerCase().includes(term))),
    );
    return out.sort((a, b) => {
      const av = a[sort.key] ?? -1;
      const bv = b[sort.key] ?? -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir;
    });
  }, [all, q, f, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / size));
  const cur = Math.min(page, pages);
  const view = rows.slice((cur - 1) * size, cur * size);
  const set = (k: keyof typeof f) => (v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setPage(1);
  };
  const th = (key: SortKey, label: string, cls = "") => (
    <th className={`px-4 py-3 font-medium ${cls}`}>
      <button
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as 1 | -1) : key === "followers" ? -1 : 1 }))}
      >
        {label} <ArrowDownUp className={`h-3 w-3 ${sort.key === key ? "text-primary" : "opacity-40"}`} />
      </button>
    </th>
  );

  const exportRows = () =>
    downloadCsv(
      `creators-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((c) => ({
        Region: c.region, Name: c.name, Gender: c.gender, Handle: c.handle, Followers: c.followers ?? c.followersRaw,
        Nationality: c.nationality, Country: c.country, Content: c.content, Platform: c.platform,
        Links: c.links, Contact: c.contact, Notes: c.notes,
      })),
    );

  const active = Object.values(f).some(Boolean) || q;

  return (
    <>
      <PageHeader
        title="Creators"
        sub={`${rows.length.toLocaleString()} of ${all.length.toLocaleString()} creators`}
        actions={
          <button onClick={exportRows} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <div className="surface mb-4 flex flex-wrap gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, handle, content, notes…"
            className="h-10 w-full rounded-lg border border-input bg-secondary pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <FilterSelect label="Region" value={f.region} onChange={set("region")} options={opts.region} />
        <FilterSelect label="Platform" value={f.platform} onChange={set("platform")} options={opts.platform} />
        <FilterSelect label="Category" value={f.category} onChange={set("category")} options={opts.category} />
        <FilterSelect label="Tier" value={f.tier} onChange={set("tier")} options={FOLLOWER_BUCKETS.map((b) => b.label)} />
        <FilterSelect label="Country" value={f.country} onChange={set("country")} options={opts.country} />
        <FilterSelect label="Nationality" value={f.nationality} onChange={set("nationality")} options={opts.nationality} />
        <FilterSelect label="Gender" value={f.gender} onChange={set("gender")} options={opts.gender} />
        {active && (
          <button
            onClick={() => {
              setF({ region: "", platform: "", gender: "", category: "", tier: "", country: "", nationality: "" });
              setQ("");
            }}
            className="h-10 rounded-lg px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                {th("name", "Creator")}
                {th("followers", "Followers", "text-right")}
                {th("platform", "Platform", "hidden md:table-cell")}
                {th("country", "Residence", "hidden lg:table-cell")}
                {th("region", "Region", "hidden lg:table-cell")}
                <th className="hidden px-4 py-3 font-medium xl:table-cell">Content</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {view.map((c) => (
                <tr key={c.id} onClick={() => setSel(c)} className="cursor-pointer transition hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.handle}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-display font-semibold">{fmt(c.followers)}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Chip tone="primary">{c.platform}</Chip>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{c.country}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{c.region}</td>
                  <td className="hidden max-w-xs px-4 py-3 xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.categories.slice(0, 3).map((x) => (
                        <Chip key={x}>{x}</Chip>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!view.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                    No creators match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            Rows
            <select value={size} onChange={(e) => { setSize(+e.target.value); setPage(1); }} className="rounded-md border border-input bg-secondary px-2 py-1 text-foreground">
              {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Prev</button>
            <span>Page {cur} / {pages}</span>
            <button disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
      <CreatorSheet creator={sel} onClose={() => setSel(null)} />
    </>
  );
}
