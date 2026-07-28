# FMS Design System — `design.md`
**Product:** Sugarcane Farm Management System (Eswatini)
**Stack:** Next.js (App Router) · TailwindCSS · Recharts · react-icons
**Version:** 1.0

---

## 1. Design Direction

**Identity:** "Cane & Ledger" — the precision of an accounting ledger rooted in the green of a growing cane field. Light, card-based, data-dense but calm. Deep cane-green (`#2E7D32`) is the brand's voice: used with discipline for primary actions, active states, and key figures — never as decoration or large background fills.

**Principles**
1. **Green is a verb.** `#2E7D32` appears where the user acts or must look: primary buttons, active nav, positive money, brand marks. If a screen has more than ~4 green elements, remove some.
2. **Paper, not gray.** Backgrounds are warm off-whites, not cold grays — the app should feel like a well-kept ledger book, distinct from generic SaaS.
3. **Brand and success share a family.** Growth, "Paid", and income naturally speak in the brand green — this reinforces the identity. Danger is unambiguous red (`#C00000`), amber = pending & harvest. Status is never conveyed by color alone (always icon + label).
4. **Numbers are the heroes.** Tabular figures, generous size for money and tonnage, small quiet labels.
5. **Offline honesty.** Every capture surface shows sync state plainly (Saved on device / Synced).

---

## 2. Color Tokens

### 2.1 Brand — Cane Green
| Token | Hex | Use |
|---|---|---|
| `brand-50` | `#EAF4EB` | Tinted backgrounds, active nav bg |
| `brand-100` | `#CFE6D2` | Hover tint, selected row |
| `brand-200` | `#A5CFAA` | Borders on brand surfaces |
| `brand-300` | `#74B37D` | Charts (secondary series) |
| `brand-400` | `#4C9A57` | Hover on primary buttons |
| `brand-500` | `#2E7D32` | **Primary.** Buttons, active states, links |
| `brand-600` | `#256B2A` | Pressed state |
| `brand-700` | `#1C5721` | Text-on-tint, dark accents |
| `brand-800` | `#144219` | — |
| `brand-900` | `#0D2E11` | Deep headings on brand surfaces |

### 2.2 Neutrals — Paper
| Token | Hex | Use |
|---|---|---|
| `paper-0` | `#FFFFFF` | Cards |
| `paper-50` | `#FAF8F5` | **App background** |
| `paper-100` | `#F2EFE9` | Hover rows, input bg |
| `paper-200` | `#E5E1D8` | Borders, dividers |
| `paper-300` | `#CFC9BC` | Disabled borders |
| `ink-400` | `#8A857A` | Placeholder, captions |
| `ink-500` | `#6B6659` | Secondary text |
| `ink-700` | `#3D3A31` | Body text |
| `ink-900` | `#211F1A` | Headings, big numbers |

### 2.3 Semantic
| Token | Hex | Use |
|---|---|---|
| `field-500` | `#2E7D32` | Success, income, growth, "Paid" (alias of brand-500) |
| `field-50` | `#EAF4EB` | Success tint (alias of brand-50) |
| `harvest-500` | `#B77816` | Warning, "Pending", harvest data |
| `harvest-50` | `#F9F1E2` | Warning tint |
| `danger-600` | `#C00000` | Errors, destructive, overdue (paired with icon) |
| `danger-50` | `#FCEBEB` | Error tint |
| `info-500` | `#1E5AA8` | Info, sync/system messages |
| `info-50` | `#E8F0FA` | Info tint |

### 2.4 Chart palette (ordered)
`#2E7D32` → `#B77816` → `#1E5AA8` → `#C00000` → `#74B37D` → `#6B6659`
Grid lines: `paper-200`. Axis text: `ink-400`, 12px.

