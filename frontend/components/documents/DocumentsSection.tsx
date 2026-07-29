"use client";

import { useMemo, useState } from "react";
import { TbDownload, TbFile, TbFileSpreadsheet, TbFileText, TbFileTypePdf, TbPhoto, TbTrash } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { FileUpload } from "@/components/ui/FileUpload";
import { IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import type { Database, DocumentCategory } from "@/lib/database.types";

type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "constitution", label: "Constitution" },
  { value: "agreements", label: "Agreements" },
  { value: "policies", label: "Policies" },
  { value: "titles", label: "Titles" },
  { value: "general", label: "General" },
];

function iconFor(mimeType: string | null) {
  if (!mimeType) return TbFile;
  if (mimeType.startsWith("image/")) return TbPhoto;
  if (mimeType === "application/pdf") return TbFileTypePdf;
  if (mimeType.includes("sheet") || mimeType.includes("csv") || mimeType.includes("excel")) return TbFileSpreadsheet;
  if (mimeType.includes("word") || mimeType.includes("text")) return TbFileText;
  return TbFile;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface DocumentsSectionProps {
  tenantId: string;
  initialDocuments: DocumentRow[];
  uploaderNames: Record<string, string>;
  canManage: boolean;
}

export function DocumentsSection({ tenantId, initialDocuments, uploaderNames, canManage }: DocumentsSectionProps) {
  const { addToast } = useToast();
  const [documents, setDocuments] = useState(initialDocuments);
  const [category, setCategory] = useState<DocumentCategory>("constitution");
  const [uploading, setUploading] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<DocumentCategory, number>();
    for (const d of documents) map.set(d.category, (map.get(d.category) ?? 0) + 1);
    return map;
  }, [documents]);

  const filtered = documents.filter((d) => d.category === category);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("documents").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    setDocuments(data ?? []);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const file of files) {
      const path = `${tenantId}/${category}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("tenant-docs").upload(path, file);
      if (uploadError) {
        addToast({ variant: "danger", message: `${file.name}: ${uploadError.message}` });
        continue;
      }
      const { error: insertError } = await supabase.from("documents").insert({
        tenant_id: tenantId,
        category,
        name: file.name,
        path,
        size: file.size,
        mime_type: file.type || null,
        uploaded_by: user?.id,
      });
      if (insertError) {
        addToast({ variant: "danger", message: `${file.name}: ${insertError.message}` });
      }
    }

    setUploading(false);
    addToast({ variant: "field", message: "Upload complete" });
    refresh();
  };

  const download = async (doc: DocumentRow) => {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("tenant-docs").createSignedUrl(doc.path, 60);
    if (error || !data) {
      addToast({ variant: "danger", message: error?.message ?? "Could not create download link" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const remove = async (doc: DocumentRow) => {
    const supabase = createClient();
    await supabase.storage.from("tenant-docs").remove([doc.path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Document deleted" });
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Documents" subtitle="Constitution, agreements, policies and titles for your association." />

      <div className="grid gap-6 md:grid-cols-[200px,1fr]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex shrink-0 items-center justify-between gap-2 rounded-ctrl px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ${
                category === c.value ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-paper-100 hover:text-ink-700"
              }`}
            >
              {c.label}
              <span className="text-xs text-ink-400">{counts.get(c.value) ?? 0}</span>
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-4">
          {canManage && (
            <FileUpload label="Drop files here or click to upload" hint={uploading ? "Uploading…" : "PDF, images, spreadsheets and documents"} onFiles={uploadFiles} />
          )}

          {filtered.length === 0 ? (
            <EmptyState title="No documents in this category" body={canManage ? "Upload the first document above." : "Documents will appear here once uploaded."} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((doc) => {
                const Icon = iconFor(doc.mime_type);
                return (
                  <div key={doc.id} className="flex flex-col gap-3 rounded-card border border-paper-200 bg-paper-0 p-4 shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <Icon className="size-8 shrink-0 text-brand-500" />
                      <div className="flex gap-1">
                        <IconButton label="Download" icon={<TbDownload />} size="sm" onClick={() => download(doc)} />
                        {canManage && (
                          <ConfirmDialog
                            trigger={<IconButton label="Delete" icon={<TbTrash />} size="sm" />}
                            title="Delete document"
                            body={`Delete "${doc.name}"? This cannot be undone.`}
                            onConfirm={() => remove(doc)}
                          />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{doc.name}</p>
                      <p className="text-xs text-ink-400">
                        {formatSize(doc.size)} · {doc.uploaded_by ? uploaderNames[doc.uploaded_by] ?? "Unknown" : "Unknown"} · {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
