"use client";

import { TbLeaf, TbBook2, TbNumbers, TbWifiOff } from "react-icons/tb";
import { Section, Swatch, Demo } from "./Section";
import { AppShell } from "@/components/app/AppShell";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { ProgressCard } from "@/components/ui/ProgressCard";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, formatTonnes } from "@/lib/formatMoney";

const PRINCIPLES = [
  { icon: <TbLeaf />, title: "Green is a verb", body: "Brand green marks primary actions and figures the user must look at — never decoration." },
  { icon: <TbBook2 />, title: "Paper, not gray", body: "Warm off-white backgrounds — a ledger book, not generic SaaS gray." },
  { icon: <TbNumbers />, title: "Numbers are heroes", body: "Tabular figures, generous size for money and tonnage, small quiet labels." },
  { icon: <TbWifiOff />, title: "Offline honesty", body: "Every capture surface shows sync state plainly — saved on device or synced." },
];

const BRAND = [
  { name: "brand-50", hex: "#EAF4EB", className: "bg-brand-50" },
  { name: "brand-100", hex: "#CFE6D2", className: "bg-brand-100" },
  { name: "brand-200", hex: "#A5CFAA", className: "bg-brand-200" },
  { name: "brand-300", hex: "#74B37D", className: "bg-brand-300" },
  { name: "brand-400", hex: "#4C9A57", className: "bg-brand-400" },
  { name: "brand-500", hex: "#2E7D32", className: "bg-brand-500" },
  { name: "brand-600", hex: "#256B2A", className: "bg-brand-600" },
  { name: "brand-700", hex: "#1C5721", className: "bg-brand-700" },
  { name: "brand-800", hex: "#144219", className: "bg-brand-800" },
  { name: "brand-900", hex: "#0D2E11", className: "bg-brand-900" },
];

const PAPER = [
  { name: "paper-0", hex: "#FFFFFF", className: "bg-paper-0" },
  { name: "paper-50", hex: "#FAF8F5", className: "bg-paper-50" },
  { name: "paper-100", hex: "#F2EFE9", className: "bg-paper-100" },
  { name: "paper-200", hex: "#E5E1D8", className: "bg-paper-200" },
  { name: "paper-300", hex: "#CFC9BC", className: "bg-paper-300" },
];

const INK = [
  { name: "ink-400", hex: "#8A857A", className: "bg-ink-400" },
  { name: "ink-500", hex: "#6B6659", className: "bg-ink-500" },
  { name: "ink-700", hex: "#3D3A31", className: "bg-ink-700" },
  { name: "ink-900", hex: "#211F1A", className: "bg-ink-900" },
];

const SEMANTIC = [
  { name: "field-500", hex: "#2E7D32", className: "bg-field-500" },
  { name: "harvest-500", hex: "#B77816", className: "bg-harvest-500" },
  { name: "danger-600", hex: "#C00000", className: "bg-danger-600" },
  { name: "info-500", hex: "#1E5AA8", className: "bg-info-500" },
];

const SPARK = [
  { season: "22/23", yield: 68 },
  { season: "23/24", yield: 74 },
  { season: "24/25", yield: 71 },
  { season: "25/26", yield: 82 },
  { season: "26/27", yield: 88 },
];

export function DirectionSection() {
  return (
    <Section
      id="direction"
      title="Design Direction — Cane & Ledger"
      description="The precision of an accounting ledger, rooted in the green of a growing cane field. Light, card-based, data-dense but calm. Deep cane-green is the brand's voice — used with discipline, never as decoration."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="rounded-card border border-paper-200 bg-paper-0 p-4 shadow-card">
            <span className="flex size-9 items-center justify-center rounded-ctrl bg-brand-50 text-brand-600 [&>svg]:size-5">
              {p.icon}
            </span>
            <p className="mt-3 text-sm font-semibold text-ink-900">{p.title}</p>
            <p className="mt-1 text-xs text-ink-500">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function ColorSection() {
  return (
    <Section id="color" title="Color Tokens" description="Brand green used with discipline, warm paper neutrals, and unambiguous semantic colors — status is never conveyed by color alone.">
      <Swatch title="Brand — Cane Green" items={BRAND} />
      <Swatch title="Neutrals — Paper" items={PAPER} />
      <Swatch title="Ink (text)" items={INK} />
      <Swatch title="Semantic" items={SEMANTIC} />
    </Section>
  );
}

export function TypographySection() {
  return (
    <Section id="typography" title="Typography" description="Bricolage Grotesque for display, Inter for body and UI, tabular figures for every number.">
      <Demo>
        <p className="font-display text-[32px] font-bold text-ink-900">Display 32 / 700</p>
        <p className="mt-2 font-display text-[20px] font-semibold text-ink-900">H2 20 / 600 — Card titles, section heads</p>
        <p className="mt-2 text-sm text-ink-700">Body 14 / 400–500 — Inter, used everywhere for interface copy.</p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-400">Small 12 / 500 — labels, captions, table headers</p>
        <p className="mt-3 font-mono text-2xl font-semibold tabular-nums text-ink-900">
          E {formatMoney(12450)}
        </p>
        <p className="text-xs text-ink-400">Money/data — tabular-nums, right-aligned in tables. SZL prefix small and lighter.</p>
      </Demo>
    </Section>
  );
}

export function SpacingSection() {
  return (
    <Section id="spacing" title="Spacing, Radius & Elevation" description="4px base unit. Two elevations only: resting card shadow and modal shadow.">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
          <p className="text-sm font-medium text-ink-900">shadow-card</p>
          <p className="mt-1 text-xs text-ink-400">rounded-card · resting surfaces</p>
        </div>
        <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-modal">
          <p className="text-sm font-medium text-ink-900">shadow-modal</p>
          <p className="mt-1 text-xs text-ink-400">Overlays — modal, drawer, popover</p>
        </div>
        <div className="rounded-card border border-brand-200 bg-paper-0 p-5 shadow-card transition-colors">
          <p className="text-sm font-medium text-ink-900">Interactive hover</p>
          <p className="mt-1 text-xs text-ink-400">Border → brand-200, no lift</p>
        </div>
      </div>
    </Section>
  );
}

export function AppShellSection() {
  return (
    <Section id="shell" title="App Shell" description="Sidebar with grouped navigation and tenant switcher · Topbar with breadcrumb, search, sync status, notifications, and user menu.">
      <AppShell crumbs={[{ label: "Dashboard" }]}>
        <div className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Season overview</h1>
            <p className="text-sm text-ink-500">2026/27 · Ka-Lavumisa Growers Association</p>
          </div>
          <KpiRow>
            <StatCard label="Total delivered" value={12450} formatValue={(v) => formatTonnes(v, 0)} delta={15.8} icon={<Badge variant="brand">t</Badge>} />
            <StatCard label="Cash position" value={842300} formatValue={(v) => `E ${formatMoney(v)}`} delta={4.2} />
            <StatCard label="Avg sucrose %" value={14.6} formatValue={(v) => `${v.toFixed(1)}%`} delta={-1.1} deltaDirection="downIsGood" />
            <StatCard label="Cost / ha" value={3120} formatValue={(v) => `E ${formatMoney(v)}`} delta={-3.4} deltaDirection="downIsGood" />
          </KpiRow>
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Delivery trend" className="lg:col-span-2">
              <AreaTrend data={SPARK} xKey="season" yKey="yield" height={200} />
            </ChartCard>
            <ProgressCard label="Season quota" value={8120} max={11000} />
          </div>
        </div>
      </AppShell>
    </Section>
  );
}
