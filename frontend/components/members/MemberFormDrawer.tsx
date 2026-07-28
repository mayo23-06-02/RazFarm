"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Drawer } from "@/components/ui/Drawer";
import { Input, Textarea, FieldError } from "@/components/ui/Input";
import { FormRow } from "@/components/ui/FormRow";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { suggestNextMemberNo } from "@/lib/members/nextMemberNo";
import type { Database } from "@/lib/database.types";

type MemberRow = Database["public"]["Tables"]["members"]["Row"];

const schema = z.object({
  member_no: z.string().min(1, { error: "Member number is required" }).max(20),
  full_name: z.string().min(2, { error: "Enter the member's full name" }).max(120),
  national_id: z.string().max(40).optional(),
  phone: z
    .string()
    .regex(/^[0-9]{8}$/, { error: "Enter 8 digits" })
    .optional()
    .or(z.literal("")),
  email: z.email({ error: "Enter a valid email" }).optional().or(z.literal("")),
  shareholding: z
    .string()
    .min(1, { error: "Shareholding is required" })
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, { error: "Enter a valid, non-negative number" }),
  next_of_kin_name: z.string().max(120).optional(),
  next_of_kin_phone: z
    .string()
    .regex(/^[0-9]{8}$/, { error: "Enter 8 digits" })
    .optional()
    .or(z.literal("")),
  next_of_kin_relationship: z.string().max(60).optional(),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

export interface MemberFormDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: MemberRow | null;
  onSaved: () => void;
}

export function MemberFormDrawer({ tenantId, open, onOpenChange, member, onSaved }: MemberFormDrawerProps) {
  const { addToast } = useToast();
  const [joinDate, setJoinDate] = useState<Date>(member ? new Date(member.join_date) : new Date());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = !!member;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      member_no: member?.member_no ?? "",
      full_name: member?.full_name ?? "",
      national_id: member?.national_id ?? "",
      phone: member?.phone ?? "",
      email: member?.email ?? "",
      shareholding: String(member?.shareholding ?? 0),
      next_of_kin_name: member?.next_of_kin_name ?? "",
      next_of_kin_phone: member?.next_of_kin_phone ?? "",
      next_of_kin_relationship: member?.next_of_kin_relationship ?? "",
      notes: member?.notes ?? "",
    },
  });

  // Auto-suggest the next member number when opening the drawer for a new member.
  useEffect(() => {
    if (!open || isEdit) return;
    setJoinDate(new Date());
    reset({
      member_no: "",
      full_name: "",
      national_id: "",
      phone: "",
      email: "",
      shareholding: "0",
      next_of_kin_name: "",
      next_of_kin_phone: "",
      next_of_kin_relationship: "",
      notes: "",
    });
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("members")
        .select("member_no")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      reset((prev) => ({ ...prev, member_no: suggestNextMemberNo(data?.member_no) }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, tenantId]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const supabase = createClient();
    const payload = {
      tenant_id: tenantId,
      member_no: values.member_no,
      full_name: values.full_name,
      national_id: values.national_id || null,
      phone: values.phone || null,
      email: values.email || null,
      join_date: joinDate.toISOString().slice(0, 10),
      shareholding: Number(values.shareholding),
      next_of_kin_name: values.next_of_kin_name || null,
      next_of_kin_phone: values.next_of_kin_phone || null,
      next_of_kin_relationship: values.next_of_kin_relationship || null,
      notes: values.notes || null,
    };

    const { error } = isEdit
      ? await supabase.from("members").update(payload).eq("id", member!.id)
      : await supabase.from("members").insert(payload);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    addToast({ variant: "field", message: isEdit ? "Member updated" : "Member added" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit member" : "Add member"} width={520}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Member no." required error={errors.member_no?.message}>
            <Input error={!!errors.member_no} {...register("member_no")} />
          </FormRow>
          <FormRow label="Join date" required>
            <DatePicker value={joinDate} onChange={setJoinDate} />
          </FormRow>
        </div>

        <FormRow label="Full name" required error={errors.full_name?.message}>
          <Input placeholder="e.g. Nomvula Dlamini" error={!!errors.full_name} {...register("full_name")} />
        </FormRow>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="National ID">
            <Input {...register("national_id")} />
          </FormRow>
          <FormRow label="Shareholding" required error={errors.shareholding?.message}>
            <Input type="number" step="0.01" className="text-right tabular-nums" error={!!errors.shareholding} {...register("shareholding")} />
          </FormRow>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Phone" error={errors.phone?.message}>
            <PhoneInput error={!!errors.phone} {...register("phone")} />
          </FormRow>
          <FormRow label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </FormRow>
        </div>

        <SectionHeading>Next of kin</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Name">
            <Input {...register("next_of_kin_name")} />
          </FormRow>
          <FormRow label="Relationship">
            <Input {...register("next_of_kin_relationship")} />
          </FormRow>
        </div>
        <FormRow label="Phone" error={errors.next_of_kin_phone?.message}>
          <PhoneInput error={!!errors.next_of_kin_phone} {...register("next_of_kin_phone")} />
        </FormRow>

        <FormRow label="Notes">
          <Textarea {...register("notes")} />
        </FormRow>

        {submitError && <FieldError>{submitError}</FieldError>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? "Save changes" : "Add member"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
