import { redirect } from "next/navigation";
import { ContractorsSection } from "@/components/staff/ContractorsSection";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { hasTenantRole } from "@/lib/auth/roleCheck";
import { STAFF_MANAGER_ROLES, CONTRACTOR_JOB_LOGGER_ROLES, BANK_DETAIL_REVEAL_ROLES } from "@/lib/roles";

export default async function ContractorsPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: settings } = await supabase.from("tenant_settings").select("season_start, season_end").eq("tenant_id", tenantId).maybeSingle();
  const currentYear = new Date().getFullYear();
  const seasonStart = settings?.season_start ?? `${currentYear}-01-01`;
  const seasonEnd = settings?.season_end ?? `${currentYear}-12-31`;

  const [{ data: contractors }, { data: jobs }, { data: fields }, canManage, canLogJob, canRevealBank] = await Promise.all([
    supabase.from("contractors_directory").select("*").eq("tenant_id", tenantId).order("business_name", { ascending: true }),
    supabase
      .from("contractor_jobs")
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("job_date", seasonStart)
      .lte("job_date", seasonEnd)
      .order("job_date", { ascending: false }),
    supabase.from("fields").select("id, code").eq("tenant_id", tenantId).order("code", { ascending: true }),
    hasTenantRole(tenantId, STAFF_MANAGER_ROLES),
    hasTenantRole(tenantId, CONTRACTOR_JOB_LOGGER_ROLES),
    hasTenantRole(tenantId, BANK_DETAIL_REVEAL_ROLES),
  ]);

  return (
    <ContractorsSection
      tenantId={tenantId}
      userId={session.user.id}
      initialContractors={contractors ?? []}
      initialJobs={jobs ?? []}
      fields={fields ?? []}
      canManage={canManage}
      canLogJob={canLogJob}
      canRevealBank={canRevealBank}
    />
  );
}
