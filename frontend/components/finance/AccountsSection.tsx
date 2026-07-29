"use client";

import { useState } from "react";
import { TbPlus, TbTemplate } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { AddAccountDrawer } from "./AddAccountDrawer";
import type { AccountType, Database } from "@/lib/database.types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];

const TYPE_ORDER: AccountType[] = ["asset", "liability", "equity", "income", "expense"];
const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};
const TYPE_BADGE: Record<AccountType, BadgeVariant> = {
  asset: "brand",
  liability: "warning",
  equity: "info",
  income: "success",
  expense: "neutral",
};

export interface AccountsSectionProps {
  tenantId: string;
  initialAccounts: AccountRow[];
  canManage: boolean;
}

export function AccountsSection({ tenantId, initialAccounts, canManage }: AccountsSectionProps) {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [addOpen, setAddOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("accounts").select("*").eq("tenant_id", tenantId).order("code", { ascending: true });
    setAccounts(data ?? []);
  };

  const seedTemplate = async () => {
    setSeeding(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("seed_default_chart_of_accounts", { p_tenant_id: tenantId });
    setSeeding(false);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Chart of accounts set up from the agri/co-op template" });
    refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" icon={<TbTemplate />} loading={seeding} onClick={seedTemplate}>
            Set up from template
          </Button>
          <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
            Add account
          </Button>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          body={canManage ? "Set up the agri/co-op starter template, or add accounts one at a time." : "The chart of accounts hasn't been set up yet."}
        />
      ) : (
        TYPE_ORDER.map((type) => {
          const rows = accounts.filter((a) => a.type === type);
          if (rows.length === 0) return null;
          return (
            <div key={type} className="flex flex-col gap-2">
              <SectionHeading>{TYPE_LABEL[type]}</SectionHeading>
              <div className="overflow-hidden rounded-card border border-paper-200 bg-paper-0">
                {rows.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 border-b border-paper-100 px-4 py-3 last:border-0">
                    <span className="w-16 shrink-0 font-mono text-xs text-ink-400">{a.code}</span>
                    <span className="flex-1 text-sm text-ink-900">{a.name}</span>
                    <Badge variant={TYPE_BADGE[a.type]}>{a.type}</Badge>
                    {!a.is_active && <Badge variant="neutral">Inactive</Badge>}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {canManage && <AddAccountDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} onAdded={refresh} />}
    </div>
  );
}
