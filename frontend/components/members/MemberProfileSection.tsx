"use client";

import { useEffect, useState } from "react";
import { TbEdit, TbUserCheck } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MemberFormDrawer } from "./MemberFormDrawer";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import type { Database, AttendanceStatus, InviteStatus, MemberStatus } from "@/lib/database.types";

type MemberRow = Database["public"]["Tables"]["members"]["Row"];

const STATUS_BADGE: Record<MemberStatus, BadgeVariant> = {
  active: "success",
  suspended: "warning",
  exited: "danger",
};

const ATTENDANCE_BADGE: Record<AttendanceStatus, BadgeVariant> = {
  present: "success",
  apologies: "warning",
  absent: "danger",
};

const INVITE_BADGE: Record<InviteStatus, BadgeVariant> = {
  pending: "info",
  accepted: "success",
  revoked: "neutral",
  expired: "danger",
};

interface AttendanceRow {
  meeting_id: string;
  status: AttendanceStatus;
  meetings: { title: string; starts_at: string; type: string } | null;
}

interface InviteRow {
  id: string;
  status: InviteStatus;
  created_at: string;
  expires_at: string;
}

export interface MemberProfileSectionProps {
  tenantId: string;
  member: MemberRow;
  canManage: boolean;
}

export function MemberProfileSection({ tenantId, member: initialMember, canManage }: MemberProfileSectionProps) {
  const { addToast } = useToast();
  const [member, setMember] = useState(initialMember);
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [latestInvite, setLatestInvite] = useState<InviteRow | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  useEffect(() => setMember(initialMember), [initialMember]);

  useEffect(() => {
    if (tab !== "attendance") return;
    let cancelled = false;
    setAttendanceLoading(true);
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("attendance")
        .select("meeting_id, status, meetings(title, starts_at, type)")
        .eq("member_id", member.id)
        .order("meeting_id", { ascending: false });
      if (!cancelled) {
        setAttendance((data as unknown as AttendanceRow[]) ?? []);
        setAttendanceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, member.id]);

  useEffect(() => {
    if (tab !== "account") return;
    let cancelled = false;
    setAccountLoading(true);
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("invites")
        .select("id, status, created_at, expires_at")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setLatestInvite(data ?? null);
        setAccountLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, member.id]);

  const refreshMember = async () => {
    const supabase = createClient();
    const { data } = await supabase.from("members").select("*").eq("id", member.id).maybeSingle();
    if (data) setMember(data);
  };

  const inviteToApp = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("invites").insert({
      tenant_id: tenantId,
      member_id: member.id,
      name: member.full_name,
      phone: member.phone,
      email: member.email,
      role: "member",
    });
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Invite created" });
    setTab("account");
    setLatestInvite(null);
    setAccountLoading(true);
  };

  const revokeInvite = async () => {
    if (!latestInvite) return;
    const supabase = createClient();
    const { error } = await supabase.from("invites").delete().eq("id", latestInvite.id);
    if (error) {
      addToast({ variant: "danger", message: error.message });
      return;
    }
    addToast({ variant: "field", message: "Invite revoked" });
    setLatestInvite(null);
  };

  const attendanceColumns: DataTableColumn<AttendanceRow>[] = [
    { key: "title", header: "Meeting", render: (r) => r.meetings?.title ?? "—" },
    { key: "date", header: "Date", render: (r) => (r.meetings?.starts_at ? formatDate(r.meetings.starts_at) : "—") },
    { key: "status", header: "Status", render: (r) => <Badge variant={ATTENDANCE_BADGE[r.status]}>{r.status}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={member.full_name}
        subtitle={`Member no. ${member.member_no}`}
        backHref="/members"
        actions={
          canManage ? (
            <Button variant="secondary" icon={<TbEdit />} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "attendance", label: "Attendance" },
          { value: "account", label: "Account" },
          { value: "notes", label: "Notes" },
          { value: "plots", label: "Plots" },
          { value: "statements", label: "Statements" },
        ]}
      />

      {tab === "overview" && (
        <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
          <DescriptionList
            items={[
              { label: "Status", value: <Badge variant={STATUS_BADGE[member.status]}>{member.status}</Badge> },
              { label: "Member no.", value: member.member_no },
              { label: "National ID", value: member.national_id ?? "—" },
              { label: "Phone", value: member.phone ? `+268 ${member.phone}` : "—" },
              { label: "Email", value: member.email ?? "—" },
              { label: "Join date", value: formatDate(member.join_date) },
              { label: "Shareholding", value: Number(member.shareholding).toLocaleString("en-SZ", { minimumFractionDigits: 2 }) },
              { label: "Next of kin", value: member.next_of_kin_name ?? "—" },
              { label: "Next of kin phone", value: member.next_of_kin_phone ? `+268 ${member.next_of_kin_phone}` : "—" },
              { label: "Next of kin relationship", value: member.next_of_kin_relationship ?? "—" },
              ...(member.status !== "active" ? [{ label: "Status reason", value: member.status_reason ?? "—" }] : []),
            ]}
          />
        </div>
      )}

      {tab === "attendance" && (
        <DataTable columns={attendanceColumns} data={attendance} rowKey={(r) => r.meeting_id} loading={attendanceLoading} emptyTitle="No meeting history" emptyBody="Attendance records will appear here once this member attends a meeting." />
      )}

      {tab === "account" && (
        <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
          {member.user_id ? (
            <div className="flex items-center gap-2 text-sm text-ink-700">
              <TbUserCheck className="size-4 text-brand-500" />
              This member has app access linked to their account.
            </div>
          ) : accountLoading ? (
            <p className="text-sm text-ink-400">Loading…</p>
          ) : latestInvite ? (
            <DescriptionList
              items={[
                { label: "Invite status", value: <Badge variant={INVITE_BADGE[latestInvite.status]}>{latestInvite.status}</Badge> },
                { label: "Sent", value: formatDateTime(latestInvite.created_at) },
                { label: "Expires", value: formatDateTime(latestInvite.expires_at) },
              ]}
            />
          ) : (
            <p className="text-sm text-ink-500">This member has not been invited to use the app yet.</p>
          )}

          {canManage && !member.user_id && (
            <div className="mt-4">
              {latestInvite?.status === "pending" ? (
                <ConfirmDialog
                  trigger={<Button variant="danger">Revoke link</Button>}
                  title="Revoke invite"
                  body={`Revoke the pending invite sent to ${member.full_name}? They will no longer be able to accept it.`}
                  onConfirm={revokeInvite}
                />
              ) : (
                <Button onClick={inviteToApp}>Invite to app</Button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div className="rounded-card border border-paper-200 bg-paper-0 p-5 shadow-card">
          <p className="whitespace-pre-wrap text-sm text-ink-700">{member.notes || "No notes recorded."}</p>
        </div>
      )}

      {tab === "plots" && <EmptyState title="Plots" body="Coming with the Production module." />}
      {tab === "statements" && <EmptyState title="Statements" body="Coming with the Finance module." />}

      {canManage && (
        <MemberFormDrawer
          tenantId={tenantId}
          open={editOpen}
          onOpenChange={setEditOpen}
          member={member}
          onSaved={refreshMember}
        />
      )}
    </div>
  );
}