### 2.5 Tailwind config
```ts
// tailwind.config.ts (excerpt)
extend: {
  colors: {
    brand:  { 50:'#EAF4EB',100:'#CFE6D2',200:'#A5CFAA',300:'#74B37D',
              400:'#4C9A57',500:'#2E7D32',600:'#256B2A',700:'#1C5721',
              800:'#144219',900:'#0D2E11' },
    paper:  { 0:'#FFFFFF',50:'#FAF8F5',100:'#F2EFE9',200:'#E5E1D8',300:'#CFC9BC' },
    ink:    { 400:'#8A857A',500:'#6B6659',700:'#3D3A31',900:'#211F1A' },
    field:  { 50:'#EAF4EB',500:'#2E7D32' },
    harvest:{ 50:'#F9F1E2',500:'#B77816' },
    danger: { 50:'#FCEBEB',600:'#C00000' },
    info:   { 50:'#E8F0FA',500:'#1E5AA8' },
  },
  borderRadius: { card:'14px', ctrl:'10px', pill:'999px' },
  boxShadow: {
    card:  '0 1px 2px rgba(33,31,26,.05), 0 4px 16px rgba(33,31,26,.06)',
    modal: '0 8px 40px rgba(33,31,26,.18)',
  },
  fontFamily: {
    display: ['"Bricolage Grotesque"','system-ui','sans-serif'],
    sans:    ['Inter','system-ui','sans-serif'],
    mono:    ['"IBM Plex Mono"','monospace'],
  },
}
```

> **Implementation note:** this project uses Tailwind v4, which is CSS-first. The tokens above are implemented as an `@theme` block in `app/globals.css` (generating the same `bg-brand-500`, `rounded-card`, `shadow-modal`, `font-display` utilities) rather than a `tailwind.config.ts` file. See `app/globals.css`.

---

## 3. Typography

| Role | Face | Size / weight | Use |
|---|---|---|---|
| Display | Bricolage Grotesque | 28–32px / 700 | Page titles, dashboard hero numbers |
| H2 | Bricolage Grotesque | 20px / 600 | Card titles, section heads |
| Body | Inter | 14px / 400–500 | Everything |
| Small | Inter | 12px / 500 | Labels, captions, table headers |
| **Money/data** | Inter (`tabular-nums`) or IBM Plex Mono | 14–24px / 600 | Amounts, tonnage, sucrose % |

Rules: money always `tabular-nums` and right-aligned in tables. SZL prefix small and lighter than the figure: `E` `12,450.00`. Uppercase 11px letter-spaced labels (`tracking-wide text-ink-400`) for stat card titles.

---

## 4. Spacing, Radius, Elevation

- Base unit **4px**; component padding steps: 8 / 12 / 16 / 24.
- Cards: `rounded-card bg-paper-0 shadow-card border border-paper-200 p-5`.
- Controls (inputs/buttons): `rounded-ctrl h-10` (40px), compact `h-9`.
- Page gutter: `p-6` desktop, `p-4` tablet. Card grid gap: `gap-4`.
- Only two elevations: `shadow-card` (resting) and `shadow-modal` (overlays). No hover-lift on data cards; hover changes border to `brand-200` on interactive cards only.

---

## 5. App Shell

