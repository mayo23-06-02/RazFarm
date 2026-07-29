"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TbUserCheck } from "react-icons/tb";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { StrengthMeter } from "@/components/ui/StrengthMeter";
import { useToast } from "@/components/ui/Toast";
import { acceptInviteSchema, type AcceptInviteValues } from "@/lib/validators/auth";
import { acceptInvite, getInvite, AuthApiError, type InviteDetails } from "@/lib/auth-api";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { addToast } = useToast();

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInvite(token)
      .then((details) => {
        if (!cancelled) setInvite(details);
      })
      .catch(() => {
        if (!cancelled) setLoadError("This invite link is invalid or has expired.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteValues>({
    resolver: zodResolver(acceptInviteSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { fullName: "", password: "", confirmPassword: "" },
  });

  const password = watch("password");

  const onSubmit = async (values: AcceptInviteValues) => {
    setSubmitError(null);
    try {
      const result = await acceptInvite({ token, ...values, phone: invite?.phone ?? null, email: invite?.email ?? null });
      addToast({ variant: "field", message: "Account created. Verify to continue." });
      router.push(`/verify?flow=invite&token=${encodeURIComponent(token)}&identifier=${encodeURIComponent(result.identifier)}`);
    } catch (err) {
      setSubmitError(
        err instanceof AuthApiError ? err.message : "Couldn't activate your account. Try again."
      );
    }
  };

  if (loadError) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink-900">Invite not found</h1>
        <p className="mt-2 text-sm text-ink-500">{loadError}</p>
      </div>
    );
  }

  if (!invite) {
    return <p className="text-sm text-ink-500">Loading your invite…</p>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink-900">Join {invite.associationName}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-ink-500">
        You&apos;ve been invited as
        <Badge variant="brand">{invite.role}</Badge>
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium text-ink-700">
            Full name
          </label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="Nomsa Dlamini"
            error={!!errors.fullName}
            aria-invalid={!!errors.fullName}
            {...register("fullName")}
          />
          {errors.fullName && <FieldError>{errors.fullName.message}</FieldError>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ink-700">
            Password
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
            Confirm password
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
          icon={<TbUserCheck />}
        >
          Activate account
        </Button>
      </form>
    </div>
  );
}
