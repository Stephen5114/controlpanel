import type { ReactNode } from "react";

export type BadgeTone = "default" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  tone?: BadgeTone;
  children?: ReactNode;
  className?: string;
  /** Small inline badge (e.g. for tabs/counters) */
  compact?: boolean;
}

const toneMap: Record<BadgeTone, string> = {
  default: "",
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
  info: "badge--info",
  neutral: "badge--neutral",
};

export function Badge({ tone = "default", children, className = "", compact }: BadgeProps) {
  const classes = ["badge", toneMap[tone], compact ? "badge--compact" : "", className]
    .filter(Boolean)
    .join(" ");

  return <span className={classes}>{children}</span>;
}
