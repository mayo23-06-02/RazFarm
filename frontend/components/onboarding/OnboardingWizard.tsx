"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper, type StepperStep } from "@/components/ui/Stepper";
import { Card } from "@/components/ui/Card";
import { StepAssociationDetails } from "./StepAssociationDetails";

const STEPS: StepperStep[] = [
  { label: "Association details", description: "Name, slug and mill" },
  { label: "Season & settings", description: "Season dates, VAT, logo" },
  { label: "Invite your committee", description: "Optional — skip anytime" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [, setTenantId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-[28px] font-bold text-ink-900">Create your association</h1>
        <p className="mt-1 text-sm text-ink-500">Set up your workspace in three quick steps.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px,1fr]">
        <Card className="h-fit md:sticky md:top-6">
          <Stepper steps={STEPS} current={step} />
        </Card>

        <Card>
          {step === 0 && (
            <StepAssociationDetails
              onCreated={(tenantId) => {
                setTenantId(tenantId);
                setStep(1);
              }}
            />
          )}
          {step === 1 && (
            <PlaceholderStep
              title="Season & settings"
              body="Season start/end, VAT registration and logo upload land here next."
            />
          )}
          {step === 2 && (
            <PlaceholderStep
              title="Invite your committee"
              body="Add your chairman, treasurer and secretary — or skip and invite them later."
              onFinish={() => router.push("/dashboard")}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function PlaceholderStep({ title, body, onFinish }: { title: string; body: string; onFinish?: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-[20px] font-semibold text-ink-900">{title}</h2>
      <p className="text-sm text-ink-500">{body}</p>
      <p className="mt-4 text-xs text-ink-400">
        This step is being built next — step 1 is up for review first.
      </p>
      {onFinish && (
        <button
          type="button"
          onClick={onFinish}
          className="mt-4 self-end text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Skip to dashboard →
        </button>
      )}
    </div>
  );
}
