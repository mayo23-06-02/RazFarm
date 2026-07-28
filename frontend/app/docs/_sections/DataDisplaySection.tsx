"use client";

import { useState } from "react";
import { TbCircleCheck, TbEdit, TbFileInvoice, TbTrash } from "react-icons/tb";
import { Section, Demo } from "./Section";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Timeline } from "@/components/ui/Timeline";
import { ApprovalTrail } from "@/components/ui/ApprovalTrail";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { formatMoney, formatTonnes } from "@/lib/formatMoney";

interface Row {
  id: string;
  member: string;
  field: string;
  tonnes: number;
  amount: number;
  status: "success" | "warning" | "danger";
  statusLabel: string;
}

const ROWS: Row[] = [
  { id: "DEL-1042", member: "Nomvula Dlamini", field: "B12", tonnes: 18.4, amount: 12450, status: "success", statusLabel: "Paid" },
  { id: "DEL-1041", member: "Sipho Mabuza", field: "C03", tonnes: 9.2, amount: 6210, status: "warning", statusLabel: "Pending" },
  { id: "DEL-1040", member: "Thandi Nkosi", field: "D21", tonnes: 24.1, amount: 16280, status: "success", statusLabel: "Paid" },
  { id: "DEL-1039", member: "Bheki Simelane", field: "B14", tonnes: 5.6, amount: 3780, status: "danger", statusLabel: "Overdue" },
  { id: "DEL-1038", member: "Precious Zwane", field: "A08", tonnes: 14.9, amount: 10060, status: "success", statusLabel: "Paid" },
];

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "id", header: "Consignment", render: (r) => <span className="font-mono text-xs font-semibold text-ink-900">{r.id}</span> },
  { key: "member", header: "Member", sortable: true, sortValue: (r) => r.member, render: (r) => r.member },
  { key: "field", header: "Field", render: (r) => <Badge variant="neutral">{r.field}</Badge> },
  { key: "tonnes", header: "Tonnes", align: "right", sortable: true, sortValue: (r) => r.tonnes, render: (r) => formatTonnes(r.tonnes) },
  { key: "amount", header: "Amount", align: "right", sortable: true, sortValue: (r) => r.amount, render: (r) => `E ${formatMoney(r.amount)}` },
  { key: "status", header: "Status", render: (r) => <Badge variant={r.status}>{r.statusLabel}</Badge> },
];

export function DataDisplaySection() {
  const [page, setPage] = useState(1);

  return (
    <Section id="data" title="Data Display" description="The workhorse DataTable, plus badges, avatars, timelines and approval trails used across detail pages.">
      <Demo label="DataTable — sortable, row actions">
        <DataTable
          columns={COLUMNS}
          data={ROWS}
          rowKey={(r) => r.id}
          sortable
          rowActions={() => [
            { label: "View invoice", icon: <TbFileInvoice />, onSelect: () => {} },
            { label: "Edit", icon: <TbEdit />, onSelect: () => {} },
            { label: "Delete", icon: <TbTrash />, destructive: true, onSelect: () => {} },
          ]}
        />
        <Pagination
          className="mt-3"
          page={page}
          totalPages={9}
          totalItems={312}
          pageSize={25}
          onPageChange={setPage}
        />
      </Demo>

      <Demo label="DataTable — empty & loading states">
        <div className="grid gap-4 lg:grid-cols-2">
          <DataTable columns={COLUMNS} data={[]} rowKey={(r) => r.id} emptyTitle="No deliveries this season yet" emptyBody="Record the first consignment to see it here." />
          <TableSkeleton rows={4} cols={4} />
        </div>
      </Demo>

      <Demo label="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success" icon={<TbCircleCheck />}>Paid</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="danger">Overdue</Badge>
          <Badge variant="info">Draft</Badge>
          <Badge variant="neutral">Ratoon 3</Badge>
          <Badge variant="brand">Chairman</Badge>
        </div>
      </Demo>

      <Demo label="Status dot, avatars">
        <div className="flex flex-wrap items-center gap-6">
          <StatusDot tone="success" label="Synced" />
          <StatusDot tone="info" label="Syncing" pulse />
          <StatusDot tone="warning" label="Offline — 6 pending" />
          <Avatar name="Nomvula Dlamini" size="md" />
          <AvatarStack
            people={[
              { name: "Nomvula Dlamini" },
              { name: "Sipho Mabuza" },
              { name: "Thandi Nkosi" },
              { name: "Bheki Simelane" },
              { name: "Precious Zwane" },
            ]}
          />
        </div>
      </Demo>

      <Demo label="Description list">
        <DescriptionList
          items={[
            { label: "Field code", value: "B12" },
            { label: "Hectares", value: "4.2 ha" },
            { label: "Variety", value: "N41" },
            { label: "Irrigation", value: "Sprinkler" },
            { label: "Ratoon", value: "Ratoon 3" },
            { label: "Status", value: <Badge variant="success">Active</Badge> },
          ]}
        />
      </Demo>

      <Demo label="Timeline">
        <Timeline
          items={[
            { title: "Fertilizer applied — NPK 12-24-12", meta: "12 Jul 2026", description: "180 kg/ha, applied by Supervisor S. Mabuza" },
            { title: "Irrigation cycle completed", meta: "18 Jul 2026" },
            { title: "Cutting scheduled", meta: "24 Jul 2026", description: "Contractor: Lubombo Cutters" },
          ]}
        />
      </Demo>

      <Demo label="Approval trail">
        <ApprovalTrail
          steps={[
            { label: "Raised", status: "done" },
            { label: "Endorsed", status: "done" },
            { label: "Approved", status: "current" },
            { label: "Paid", status: "upcoming" },
          ]}
        />
      </Demo>

      <Demo label="Empty state & chart skeleton">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-card border border-paper-200 bg-paper-0">
            <EmptyState
              title="No deliveries this season yet"
              body="Record the first consignment to start tracking tonnage and sucrose."
              action={<Button size="sm">Record delivery</Button>}
            />
          </div>
          <ChartSkeleton height={180} />
        </div>
      </Demo>
    </Section>
  );
}
