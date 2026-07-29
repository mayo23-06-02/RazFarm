import { PageHeader } from "@/components/ui/PageHeader";

// Stub — the real dashboard is built in a later module. This page exists so
// the onboarding wizard and post-login redirects have somewhere to land.
export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
      <PageHeader title="Dashboard" subtitle="Your association is set up. The full dashboard ships in a later module." />
    </div>
  );
}
