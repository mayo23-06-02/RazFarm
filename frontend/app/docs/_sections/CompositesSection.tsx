import { Section, Demo } from "./Section";
import { DeliveryRow, type Delivery } from "@/components/app/DeliveryRow";
import { MemberCell } from "@/components/app/MemberCell";
import { FieldCard } from "@/components/app/FieldCard";
import { PayoutSummaryCard } from "@/components/app/PayoutSummaryCard";
import { InvoicePreview } from "@/components/app/InvoicePreview";
import { StatementTable } from "@/components/app/StatementTable";
import { SeasonPicker } from "@/components/app/SeasonPicker";
import { SyncStatus } from "@/components/app/SyncStatus";
import { TenantSwitcher } from "@/components/app/TenantSwitcher";
import { NotificationBell } from "@/components/app/NotificationBell";
import { UserMenu } from "@/components/app/UserMenu";

const DELIVERIES: Delivery[] = [
  { consignment: "DEL-1042", fields: ["B12", "B14"], tonnes: 18.4, sucrose: 14.9, rv: 13.2, mill: "Royal Swazi Sugar", synced: true },
  { consignment: "DEL-1043", fields: ["C03"], tonnes: 9.2, sucrose: 13.6, rv: 12.1, mill: "Ubombo Sugar", synced: false },
];

export function CompositesSection() {
  return (
    <Section id="composites" title="Domain Composites" description="Higher-level components assembled from the primitives above — these carry cane-specific meaning and live in /components/app.">
      <Demo label="Delivery row">
        <div className="space-y-2">
          {DELIVERIES.map((d) => (
            <DeliveryRow key={d.consignment} delivery={d} />
          ))}
        </div>
      </Demo>

      <Demo label="Member cell">
        <div className="flex flex-wrap gap-6">
          <MemberCell name="Nomvula Dlamini" role="Chairman" roleVariant="brand" />
          <MemberCell name="Thabo Mahlalela" role="Treasurer" roleVariant="info" />
          <MemberCell name="Sipho Mabuza" role="Member" roleVariant="neutral" />
        </div>
      </Demo>

      <Demo label="Field card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FieldCard
            code="B12"
            hectares={4.2}
            variety="N41"
            ratoon={3}
            status="active"
            spark={[{ season: "23/24", yield: 68 }, { season: "24/25", yield: 74 }, { season: "25/26", yield: 71 }, { season: "26/27", yield: 82 }]}
          />
          <FieldCard
            code="D21"
            hectares={9.0}
            variety="N39"
            ratoon={1}
            status="harvesting"
            spark={[{ season: "23/24", yield: 55 }, { season: "24/25", yield: 62 }, { season: "25/26", yield: 70 }, { season: "26/27", yield: 78 }]}
          />
          <FieldCard
            code="A08"
            hectares={2.6}
            variety="N25"
            ratoon={5}
            status="fallow"
            spark={[{ season: "23/24", yield: 60 }, { season: "24/25", yield: 54 }, { season: "25/26", yield: 48 }, { season: "26/27", yield: 40 }]}
          />
        </div>
      </Demo>

      <Demo label="Payout summary card">
        <div className="max-w-sm">
          <PayoutSummaryCard
            memberName="Nomvula Dlamini"
            gross={18420}
            deductions={[
              { label: "Haulage", amount: 2100 },
              { label: "Cutting contractor", amount: 1650 },
              { label: "ESA levy", amount: 480 },
              { label: "Loan repayment", amount: 900 },
            ]}
            net={13290}
          />
        </div>
      </Demo>

      <Demo label="Invoice preview">
        <div className="max-w-xl">
          <InvoicePreview
            invoiceNumber="INV-2026-0148"
            date={new Date("2026-07-14")}
            dueDate={new Date("2026-07-28")}
            billTo="Nomvula Dlamini — Plot B12"
            lines={[
              { description: "Fertilizer — NPK 12-24-12 (bags)", qty: 12, unitPrice: 480 },
              { description: "Seed cane — N41 (tonnes)", qty: 2, unitPrice: 1250 },
            ]}
          />
        </div>
      </Demo>

      <Demo label="Statement table">
        <StatementTable
          openingBalance={4200}
          entries={[
            { date: new Date("2026-06-02"), description: "Delivery DEL-0991 payout", credit: 12450 },
            { date: new Date("2026-06-10"), description: "Fertilizer advance", debit: 3200 },
            { date: new Date("2026-06-28"), description: "Loan repayment", debit: 900 },
          ]}
        />
      </Demo>

      <Demo label="Season picker, sync status, tenant switcher, notifications, user menu">
        <div className="flex flex-wrap items-center gap-4">
          <SeasonPicker className="w-56" />
          <SyncStatus state="offline" pendingCount={6} />
          <TenantSwitcher
            tenants={[{ name: "Ka-Lavumisa Growers", role: "Chairman" }, { name: "Big Bend Co-op", role: "Accountant" }]}
            active={{ name: "Ka-Lavumisa Growers", role: "Chairman" }}
          />
          <NotificationBell items={[{ title: "Payout run #14 awaiting approval", time: "12m ago" }]} />
          <UserMenu name="Nomvula Dlamini" role="Chairman" />
        </div>
      </Demo>
    </Section>
  );
}
