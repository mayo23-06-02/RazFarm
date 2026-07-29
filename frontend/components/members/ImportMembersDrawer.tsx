"use client";

import { useMemo, useState } from "react";
import { TbDownload } from "react-icons/tb";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { Select, type SelectOption } from "@/components/ui/Select";
import { FormRow } from "@/components/ui/FormRow";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { parseCsv, rowsToRecords, toCsv } from "@/lib/csv";
import { isEswatiniPhone } from "@/lib/validators/auth";

const TARGET_FIELDS = [
  { key: "member_no", label: "Member no.", required: true },
  { key: "full_name", label: "Full name", required: true },
  { key: "national_id", label: "National ID", required: false },
  { key: "phone", label: "Phone (8 digits)", required: false },
  { key: "email", label: "Email", required: false },
  { key: "join_date", label: "Join date (YYYY-MM-DD)", required: false },
  { key: "shareholding", label: "Shareholding", required: false },
  { key: "next_of_kin_name", label: "Next of kin name", required: false },
  { key: "next_of_kin_phone", label: "Next of kin phone", required: false },
  { key: "next_of_kin_relationship", label: "Next of kin relationship", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

type TargetKey = (typeof TARGET_FIELDS)[number]["key"];

interface PreviewRow {
  rowNumber: number;
  values: Record<TargetKey, string>;
  errors: string[];
}

function downloadTemplate() {
  const csv = toCsv([
    TARGET_FIELDS.map((f) => f.key),
    ["M-0001", "Nomvula Dlamini", "0000000000", "76123456", "nomvula@example.com", "2024-03-01", "12", "Thabo Dlamini", "76129999", "Spouse", ""],
  ]);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "members-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function validateRow(values: Record<TargetKey, string>): string[] {
  const errors: string[] = [];
  if (!values.member_no) errors.push("Member no. is required");
  if (!values.full_name || values.full_name.length < 2) errors.push("Full name is required");
  if (values.phone && !isEswatiniPhone(values.phone)) errors.push("Phone must be 8 digits");
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.push("Invalid email");
  if (values.join_date && Number.isNaN(Date.parse(values.join_date))) errors.push("Invalid join date");
  if (values.shareholding && Number.isNaN(Number(values.shareholding))) errors.push("Shareholding must be a number");
  return errors;
}

export interface ImportMembersDrawerProps {
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportMembersDrawer({ tenantId, open, onOpenChange, onImported }: ImportMembersDrawerProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<TargetKey, string>>({} as Record<TargetKey, string>);
  const [committing, setCommitting] = useState(false);

  const header = rows[0] ?? [];
  const columnOptions: SelectOption[] = [{ value: "", label: "— Skip —" }, ...header.map((h) => ({ value: h, label: h }))];

  const reset = () => {
    setStep("upload");
    setRows([]);
    setMapping({} as Record<TargetKey, string>);
  };

  const handleFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);

    const guessed: Record<TargetKey, string> = {} as Record<TargetKey, string>;
    for (const field of TARGET_FIELDS) {
      const match = parsed[0]?.find((h) => h.toLowerCase().replace(/\s+/g, "_") === field.key);
      guessed[field.key] = match ?? "";
    }
    setMapping(guessed);
    setStep("map");
  };

  const previewRows: PreviewRow[] = useMemo(() => {
    if (step !== "preview") return [];
    const records = rowsToRecords(rows);
    return records.map((record, i) => {
      const values = {} as Record<TargetKey, string>;
      for (const field of TARGET_FIELDS) {
        const sourceCol = mapping[field.key];
        values[field.key] = sourceCol ? (record[sourceCol] ?? "") : "";
      }
      return { rowNumber: i + 2, values, errors: validateRow(values) };
    });
  }, [step, rows, mapping]);

  const validRows = previewRows.filter((r) => r.errors.length === 0);
  const invalidRows = previewRows.filter((r) => r.errors.length > 0);

  const commit = async () => {
    setCommitting(true);
    const supabase = createClient();
    const payload = validRows.map((r) => ({
      tenant_id: tenantId,
      member_no: r.values.member_no,
      full_name: r.values.full_name,
      national_id: r.values.national_id || null,
      phone: r.values.phone || null,
      email: r.values.email || null,
      join_date: r.values.join_date || new Date().toISOString().slice(0, 10),
      shareholding: r.values.shareholding ? Number(r.values.shareholding) : 0,
      next_of_kin_name: r.values.next_of_kin_name || null,
      next_of_kin_phone: r.values.next_of_kin_phone || null,
      next_of_kin_relationship: r.values.next_of_kin_relationship || null,
      notes: r.values.notes || null,
    }));

    const { error } = await supabase.from("members").insert(payload);
    setCommitting(false);

    if (error) {
      addToast({ variant: "danger", message: `Import failed: ${error.message}` });
      return;
    }

    addToast({ variant: "field", message: `Imported ${payload.length} member${payload.length === 1 ? "" : "s"}` });
    onOpenChange(false);
    onImported();
    reset();
  };

  const previewColumns: DataTableColumn<PreviewRow>[] = [
    { key: "row", header: "Row", render: (r) => r.rowNumber, width: "60px" },
    { key: "member_no", header: "Member no.", render: (r) => r.values.member_no },
    { key: "full_name", header: "Name", render: (r) => r.values.full_name },
    { key: "phone", header: "Phone", render: (r) => r.values.phone },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        r.errors.length === 0 ? (
          <Badge variant="success">OK</Badge>
        ) : (
          <span className="flex flex-col gap-0.5">
            <Badge variant="danger">Error</Badge>
            <span className="text-xs text-danger-600">{r.errors.join("; ")}</span>
          </span>
        ),
    },
  ];

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title="Import members"
      width={640}
    >
      <div className="flex flex-col gap-5">
        {step === "upload" && (
          <>
            <Button variant="secondary" icon={<TbDownload />} onClick={downloadTemplate} className="self-start">
              Download CSV template
            </Button>
            <FileUpload
              label="Drop your member CSV here or click to upload"
              hint="Column headers can be in any order — you'll map them next."
              accept=".csv,text/csv"
              multiple={false}
              onFiles={handleFile}
            />
          </>
        )}

        {step === "map" && (
          <>
            <p className="text-sm text-ink-500">Match each field to a column from your file.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {TARGET_FIELDS.map((field) => (
                <FormRow key={field.key} label={field.label} required={field.required}>
                  <Select
                    options={columnOptions}
                    value={mapping[field.key] ?? ""}
                    onChange={(v) => setMapping((prev) => ({ ...prev, [field.key]: v }))}
                  />
                </FormRow>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={reset}>
                Back
              </Button>
              <Button
                disabled={!mapping.member_no || !mapping.full_name}
                onClick={() => setStep("preview")}
              >
                Preview import
              </Button>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="success">{validRows.length} ready</Badge>
              {invalidRows.length > 0 && <Badge variant="danger">{invalidRows.length} with errors</Badge>}
            </div>
            <DataTable columns={previewColumns} data={previewRows} rowKey={(r) => String(r.rowNumber)} compact />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("map")}>
                Back
              </Button>
              <Button onClick={commit} loading={committing} disabled={validRows.length === 0}>
                Import {validRows.length} member{validRows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
