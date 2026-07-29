"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TbCircleCheck, TbLockCheck } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { StrengthMeter } from "@/components/ui/StrengthMeter";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validators/auth";
import { resetPassword, AuthApiError } from "@/lib/auth-api";

export default function ResetPasswordPage() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = watch("password");

  const onSubmit = async (values: ResetPasswordValues) => {
    setSubmitError(null);
    try {
      await resetPassword(values);
      setDone(true);
    } catch (err) {
      setSubmitError(
        err instanceof AuthApiError ? err.message : "Couldn't reset your password. Try again."
      );
    }
  };

  if (done) {
    return (
      <div className="text-center">
        <TbCircleCheck className="mx-auto size-10 text-field-500" />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink-900">
          Password reset. Sign in with your new password.
        </h1>
        <Link href="/login" className="mt-8 inline-block w-full">
          <Button variant="primary" size="lg" fullWidth>
            Go to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink-900">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-500">Choose a new password for your account.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ink-700">
            New password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            error={!!errors.password}
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password ? (
            <FieldError>{errors.password.message}</FieldError>
          ) : (
            <StrengthMeter password={password} />
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-xs font-medium text-ink-700"
          >
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && <FieldError>{errors.confirmPassword.message}</FieldError>}
        </div>

        {submitError && <FieldError>{submitError}</FieldError>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          icon={<TbLockCheck />}
        >
          Reset password
        </Button>
      </form>
    </div>
  );
}
