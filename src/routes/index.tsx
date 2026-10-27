import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Flag, Globe2, Layers, MapPin, Send, Shuffle, Sparkles, Tags, Users } from "lucide-react";
import { datasetQuery } from "@/lib/sheets.functions";
import { bucketOf, countBy, findNameDuplicates, firstLink, fmt, FOLLOWER_BUCKETS } from "@/lib/creators";
import { countValues } from "@/lib/geo";
import { Chip, CountUp, Donut, HBars, Kpi, PageHeader, Panel, useDataset, VBars } from "@/components/dash/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · Creator Intelligence Dashboard" },
      { name: "description", content: "Live overview of creators, reach, regions and outreach pipeline from Google Sheets." },
      { property: "og:title", content: "Creator Intelligence Dashboard" },
      { property: "og:description", content: "Live creator analytics synced from Google Sheets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(datasetQuery),
  component: Overview,
});

function Overview() {
  const { data } = useDataset();
  const c = data.creators;
  const s = useMemo(() => {
    const reach = c.reduce((a, x) => a + (x.followers ?? 0), 0);
    const withF = c.filter((x) => x.followers != null);
    const approached = data.status.filter((x) => x.status.toLowerCase() !== "press to start").length;
    return {
      reach,
      avg: withF.length ? Math.round(reach / withF.length) : 0,
      countries: countValues(c, (x) => x.countries, false).length,
      nationalities: countValues(c, (x) => x.nationalities, false).length,
      countryList: countValues(c, (x) => x.countries),
      natList: countValues(c, (x) => x.nationalities),
      themes: new Set(c.flatMap((x) => x.categories)).size,
      dups: findNameDuplicates(c).extra,
      approached,
      regions: countBy(c, (x) => x.region),
      platforms: countBy(c, (x) => x.platform),
      categories: countBy(c, (x) => x.categories).slice(0, 8),
      buckets: FOLLOWER_BUCKETS.map((b) => ({ name: b.label, value: c.filter((x) => bucketOf(x.followers) === b.label).length })),
      top: [...withF].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)).slice(0, 8),
      status: countBy(data.status, (x) => x.status),
    };
  }, [data, c]);

  const [pick, setPick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPick((p) => p + 1), 7000);
    return () => clearInterval(t);
  }, []);
  const spotPool = s.top.length ? [...c].filter((x) => x.notes || x.content) : [];
  const spot = spotPool.length ? spotPool[(pick * 7919) % spotPool.length] : undefined;

  const insights = [
    `Creators live in ${s.countries} countries and come from ${s.nationalities} nationalities.`,
    `${s.countryList.find((x) => x.name !== "Unknown")?.name} is the top country of residence (${s.countryList[0]?.value}).`,
    `${s.regions[0]?.name} is the largest region with ${s.regions[0]?.value} creators.`,
    `${s.platforms[0]?.name} hosts ${Math.round(((s.platforms[0]?.value ?? 0) / Math.max(1, c.length)) * 100)}% of all creators.`,
    `${s.categories[0]?.name} is the most common content theme.`,
    `${s.approached} of ${data.status.length} pipeline creators have been contacted.`,
  ];

  return (
    <>
      <PageHeader title="Overview" sub={`${c.length.toLocaleString()} creators across ${data.sheets.length - 1} regional sheets`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Total Leads" value={<CountUp value={c.length} />} sub={`${s.countries} countries`} icon={<Users className="h-4 w-4" />} />
        <Kpi label="Total reach" value={fmt(s.reach)} sub={`Avg ${fmt(s.avg)} per creator`} icon={<Sparkles className="h-4 w-4" />} delay={60} />
        <Kpi label="Regions" value={s.regions.length} sub={`Top: ${s.regions[0]?.name ?? "—"}`} icon={<Globe2 className="h-4 w-4" />} delay={120} />
        <Kpi label="Contacted" value={<CountUp value={s.approached} />} sub={`of ${data.status.length} in pipeline`} icon={<Send className="h-4 w-4" />} delay={180} />
        <Kpi label="Countries" value={<CountUp value={s.countries} />} sub={`Top: ${s.countryList.find((x) => x.name !== "Unknown")?.name ?? "—"}`} icon={<MapPin className="h-4 w-4" />} delay={240} />
        <Kpi label="Nationalities" value={<CountUp value={s.nationalities} />} sub={`Top: ${s.natList.find((x) => x.name !== "Unknown")?.name ?? "—"}`} icon={<Flag className="h-4 w-4" />} delay={300} />
        <Kpi label="Content themes" value={<CountUp value={s.themes} />} sub={`Top: ${s.categories[0]?.name ?? "—"}`} icon={<Tags className="h-4 w-4" />} delay={360} />
        <Kpi label="Duplicate entries" value={<CountUp value={s.dups} />} sub="Same name + handle in more than one row · click to view" icon={<Layers className="h-4 w-4" />} delay={420} href="/duplicates" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={`Countries of residence · ${s.countries}`}>
          <TopList items={s.countryList} total={c.length} />
        </Panel>
        <Panel title={`Nationalities · ${s.nationalities}`}>
          <TopList items={s.natList} total={c.length} />
        </Panel>
        <Panel title="Creator spotlight" action={<button onClick={() => setPick((p) => p + 1)} className="inline-flex items-center gap-1 text-xs text-primary"><Shuffle className="h-3 w-3" /> Shuffle</button>}>
          {spot && (
            <div key={spot.id} className="animate-rise">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">{spot.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0">
                  <div className="truncate font-display text-lg font-semibold">{spot.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{spot.handle} · {spot.country}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Chip tone="primary">{fmt(spot.followers)} followers</Chip>
                <Chip>{spot.platform}</Chip>
                {spot.categories.slice(0, 2).map((x) => <Chip key={x}>{x}</Chip>)}
              </div>
              <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{spot.notes || spot.content}</p>
              {firstLink(spot.links) && <a href={firstLink(spot.links)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary">Open profile →</a>}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Creators by region" className="lg:col-span-2">
          <HBars data={s.regions} />
        </Panel>
        <Panel title="Key insights">
          <ul className="space-y-3 text-sm">
            {insights.map((t) => (
              <li key={t} className="flex gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {t}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Platforms">
          <Donut data={s.platforms} />
        </Panel>
        <Panel title="Follower tiers">
          <VBars data={s.buckets} />
        </Panel>
        <Panel title="Outreach status" action={<Link to="/pipeline" className="text-xs text-primary">View pipeline →</Link>}>
          <Donut data={s.status} />
        </Panel>
        <Panel title="Top content themes" className="lg:col-span-1">
          <HBars data={s.categories} height={300} />
        </Panel>
        <Panel title="Top creators by followers" className="lg:col-span-2" action={<Link to="/creators" className="text-xs text-primary">All creators →</Link>}>
          <ol className="divide-y divide-border">
            {s.top.map((x, i) => (
              <li key={x.id} className="flex items-center gap-4 py-2.5 text-sm">
                <span className="w-5 text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{x.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {x.handle} · {x.country} · {x.platform}
                  </div>
                </div>
                <span className="font-display font-semibold text-primary">{fmt(x.followers)}</span>
                {firstLink(x.links) && (
                  <a href={firstLink(x.links)} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                    Open
                  </a>
                )}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

function TopList({ items, total }: { items: { name: string; value: number }[]; total: number }) {
  const [all, setAll] = useState(false);
  const max = items[0]?.value ?? 1;
  return (
    <div>
      <ul className={`space-y-2 overflow-y-auto pr-1 ${all ? "max-h-80" : ""}`}>
        {(all ? items : items.slice(0, 8)).map((x) => (
          <li key={x.name} className="text-sm">
            <div className="flex justify-between">
              <span className="truncate">{x.name}</span>
              <span className="text-muted-foreground">{x.value} · {Math.round((x.value / Math.max(1, total)) * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(x.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {items.length > 8 && (
        <button onClick={() => setAll(!all)} className="mt-3 text-xs text-primary">{all ? "Show less" : `Show all ${items.length}`}</button>
      )}
    </div>
  );
}
