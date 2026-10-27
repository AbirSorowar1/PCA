import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { datasetQuery } from "@/lib/sheets.functions";
import { bucketOf, countBy, fmt, FOLLOWER_BUCKETS } from "@/lib/creators";
import { countValues } from "@/lib/geo";
import { Donut, FilterSelect, HBars, PageHeader, Panel, useDataset, VBars } from "@/components/dash/kit";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights · Creator Intelligence Dashboard" },
      { name: "description", content: "Geography, platform, content category and reach analytics for all creators." },
      { property: "og:title", content: "Creator insights" },
      { property: "og:description", content: "Geography, platforms and content analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(datasetQuery),
  component: Insights,
});

function Insights() {
  const { data } = useDataset();
  const [region, setRegion] = useState("");
  const c = useMemo(() => data.creators.filter((x) => !region || x.region === region), [data, region]);
  const regionReach = useMemo(() => {
    const m = new Map<string, number>();
    c.forEach((x) => m.set(x.region, (m.get(x.region) ?? 0) + (x.followers ?? 0)));
    return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [c]);

  return (
    <>
      <PageHeader
        title="Insights"
        sub={`${c.length} creators${region ? ` in ${region}` : ""}`}
        actions={<FilterSelect label="Region" value={region} onChange={setRegion} options={[...new Set(data.creators.map((x) => x.region))]} />}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top countries of residence"><HBars data={countValues(c, (x) => x.countries).slice(0, 10)} height={320} /></Panel>
        <Panel title="Top nationalities"><HBars data={countValues(c, (x) => x.nationalities).slice(0, 10)} height={320} /></Panel>
        <Panel title="Content categories"><HBars data={countBy(c, (x) => x.categories).slice(0, 12)} height={360} /></Panel>
        <Panel title="Platform share"><Donut data={countBy(c, (x) => x.platform)} height={280} /></Panel>
        <Panel title="Follower tiers"><VBars data={FOLLOWER_BUCKETS.map((b) => ({ name: b.label, value: c.filter((x) => bucketOf(x.followers) === b.label).length }))} /></Panel>
        <Panel title="Gender split"><Donut data={countBy(c, (x) => x.gender)} /></Panel>
        <Panel title="Total reach by region" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {regionReach.map((r) => (
              <div key={r.name} className="rounded-xl border border-border bg-secondary/40 p-4">
                <div className="text-xs text-muted-foreground">{r.name}</div>
                <div className="mt-1 font-display text-2xl font-semibold text-primary">{fmt(r.value)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
