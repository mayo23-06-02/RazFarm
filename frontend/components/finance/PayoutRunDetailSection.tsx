"use client";

import { useMemo, useState } from "react";
import { TbDownload, TbRefresh } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import { toCsv } from "@/lib/csv";
import type { Database, PayoutRunStatus } from "@/lib/database.types";

type PayoutRunRow = Database["public"]["Tables"]["payout_runs"]["Row"];
type PayoutRunLineRow = Database["public"]["Tables"]["payout_run_lines"]["Row"];
type PayoutDeductionRow = Database["public"]["Tables"]["payout_deductions"]["Row"];
type DeductionTypeRow = Database["public"]["Tables"]["deduction_types"]["Row"];

interface MemberInfo {
  id: string;
  member_no: string;
  full_name: string;
}

const STATUS_BADGE: Record<PayoutRunStatus, BadgeVariant> = {
  draft: "neutral",
  approved: "warning",
  paid: "success",
};

function money(v: number) {
  return v.toLocaleString("en-SZ", { minimumFractionDigits: 2 });
}

export interface PayoutRunDetailSectionProps {
  run: PayoutRunRow;
  initialLines: PayoutRunLineRow[];
  initialDeductions: PayoutDeductionRow[];
  deductionTypes: DeductionTypeRow[];
  members: MemberInfo[];
  bankAccountLabel: string;
  canManage: boolean;
  canApprove: boolean;
}

