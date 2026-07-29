import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { decodeAccessTokenClaims } from "@/lib/auth/claims";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  const claims = decodeAccessTokenClaims(session.access_token);
  if (Object.keys(claims.tenantRoles).length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
      <OnboardingWizard />
    </div>
  );
}
