import { PageHeader } from "@/components/ui/PageHeader";

// Stub — the real dashboard is built in a later module. This page exists so
// the onboarding wizard and post-login redirects have somewhere to land.
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" subtitle="Your association is set up. The full dashboard ships in a later module." />
    </div>
  );
}
