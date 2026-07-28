"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TbSend2, TbArrowLeft } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Input, FieldError } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validators/auth";
import { requestReset, AuthApiError } from "@/lib/auth-api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { identifier: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setSubmitError(null);
    try {
      const result = await requestReset(values);
      addToast({ variant: "field", message: "Reset code sent. Check your messages." });
      router.push(`/verify?flow=reset&identifier=${encodeURIComponent(result.identifier)}`);
    } catch (err) {
      setSubmitError(
        err instanceof AuthApiError ? err.message : "Couldn't send a reset code. Try again."
      );
    }
  };

  return (
    <div>
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700"
      >
        <TbArrowLeft className="size-4" />
        Back to sign in
      </Link>

      <h1 className="font-display text-3xl font-bold text-ink-900">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-500">
        Enter the email or phone number on your account and we&apos;ll send a reset code.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="identifier" className="mb-1.5 block text-xs font-medium text-ink-700">
            Email or phone number
          </label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="you@association.co.sz or 7612 3456"
            error={!!errors.identifier}
            aria-invalid={!!errors.identifier}
            {...register("identifier")}
          />
          {errors.identifier && <FieldError>{errors.identifier.message}</FieldError>}
        </div>

        {submitError && <FieldError>{submitError}</FieldError>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          icon={<TbSend2 />}
        >
          Send reset code
        </Button>
      </form>
    </div>
  );
}
