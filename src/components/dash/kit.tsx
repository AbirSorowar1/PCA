import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCw } from "lucide-react";
import { datasetQuery, LIVE_INTERVAL_MS } from "@/lib/sheets.functions";
import { cn } from "@/lib/utils";

export const CHART_COLORS = [1, 2, 3, 4, 5, 6].map((i) => `var(--chart-${i})`);

export function useDataset() {
  return useSuspenseQuery(datasetQuery);
}

export function LiveBadge({ compact }: { compact?: boolean }) {
  const q = useDataset();
  const qc = useQueryClient();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ago = now ? Math.max(0, Math.round((now - q.dataUpdatedAt) / 1000)) : 0;
  const next = Math.max(0, Math.round(LIVE_INTERVAL_MS / 1000) - ago);
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-live" />
      </span>
      <span>
        <span className="font-semibold text-foreground">Live</span>
        {!compact && (q.isFetching ? " · syncing…" : ` · updated ${ago}s ago · next in ${next}s`)}
      </span>
      <button
        onClick={() => qc.invalidateQueries({ queryKey: datasetQuery.queryKey })}
        className="rounded-md p-1.5 transition hover:bg-accent hover:text-foreground"
        aria-label="Refresh now"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", q.isFetching && "animate-spin")} />
      </button>
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}

export function CountUp({ value, format = (n: number) => n.toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const [n, setN] = useState(value);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setN(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(n)}</>;
}

export function Kpi({ label, value, sub, icon, delay = 0, href }: { label: string; value: ReactNode; sub?: string; icon?: ReactNode; delay?: number; href?: string }) {
  const Tag = (href ? "a" : "div") as "a";
  return (
    <Tag {...(href ? { href, target: "_blank", rel: "noreferrer" } : {})} className={cn("surface animate-rise block p-5 transition duration-300 hover:-translate-y-1 hover:border-primary/40", href && "cursor-pointer")} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </Tag>
  );
}

export function Panel({ title, children, className, action }: { title: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("surface animate-rise p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 },
  labelStyle: { color: "var(--foreground)" },
  itemStyle: { color: "var(--foreground)" },
  cursor: { fill: "var(--accent)" },
};

export function HBars({ data, height = 280, onSelect }: { data: { name: string; value: number }[]; height?: number; onSelect?: (n: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={120} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} onClick={(d: { name?: string }) => d.name && onSelect?.(d.name)} className={onSelect ? "cursor-pointer" : ""}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VBars({ data, height = 260 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 240 }: { data: { name: string; value: number }[]; height?: number }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="w-full sm:w-2/5" style={{ height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm sm:w-3/5">
        {data.slice(0, 7).map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
            <span className="font-medium">{d.value}</span>
            <span className="w-10 text-right text-xs text-muted-foreground">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "primary" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "primary" ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: (string | { name: string; value: number })[] }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{label}: All</option>
      {options.map((o) => {
        const name = typeof o === "string" ? o : o.name;
        return (
          <option key={name} value={name}>
            {typeof o === "string" ? o : `${o.name} (${o.value})`}
          </option>
        );
      })}
    </select>
  );
}
