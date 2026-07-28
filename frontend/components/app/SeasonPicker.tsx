"use client";

import { TbCalendarEvent } from "react-icons/tb";
import { Select } from "@/components/ui/Select";

const SEASONS = [
  { value: "2026-27", label: "2026/27 Season" },
  { value: "2025-26", label: "2025/26 Season" },
  { value: "2024-25", label: "2024/25 Season" },
];

export function SeasonPicker({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Select options={SEASONS} defaultValue="2026-27" placeholder="Select season" />
    </div>
  );
}

export function SeasonPickerIcon() {
  return <TbCalendarEvent className="size-4" />;
}
