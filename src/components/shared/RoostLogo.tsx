// PLACEHOLDER LOGO — swap src/components/shared/RoostLogo.tsx
// when final logo assets arrive from designer.
// All logo usage across the app imports from here.
// To update: replace the SVG paths in the icon and/or
// swap the wordmark font/spacing. Nothing else needs changing.

const SIZE_CONFIG = {
  xs: { iconSize: 24, wordmarkSize: 0,  radius: 6,  gap: 0  },
  sm: { iconSize: 32, wordmarkSize: 18, radius: 8,  gap: 8  },
  md: { iconSize: 40, wordmarkSize: 22, radius: 10, gap: 10 },
  lg: { iconSize: 56, wordmarkSize: 28, radius: 14, gap: 12 },
  xl: { iconSize: 80, wordmarkSize: 36, radius: 18, gap: 16 },
} as const;

const VARIANT_CONFIG = {
  dark:  { iconBg: "#1A1714", wordmark: "#1A1714" },
  light: { iconBg: "#1A1714", wordmark: "#F5F0E8" },
  red:   { iconBg: "#EF4444", wordmark: "#1A1714" },
} as const;

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
  const { iconBg, wordmark } = VARIANT_CONFIG[variant];
  const showWord = size !== "xs" && showWordmark;
  const svgSize = iconSize * 0.62;

  return (
    <div style={{ display: "flex", alignItems: "center", gap, flexShrink: 0 }}>
      {/* Icon */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: radius,
          backgroundColor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* House walls */}
          <rect
            x="3"
            y="11.5"
            width="18"
            height="10.5"
            rx="1.5"
            stroke="white"
            strokeWidth="1.5"
          />
          {/* Door */}
          <path
            d="M9.5 22v-5a2.5 2.5 0 015 0V22"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Roof ridge */}
          <path
            d="M1.5 12L12 2.5L22.5 12"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Rooster comb: three bumps at roof peak */}
          <path
            d="M10.5 2.5Q11 0.5 11.5 2.5Q12 1 12.5 2.5Q13 0.5 13.5 2.5"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

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
