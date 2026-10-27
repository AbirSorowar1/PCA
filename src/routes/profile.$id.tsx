import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { datasetQuery } from "@/lib/sheets.functions";
import { dupKey, firstLink, SPREADSHEET_URL } from "@/lib/creators";
import { Chip, Panel, useDataset } from "@/components/dash/kit";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Creator profile · Creator Intelligence Dashboard" },
      { name: "description", content: "Everything the Google Sheet knows about this creator, in one place." },
      { property: "og:title", content: "Creator profile" },
      { property: "og:description", content: "Full creator details from the live Google Sheet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(datasetQuery);
    const found = data.status.some((s) => s.id === params.id) || data.creators.some((c) => c.id === params.id);
    if (!found) throw notFound();
  },
  notFoundComponent: () => (
    <div className="surface p-8 text-center">
      <p className="text-lg font-semibold">Profile not found</p>
      <p className="mt-1 text-sm text-muted-foreground">The sheet may have changed since you opened this link.</p>
      <Link to="/pipeline" className="mt-4 inline-block text-primary">Back to pipeline</Link>
    </div>
  ),
  component: ProfilePage,
});

function Fields({ raw }: { raw: Record<string, string> }) {
  const entries = Object.entries(raw);
  if (!entries.length) return <p className="text-sm text-muted-foreground">No data in this row.</p>;
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-border bg-secondary/50 p-3">
          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">
            {/^https?:\/\//.test(v) ? (
              <a href={v} target="_blank" rel="noreferrer" className="text-primary hover:underline">{v}</a>
            ) : (
              v
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ProfilePage() {
  const { id } = Route.useParams();
  const { data } = useDataset();
  const status = data.status.find((s) => s.id === id);
  const creator = data.creators.find((c) => c.id === id);
  const subject = status ?? creator;
  if (!subject) return null;

  const key = dupKey(subject);
  const otherStatus = data.status.filter((s) => s.id !== id && dupKey(s) === key);
  const regional = data.creators.filter((c) => c.id !== id && dupKey(c) === key);
  const link = firstLink(subject.links);

  return (
    <>
      <Link to="/pipeline" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Pipeline
      </Link>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">{subject.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subject.handle}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {status && <Chip tone="primary">{status.status}</Chip>}
            {status && <Chip>{status.messaging}</Chip>}
            {creator && <Chip tone="primary">{creator.platform}</Chip>}
            {creator && <Chip>{creator.region}</Chip>}
            {subject.gender !== "Unknown" && <Chip>{subject.gender}</Chip>}
            {subject.countries.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Open social profile <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <a href={SPREADSHEET_URL} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-secondary px-4 text-sm">
            Open sheet <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="grid gap-4">
        <Panel title={status ? "Pipeline sheet (CreatorStatus)" : `Regional sheet (${creator?.region})`}>
          <Fields raw={subject.raw} />
        </Panel>

        {otherStatus.map((s) => (
          <Panel
            key={s.id}
            title="Another pipeline entry for this creator"
            action={<Link to="/profile/$id" params={{ id: s.id }} target="_blank" className="text-xs text-primary">Open</Link>}
          >
            <Fields raw={s.raw} />
          </Panel>
        ))}

        {regional.map((c) => (
          <Panel
            key={c.id}
            title={`Also in regional sheet: ${c.region}`}
            action={<Link to="/profile/$id" params={{ id: c.id }} target="_blank" className="text-xs text-primary">Open</Link>}
          >
            <Fields raw={c.raw} />
          </Panel>
        ))}
        {status && !regional.length && (
          <p className="text-xs text-muted-foreground">No matching row found in the regional sheets for this creator.</p>
        )}
      </div>
    </>
  );
}
