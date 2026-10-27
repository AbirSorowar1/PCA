import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { datasetQuery } from "@/lib/sheets.functions";
import { findNameDuplicates, firstLink, fmt } from "@/lib/creators";
import { PageHeader, Panel, useDataset } from "@/components/dash/kit";

export const Route = createFileRoute("/duplicates")({
  head: () => ({
    meta: [
      { title: "Duplicate Creator Names · Creator Intelligence Dashboard" },
      { name: "description", content: "Every creator name that appears in more than one row, with region and SL numbers." },
      { property: "og:title", content: "Duplicate Creator Names" },
      { property: "og:description", content: "Which region and SL numbers share the same Creator Name." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(datasetQuery),
  component: Duplicates,
});

function Duplicates() {
  const { data } = useDataset();
  const [q, setQ] = useState("");
  const d = useMemo(() => findNameDuplicates(data.creators), [data]);
  const groups = d.groups.filter((g) => !q || g.key.includes(q.toLowerCase()));

  const download = async () => {
    const XLSX = await import("xlsx");
    const rows = d.groups.flatMap((g, gi) =>
      g.items.map((x) => ({
        Group: gi + 1,
        "Creator Name": x.name,
        Region: x.region,
        SL: x.sl,
        "Matches (Region · SL)": g.items.filter((o) => o !== x).map((o) => `${o.region} · SL ${o.sl || "—"}`).join("; "),
        Handle: x.handle,
        Followers: x.followersRaw,
        Country: x.country,
        Platform: x.platform,
        "Social Media Link": x.links,
      })),
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Duplicates");
    XLSX.writeFile(wb, "duplicate-creator-names.xlsx");
  };

  return (
    <>
      <PageHeader title="Duplicate entries" sub={`${d.groups.length} names repeated · ${d.extra} extra rows`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name…" className="h-9 w-64 rounded-md border border-border bg-secondary/40 px-3 text-sm" />
        <button onClick={download} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          <Download className="h-4 w-4" /> Download XLSX
        </button>
      </div>
      <Panel title={`Matching Creator Names · ${groups.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-2">#</th><th className="p-2">Creator Name</th><th className="p-2">Region</th><th className="p-2">SL</th><th className="p-2">Matches with</th><th className="p-2">Followers</th><th className="p-2">Country</th><th className="p-2">Social Media Link</th></tr>
            </thead>
            <tbody>
              {groups.map((g, gi) =>
                g.items.map((x, i) => (
                  <tr key={x.id} className={i === 0 ? "border-t-2 border-border" : "border-t border-border/40"}>
                    <td className="p-2 text-muted-foreground">{i === 0 ? gi + 1 : ""}</td>
                    <td className="p-2 font-medium">{x.name}<div className="text-xs text-muted-foreground">{x.handle}</div></td>
                    <td className="p-2">{x.region}</td>
                    <td className="p-2 font-display text-primary">{x.sl || "—"}</td>
                    <td className="p-2 text-xs text-muted-foreground">{g.items.filter((o) => o !== x).map((o) => `${o.region} · SL ${o.sl || "—"}`).join(", ")}</td>
                    <td className="p-2">{fmt(x.followers)}</td>
                    <td className="p-2">{x.country}</td>
                    <td className="p-2 text-xs">{firstLink(x.links) ? <a href={firstLink(x.links)} target="_blank" rel="noreferrer" className="text-primary hover:underline">{firstLink(x.links)}</a> : x.links || "—"}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
