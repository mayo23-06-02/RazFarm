import { TbCheck } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("flex flex-col gap-4", className)}>
      {steps.map((step, i) => {
        const status = i < current ? "done" : i === current ? "current" : "upcoming";
        return (
          <li key={step.label} className="flex gap-3">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                status === "done" && "bg-field-500 text-white",
                status === "current" && "border-2 border-brand-500 bg-paper-0 text-brand-600",
                status === "upcoming" && "bg-paper-200 text-ink-400"
              )}
            >
              {status === "done" ? <TbCheck className="size-4" /> : i + 1}
            </span>
            <div>
              <p className={cn("text-sm font-medium", status === "upcoming" ? "text-ink-400" : "text-ink-900")}>
                {step.label}
              </p>
              {step.description && <p className="mt-0.5 text-xs text-ink-500">{step.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
