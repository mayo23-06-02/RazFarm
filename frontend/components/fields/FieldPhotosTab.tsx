"use client";

import { useEffect, useState } from "react";
import { TbPhoto, TbTrash } from "react-icons/tb";
import { FileUpload } from "@/components/ui/FileUpload";
import { IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import type { Database } from "@/lib/database.types";

type FieldPhotoRow = Database["public"]["Tables"]["field_photos"]["Row"];

export interface FieldPhotosTabProps {
  tenantId: string;
  fieldId: string;
  initialPhotos: FieldPhotoRow[];
  canManage: boolean;
}

export function FieldPhotosTab({ tenantId, fieldId, initialPhotos, canManage }: FieldPhotosTabProps) {
  const { addToast } = useToast();
  const [photos, setPhotos] = useState(initialPhotos);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        photos.map(async (p) => {
          const { data } = await supabase.storage.from("field-photos").createSignedUrl(p.path, 3600);
          return [p.id, data?.signedUrl ?? ""] as const;
        })
      );
      if (!cancelled) setUrls(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const refresh = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("field_photos").select("*").eq("field_id", fieldId).order("taken_at", { ascending: false });
    setPhotos(data ?? []);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    for (const file of files) {
      const path = `${tenantId}/${fieldId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("field-photos").upload(path, file);
      if (uploadError) {
        addToast({ variant: "danger", message: `${file.name}: ${uploadError.message}` });
        continue;
      }
      const { error: insertError } = await supabase.from("field_photos").insert({
        tenant_id: tenantId,
        field_id: fieldId,
        path,
        created_by: user?.id,
      });
      if (insertError) {
        addToast({ variant: "danger", message: `${file.name}: ${insertError.message}` });
      }
    }

    setUploading(false);
    addToast({ variant: "field", message: "Photos uploaded" });
    refresh();
  };

  const remove = async (photo: FieldPhotoRow) => {
    const supabase = createClient();
    await supabase.storage.from("field-photos").remove([photo.path]);
    const { error } = await supabase.from("field_photos").delete().eq("id", photo.id);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  };

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <FileUpload
          label="Drop photos here or click to upload"
          hint={uploading ? "Uploading…" : "Field, activity or harvest photos — JPG or PNG"}
          accept="image/*"
          onFiles={uploadFiles}
        />
      )}

      {photos.length === 0 ? (
        <EmptyState icon={<TbPhoto />} title="No photos yet" body={canManage ? "Upload the first photo above." : "Photos will appear here once uploaded."} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-card border border-paper-200 bg-paper-0">
              {urls[photo.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[photo.id]} alt={photo.caption ?? "Field photo"} className="aspect-square w-full object-cover" />
              ) : (
                <div className="aspect-square w-full animate-pulse bg-paper-100" />
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-ink-900/60 px-2 py-1.5">
                <span className="truncate text-xs text-white">{formatDate(photo.taken_at)}</span>
                {canManage && (
                  <ConfirmDialog
                    trigger={<IconButton label="Delete photo" icon={<TbTrash />} size="sm" className="text-white hover:bg-white/20 hover:text-white" />}
                    title="Delete photo"
                    body="Delete this photo? This cannot be undone."
                    onConfirm={() => remove(photo)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
