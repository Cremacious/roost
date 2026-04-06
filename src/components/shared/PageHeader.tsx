interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: number;
  action?: React.ReactNode;
  color?: string;
}

export default function PageHeader({ title, subtitle, badge, action, color }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <h1
          className="text-2xl truncate"
          style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
        >
          {title}
        </h1>
        {badge !== undefined && badge > 0 && (
          <span
            className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs text-white shrink-0"
            style={{ backgroundColor: color ?? "var(--roost-text-secondary)", fontWeight: 700 }}
          >
            {badge}
          </span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
