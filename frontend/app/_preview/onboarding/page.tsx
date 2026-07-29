import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

// Temporary, unauthenticated preview route for visual QA only — deleted before shipping.
export default function OnboardingPreviewPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6">
      <OnboardingWizard />
    </div>
  );
}
