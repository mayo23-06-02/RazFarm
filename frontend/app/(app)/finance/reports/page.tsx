import { ReportsSection } from "@/components/finance/ReportsSection";
import { getActiveTenantId } from "@/lib/auth/tenant";

export default async function ReportsPage() {
  const tenantId = await getActiveTenantId();
  return <ReportsSection tenantId={tenantId} />;
}
