"use client";

import { TbDotsVertical, TbEdit, TbTrash } from "react-icons/tb";
import { Section, Demo } from "./Section";
import { Button, IconButton } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { Banner } from "@/components/ui/Banner";
import { Tooltip } from "@/components/ui/Tooltip";
import { Popover, DropdownMenu } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { DescriptionList } from "@/components/ui/DescriptionList";
import { Badge } from "@/components/ui/Badge";

function ToastDemo() {
  const { addToast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => addToast({ variant: "field", message: "Payout approved." })}>
        Trigger success toast
      </Button>
      <Button
        variant="danger"
        onClick={() =>
          addToast({
            variant: "danger",
            message: "Mill statement import failed.",
            action: { label: "Retry", onClick: () => {} },
          })
        }
      >
        Trigger error toast
      </Button>
      <Button variant="secondary" onClick={() => addToast({ variant: "info", message: "6 records synced." })}>
        Trigger info toast
      </Button>
    </div>
  );
}

export function OverlaysSection() {
  return (
    <Section id="overlays" title="Overlays & Feedback" description="Modals trap focus, toasts announce via aria-live, banners carry offline honesty to the top of the page.">
      <Demo label="Modal & confirm dialog">
        <div className="flex flex-wrap gap-3">
          <Modal
            trigger={<Button variant="secondary">Open modal</Button>}
            title="Record new delivery"
            footer={
              <>
                <Button variant="ghost">Cancel</Button>
                <Button variant="primary">Save delivery</Button>
              </>
            }
          >
            <p className="text-sm text-ink-500">
              Modal body — forms, confirmations or record detail go here. Max width variants: md · lg · 2xl.
            </p>
          </Modal>
          <ConfirmDialog
            trigger={<Button variant="danger" icon={<TbTrash />}>Delete field</Button>}
            title="Delete field B12?"
            body="This permanently removes the field record, its activity log and yield history. This cannot be undone."
            requireKeyword="DELETE"
            confirmLabel="Delete field"
            onConfirm={() => {}}
          />
        </div>
      </Demo>

      <Demo label="Drawer">
        <Drawer
          trigger={<Button variant="secondary">Open delivery detail</Button>}
          title="Delivery DEL-1042"
        >
          <DescriptionList
            items={[
              { label: "Member", value: "Nomvula Dlamini" },
              { label: "Field", value: "B12" },
              { label: "Tonnes", value: "18.4 t" },
              { label: "Sucrose", value: "14.9%" },
              { label: "Mill", value: "Royal Swazi Sugar" },
              { label: "Status", value: <Badge variant="success">Paid</Badge> },
            ]}
          />
        </Drawer>
      </Demo>

      <Demo label="Toast (bottom-right, aria-live)">
        <ToastDemo />
      </Demo>

      <Demo label="Banner" className="!p-0 overflow-hidden">
        <div className="divide-y divide-paper-200">
          <Banner variant="info" dismissible>
            Working offline — 6 records will sync when connection returns.
          </Banner>
          <Banner variant="harvest" action={<Button size="sm" variant="secondary">Upgrade plan</Button>}>
            Trial ends in 5 days — upgrade to keep payout runs active.
          </Banner>
          <Banner variant="danger">Mill statement import failed — check the file format and retry.</Banner>
        </div>
      </Demo>

      <Demo label="Tooltip, popover & dropdown menu">
        <div className="flex flex-wrap items-center gap-6">
          <Tooltip content="Season-to-date tonnage accepted at the mill">
            <span className="cursor-default rounded-ctrl border border-paper-200 bg-paper-0 px-3 py-1.5 text-sm text-ink-700">
              Hover for tooltip
            </span>
          </Tooltip>
          <Popover trigger={<Button variant="secondary">Open popover</Button>}>
            <p className="text-sm text-ink-700">Arbitrary popover content — filters, quick actions, previews.</p>
          </Popover>
          <DropdownMenu
            trigger={<IconButton label="More" icon={<TbDotsVertical />} variant="secondary" />}
            items={[
              { label: "Edit", icon: <TbEdit /> },
              { label: "Delete", icon: <TbTrash />, destructive: true },
            ]}
          />
        </div>
      </Demo>
    </Section>
  );
}
