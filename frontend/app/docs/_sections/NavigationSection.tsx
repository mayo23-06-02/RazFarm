import { Section, Demo } from "./Section";
import { Tabs } from "@/components/ui/Tabs";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stepper } from "@/components/ui/Stepper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";

export function NavigationSection() {
  return (
    <Section id="navigation" title="Navigation & Structure" description="Underline tabs, breadcrumbs, page headers and steppers used across detail pages and multi-step forms.">
      <Demo label="Tabs">
        <Tabs
          items={[
            { value: "overview", label: "Overview" },
            { value: "activities", label: "Activities", badge: 12 },
            { value: "harvests", label: "Harvests" },
            { value: "costs", label: "Costs" },
          ]}
          defaultValue="overview"
        />
      </Demo>

      <Demo label="Breadcrumbs">
        <Breadcrumbs items={[{ label: "Fields", href: "#" }, { label: "B12", href: "#" }, { label: "Activities" }]} />
      </Demo>

      <Demo label="Page header">
        <PageHeader
          title="Field B12"
          subtitle="4.2 ha · Variety N41 · Ratoon 3"
          backHref="#"
          actions={
            <>
              <Button variant="secondary">Export</Button>
              <Button>Record activity</Button>
            </>
          }
        />
      </Demo>

      <Demo label="Stepper">
        <Stepper
          current={1}
          steps={[
            { label: "Association profile", description: "Name, contact, mill affiliation" },
            { label: "Season calendar", description: "Start date, deduction types, levy rates" },
            { label: "Invite committee", description: "Chairman, treasurer, secretary" },
          ]}
        />
      </Demo>

      <Demo label="Section heading">
        <div className="space-y-3">
          <SectionHeading>Production</SectionHeading>
          <SectionHeading>Finance</SectionHeading>
        </div>
      </Demo>
    </Section>
  );
}
