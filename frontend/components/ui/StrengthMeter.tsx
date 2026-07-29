import { getPasswordStrength, type PasswordStrength } from "@/lib/validators/auth";
import { cn } from "@/lib/cn";

export interface StrengthMeterProps {
  password: string;
}

const labels: Record<PasswordStrength, string> = {
  weak: "Weak",
  fair: "Fair",
  strong: "Strong",
};

const barColor: Record<PasswordStrength, string> = {
  weak: "bg-danger-600",
  fair: "bg-harvest-500",
  strong: "bg-field-500",
};

const textColor: Record<PasswordStrength, string> = {
  weak: "text-danger-600",
  fair: "text-harvest-500",
  strong: "text-field-500",
};

const activeBars: Record<PasswordStrength, number> = {
  weak: 1,
  fair: 2,
  strong: 3,
};

export function StrengthMeter({ password }: StrengthMeterProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const active = activeBars[strength];

  return (
    <div className="mt-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-pill transition-colors duration-150",
              i < active ? barColor[strength] : "bg-paper-200"
            )}
          />
        ))}
      </div>
      <p className={cn("mt-1 text-xs font-medium", textColor[strength])}>{labels[strength]}</p>
    </div>
  );
}
