"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TbArrowRight } from "react-icons/tb";
import { Input, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import type { MillName } from "@/lib/database.types";

const MILL_OPTIONS: SelectOption[] = [
  { value: "ubombo", label: "Ubombo" },
  { value: "mhlume", label: "Mhlume" },
  { value: "simunye", label: "Simunye" },
  { value: "other", label: "Other" },
];

const schema = z.object({
  name: z
    .string()
    .min(2, { error: "Enter the association's name" })
    .max(120, { error: "Keep the name under 120 characters" })
    .trim(),
  slug: z
    .string()
    .min(3, { error: "Slug must be at least 3 characters" })
    .max(40, { error: "Slug must be 40 characters or fewer" })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
      error: "Use lowercase letters, numbers and hyphens only",
    })
    .trim(),
  mill: z.enum(["ubombo", "mhlume", "simunye", "other"], {
    error: "Select a mill",
  }),
});

type FormValues = z.infer<typeof schema>;

export interface StepAssociationDetailsProps {
  onCreated: (tenantId: string) => void;
}

export function StepAssociationDetails({ onCreated }: StepAssociationDetailsProps) {
  const { addToast } = useToast();
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", mill: undefined },
  });

  const mill = watch("mill");

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("register_association", {
      p_name: values.name,
      p_slug: values.slug,
      p_mill: values.mill as MillName,
    });

    if (error) {
      setSubmitError(error.message);
      return;
    }

    addToast({ variant: "field", message: "Association created" });
    onCreated(data as unknown as string);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      <div>
        <h2 className="font-display text-[20px] font-semibold text-ink-900">Association details</h2>
        <p className="mt-1 text-sm text-ink-500">Tell us who you&apos;re setting up.</p>
      </div>

      <FormRow label="Association name" required error={errors.name?.message}>
        <Input
          placeholder="e.g. Lubombo Growers Association"
          error={!!errors.name}
          {...register("name", {
            onChange: (e) => {
              if (!slugTouched) {
                setValue("slug", slugify(e.target.value), { shouldValidate: true });
              }
            },
          })}
        />
      </FormRow>

      <FormRow
        label="Slug"
        required
        hint="Used in invite links and URLs. Lowercase letters, numbers and hyphens only."
        error={errors.slug?.message}
      >
        <Input
          placeholder="lubombo-growers"
          error={!!errors.slug}
          {...register("slug", {
            onChange: () => setSlugTouched(true),
          })}
        />
      </FormRow>

      <FormRow label="Mill" required hint="Which mill does your association deliver to?" error={errors.mill?.message}>
        <Select
          options={MILL_OPTIONS}
          value={mill}
          onChange={(v) => setValue("mill", v as MillName, { shouldValidate: true })}
          placeholder="Select a mill"
          error={!!errors.mill}
        />
      </FormRow>

      {submitError && <FieldError>{submitError}</FieldError>}

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting} iconRight={<TbArrowRight />}>
          Continue
        </Button>
      </div>
    </form>
  );
}
