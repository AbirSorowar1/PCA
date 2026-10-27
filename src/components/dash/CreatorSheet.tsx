import { ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { firstLink, fmt, type Creator } from "@/lib/creators";
import { Chip } from "./kit";

export function CreatorSheet({ creator, onClose }: { creator: Creator | null; onClose: () => void }) {
  const link = creator ? firstLink(creator.links) : "";
  return (
    <Sheet open={!!creator} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-md">
        {creator && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">{creator.name}</SheetTitle>
              <p className="text-sm text-muted-foreground">{creator.handle}</p>
            </SheetHeader>
            <div className="mt-4 flex flex-wrap gap-1.5 px-4">
              <Chip tone="primary">{creator.platform}</Chip>
              <Chip>{creator.region}</Chip>
              {creator.categories.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 px-4">
              {[
                ["Followers", fmt(creator.followers)],
                ["Gender", creator.gender],
                ["Nationality", creator.nationality],
                ["Residence", creator.country],
                ["Contact", creator.contact || "—"],
                ["Serial", creator.sl || "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border bg-secondary/50 p-3">
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="mt-1 break-words text-sm font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-4 px-4 py-6 text-sm">
              <div>
                <h4 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Type of content</h4>
                <p>{creator.content || "—"}</p>
              </div>
              {creator.notes && (
                <div>
                  <h4 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Notes</h4>
                  <p className="leading-relaxed text-muted-foreground">{creator.notes}</p>
                </div>
              )}
              {link && (
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">
                  Open profile <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
