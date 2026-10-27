<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Data comes from the public Google Sheet via `getDataset` server fn (gviz CSV export, all tabs in parallel), polled by react-query every 30s — no database; the sheet is the single source of truth and is never written to.
- Sheet parsing/normalisation lives in `src/lib/creators.ts` (pure, tested) so header synonyms and follower rules stay in one place.
