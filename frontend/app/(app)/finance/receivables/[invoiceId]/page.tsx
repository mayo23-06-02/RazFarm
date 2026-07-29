import { EmptyState } from "@/components/ui/EmptyState";
import { InvoiceDetailSection } from "@/components/finance/InvoiceDetailSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { ACCOUNTANT_ROLES } from "@/lib/roles";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const [{ data: invoice }, { data: lines }, { data: payments }, { data: creditNotes }, { data: accounts }, canManage] = await Promise.all([
    supabase.from("invoices").select("*, customers(name)").eq("id", invoiceId).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId).order("position", { ascending: true }),
    supabase.from("invoice_payments").select("*").eq("invoice_id", invoiceId).order("paid_at", { ascending: true }),
    supabase.from("credit_notes").select("*").eq("invoice_id", invoiceId).order("issued_at", { ascending: true }),
    supabase.from("accounts").select("id, code, name, type").eq("tenant_id", tenantId).eq("is_active", true).order("code", { ascending: true }),
    hasTenantRole(tenantId, ACCOUNTANT_ROLES),
  ]);

  if (!invoice) {
    return <EmptyState title="Invoice not found" body="This invoice doesn't exist, or you don't have access to view it." />;
  }

  const customerName = (invoice as unknown as { customers: { name: string } | null }).customers?.name ?? "—";
  const revenueAccounts = (accounts ?? []).filter((a) => a.type === "income");
  const assetAccounts = (accounts ?? []).filter((a) => a.type === "asset");

  return (
    <InvoiceDetailSection
      invoice={invoice}
      customerName={customerName}
      initialLines={lines ?? []}
      initialPayments={payments ?? []}
      initialCreditNotes={creditNotes ?? []}
      revenueAccounts={revenueAccounts}
      assetAccounts={assetAccounts}
      canManage={canManage}
    />
  );
}
