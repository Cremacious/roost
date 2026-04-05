interface SectionColorBadgeProps {
  label: string;
  color: string;
}

export default function SectionColorBadge({ label, color }: SectionColorBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px]"
      style={{
        backgroundColor: color + "18",
        color,
        border: `1px solid ${color}30`,
        borderBottom: `2px solid ${color}50`,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}
