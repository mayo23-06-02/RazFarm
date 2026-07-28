import { TbCalendarEvent, TbMapPin, TbUser } from "react-icons/tb";
import { Section, Demo } from "./Section";
import { Input, Textarea, SearchInput } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { OTPInput } from "@/components/ui/OTPInput";
import { Select, Combobox } from "@/components/ui/Select";
import { DatePicker, DateRangePicker } from "@/components/ui/DatePicker";
import { Checkbox, Radio, Toggle } from "@/components/ui/Checkbox";
import { FileUpload } from "@/components/ui/FileUpload";
import { FormRow } from "@/components/ui/FormRow";

const FIELD_OPTIONS = [
  { value: "b12", label: "Field B12 — 4.2 ha" },
  { value: "b14", label: "Field B14 — 6.8 ha" },
  { value: "c03", label: "Field C03 — 3.1 ha" },
  { value: "d21", label: "Field D21 — 9.0 ha" },
];

export function FormControlsSection() {
  return (
    <Section id="forms" title="Form Controls" description="Hit targets ≥ 40px for gloved, field use. Errors pair a red border with an explicit message — never color alone.">
      <Demo label="Text inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Member name" required>
            <Input placeholder="e.g. Nomvula Dlamini" prefix={<TbUser />} />
          </FormRow>
          <FormRow label="Field code" error="Field code is required">
            <Input placeholder="e.g. B12" error />
          </FormRow>
          <FormRow label="Search" layout="stacked">
            <SearchInput placeholder="Search deliveries…" />
          </FormRow>
          <FormRow label="Notes" hint="Visible to the treasurer and accountant only">
            <Textarea placeholder="Add context for this expense…" />
          </FormRow>
        </div>
      </Demo>

      <Demo label="Money, quantity & OTP">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormRow label="Advance amount">
            <MoneyInput defaultValue={2500} />
          </FormRow>
          <FormRow label="Tonnes cut today">
            <NumberStepper defaultValue={12} step={0.5} suffix="t" />
          </FormRow>
          <FormRow label="Verification code" hint="Sent via SMS">
            <OTPInput length={6} />
          </FormRow>
        </div>
      </Demo>

      <Demo label="Select, combobox & dates">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Assign to field">
            <Select options={FIELD_OPTIONS} placeholder="Choose a field" />
          </FormRow>
          <FormRow label="Haulier" hint="Type to filter">
            <Combobox options={FIELD_OPTIONS} placeholder="Search haulier…" />
          </FormRow>
          <FormRow label="Delivery date">
            <DatePicker placeholder="Select date" />
          </FormRow>
          <FormRow label="Reporting period">
            <DateRangePicker />
          </FormRow>
        </div>
      </Demo>

      <Demo label="Checkbox, radio & toggle">
        <div className="flex flex-wrap items-center gap-6">
          <Checkbox label="I confirm the tonnage is accurate" defaultChecked />
          <div className="flex items-center gap-4">
            <Radio name="deduction-order" label="Haulage first" defaultChecked />
            <Radio name="deduction-order" label="Cutting first" />
          </div>
          <Toggle label="Enable SMS notifications" defaultChecked />
        </div>
      </Demo>

      <Demo label="File upload">
        <FileUpload label="Drop the delivery note or click to upload" accept="image/*,.pdf" />
      </Demo>

      <Demo label="Settings layout (FormRow grid)">
        <div className="max-w-xl space-y-4">
          <FormRow label="Association name" layout="settings">
            <Input defaultValue="Ka-Lavumisa Growers Association" />
          </FormRow>
          <FormRow label="Season start" layout="settings" hint="Used for quota and reporting resets">
            <DatePicker placeholder="Select start date" />
          </FormRow>
          <FormRow label="Mill affiliation" layout="settings">
            <Select options={[{ value: "rss", label: "Royal Swazi Sugar" }, { value: "ubombo", label: "Ubombo Sugar" }]} placeholder="Select mill" />
          </FormRow>
        </div>
      </Demo>

      <Demo label="Field-context icons">
        <div className="flex flex-wrap gap-3 text-sm text-ink-500">
          <span className="flex items-center gap-1.5"><TbMapPin className="size-4" /> GPS boundary reference</span>
          <span className="flex items-center gap-1.5"><TbCalendarEvent className="size-4" /> Cutting schedule</span>
        </div>
      </Demo>
    </Section>
  );
}
