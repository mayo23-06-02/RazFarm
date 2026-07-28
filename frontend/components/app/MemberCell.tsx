import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";

export interface MemberCellProps {
  name: string;
  role: string;
  roleVariant?: BadgeVariant;
  src?: string;
}

export function MemberCell({ name, role, roleVariant = "brand", src }: MemberCellProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} src={src} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-900">{name}</p>
        <Badge variant={roleVariant} className="mt-0.5">
          {role}
        </Badge>
      </div>
    </div>
  );
}
