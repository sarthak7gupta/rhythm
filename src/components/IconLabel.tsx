import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function IconLabel({
  icon: Icon,
  children,
  iconClassName = "h-3.5 w-3.5 shrink-0",
}: {
  icon: LucideIcon;
  children: ReactNode;
  iconClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={iconClassName} aria-hidden />
      {children}
    </span>
  );
}
