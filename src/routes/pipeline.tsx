import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, ExternalLink, Search, ThumbsDown, ThumbsUp } from "lucide-react";
import { datasetQuery } from "@/lib/sheets.functions";
import { countBy, downloadCsv, dupKey, findDuplicates, firstLink } from "@/lib/creators";
import { countValues, optionList } from "@/lib/geo";
import { Chip, CountUp, Donut, FilterSelect, HBars, Kpi, PageHeader, Panel, useDataset } from "@/components/dash/kit";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Outreach Pipeline · Creator Intelligence Dashboard" },
      { name: "description", content: "Track creator outreach status and messaging categories live from the CreatorStatus sheet." },
      { property: "og:title", content: "Outreach pipeline" },
      { property: "og:description", content: "Live creator outreach tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(datasetQuery),
  component: Pipeline,
});

const STAGES = ["Press To Start", "Approached", "Responded", "Interested", "Negotiating", "Not Interested"];

function Pipeline() {
  const { data } = useDataset();
  const rows = data.status;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");
  const [country, setCountry] = useState("");
  const [limit, setLimit] = useState(50);
  const [dupOnly, setDupOnly] = useState(false);
  const dups = useMemo(() => findDuplicates(rows), [rows]);

  const statuses = useMemo(() => countBy(rows, (r) => r.status), [rows]);
  const stageCounts = STAGES.map((s) => ({ name: s, value: rows.filter((r) => r.status.toLowerCase() === s.toLowerCase()).length }));
  const filtered = rows.filter(
    (r) =>
      (!status || r.status === status) &&
      (!msg || r.messaging === msg) &&
      (!country || r.countries.includes(country)) &&
      (!dupOnly || dups.keys.has(dupKey(r))) &&
      (!q || [r.name, r.handle, r.extra].some((v) => v.toLowerCase().includes(q.toLowerCase()))),
  );
  const contacted = rows.length - (stageCounts[0]?.value ?? 0);
  const responsive = rows.filter((r) => r.nature.toLowerCase() === "responsive").length;
  const unresponsive = rows.filter((r) => r.nature.toLowerCase() === "unresponsive").length;

  const downloadDupXlsx = async () => {
    const XLSX = await import("xlsx");
    const rowsOut = dups.groups.flatMap((g, gi) =>
      g.items.map((x) => ({
        Group: gi + 1,
        "Creator Name": x.name,
        Handle: x.handle,
        SL: x.sl,
        Status: x.status,
        "Creator Nature": x.nature,
        Country: x.country,
        "Messaging Category": x.messaging,
        "Social Media Link": firstLink(x.links) || x.links,
        Notes: x.extra,
      })),
    );
    const ws = XLSX.utils.json_to_sheet(rowsOut);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pipeline Duplicates");
    XLSX.writeFile(wb, "pipeline-duplicate-entries.xlsx");
  };

  return (
    <>
      <PageHeader
        title="Outreach pipeline"
        sub="Live from the CreatorStatus sheet"
        actions={
          <button
            onClick={() => downloadCsv("pipeline.csv", filtered.map(({ id: _id, raw: _raw, ...r }) => r))}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total in pipeline" value={<CountUp value={rows.length} />} sub={`${dups.unique} unique creators`} />
        <Kpi label="Contacted" value={contacted} sub={`${Math.round((contacted / Math.max(1, rows.length)) * 100)}% of pipeline`} delay={60} />
        <Kpi label="Responded+" value={stageCounts.slice(2, 5).reduce((a, b) => a + b.value, 0)} sub="Responded, interested, negotiating" delay={120} />
        <Kpi label="Not started" value={stageCounts[0]?.value ?? 0} delay={180} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4">
          <Kpi label="Unique creators" value={<CountUp value={dups.unique} />} sub="After merging repeats" delay={200} />
          <Kpi label="Duplicates" value={<CountUp value={dups.extra} />} sub={`${dups.groups.length} creators appear more than once`} delay={260} />
          <div className="grid grid-cols-2 gap-4">
            <Kpi label="Responsive" value={<CountUp value={responsive} />} sub="Creator nature" icon={<ThumbsUp className="h-4 w-4" />} delay={300} />
            <Kpi label="Unresponsive" value={<CountUp value={unresponsive} />} sub="Creator nature" icon={<ThumbsDown className="h-4 w-4" />} delay={340} />
          </div>
        </div>
        <Panel title="Duplicate entries" className="lg:col-span-2" action={
          <div className="flex items-center gap-2">
            {dups.groups.length > 0 && (
              <button onClick={downloadDupXlsx} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90">
                <Download className="h-3.5 w-3.5" /> Download XLSX
              </button>
            )}
            <button onClick={() => setDupOnly(!dupOnly)} className={`rounded-full border px-3 py-1 text-xs ${dupOnly ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              {dupOnly ? "Showing duplicates only" : "Show only duplicates in table"}
            </button>
          </div>
        }>
          {dups.groups.length ? (
            <ul className="max-h-56 divide-y divide-border overflow-y-auto pr-1 text-sm">
              {dups.groups.map((g) => (
                <li key={g.key} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{g.items[0]?.name || g.key}</div>
                    <div className="truncate text-xs text-muted-foreground">@{g.key} · rows {g.items.map((x) => x.sl || "?").join(", ")}</div>
                  </div>
                  <Chip tone="primary">×{g.items.length}</Chip>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No duplicates found 🎉</p>
          )}
        </Panel>
      </div>

      <Panel title="Funnel" className="mt-4">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {stageCounts.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setStatus(statuses.find((x) => x.name.toLowerCase() === s.name.toLowerCase())?.name ?? "")}
              className="rounded-xl border border-border bg-secondary/50 p-4 text-left transition hover:border-primary/50"
            >
              <div className="text-xs text-muted-foreground">{i + 1}. {s.name}</div>
              <div className="mt-2 font-display text-2xl font-semibold">{s.value}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(s.value / Math.max(1, rows.length)) * 100}%` }} />
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Messaging category">
          <Donut data={countBy(rows, (r) => r.messaging)} />
        </Panel>
        <Panel title="Pipeline by country">
          <HBars data={countValues(rows, (r) => r.countries).slice(0, 8)} onSelect={setCountry} />
        </Panel>
      </div>

      <div className="surface mt-4 flex flex-wrap gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, handle, notes…" className="h-10 w-full rounded-lg border border-input bg-secondary pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={statuses.map((s) => s.name)} />
        <FilterSelect label="Messaging" value={msg} onChange={setMsg} options={countBy(rows, (r) => r.messaging).map((s) => s.name)} />
        <FilterSelect label="Country" value={country} onChange={setCountry} options={optionList(rows, (r) => r.countries)} />
      </div>

      <div className="surface mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Creator</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 md:table-cell">Messaging</th>
              <th className="hidden px-4 py-3 lg:table-cell">Country</th>
              <th className="hidden px-4 py-3 xl:table-cell">Notes</th>
              <th className="px-4 py-3 text-right">Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, limit).map((r) => (
              <tr key={r.id} className="hover:bg-accent/40">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{r.date || "—"}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {firstLink(r.links) ? <a href={firstLink(r.links)} target="_blank" rel="noreferrer" className="hover:text-primary">{r.name}</a> : r.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.handle}</div>
                </td>
                <td className="px-4 py-3"><Chip tone={r.status.toLowerCase() === "press to start" ? "default" : "primary"}>{r.status}</Chip></td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{r.messaging}</td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{r.country}</td>
                <td className="hidden max-w-sm truncate px-4 py-3 text-muted-foreground xl:table-cell" title={r.extra}>{r.extra}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link
                    to="/profile/$id"
                    params={{ id: r.id }}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    View profile <ExternalLink className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>Showing {Math.min(limit, filtered.length)} of {filtered.length}</span>
          {limit < filtered.length && <button onClick={() => setLimit(limit + 50)} className="text-primary">Load more</button>}
        </div>
      </div>
    </>
  );
}
