import { TbCash, TbClipboardCheck, TbFileInvoice, TbNotes, TbTractor } from "react-icons/tb";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InventoryItemCategory } from "@/lib/database.types";
import { formatDate } from "@/lib/formatDate";
import { formatMoney, formatTonnes } from "@/lib/formatMoney";
import type { ApprovalQueueItem } from "@/components/dashboard/ApprovalQueueCard";
import type { AlertItem } from "@/components/dashboard/AlertsCard";
import type { TimelineItem } from "@/components/ui/Timeline";

type Supabase = SupabaseClient<Database>;

const DAY_MS = 86_400_000;
const CASH_ACCOUNT_CODES = ["1000", "1010"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

async function getSeasonWindow(supabase: Supabase, tenantId: string) {
  const { data: settings } = await supabase
    .from("tenant_settings")
    .select("season_start, season_end, season_quota_tonnes")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const currentYear = new Date().getFullYear();
  const seasonStart = settings?.season_start ?? `${currentYear}-01-01`;
  const seasonEnd = settings?.season_end ?? `${currentYear}-12-31`;
  return { seasonStart, seasonEnd, seasonQuotaTonnes: settings?.season_quota_tonnes ?? null };
}

interface CashPosition {
  cashOnHand: number;
  cashAvailable: boolean;
  weeklyTrend: { week: string; balance: number }[];
}

// Cash/bank balance derived straight from posted journal lines against the
// default chart of accounts' cash codes (see 0004_finance_core.sql §5) — the
// same debit-normal balance math ReportsSection.tsx uses for the balance
// sheet, just narrowed to the cash/bank accounts.
async function getCashPosition(supabase: Supabase, tenantId: string): Promise<CashPosition> {
  const { data: cashAccounts } = await supabase.from("accounts").select("id").eq("tenant_id", tenantId).in("code", CASH_ACCOUNT_CODES);
  const accountIds = (cashAccounts ?? []).map((a) => a.id);

  if (accountIds.length === 0) {
    return { cashOnHand: 0, cashAvailable: false, weeklyTrend: [] };
  }

  const { data: rawLines } = await supabase
    .from("journal_lines")
    .select("debit, credit, journal_entries!inner(entry_date, status, tenant_id)")
    .in("account_id", accountIds)
    .eq("journal_entries.tenant_id", tenantId)
    .eq("journal_entries.status", "posted");

  const lines = ((rawLines as unknown as { debit: number; credit: number; journal_entries: { entry_date: string } }[]) ?? []).map((l) => ({
    debit: Number(l.debit),
    credit: Number(l.credit),
    entry_date: l.journal_entries.entry_date,
  }));

  const cashOnHand = lines.reduce((sum, l) => sum + (l.debit - l.credit), 0);

  const weeklyTrend: { week: string; balance: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const cutoff = new Date(Date.now() - i * 7 * DAY_MS).toISOString().slice(0, 10);
    const balance = lines.filter((l) => l.entry_date <= cutoff).reduce((sum, l) => sum + (l.debit - l.credit), 0);
    weeklyTrend.push({ week: formatDate(cutoff, { year: undefined }), balance });
  }

  return { cashOnHand, cashAvailable: true, weeklyTrend };
}

// ---------------------------------------------------------------------------
// Committee (chairman / treasurer / secretary)
// ---------------------------------------------------------------------------

export interface CommitteeDashboardData {
  seasonStart: string;
  seasonEnd: string;
  seasonQuotaTonnes: number | null;
  deliveredTonnes: number;
  daysRemaining: number;
  cashOnHand: number;
  cashAvailable: boolean;
  cashTrend: { week: string; balance: number }[];
  membersActive: number;
  pendingApprovalsCount: number;
  approvalItems: ApprovalQueueItem[];
  alerts: AlertItem[];
  activity: TimelineItem[];
}

export async function getCommitteeDashboardData(supabase: Supabase, tenantId: string): Promise<CommitteeDashboardData> {
  const { seasonStart, seasonEnd, seasonQuotaTonnes } = await getSeasonWindow(supabase, tenantId);

  const [
    { data: seasonDeliveries },
    { count: membersActive },
    { data: draftEntries },
    { data: draftRuns },
    { data: recentMeetings },
    { data: expiringMemberships },
    { data: reconciliation },
    { data: auditRows },
    { data: fieldRows },
    { data: memberRows },
    cash,
  ] = await Promise.all([
    supabase.from("delivery_details").select("tonnes_accepted, field_code").eq("tenant_id", tenantId).gte("delivery_date", seasonStart).lte("delivery_date", seasonEnd),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
    supabase.from("journal_entries").select("id, entry_no, memo, entry_date").eq("tenant_id", tenantId).eq("status", "draft").order("entry_date", { ascending: true }).limit(5),
    supabase.from("payout_runs").select("id, run_no, title, run_date, gross_pool").eq("tenant_id", tenantId).eq("status", "draft").order("run_date", { ascending: true }).limit(5),
    supabase.from("meetings").select("id, title, starts_at").eq("tenant_id", tenantId).order("starts_at", { ascending: false }).limit(20),
    supabase
      .from("memberships")
      .select("id, role, term_end")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .not("term_end", "is", null)
      .gte("term_end", todayIso())
      .lte("term_end", isoDaysFromNow(30)),
    supabase.from("field_delivery_reconciliation").select("field_code, recovery_pct, variance_tonnes").eq("tenant_id", tenantId),
    supabase.from("audit_log").select("id, action, entity, entity_id, actor_id, created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(10),
    supabase.from("fields").select("code, member_id").eq("tenant_id", tenantId),
    supabase.from("members").select("id, full_name").eq("tenant_id", tenantId).eq("status", "active"),
    getCashPosition(supabase, tenantId),
  ]);

  const deliveredTonnes = (seasonDeliveries ?? []).reduce((sum, d) => sum + (d.tonnes_accepted ?? 0), 0);
  const daysRemaining = Math.max(0, Math.ceil((new Date(seasonEnd).getTime() - Date.now()) / DAY_MS));

  const meetingIds = (recentMeetings ?? []).map((m) => m.id);
  const { data: submittedMinutes } = meetingIds.length
    ? await supabase.from("minutes").select("meeting_id").in("meeting_id", meetingIds).eq("status", "submitted")
    : { data: [] as { meeting_id: string }[] };
  const meetingById = new Map((recentMeetings ?? []).map((m) => [m.id, m]));

  const approvalItems: ApprovalQueueItem[] = [
    ...(draftEntries ?? []).map((e) => ({
      icon: <TbFileInvoice />,
      label: e.memo ?? `Journal entry ${e.entry_no}`,
      meta: `Awaiting posting · ${formatDate(e.entry_date)}`,
      href: `/finance/journal/${e.id}`,
      urgency: "none" as const,
    })),
    ...(draftRuns ?? []).map((r) => ({
      icon: <TbCash />,
      label: `${r.title} (${r.run_no})`,
      meta: `Awaiting treasurer approval · ${formatMoney(r.gross_pool, { withPrefix: true })}`,
      href: `/finance/payouts/${r.id}`,
      urgency: "harvest" as const,
    })),
    ...(submittedMinutes ?? []).flatMap((m) => {
      const meeting = meetingById.get(m.meeting_id);
      if (!meeting) return [];
      return [
        {
          icon: <TbNotes />,
          label: `Minutes — ${meeting.title}`,
          meta: "Awaiting chairman approval",
          href: `/meetings/${meeting.id}`,
          urgency: "none" as const,
        },
      ];
    }),
  ];

  const alerts: AlertItem[] = [];

  for (const m of expiringMemberships ?? []) {
    alerts.push({
      label: `${m.role.charAt(0).toUpperCase() + m.role.slice(1)} term expiring ${formatDate(m.term_end!)}`,
      meta: "Committee term ending soon",
      href: "/members",
      severity: "warning",
    });
  }

  const flaggedFields = (reconciliation ?? []).filter((r) => r.recovery_pct != null && r.recovery_pct < 95);
  for (const f of flaggedFields.slice(0, 3)) {
    alerts.push({
      label: `Field ${f.field_code} — mill recovery ${f.recovery_pct?.toFixed(1)}%`,
      meta: "Below expected recovery rate — review dispatch and mill results",
      href: "/mill/deliveries",
      severity: "danger",
    });
  }

  const fieldToMember = new Map((fieldRows ?? []).map((f) => [f.code, f.member_id]));
  const tonnesByMember = new Map<string, number>();
  for (const d of seasonDeliveries ?? []) {
    const memberId = fieldToMember.get(d.field_code);
    if (!memberId) continue;
    tonnesByMember.set(memberId, (tonnesByMember.get(memberId) ?? 0) + (d.tonnes_accepted ?? 0));
  }
  const producingMemberIds = [...new Set((fieldRows ?? []).filter((f) => f.member_id).map((f) => f.member_id as string))];
  const totalDelivered = producingMemberIds.reduce((sum, id) => sum + (tonnesByMember.get(id) ?? 0), 0);
  const average = producingMemberIds.length ? totalDelivered / producingMemberIds.length : 0;
  const memberNameById = new Map((memberRows ?? []).map((m) => [m.id, m.full_name]));

  const laggingMembers = producingMemberIds
    .filter((id) => average > 0 && (tonnesByMember.get(id) ?? 0) < average * 0.5 && memberNameById.has(id))
    .sort((a, b) => (tonnesByMember.get(a) ?? 0) - (tonnesByMember.get(b) ?? 0))
    .slice(0, 3);

  for (const id of laggingMembers) {
    alerts.push({
      label: `${memberNameById.get(id)} is behind on deliveries this season`,
      meta: `${formatTonnes(tonnesByMember.get(id) ?? 0)} vs association average ${formatTonnes(average)}`,
      href: "/members",
      severity: "warning",
    });
  }

  const actorIds = [...new Set((auditRows ?? []).map((a) => a.actor_id).filter((id): id is string => !!id))];
  const { data: actorProfiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const actorNameById = new Map((actorProfiles ?? []).map((p) => [p.id, p.full_name ?? "Someone"]));

  const activity: TimelineItem[] = (auditRows ?? []).map((a) => ({
    icon: <TbClipboardCheck />,
    title: `${a.action.charAt(0).toUpperCase() + a.action.slice(1)} ${a.entity.replace(/_/g, " ")}`,
    meta: formatDate(a.created_at),
    description: a.actor_id ? actorNameById.get(a.actor_id) : undefined,
  }));

  return {
    seasonStart,
    seasonEnd,
    seasonQuotaTonnes,
    deliveredTonnes,
    daysRemaining,
    cashOnHand: cash.cashOnHand,
    cashAvailable: cash.cashAvailable,
    cashTrend: cash.weeklyTrend,
    membersActive: membersActive ?? 0,
    pendingApprovalsCount: approvalItems.length,
    approvalItems,
    alerts,
    activity,
  };
}

// ---------------------------------------------------------------------------
// Accountant
// ---------------------------------------------------------------------------

export interface AccountantDashboardData {
  unreconciledCount: number;
  pendingPayoutRuns: number;
  overdueInvoicesCount: number;
  overdueBillsCount: number;
  reconciliationQueue: { id: string; deliveryNo: string; fieldCode: string; date: string; sucrosePct: number | null }[];
  cashOnHand: number;
  cashAvailable: boolean;
  cashTrend: { week: string; balance: number }[];
  actionItems: ApprovalQueueItem[];
  alerts: AlertItem[];
  activity: TimelineItem[];
}

export async function getAccountantDashboardData(supabase: Supabase, tenantId: string): Promise<AccountantDashboardData> {
  const { seasonStart, seasonEnd } = await getSeasonWindow(supabase, tenantId);
  const today = todayIso();
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS).toISOString().slice(0, 10);

  const [
    { data: seasonDeliveries },
    { count: pendingPayoutRuns },
    { data: overdueInvoices },
    { data: openBills },
    { data: draftEntries },
    { data: settings },
    { data: recentEntries },
    cash,
  ] = await Promise.all([
    supabase
      .from("delivery_details")
      .select("id, delivery_no, field_code, delivery_date, status, sucrose_pct")
      .eq("tenant_id", tenantId)
      .gte("delivery_date", seasonStart)
      .lte("delivery_date", seasonEnd)
      .order("delivery_date", { ascending: false }),
    supabase.from("payout_runs").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "draft"),
    supabase.from("invoices").select("id, invoice_no, due_date").eq("tenant_id", tenantId).in("status", ["sent", "partial"]).lte("due_date", today),
    supabase.from("supplier_bills").select("id, bill_no, bill_date, amount").eq("tenant_id", tenantId).eq("status", "open").lte("bill_date", thirtyDaysAgo),
    supabase.from("journal_entries").select("id, entry_no, memo, entry_date").eq("tenant_id", tenantId).eq("status", "draft").order("entry_date", { ascending: true }).limit(6),
    supabase.from("tenant_settings").select("vat_registered").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("journal_entries").select("id, entry_no, memo, status, entry_date, updated_at").eq("tenant_id", tenantId).order("updated_at", { ascending: false }).limit(10),
    getCashPosition(supabase, tenantId),
  ]);

  const unreconciledCount = (seasonDeliveries ?? []).filter((d) => d.status !== "reconciled").length;
  const reconciliationQueue = (seasonDeliveries ?? [])
    .filter((d) => d.status === "result_captured")
    .slice(0, 8)
    .map((d) => ({ id: d.id, deliveryNo: d.delivery_no, fieldCode: d.field_code, date: d.delivery_date, sucrosePct: d.sucrose_pct }));

  const actionItems: ApprovalQueueItem[] = [
    ...(draftEntries ?? []).map((e) => ({
      icon: <TbFileInvoice />,
      label: e.memo ?? `Journal entry ${e.entry_no}`,
      meta: `Awaiting chairman/treasurer posting · ${formatDate(e.entry_date)}`,
      href: `/finance/journal/${e.id}`,
      urgency: "none" as const,
    })),
    ...(overdueInvoices ?? []).slice(0, 6).map((inv) => ({
      icon: <TbFileInvoice />,
      label: `Invoice ${inv.invoice_no} overdue`,
      meta: `Due ${formatDate(inv.due_date)} — send a reminder`,
      href: `/finance/receivables/${inv.id}`,
      urgency: "danger" as const,
    })),
  ];

  const alerts: AlertItem[] = [];

  if (settings?.vat_registered) {
    const now = new Date();
    const vatDue = new Date(now.getFullYear(), now.getMonth(), 25);
    if (vatDue.getTime() < now.getTime()) vatDue.setMonth(vatDue.getMonth() + 1);
    const daysUntil = Math.ceil((vatDue.getTime() - now.getTime()) / DAY_MS);
    if (daysUntil <= 10) {
      alerts.push({
        label: `VAT return due ${formatDate(vatDue)}`,
        meta: daysUntil <= 0 ? "Due today" : `${daysUntil} day${daysUntil === 1 ? "" : "s"} remaining`,
        href: "/finance/reports",
        severity: daysUntil <= 3 ? "danger" : "warning",
      });
    }
  }

  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  const daysToClose = Math.ceil((monthEnd.getTime() - Date.now()) / DAY_MS);
  if (daysToClose <= 5) {
    alerts.push({
      label: "Period close approaching",
      meta: `${daysToClose} day${daysToClose === 1 ? "" : "s"} left in ${monthEnd.toLocaleString("en-GB", { month: "long" })}`,
      href: "/finance/reports",
      severity: "info",
    });
  }

  if ((openBills ?? []).length > 0) {
    const total = (openBills ?? []).reduce((sum, b) => sum + b.amount, 0);
    alerts.push({
      label: `${openBills!.length} supplier bill${openBills!.length === 1 ? "" : "s"} open 30+ days`,
      meta: `${formatMoney(total, { withPrefix: true })} outstanding`,
      href: "/inventory/bills",
      severity: "warning",
    });
  }

  const activity: TimelineItem[] = (recentEntries ?? []).map((e) => ({
    icon: e.status === "posted" ? <TbClipboardCheck /> : <TbFileInvoice />,
    title: e.memo ?? `Journal entry ${e.entry_no}`,
    meta: formatDate(e.entry_date),
    description: e.status === "posted" ? "Posted" : "Draft",
  }));

  return {
    unreconciledCount,
    pendingPayoutRuns: pendingPayoutRuns ?? 0,
    overdueInvoicesCount: (overdueInvoices ?? []).length,
    overdueBillsCount: (openBills ?? []).length,
    reconciliationQueue,
    cashOnHand: cash.cashOnHand,
    cashAvailable: cash.cashAvailable,
    cashTrend: cash.weeklyTrend,
    actionItems,
    alerts,
    activity,
  };
}

// ---------------------------------------------------------------------------
// Supervisor
// ---------------------------------------------------------------------------

export interface SupervisorDashboardData {
  fieldsDueForHarvest: number;
  activitiesLoggedToday: number;
  stockItemsLow: number;
  equipmentDueForService: number;
  cuttingPlan: { id: string; fieldCode: string; status: string; cuttingDatePlanned: string | null; tonnesCutToday: number }[];
  harvestByDay: { date: string; tonnes: number }[];
  syncPendingCount: number;
  alerts: AlertItem[];
  activity: TimelineItem[];
}

const EQUIPMENT_CATEGORIES: InventoryItemCategory[] = ["equipment", "vehicle", "plant_equipment"];

export async function getSupervisorDashboardData(supabase: Supabase, tenantId: string, userId: string): Promise<SupervisorDashboardData> {
  const today = todayIso();
  const fourteenDaysAgo = new Date(Date.now() - 13 * DAY_MS).toISOString().slice(0, 10);

  const [
    { count: fieldsDueForHarvest },
    { count: activitiesLoggedToday },
    { data: stockItems },
    { data: equipmentItems },
    { data: harvestPlans },
    { data: fieldRows },
    { data: harvestCapturesRows },
    { data: myRecentCaptures },
  ] = await Promise.all([
    supabase.from("crop_cycles").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "ready_to_harvest"),
    supabase.from("field_activities").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("activity_date", today),
    supabase.from("inventory_items").select("id, sku, name, quantity_on_hand, reorder_level").eq("tenant_id", tenantId).eq("is_active", true),
    supabase.from("inventory_items").select("id, name, condition, category").eq("tenant_id", tenantId).eq("is_active", true).in("category", EQUIPMENT_CATEGORIES),
    supabase
      .from("harvest_plans")
      .select("id, field_id, status, cutting_date_planned")
      .eq("tenant_id", tenantId)
      .in("status", ["planned", "burn_scheduled", "cutting"])
      .order("cutting_date_planned", { ascending: true })
      .limit(10),
    supabase.from("fields").select("id, code").eq("tenant_id", tenantId),
    supabase.from("harvest_captures").select("field_id, capture_date, tonnes_cut").eq("tenant_id", tenantId).gte("capture_date", fourteenDaysAgo),
    supabase
      .from("harvest_captures")
      .select("id, field_id, capture_date, tonnes_cut")
      .eq("tenant_id", tenantId)
      .eq("created_by", userId)
      .order("capture_date", { ascending: false })
      .limit(6),
  ]);

  const fieldCodeById = new Map((fieldRows ?? []).map((f) => [f.id, f.code]));

  const lowStock = (stockItems ?? []).filter((i) => i.quantity_on_hand <= i.reorder_level);
  const dueEquipment = (equipmentItems ?? []).filter((i) => i.condition === "poor" || i.condition === "out_of_service");

  const tonnesTodayByField = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const c of harvestCapturesRows ?? []) {
    byDay.set(c.capture_date, (byDay.get(c.capture_date) ?? 0) + (c.tonnes_cut ?? 0));
    if (c.capture_date === today) {
      tonnesTodayByField.set(c.field_id, (tonnesTodayByField.get(c.field_id) ?? 0) + (c.tonnes_cut ?? 0));
    }
  }

  const cuttingPlan = (harvestPlans ?? []).map((p) => ({
    id: p.id,
    fieldCode: fieldCodeById.get(p.field_id) ?? "—",
    status: p.status,
    cuttingDatePlanned: p.cutting_date_planned,
    tonnesCutToday: tonnesTodayByField.get(p.field_id) ?? 0,
  }));

  const harvestByDay: { date: string; tonnes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    harvestByDay.push({ date: formatDate(d, { year: undefined }), tonnes: byDay.get(d) ?? 0 });
  }

  const alerts: AlertItem[] = [
    ...lowStock.slice(0, 4).map((i) => ({
      label: `${i.name} low on stock`,
      meta: `${i.quantity_on_hand} on hand (${i.sku}) — reorder level ${i.reorder_level}`,
      href: "/inventory/items",
      severity: "warning" as const,
    })),
    ...dueEquipment.slice(0, 4).map((i) => ({
      label: `${i.name} needs maintenance`,
      meta: `Condition: ${i.condition?.replace(/_/g, " ")}`,
      href: "/inventory/items",
      severity: "danger" as const,
    })),
  ];

  const activity: TimelineItem[] = (myRecentCaptures ?? []).map((c) => ({
    icon: <TbTractor />,
    title: `Captured ${formatTonnes(c.tonnes_cut)} — Field ${fieldCodeById.get(c.field_id) ?? "—"}`,
    meta: formatDate(c.capture_date),
  }));

  return {
    fieldsDueForHarvest: fieldsDueForHarvest ?? 0,
    activitiesLoggedToday: activitiesLoggedToday ?? 0,
    stockItemsLow: lowStock.length,
    equipmentDueForService: dueEquipment.length,
    cuttingPlan,
    harvestByDay,
    syncPendingCount: 0,
    alerts,
    activity,
  };
}
