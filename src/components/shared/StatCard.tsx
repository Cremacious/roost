interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
  borderColor?: string;
}

export default function StatCard({ value, label, color, borderColor }: StatCardProps) {
  return (
    <div
      className="rounded-2xl px-3 py-3 text-center"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `4px solid ${borderColor ?? "var(--roost-border-bottom)"}`,
      }}
    >
      <p
        className="text-2xl tabular-nums"
        style={{ color: color ?? "var(--roost-text-primary)", fontWeight: 800 }}
      >
        {value}
      </p>
      <p
        className="mt-0.5 text-[11px]"
        style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
      >
        {label}
      </p>
    </div>
  );
}
