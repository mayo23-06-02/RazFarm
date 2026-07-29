"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TbLogin2 } from "react-icons/tb";
import { Button } from "@/components/ui/Button";
import { Input, FieldError } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import { loginSchema, type LoginValues } from "@/lib/validators/auth";
import { login, AuthApiError } from "@/lib/auth-api";

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { identifier: "", password: "", remember: false },
  });

  const onSubmit = async (values: LoginValues) => {
    setSubmitError(null);
    try {
      await login(values);
      addToast({ variant: "field", message: "Signed in. Taking you to your dashboard." });
      router.push("/dashboard");
    } catch (err) {
      setSubmitError(
        err instanceof AuthApiError ? err.message : "Couldn't sign you in. Try again."
      );
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-ink-900">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-500">Sign in to manage your association.</p>

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

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="password" className="block text-xs font-medium text-ink-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            error={!!errors.password}
            aria-invalid={!!errors.password}
            {...register("password")}
          />
          {errors.password && <FieldError>{errors.password.message}</FieldError>}
        </div>

        {submitError && <FieldError>{submitError}</FieldError>}

        <Checkbox label="Remember me" {...register("remember")} />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          icon={<TbLogin2 />}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New association?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
