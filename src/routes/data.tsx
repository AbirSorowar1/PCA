import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Download } from "lucide-react";
import { datasetQuery } from "@/lib/sheets.functions";
import { downloadCsv, SPREADSHEET_URL } from "@/lib/creators";
import { LiveBadge, PageHeader, Panel, useDataset } from "@/components/dash/kit";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data Sources · Creator Intelligence Dashboard" },
      { name: "description", content: "Google Sheets sync status, row counts per tab and full data export." },
      { property: "og:title", content: "Data sources & sync" },
      { property: "og:description", content: "Live Google Sheets sync status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(datasetQuery),
  component: DataPage,
});

function DataPage() {
  const { data } = useDataset();
  return (
    <>
      <PageHeader
        title="Data & sync"
        sub={`Last fetched ${new Date(data.fetchedAt).toUTCString()}`}
        actions={
          <a href={SPREADSHEET_URL} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm">
            Open Google Sheet <ExternalLink className="h-4 w-4" />
          </a>
        }
      />
      <Panel title="Sync status" action={<LiveBadge />}>
        {data.errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {data.errors.map((e) => <div key={e}>{e}</div>)}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.sheets.map((s) => (
            <div key={s.name} className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="text-xs text-muted-foreground">{s.name}</div>
              <div className="mt-1 font-display text-2xl font-semibold">{s.rows}</div>
              <div className="text-xs text-muted-foreground">rows</div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Export" className="mt-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => downloadCsv("all-creators.csv", data.creators.map(({ id: _i, raw: _r, categories, ...r }) => ({ ...r, categories: categories.join("; ") })))} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Download className="h-4 w-4" /> All creators
          </button>
          <button onClick={() => downloadCsv("creator-status.csv", data.status.map(({ id: _i, raw: _r, ...r }) => r))} className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm">
            <Download className="h-4 w-4" /> Creator status
          </button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          The dashboard reads the spreadsheet directly and never writes to it. Edits in Google Sheets appear here within about 30 seconds — no page refresh needed.
        </p>
      </Panel>
    </>
  );
}