```
┌──────────┬──────────────────────────────────────────┐
│ Sidebar  │ Topbar: breadcrumb · search · sync · ⚙ 👤│
│ 248px    ├──────────────────────────────────────────┤
│          │ Page header: Title · actions (right)     │
│ nav      │ ──────────────────────────────────────── │
│ groups   │ Content: stat row → cards/tables         │
│          │                                          │
│ tenant   │                                          │
│ switcher │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Sidebar** (`bg-paper-0 border-r border-paper-200`)
- Logo block top; nav grouped with 11px uppercase group labels (`GENERAL`, `PRODUCTION`, `FINANCE`, `ADMIN`).
- `<NavItem icon label badge? active>` — active: `bg-brand-50 text-brand-700 font-medium` with a 3px `bg-brand-500` left rail (rounded). Inactive: `text-ink-500 hover:bg-paper-100`.
- Bottom: `<TenantSwitcher>` — association avatar, name, role chip; opens popover to switch tenants.
- Collapses to 64px icon rail (`lg:` breakpoint toggle).

**Topbar** (`h-14 bg-paper-0 border-b border-paper-200`)
- `<Breadcrumbs>` left · `<GlobalSearch>` center (⌘K) · right: `<SyncStatus>` `<NotificationBell>` `<UserMenu>`.

---

## 6. Component Library

Each component lives in `/components/ui/*` (primitives) or `/components/app/*` (composed). Props listed are the required API surface.

### 6.1 Buttons
`<Button variant size icon iconRight loading disabled fullWidth>`

| Variant | Classes |
|---|---|
| `primary` | `bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600` |
| `secondary` | `bg-paper-0 border border-paper-200 text-ink-700 hover:border-brand-300 hover:text-brand-600` |
| `ghost` | `text-ink-500 hover:bg-paper-100 hover:text-ink-700` |
| `danger` | `bg-danger-600 text-white` + confirm pattern (see Modal) |

> No separate `success` variant — approve/confirm actions use `primary` (brand green *is* the success voice).

Sizes: `sm h-9 px-3 text-[13px]`, `md h-10 px-4 text-sm`, `lg h-11 px-5`. All: `rounded-ctrl font-medium inline-flex items-center gap-2 transition-colors focus-visible:ring-2 ring-brand-500 ring-offset-2 disabled:opacity-50`. Loading swaps icon for spinner, keeps width.

Related: `<IconButton>` (square, `ghost`/`secondary`), `<ButtonGroup>` (segmented, used for chart range: Day/Week/Month).

### 6.2 Form Controls
- `<Input>` — `h-10 rounded-ctrl bg-paper-0 border border-paper-200 px-3 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:ring-1 ring-brand-500`. Props: `prefix suffix error hint`. Error: `border-danger-600` + `<FieldError>` 12px danger text with alert icon.
- `<MoneyInput>` — `E` prefix, `tabular-nums`, auto thousands separators, right-aligned.
- `<NumberStepper>` — for tonnage/hours; large touch +/- (mobile-friendly).
- `<Select>` / `<Combobox>` — searchable, keyboard nav; chevron `ink-400`; option active `bg-brand-50 text-brand-700`.
- `<DatePicker>` / `<DateRangePicker>` — calendar popover; selected day `bg-brand-500 text-white rounded-pill`; range fill `bg-brand-50`. Season presets: *This season · Last season · This month*.
- `<Checkbox>` `<Radio>` — 18px, checked `bg-brand-500 border-brand-500`.
- `<Toggle>` — 36×20 track, on `bg-brand-500`.
- `<Textarea>`, `<SearchInput>` (leading magnifier, `esc` clears), `<FileUpload>` (drag-drop zone `border-dashed border-paper-300`, photo previews — receipts/delivery notes), `<OTPInput>` (6 boxes).
- `<FormRow label required hint error children>` — label 12px/500 `text-ink-700`, red asterisk; grid `md:grid-cols-[200px,1fr]` on settings pages, stacked on capture forms.

### 6.3 Cards & Stats
- `<Card title action footer padded>` — base surface; title row = H2 + right-slot (menu/filter).
- `<StatCard label value delta deltaDirection icon spark>` —
  ```
  ┌────────────────────────────┐
  │ ⬤ TOTAL DELIVERED     ⓘ   │   label: 11px uppercase ink-400
  │ 12,450 t                   │   value: 24px/700 ink-900 tabular
  │ ▲ 15.8%  vs last season    │   delta chip
  └────────────────────────────┘
  ```
  `<DeltaChip>`: up `bg-field-50 text-field-500`, down `bg-danger-50 text-danger-600`, arrow icon; *direction meaning is contextual* (`deltaDirection="downIsGood"` for costs).
- `<KpiRow>` — responsive stat grid `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`.
- `<ChartCard>` — Card + range `<ButtonGroup>` + Recharts child + `<Legend>`; fixed heights 260/320px.
- `<ProgressCard>` — quota vs delivered: label, `<ProgressBar>` (`bg-paper-100` track, `bg-brand-500` fill, `rounded-pill`), fraction text `8,120 / 11,000 t`.

### 6.4 Data Display
- `<DataTable>` — the workhorse. Header row: 12px/500 uppercase `text-ink-400 bg-paper-50 sticky top-0`; rows `border-b border-paper-100 hover:bg-paper-50`; selected `bg-brand-50/50`; money columns right-aligned tabular; row height 48px (compact 40).
  Features via props: `columns data sortable selectable pagination rowActions onRowClick stickyFirstCol emptyState loading`.
  `<RowActions>` = kebab `<IconButton>` → `<DropdownMenu>`.
- `<Pagination>` — `‹ 1 2 … 9 ›` + "Showing 1–25 of 312"; active page `bg-brand-500 text-white`.
- `<Badge variant>` — `rounded-pill px-2.5 py-0.5 text-xs font-medium`:
  | Variant | Style | Example |
  |---|---|---|
  | `success` | `bg-field-50 text-field-500` | Paid · Synced · Active |
  | `warning` | `bg-harvest-50 text-harvest-500` | Pending · Awaiting approval |
  | `danger` | `bg-danger-50 text-danger-600` | Overdue · Rejected · Failed |
  | `info` | `bg-info-50 text-info-500` | Draft · Imported |
  | `neutral` | `bg-paper-100 text-ink-500` | Archived · Ratoon 3 |
  | `brand` | `bg-brand-50 text-brand-700` | Chairman · New |
- `<StatusDot>` — 8px dot + label (sync/live states).
- `<Avatar name src size>` — initials fallback on `bg-brand-50 text-brand-700`; `<AvatarStack max=4>`.
- `<DescriptionList>` — label/value pairs for detail pages (field detail, member profile).
- `<Timeline>` — activity feed: icon node on `paper-200` rail, title, meta 12px `ink-400`. Used for audit trail & field activity log.
- `<ApprovalTrail>` — horizontal stepper: Raised → Endorsed → Approved → Paid; done nodes solid `bg-brand-500` with check, current node outlined `border-2 border-brand-500 bg-paper-0`, upcoming `bg-paper-200`.
- `<EmptyState icon title body action>` — centered, 40px icon in `bg-paper-100 rounded-pill` tile; body tells the user what to do ("No deliveries this season yet. Record the first consignment."), primary action button.
- `<Skeleton>` — `bg-paper-100 animate-pulse rounded`; provide `<StatCardSkeleton>` `<TableSkeleton rows>` `<ChartSkeleton>`.

### 6.5 Overlays & Feedback
- `<Modal size title footer>` — `rounded-card shadow-modal max-w-{md|lg|2xl}`; footer right-aligned `ghost` + `primary`. `<ConfirmDialog tone="danger">` for destructive/irreversible (payout run, delete): requires typed keyword or explicit checkbox for payouts.
- `<Drawer side="right" w=480>` — quick-view record detail (delivery, invoice) without leaving the table.
- `<Toast variant>` — bottom-right, icon + message + optional action, 5s; success `field`, error `danger` (persistent until dismissed).
- `<Banner variant dismissible>` — page-top strip: offline (`info`, "Working offline — 6 records will sync"), trial/subscription (`harvest`), error.
- `<Tooltip>` — `bg-ink-900 text-paper-0 text-xs rounded-md px-2 py-1`, 300ms delay.
- `<Popover>` / `<DropdownMenu>` — `shadow-modal rounded-card border-paper-200`; menu item `hover:bg-paper-100`, destructive item `text-danger-600`.

### 6.6 Navigation & Structure
- `<Tabs>` — underline style: active `text-brand-600 border-b-2 border-brand-500`, inactive `text-ink-500`; used on detail pages (Field → Overview | Activities | Harvests | Costs).
- `<Breadcrumbs>` — 13px, `ink-400`, current `ink-700`.
- `<PageHeader title subtitle actions backHref>` — every page starts with this; actions right (primary + overflow).
- `<Stepper>` — multi-step forms (onboarding wizard, payout run): numbered circles, done `bg-field-500` check.
- `<SectionHeading>` — 11px uppercase group label with divider, ledger-style.
- `<TenantSwitcher>`, `<UserMenu>`, `<NotificationBell badge>` (popover list w/ read state), `<SyncStatus>` (cloud icon: synced `field` / syncing spin `info` / offline `harvest` + count).

### 6.7 Charts (Recharts conventions)
Create `/lib/chartTheme.ts` exporting shared props:
```tsx
export const chart = {
  colors: ['#C00000','#2E7D32','#B77816','#1E5AA8','#DD6B6B','#6B6659'],
  grid:   { stroke:'#E5E1D8', strokeDasharray:'3 3', vertical:false },
  axis:   { stroke:'#E5E1D8', tick:{ fill:'#8A857A', fontSize:12 }, tickLine:false, axisLine:false },
  tooltip:{ contentStyle:{ borderRadius:12, border:'1px solid #E5E1D8',
            boxShadow:'0 4px 16px rgba(33,31,26,.08)', fontSize:13 } },
};
```
Wrappers (all accept `data height`):
- `<AreaTrend>` — money/tonnage over time; gradient fill `brand-500` 18%→0% opacity, 2px line, activeDot 4px.
- `<BarCompare>` — deliveries per day/field; `radius={[6,6,0,0]}`, highlight max bar `brand-500`, others `brand-100`.
- `<StackedBars>` — cost composition per field.
- `<DonutSplit>` — deduction breakdown; 60% innerRadius, center = total (Display face).
- `<SucroseLine>` — dual-axis line (tonnes bars `paper-300` + sucrose % line `brand-500`).
- Rules: no 3D, no legends when ≤2 series (label inline), always `<ResponsiveContainer>`, empty data → `<EmptyState>` inside `<ChartCard>`, mobile ticks max 5.

### 6.8 Domain Composites (`/components/app`)
- `<DeliveryRow>` — consignment #, field chips, tonnes, sucrose %, RV, mill badge, sync dot.
- `<MemberCell>` — avatar + name + role badge (table-ready).
- `<FieldCard>` — field code, ha, variety, ratoon badge, mini yield spark, status.
- `<PayoutSummaryCard>` — gross → deductions (list w/ minus signs `danger-600`) → **net** (Display face, `ink-900`).
- `<InvoicePreview>` — brand-500 accent bar, association logo, totals block; print CSS included.
- `<StatementTable>` — member statement w/ running balance column.
- `<SeasonPicker>` — global season context selector in topbar (affects all queries).

---

## 7. Icons — react-icons
Use **one set only** for coherence: **Tabler (`react-icons/tb`)** — outline, 1.5px stroke, matches the light aesthetic.
- Sizes: 16px inline/buttons, 20px nav/inputs, 24px stat cards, 40px empty states.
- Color: inherit text color; never brand-green unless the element itself is a brand action.
- Canonical picks: dashboard `TbLayoutDashboard`, fields `TbPlant2`, deliveries `TbTruck`, mill `TbBuildingFactory2`, finance `TbCash`, invoices `TbFileInvoice`, payouts `TbCoins`, members `TbUsers`, meetings `TbCalendarEvent`, inventory `TbPackage`, equipment `TbTractor`, irrigation `TbDroplet`, reports `TbChartBar`, settings `TbSettings`, sync `TbCloudCheck`/`TbCloudOff`, approve `TbCircleCheck`, warning `TbAlertTriangle`.

---

## 8. Interaction & Motion
- Transitions: `transition-colors duration-150` only, for hover/active. No entrance animations on data (feels slow on rural connections); skeletons instead.
- One signature motion: number **count-up** (400ms, ease-out) on dashboard stat values on first load — respect `prefers-reduced-motion` (render final value instantly).
- Focus: every interactive element `focus-visible:ring-2 ring-brand-500 ring-offset-2 ring-offset-paper-50`.
- Hit targets ≥ 40px on capture screens (gloved/field use).

---

## 9. Accessibility & Localization Floor
- Contrast: `brand-500` (#2E7D32) on white ≈ 5.1:1 ✓ (AA for text, AAA for large/bold); use `brand-700` for small text on `brand-50` tints.
- Status never by color alone — pair badge color with text + icon.
- All tables keyboard-navigable; modals trap focus; `aria-live` on toasts and sync status.
- Copy: sentence case, plain verbs ("Record delivery", "Run payout", "Approve expense"); buttons keep the same verb through the flow and its toast ("Payout approved").
- Currency `E 12,450.00` (SZL), dates `12 Aug 2026`, decimal point (not comma) per local convention; strings centralized for later siSwati pass.

---

## 10. File Structure
```
/components
  /ui        Button, Input, Select, DatePicker, Card, StatCard, Badge,
             DataTable, Modal, Drawer, Toast, Tabs, Tooltip, EmptyState,
             Skeleton, Avatar, Stepper, ProgressBar, Banner, ...
  /app       AppShell, Sidebar, Topbar, NavItem, TenantSwitcher, SyncStatus,
             SeasonPicker, DeliveryRow, FieldCard, PayoutSummaryCard, ...
  /charts    chartTheme.ts, AreaTrend, BarCompare, StackedBars, DonutSplit,
             SucroseLine
/lib         formatMoney.ts, formatDate.ts, cn.ts (clsx+tailwind-merge)
/styles      globals.css (font imports, CSS vars mirror of tokens)
```
- Every `/ui` primitive: typed props, `className` passthrough merged via `cn()`, no business logic.
- Storybook (or a `/design` route rendering all components) is part of Phase 1 — build the kit before the screens.

---

## 11. Do / Don't
| Do | Don't |
|---|---|
| Green for the one primary action per view | Green headers, green sidebars, full-green hero fills |
| Warm paper backgrounds | Pure `#F5F5F5` gray SaaS backgrounds |
| Tabular, right-aligned money | Centered or proportional-font figures |
| Badges + icon for status | Color-only status |
| Skeletons while loading | Spinners on full pages |
| One icon set (Tabler) | Mixing icon families |

---

## 12. Product Context

**Product:** A cloud-based, multi-tenant SaaS platform purpose-built for sugarcane grower associations and co-operative schemes in Eswatini. The system digitizes the full production-to-payment lifecycle: field and ratoon management, harvest and mill delivery tracking, sucrose-based payment reconciliation, member governance, association finances, and inventory/irrigation management.

Each association (tenant) operates in a fully isolated workspace with its own members, roles, fields, and financial records, while a System Mega Admin oversees the platform, onboarding, and subscriptions.

Core value proposition: transparency and accuracy in the delivery-to-payment chain — from tonnes cut in the field, to sucrose measured at the mill, to deductions applied, to each member's net payout.

### 12.1 Objectives
- Digitize cane production records per field, including ratoon cycles and yield history.
- Track harvest consignments and mill deliveries with tonnage and sucrose/RV data.
- Automate payment reconciliation between mill statements and grower records.
- Provide a deductions and payout engine (haulage, cutting, levies, loans, advances).
- Strengthen association governance: member registers, meetings, resolutions, committee terms.
- Manage inputs, equipment, and irrigation costs with per-field cost allocation.
- Deliver role-based, auditable access for farmers' committees, accountants, and platform administrators.
- Operate reliably in low-connectivity rural environments (offline-first mobile).

### 12.2 Users & Roles

**Tenant-level roles (per association)**

| Role | Description | Primary Platform |
|---|---|---|
| Chairman | Association head. Full read access, approves resolutions, final sign-off on major expenditures. | Web + Mobile |
| Treasurer | Approves payments, manages member accounts, oversees payouts. | Web + Mobile |
| Supervisor | Field operations: records activities, harvests, deliveries, attendance, inventory issues. | Mobile (primary) |
| Secretary | Meetings, minutes, member register maintenance, notices. | Web + Mobile |
| Member (Grower) | Read-only self-service: own plots, deliveries, statements, payout history, meeting notices. | Mobile |
| Accountant | Full financial module access: reconciliation, ledgers, reports, deduction runs. May serve multiple associations if granted access per tenant. | Web (primary) |

Roles are assigned per tenant. A user may hold different roles in different associations. Committee roles carry term dates with automatic expiry and handover.

**Platform-level role**

| Role | Description |
|---|---|
| System Mega Admin | Platform owner. Onboards associations, manages subscriptions and billing, configures global reference data (mills, levy rates, seasons), monitors system health, accesses anonymized cross-tenant analytics. Cannot view tenant financial detail without explicit support-access grant (audited). |

### 12.3 Functional Scope by Module

**Module A — Tenant & Access Management**
Association onboarding wizard (profile, scheme details, mill affiliation, season calendar); user invitation via SMS/email with role assignment; role & permission matrix (predefined + custom overrides); committee term management with expiry alerts and handover checklist; audit log of sensitive actions per tenant; tenant settings (currency, season dates, deduction types, levy rates, notification preferences).

**Module B — Cane Production & Field Management**
Field register (code, hectares, GPS/boundary, soil notes, irrigation type, variety, plot allocation); crop cycle tracking (plant crop vs ratoon number, full ratoon history, plough-out/replant); activity log per field (land prep, fertilizer, herbicide/pesticide, ripener, irrigation events); harvest planning (cutting schedule, burn permit/date, cutting contractor); daily harvest capture (tonnes cut, cutter teams, field-edge stock); yield analytics (t/ha, t sucrose/ha, ratoon decline curves, replant recommendations); photo attachments on field records.

**Module C — Mill Deliveries & Sucrose Tracking**
Consignment/delivery notes (date, fields, haulier, vehicle, tonnes, mill destination); mill result capture (tonnes accepted, sucrose %, RV/ERC, manual entry v1, mill statement import later); delivery-to-field reconciliation (variance between cut and received); season delivery dashboard (quota vs delivered, remaining allocation, daily rate); sucrose quality trends per field/season.

**Module D — Finances, Payments & Full Accounting Suite**
A complete double-entry accounting system (QuickBooks-class) built into the platform, so associations do not need separate accounting software. Cane-specific finance features (reconciliation, deductions, payouts) sit on top of a proper general ledger.

*D.1 Core Accounting (double-entry):* chart of accounts (agri/co-op template, customizable); general ledger with automatic double-entry posting and approved manual journals; Accounts Receivable (customers, quotes, branded invoicing, recurring invoices, payments, credit notes, aging, reminders); online payment acceptance (card via local gateway, MTN MoMo, EFT reference matching, auto-posted); Accounts Payable (suppliers, bills with attachments, due-date tracking, payment scheduling, supplier statements, aging); Banking (multiple bank/cash/MoMo accounts, CSV/OFX statement import, matching rules, reconciliation, transfers, petty cash); fixed asset register (depreciation schedules, automatic journals, disposals); Tax/VAT (Eswatini VAT 15%, VAT control accounts, SRA-ready return exports); Payroll (staff records, PAYE/ENPF, contractor payments, payslips, payroll journals); financial statements (trial balance, P&L, balance sheet, cash flow, GL detail, comparatives, PDF/Excel export); period management (financial year, month/year-end close with lock dates, audit-ready exports); multi-user controls (approval thresholds, immutable audit trail).

*D.2 Cane-Specific Finance (integrated with the ledger):* mill payment reconciliation (capture/import remittances, match to deliveries, flag discrepancies); deductions engine (configurable, ordered: haulage, cutting, levies, water/electricity recovery, loan repayments, retentions, advances); member payout runs (gross by plot share of sucrose value → deductions → net, treasurer approval, bank/MoMo export); member accounts (individual ledgers: earnings, deductions, advances, contributions, dividends, printable statements); expense management (raise → endorse → approve → pay, receipt attachments); income recording (non-cane income); loan register (amortization, automatic per-season deduction); budgeting (per field/association, budget vs actual); cane finance reports (payout summary, deduction summary, cost/ha, outstanding advances, loan balances, mill revenue analysis); full integration — every operational event posts ledger journals automatically.

**Module E — Members, Meetings & Governance**
Member register (ID, contact, plot/shareholding, next of kin, join date, status); meetings (AGM/committee scheduling, agenda builder, SMS/push notices, mobile check-in attendance, minutes, resolution log with voting outcomes); document vault per tenant (constitution, title/lease, mill agreements, policies); member self-service mobile (deliveries, statements, payout history, notices); announcements/notice board with push + SMS fallback.

**Module F — Inventory, Equipment & Irrigation**
Input inventory (fertilizer, chemicals, seed cane; stock in/out, reorder alerts, suppliers); purchase orders (issued → received → billed, goods-received notes updating stock and creating supplier bills); sales-linked stock (invoicing deducts stock, posts cost-of-sales); issue-to-field (every stock issue tagged to a field for per-field cost accounting); equipment register (tractors, implements, pumps; logbooks, fuel, maintenance/service, breakdowns, checkout/return); irrigation management (pump run-hours, irrigation scheduling, electricity meter readings and cost allocation, water permit/allocation tracking).

**Module G — Dashboards & Analytics**
Customizable role-based dashboards (add/remove/reorder widgets: cash position, delivery progress, AR/AP aging, budget vs actual, stock alerts — all real-time); Chairman/committee dashboard (season progress, cash position, upcoming approvals, alerts); Accountant dashboard (unreconciled deliveries, pending payout runs, expense queue); Supervisor dashboard mobile (today's cutting plan, pending captures, stock alerts); Member view (my deliveries, my estimated payout, my statement); Mega Admin analytics (tenants, active users, subscription status, anonymized regional benchmarks).

**Module H — System Mega Admin (Platform)**
Tenant lifecycle (create, activate, suspend, archive); subscription & billing management (plans, invoicing, payment status, grace periods); global reference data (mills, levy types, season templates, variety list); support-access mode (time-boxed, audited); platform monitoring (usage metrics, sync failure logs, error reporting).
