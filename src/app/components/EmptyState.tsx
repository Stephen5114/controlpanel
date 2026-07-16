import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ title, description, action, compact, className = "" }: EmptyStateProps) {
  return (
    <div className={`empty-state${compact ? " empty-state--compact" : ""} ${className}`}>
      <div className="empty-state__card">
        <h2 className="empty-state__title">{title}</h2>
        {description ? <p className="empty-state__desc">{description}</p> : null}
        {action ? <div className="empty-state__action">{action}</div> : null}
      </div>
    </div>
  );
}
