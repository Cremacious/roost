// Logo — src/components/shared/RoostLogo.tsx
// Single source of truth for all logo usage across the app.
// To update: swap the image at public/brand/roost-icon.png.
// Nothing else needs changing.

import Image from "next/image";

const SIZE_CONFIG = {
  xs: { iconSize: 24, wordmarkSize: 0,  radius: 6,  gap: 0  },
  sm: { iconSize: 32, wordmarkSize: 18, radius: 8,  gap: 8  },
  md: { iconSize: 40, wordmarkSize: 22, radius: 10, gap: 10 },
  lg: { iconSize: 56, wordmarkSize: 28, radius: 14, gap: 12 },
  xl: { iconSize: 80, wordmarkSize: 36, radius: 18, gap: 16 },
} as const;

const VARIANT_CONFIG = {
  dark:  { wordmark: "var(--roost-text-primary)" },
  light: { wordmark: "#F5F0E8" },
  red:   { wordmark: "var(--roost-text-primary)" },
};

interface RoostLogoProps {
  size?: keyof typeof SIZE_CONFIG;
  showWordmark?: boolean;
  variant?: keyof typeof VARIANT_CONFIG;
}

export default function RoostLogo({
  size = "md",
  showWordmark = true,
  variant = "dark",
}: RoostLogoProps) {
  const { iconSize, wordmarkSize, radius, gap } = SIZE_CONFIG[size];
  const { wordmark } = VARIANT_CONFIG[variant];
  const showWord = size !== "xs" && showWordmark;

  return (
    <div style={{ display: "flex", alignItems: "center", gap, flexShrink: 0 }}>
      {/* Icon */}
      <Image
        src="/brand/roost-icon.png"
        alt="Roost"
        width={iconSize}
        height={iconSize}
        style={{ borderRadius: radius, flexShrink: 0 }}
        priority
      />

      {/* Wordmark */}
      {showWord && (
        <span
          style={{
            fontSize: wordmarkSize,
            fontWeight: 900,
            color: wordmark,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          Roost
        </span>
      )}
    </div>
  );
}
