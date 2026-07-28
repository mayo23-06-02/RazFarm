"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { TbShieldCheck } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OTPInput";
import { useToast } from "@/components/ui/Toast";
import { verifyOtp, resendOtp, AuthApiError } from "@/lib/auth-api";

const RESEND_SECONDS = 60;

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const flow = searchParams.get("flow") === "reset" ? "reset" : "signup";
  const identifier = searchParams.get("identifier") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const submitCode = async (value: string) => {
    setError(null);
    setVerifying(true);
    try {
      await verifyOtp({ identifier, code: value, flow });
      if (flow === "signup") {
        addToast({ variant: "field", message: "Phone verified. Welcome to Cane & Ledger." });
        router.push("/dashboard");
      } else {
        addToast({ variant: "field", message: "Code verified. Choose a new password." });
        router.push("/reset-password");
      }
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : "Couldn't verify that code. Try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResending(true);
    try {
      await resendOtp({ identifier, flow });
      addToast({ variant: "field", message: "A new code is on its way." });
      setSecondsLeft(RESEND_SECONDS);
      setCode("");
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : "Couldn't resend a code. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink-900">Check your phone</h1>
      <p className="mt-2 text-sm text-ink-500">
        {identifier ? (
          <>
            Enter the 6-digit code we sent to <span className="font-medium text-ink-700">{identifier}</span>.
          </>
        ) : (
          "Enter the 6-digit code we sent you."
        )}
      </p>

      <div className="mt-8">
        <OtpInput
          length={6}
          value={code}
          onChange={setCode}
          onComplete={submitCode}
          error={!!error}
          disabled={verifying}
        />
        {error && <FieldError>{error}</FieldError>}

        {verifying && <p className="mt-3 text-sm text-ink-500">Verifying…</p>}

        <div className="mt-6" aria-live="polite">
          {secondsLeft > 0 ? (
            <p className="text-sm text-ink-500">Resend code in {formatCountdown(secondsLeft)}</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          className="mt-6"
          loading={verifying}
          disabled={code.length < 6}
          icon={<TbShieldCheck />}
          onClick={() => submitCode(code)}
        >
          Verify
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-ink-500">
        Wrong number?{" "}
        <Link href={flow === "signup" ? "/register" : "/forgot-password"} className="font-medium text-brand-600 hover:text-brand-700">
          Start over
        </Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
