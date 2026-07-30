import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { TbPlant2, TbUserPlus } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { SeasonPicker } from "@/components/app/SeasonPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenantId } from "@/lib/auth/tenant";
import { decodeAccessTokenClaims } from "@/lib/auth/claims";
import { COMMITTEE_ROLES } from "@/lib/roles";
import { cn } from "@/lib/cn";
import { CommitteeDashboard } from "@/components/dashboard/CommitteeDashboard";
import { AccountantDashboard } from "@/components/dashboard/AccountantDashboard";
import { SupervisorDashboard } from "@/components/dashboard/SupervisorDashboard";
import { getAccountantDashboardData, getCommitteeDashboardData, getSupervisorDashboardData } from "@/lib/dashboard/queries";
import type { MemberRole } from "@/lib/database.types";

type DashboardVariant = "committee" | "accountant" | "supervisor" | "member";

// Highest-privilege role wins when a user holds several for the same tenant.
function pickVariant(roles: MemberRole[]): DashboardVariant {
  if (roles.some((r) => COMMITTEE_ROLES.includes(r))) return "committee";
  if (roles.includes("accountant")) return "accountant";
  if (roles.includes("supervisor")) return "supervisor";
  return "member";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function EmptyStateAction({
  href,
  icon,
  children,
  variant = "primary",
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-ctrl px-4 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50",
        variant === "primary"
          ? "bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600"
          : "border border-paper-200 bg-paper-0 text-ink-700 hover:border-brand-300 hover:text-brand-600"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export default async function DashboardPage() {
  const tenantId = await getActiveTenantId();
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const claims = decodeAccessTokenClaims(session.access_token);
  const roles = claims.tenantRoles[tenantId] ?? [];
  const variant = pickVariant(roles);

  const [{ data: tenant }, { data: profile }, { count: memberCount }, { count: fieldCount }] = await Promise.all([
    supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle(),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
    supabase.from("fields").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const header = <PageHeader title={`${getGreeting()}, ${firstName}`} subtitle={tenant?.name ?? "Your association"} actions={<SeasonPicker />} />;

  // New association with nothing captured yet — replace the whole content
  // grid with a guided setup empty state rather than a wall of empty cards.
  if (!memberCount && !fieldCount) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="Let's get your association set up"
          body="Add your members and fields to start tracking deliveries, payouts and season progress."
          action={
            <div className="flex items-center gap-2">
              <EmptyStateAction href="/members" icon={<TbUserPlus />}>
                Add members
              </EmptyStateAction>
              <EmptyStateAction href="/fields" icon={<TbPlant2 />} variant="secondary">
                Add fields
              </EmptyStateAction>
            </div>
          }
        />
      </div>
    );
  }

  if (variant === "committee") {
    const data = await getCommitteeDashboardData(supabase, tenantId);
    return (
      <div className="flex flex-col gap-6">
        {header}
        <CommitteeDashboard data={data} />
      </div>
    );
  }

  if (variant === "accountant") {
    const data = await getAccountantDashboardData(supabase, tenantId);
    return (
      <div className="flex flex-col gap-6">
        {header}
        <AccountantDashboard data={data} />
      </div>
    );
  }

  if (variant === "supervisor") {
    const data = await getSupervisorDashboardData(supabase, tenantId, session.user.id);
    return (
      <div className="flex flex-col gap-6">
        {header}
        <SupervisorDashboard data={data} />
      </div>
    );
  }

  // Members (no staff role) get a simpler, dedicated view in a later module —
  // this route stays staff-shaped, so a member landing here by a stale link
  // or mistyped URL sees a holding message instead of empty staff cards.
  return (
    <div className="flex flex-col gap-6">
      {header}
      <EmptyState
        title="Your dashboard is coming soon"
        body="The member view — your deliveries, estimated payout and notices — lands in a later module. Check with your association's committee if you were expecting a staff dashboard."
      />
    </div>
  );
}
