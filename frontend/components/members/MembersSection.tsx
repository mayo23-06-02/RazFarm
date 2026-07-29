"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TbFileImport, TbPlus, TbUserCheck, TbUsers, TbUserX, TbWallet } from "react-icons/tb";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiRow, StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import { MemberCell } from "@/components/app/MemberCell";
import { MemberFormDrawer } from "./MemberFormDrawer";
import { ImportMembersDrawer } from "./ImportMembersDrawer";
import { ChangeStatusModal } from "./ChangeStatusModal";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/formatDate";
import type { Database, MemberStatus } from "@/lib/database.types";

type MemberRow = Database["public"]["Tables"]["members"]["Row"];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "exited", label: "Exited" },
];

const STATUS_BADGE: Record<MemberStatus, BadgeVariant> = {
  active: "success",
  suspended: "warning",
  exited: "danger",
};

const PAGE_SIZE = 20;

export interface MembersSectionProps {
  tenantId: string;
  canManage: boolean;
}

export function MembersSection({ tenantId, canManage }: MembersSectionProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState({ active: 0, suspended: 0, totalShareholding: 0, newThisSeason: 0 });

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<MemberRow | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const supabase = createClient();
      let query = supabase
        .from("members")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (status !== "all") query = query.eq("status", status as MemberStatus);
      if (search.trim()) {
        const term = search.trim();
        query = query.or(`full_name.ilike.%${term}%,member_no.ilike.%${term}%,phone.ilike.%${term}%`);
      }

      const { data, count, error } = await query;
      if (cancelled) return;
      if (error) {
        addToast({ variant: "danger", message: error.message });
      } else {
        setRows(data ?? []);
        setTotal(count ?? 0);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, search, status, page, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [{ data: members }, { data: settings }] = await Promise.all([
        supabase.from("members").select("status, shareholding, join_date").eq("tenant_id", tenantId),
        supabase.from("tenant_settings").select("season_start").eq("tenant_id", tenantId).maybeSingle(),
      ]);
      if (cancelled) return;
      const seasonStart = settings?.season_start ?? `${new Date().getFullYear()}-01-01`;
      const list = members ?? [];
      setKpis({
        active: list.filter((m) => m.status === "active").length,
        suspended: list.filter((m) => m.status === "suspended").length,
        totalShareholding: list.reduce((sum, m) => sum + Number(m.shareholding ?? 0), 0),
        newThisSeason: list.filter((m) => m.join_date >= seasonStart).length,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId, refreshKey]);

  const inviteToApp = async (member: MemberRow) => {
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
    addToast({ variant: "field", message: `Invite created for ${member.full_name}` });
    refresh();
  };

  const columns: DataTableColumn<MemberRow>[] = [
    { key: "member_no", header: "Member no.", render: (m) => <span className="font-mono text-xs">{m.member_no}</span>, sortable: true, sortValue: (m) => m.member_no },
    {
      key: "name",
      header: "Member",
      render: (m) => (
        <div className="flex items-center gap-1.5">
          <MemberCell name={m.full_name} role={m.status} roleVariant={STATUS_BADGE[m.status]} />
          {m.user_id && (
            <Tooltip content="Has app access">
              <TbUserCheck className="size-4 shrink-0 text-brand-500" />
            </Tooltip>
          )}
        </div>
      ),
      sortable: true,
      sortValue: (m) => m.full_name,
    },
    { key: "phone", header: "Phone", render: (m) => (m.phone ? `+268 ${m.phone}` : "—") },
    {
      key: "shareholding",
      header: "Shareholding",
      align: "right",
      render: (m) => Number(m.shareholding).toLocaleString("en-SZ", { minimumFractionDigits: 2 }),
      sortable: true,
      sortValue: (m) => Number(m.shareholding),
    },
    { key: "join_date", header: "Joined", render: (m) => formatDate(m.join_date), sortable: true, sortValue: (m) => m.join_date },
    { key: "status", header: "Status", render: (m) => <Badge variant={STATUS_BADGE[m.status]}>{m.status}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        subtitle="The grower register — every member, whether or not they have app access."
        actions={
          canManage ? (
            <>
              <Button variant="secondary" icon={<TbFileImport />} onClick={() => setImportOpen(true)}>
                Import
              </Button>
              <Button icon={<TbPlus />} onClick={() => setAddOpen(true)}>
                Add member
              </Button>
            </>
          ) : undefined
        }
      />

      <KpiRow>
        <StatCard label="Active members" value={kpis.active} icon={<TbUsers />} />
        <StatCard label="Total shareholding" value={kpis.totalShareholding} formatValue={(v) => Math.round(v).toLocaleString("en-SZ")} icon={<TbWallet />} />
        <StatCard label="New this season" value={kpis.newThisSeason} icon={<TbUserCheck />} />
        <StatCard label="Suspended" value={kpis.suspended} icon={<TbUserX />} />
      </KpiRow>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          placeholder="Search name, member no. or phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          onClear={() => setSearch("")}
          className="sm:max-w-xs"
        />
        <Select
          options={STATUS_FILTER_OPTIONS}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          className="sm:w-48"
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(m) => m.id}
        sortable
        loading={loading}
        onRowClick={(m) => router.push(`/members/${m.id}`)}
        emptyTitle="No members yet"
        emptyBody="Add your first member or import a CSV to get started."
        rowActions={
          canManage
            ? (m) => [
                { label: "Edit", onSelect: () => setEditing(m) },
                { label: "Change status", onSelect: () => setStatusTarget(m) },
                ...(m.user_id ? [] : [{ label: "Invite to app", onSelect: () => inviteToApp(m) }]),
              ]
            : undefined
        }
      />

      {total > PAGE_SIZE && (
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}

      {canManage && (
        <>
          <MemberFormDrawer tenantId={tenantId} open={addOpen} onOpenChange={setAddOpen} onSaved={refresh} />
          <MemberFormDrawer
            tenantId={tenantId}
            open={!!editing}
            onOpenChange={(v) => !v && setEditing(null)}
            member={editing}
            onSaved={refresh}
          />
          <ImportMembersDrawer tenantId={tenantId} open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />
          {statusTarget && (
            <ChangeStatusModal
              member={statusTarget}
              open={!!statusTarget}
              onOpenChange={(v) => !v && setStatusTarget(null)}
              onSaved={refresh}
            />
          )}
        </>
      )}
    </div>
  );
}
