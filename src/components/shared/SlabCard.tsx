"use client";

import { useState } from "react";

interface SlabCardProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  onClick?: () => void;
  padding?: string;
}

export default function SlabCard({
  children,
  className = "",
  color,
  onClick,
  padding = "p-5",
}: SlabCardProps) {
  const [pressed, setPressed] = useState(false);

  const borderBottomColor = color ?? "var(--roost-border-bottom)";
  const borderBottomWidth = onClick && pressed ? "2px" : "4px";
  const transform = onClick && pressed ? "translateY(2px)" : "translateY(0)";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      onPointerDown={onClick ? () => setPressed(true) : undefined}
      onPointerUp={onClick ? () => setPressed(false) : undefined}
      onPointerLeave={onClick ? () => setPressed(false) : undefined}
      className={`rounded-2xl ${padding} ${onClick ? "cursor-pointer select-none" : ""} ${className}`}
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `${borderBottomWidth} solid ${borderBottomColor}`,
        transform,
        transition: "transform 80ms ease, border-bottom-width 80ms ease",
      }}
    >
      {children}
    </div>
  );
}
