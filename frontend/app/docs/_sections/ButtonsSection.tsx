import { TbCheck, TbDotsVertical, TbDownload, TbPlus, TbTrash } from "react-icons/tb";
import { Section, Demo } from "./Section";
import { Button, ButtonGroup, IconButton } from "@/components/ui/Button";

export function ButtonsSection() {
  return (
    <Section id="buttons" title="Buttons" description="Green is reserved for the one primary action per view. No separate success variant — primary is the success voice.">
      <Demo label="Variants">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Record delivery</Button>
          <Button variant="secondary">Export CSV</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete field</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="primary" loading>
            Saving
          </Button>
        </div>
      </Demo>

      <Demo label="Sizes">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Demo>

      <Demo label="With icons">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<TbPlus />}>New payout run</Button>
          <Button variant="secondary" iconRight={<TbDownload />}>
            Download statement
          </Button>
          <Button variant="primary" icon={<TbCheck />}>
            Approve
          </Button>
        </div>
      </Demo>

      <Demo label="Icon buttons & button group">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton label="More actions" icon={<TbDotsVertical />} />
          <IconButton label="Delete" icon={<TbTrash />} variant="secondary" />
          <ButtonGroup
            options={[
              { value: "day", label: "Day" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
            defaultValue="week"
          />
        </div>
      </Demo>
    </Section>
  );
}
