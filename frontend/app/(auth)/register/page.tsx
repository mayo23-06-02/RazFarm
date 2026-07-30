"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TbUserPlus } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Input, FieldError } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { StrengthMeter } from "@/components/ui/StrengthMeter";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { registerSchema, type RegisterValues } from "@/lib/validators/auth";
import { register as registerAccount, AuthApiError } from "@/lib/auth-api";

export default function RegisterPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      associationName: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const password = watch("password");

  const onSubmit = async (values: RegisterValues) => {
    setSubmitError(null);
    try {
      const result = await registerAccount(values);
      addToast({ variant: "field", message: "Account created. Verify your phone to continue." });
      router.push(`/verify?flow=signup&identifier=${encodeURIComponent(result.phone)}`);
    } catch (err) {
      setSubmitError(
        err instanceof AuthApiError ? err.message : "Couldn't create your account. Try again."
      );
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink-900">Create your account</h1>
      <p className="mt-2 text-sm text-ink-500">Set up your association on RazFarm.</p>

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
          <label htmlFor="phone" className="mb-1.5 block text-xs font-medium text-ink-700">
            Phone number
          </label>
          <PhoneInput
            id="phone"
            error={!!errors.phone}
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          {errors.phone && <FieldError>{errors.phone.message}</FieldError>}
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-ink-700">
            Email <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@association.co.sz"
            error={!!errors.email}
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && <FieldError>{errors.email.message}</FieldError>}
        </div>

        <div>
          <label
            htmlFor="associationName"
            className="mb-1.5 block text-xs font-medium text-ink-700"
          >
            Association name
          </label>
          <Input
            id="associationName"
            type="text"
            placeholder="Lubombo Grower's Co-operative"
            error={!!errors.associationName}
            aria-invalid={!!errors.associationName}
            {...register("associationName")}
          />
          {errors.associationName && <FieldError>{errors.associationName.message}</FieldError>}
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

        <div>
          <Checkbox
            label="I agree to the terms of service and privacy policy"
            {...register("terms")}
          />
          {errors.terms && <FieldError>{errors.terms.message}</FieldError>}
        </div>

        {submitError && <FieldError>{submitError}</FieldError>}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          icon={<TbUserPlus />}
        >
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-500">
        Joining an existing association? Ask your committee for an invite.
      </p>

      <p className="mt-4 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
