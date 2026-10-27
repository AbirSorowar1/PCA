import { Link } from "@tanstack/react-router";
import { Suspense, type ReactNode } from "react";
import { BarChart3, Database, LayoutDashboard, Users, Workflow } from "lucide-react";
import { LiveBadge } from "./kit";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/creators", label: "Creators", icon: Users },
  { to: "/pipeline", label: "Pipeline", icon: Workflow },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/data", label: "Data", icon: Database },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/70 p-5 backdrop-blur md:flex">
        <Brand />
        <nav className="mt-8 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-foreground" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-border bg-secondary/50 p-3">
          <Suspense fallback={null}>
            <LiveBadge compact />
          </Suspense>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Synced from Google Sheets every 30 seconds.</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-border bg-background/75 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 md:px-8">
            <div className="md:hidden">
              <Brand />
            </div>
            <div className="hidden text-xs text-muted-foreground md:block">Creator Route · Executive analytics</div>
            <Suspense fallback={null}>
              <LiveBadge />
            </Suspense>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-muted-foreground"
                activeProps={{ className: "bg-primary !text-primary-foreground" }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">CI</span>
      <span className="font-display text-sm font-semibold leading-tight">
        Creator
        <br />
        <span className="text-muted-foreground">Intelligence</span>
      </span>
    </Link>
  );
}
