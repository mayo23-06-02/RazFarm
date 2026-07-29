import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RoleGate } from "@/components/guards/RoleGate";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { FINANCE_VIEWER_ROLES } from "@/lib/roles";

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  const tenantId = await getActiveTenantId();

  return (
    <RoleGate
      roles={FINANCE_VIEWER_ROLES}
      tenantId={tenantId}
      fallback={
        <EmptyState
          title="No access to finances"
          body="Only chairman, treasurer and accountant roles can see the ledger and reports."
        />
      }
    >
      <div className="flex flex-col gap-6">
        <PageHeader title="Finances" subtitle="Chart of accounts, journal entries and financial statements." />
        <FinanceNav />
        {children}
      </div>
    </RoleGate>
  );
}
