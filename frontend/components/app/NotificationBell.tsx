import { TbBell } from "react-icons/tb";
import { Popover } from "@/components/ui/Popover";
import { StatusDot } from "@/components/ui/StatusDot";

export interface NotificationItem {
  title: string;
  time: string;
  read?: boolean;
}

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const unread = items.filter((i) => !i.read).length;
  return (
    <Popover
      align="end"
      trigger={
        <button className="relative flex size-9 items-center justify-center rounded-ctrl text-ink-500 hover:bg-paper-100">
          <TbBell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-danger-600" />
          )}
        </button>
      }
      className="w-80 p-0"
    >
      <div className="border-b border-paper-200 px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">Notifications</p>
      </div>
      <ul className="max-h-80 overflow-y-auto">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 border-b border-paper-100 px-4 py-3 last:border-0">
            {!item.read && <StatusDot tone="info" label="" className="mt-1.5" />}
            <div className={item.read ? "pl-4" : undefined}>
              <p className="text-sm text-ink-700">{item.title}</p>
              <p className="mt-0.5 text-xs text-ink-400">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