export function PayoutRunDetailSection({
  run: initialRun,
  initialLines,
  initialDeductions,
  deductionTypes,
  members,
  bankAccountLabel,
  canManage,
  canApprove,
}: PayoutRunDetailSectionProps) {
  const { addToast } = useToast();
  const [run, setRun] = useState(initialRun);
  const [lines, setLines] = useState(initialLines);
  const [deductions, setDeductions] = useState(initialDeductions);
  const [computing, setComputing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [paying, setPaying] = useState(false);

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const activeDeductionTypes = deductionTypes.filter((d) => d.is_active);

  const deductionAmount = (lineId: string, deductionTypeId: string) => deductions.find((d) => d.payout_run_line_id === lineId && d.deduction_type_id === deductionTypeId)?.amount ?? 0;

  const editable = canManage && run.status === "draft";

  const totals = useMemo(() => {
    const gross = lines.reduce((s, l) => s + Number(l.gross_amount), 0);
    const net = lines.reduce((s, l) => s + Number(l.net_amount), 0);
    return { gross, net, deducted: gross - net };
  }, [lines]);

  const compute = async () => {
    setComputing(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("compute_payout_run", { p_run_id: run.id });
    if (error) {
      setComputing(false);
      addToast({ variant: "danger", message: error.message });
      return;
    }
    const [{ data: freshDeductions }] = await Promise.all([
      supabase.from("payout_deductions").select("*").in("payout_run_line_id", (data ?? []).map((l: PayoutRunLineRow) => l.id)),
    ]);
    setComputing(false);
    setLines(data ?? []);
    setDeductions(freshDeductions ?? []);
    addToast({ variant: "field", message: `Allocated across ${data?.length ?? 0} members` });
  };

  const updateDeduction = async (lineId: string, deductionTypeId: string, amount: number) => {
    setDeductions((prev) => {
      const existing = prev.find((d) => d.payout_run_line_id === lineId && d.deduction_type_id === deductionTypeId);
      if (existing) return prev.map((d) => (d === existing ? { ...d, amount } : d));
      return [...prev, { id: `${lineId}-${deductionTypeId}`, payout_run_line_id: lineId, deduction_type_id: deductionTypeId, amount }];
    });

    const supabase = createClient();
    await supabase.from("payout_deductions").upsert(
      { payout_run_line_id: lineId, deduction_type_id: deductionTypeId, amount },
      { onConflict: "payout_run_line_id,deduction_type_id" }
    );
    const { data: updatedLine, error } = await supabase.rpc("recompute_payout_line", { p_line_id: lineId });
    if (!error && updatedLine) {
      setLines((prev) => prev.map((l) => (l.id === lineId ? updatedLine : l)));
    }
  };

  const approve = async () => {
    setApproving(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("approve_payout_run", { p_run_id: run.id });
    setApproving(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    setRun(data);
    addToast({ variant: "field", message: "Payout run approved" });
  };

  const markPaid = async () => {
    setPaying(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("mark_payout_run_paid", { p_run_id: run.id });
    setPaying(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    setRun(data);
    addToast({ variant: "field", message: "Payout run paid — posted to the ledger" });
  };

  const exportCsv = () => {
    const rows = [
      ["Member no.", "Name", "Gross", "Deductions", "Net"],
      ...lines.map((l) => {
        const m = memberMap.get(l.member_id);
        return [m?.member_no ?? "", m?.full_name ?? "", String(l.gross_amount), String(Number(l.gross_amount) - Number(l.net_amount)), String(l.net_amount)];
      }),
    ];
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.run_no}-payout-list.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={run.title}
        backHref="/finance/payouts"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE[run.status]}>{run.status}</Badge>
            <span className="font-mono text-xs">{run.run_no}</span>
            <span>
              {formatDate(run.run_date)} · Gross E {money(Number(run.gross_pool))} · from {bankAccountLabel}
            </span>
          </span>
        }
        actions={
          <>
            {lines.length > 0 && (
              <Button variant="secondary" icon={<TbDownload />} onClick={exportCsv}>
                Export bank/MoMo list
              </Button>
            )}
            {editable && (
              <Button variant="secondary" icon={<TbRefresh />} loading={computing} onClick={compute}>
                {lines.length > 0 ? "Recompute allocation" : "Compute allocation"}
              </Button>
            )}
            {run.status === "draft" && canApprove && lines.length > 0 && (
              <ConfirmDialog
                trigger={<Button loading={approving}>Approve run</Button>}
                title="Approve payout run"
                body={`Approve ${run.run_no} for a net payout of E ${money(totals.net)}? Once approved, the accountant can mark it paid.`}
                tone="primary"
                confirmLabel="Approve"
                onConfirm={approve}
              />
            )}
            {run.status === "approved" && canManage && (
              <ConfirmDialog
                trigger={<Button loading={paying}>Mark as paid</Button>}
                title="Mark payout run as paid"
                body={`Post ${run.run_no} to the ledger and record E ${money(totals.net)} as paid out? This can't be undone.`}
                tone="primary"
                confirmLabel="Mark as paid"
                onConfirm={markPaid}
              />
            )}
          </>
        }
      />

      {lines.length === 0 ? (
        <EmptyState
          title="Not computed yet"
          body={editable ? "Compute the allocation to split the gross pool across active members by shareholding." : "This run hasn't been computed."}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-paper-200 bg-paper-0">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-paper-200 bg-paper-50 text-[12px] font-medium uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-2.5 text-left">Member</th>
                  <th className="px-4 py-2.5 text-right">Gross</th>
                  {activeDeductionTypes.map((dt) => (
                    <th key={dt.id} className="px-3 py-2.5 text-right">
                      {dt.name}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const member = memberMap.get(line.member_id);
                  return (
                    <tr key={line.id} className="border-b border-paper-100 last:border-0">
                      <td className="px-4 py-2 text-ink-900">
                        {member?.full_name} <span className="text-xs text-ink-400">{member?.member_no}</span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-700">{money(Number(line.gross_amount))}</td>
                      {activeDeductionTypes.map((dt) => (
                        <td key={dt.id} className="px-3 py-1.5 text-right">
                          {editable ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24 text-right tabular-nums"
                              defaultValue={deductionAmount(line.id, dt.id) || ""}
                              onBlur={(e) => updateDeduction(line.id, dt.id, Number(e.target.value) || 0)}
                            />
                          ) : (
                            <span className="tabular-nums text-ink-700">{money(deductionAmount(line.id, dt.id))}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-ink-900">{money(Number(line.net_amount))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-paper-50 text-sm font-semibold text-ink-900">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(totals.gross)}</td>
                  {activeDeductionTypes.map((dt) => (
                    <td key={dt.id} className="px-3 py-2.5 text-right tabular-nums">
                      {money(lines.reduce((s, l) => s + deductionAmount(l.id, dt.id), 0))}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
