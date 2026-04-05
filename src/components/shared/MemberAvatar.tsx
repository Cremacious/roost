const SIZES = {
  sm: "h-6 w-6 text-[9px]",
  md: "h-8 w-8 text-[11px]",
  lg: "h-10 w-10 text-xs",
};

interface MemberAvatarProps {
  name: string;
  avatarColor?: string | null;
  size?: "sm" | "md" | "lg";
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function MemberAvatar({
  name,
  avatarColor,
  size = "md",
}: MemberAvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZES[size]}`}
      style={{ background: avatarColor ?? "#6366f1" }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
