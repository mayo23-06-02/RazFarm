import { TbCheck } from "react-icons/tb";
import { cn } from "@/lib/cn";

export interface ApprovalStep {
  label: string;
  status: "done" | "current" | "upcoming";
}

export interface ApprovalTrailProps {
  steps: ApprovalStep[];
  className?: string;
}

export function ApprovalTrail({ steps, className }: ApprovalTrailProps) {
  return (
    <ol className={cn("flex items-center", className)}>
      {steps.map((step, i) => (
        <li key={step.label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                step.status === "done" && "bg-brand-500 text-white",
                step.status === "current" && "border-2 border-brand-500 bg-paper-0 text-brand-600",
                step.status === "upcoming" && "bg-paper-200 text-ink-400"
              )}
            >
              {step.status === "done" ? <TbCheck className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "whitespace-nowrap text-xs font-medium",
                step.status === "upcoming" ? "text-ink-400" : "text-ink-700"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span
              className={cn(
                "mx-2 h-0.5 flex-1 rounded-full",
                step.status === "done" ? "bg-brand-500" : "bg-paper-200"
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
