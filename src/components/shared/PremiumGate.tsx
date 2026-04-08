import { BarChart2, ChefHat, ClipboardList, Home, ListPlus, Receipt, ScanLine, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import MockExpensesPreview from "@/components/expenses/MockExpensesPreview";

const COLOR = "#22C55E";
const COLOR_DARK = "#159040";

type Feature = "expenses" | "receipt-scanning" | "multiple-lists" | "multiple-households" | "chore-history" | "budgets" | "insights" | "meals";

interface FeatureConfig {
  icon: React.ElementType;
  title: string;
  body: string;
  MockPreview?: React.ComponentType;
}

const FEATURES: Record<Feature, FeatureConfig> = {
  expenses: {
    icon: Receipt,
    title: "Split expenses fairly.",
    body: "Track who paid what, split bills instantly, and settle up without the awkward conversations. One subscription covers your whole household.",
    MockPreview: MockExpensesPreview,
  },
  "receipt-scanning": {
    icon: ScanLine,
    title: "Scan receipts instantly.",
    body: "Point your camera at any receipt and split the items between household members. No manual entry needed.",
  },
  "multiple-lists": {
    icon: ListPlus,
    title: "Multiple grocery lists.",
    body: "Create named lists for different stores or occasions. Costco run, Target trip, weekly shop. Keep it all organized.",
  },
  "multiple-households": {
    icon: Home,
    title: "Multiple households.",
    body: "Belong to your family home and your college house at the same time. Switch between them instantly.",
  },
  "chore-history": {
    icon: ClipboardList,
    title: "See every chore, ever completed.",
    body: "Track your household's full completion history. See who's pulling their weight and who needs a nudge.",
  },
  budgets: {
    icon: Target,
    title: "Keep spending on track.",
    body: "Set monthly budgets per category and get notified before you overspend. Upgrade to Premium for $3/month.",
  },
  insights: {
    icon: BarChart2,
    title: "Understand your spending.",
    body: "See where your money goes with charts and breakdowns by category, member, and month. Upgrade to Premium for $3/month.",
  },
  meals: {
    icon: ChefHat,
    title: "Plan your household's meals.",
    body: "Build a shared meal bank, plan the week together, and push ingredients straight to the grocery list. Upgrade to Premium for $3/month.",
  },
};

export default function PremiumGate({ feature }: { feature: Feature }) {
  const router = useRouter();
  const { icon: Icon, title, body, MockPreview } = FEATURES[feature];

  return (
    <div>
      {/* Gate card */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid var(--roost-border)",
          borderBottom: `4px solid ${COLOR_DARK}`,
        }}
      >
        {/* Icon */}
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `${COLOR}18`,
            border: `1.5px solid ${COLOR}30`,
            borderBottom: `3px solid ${COLOR_DARK}30`,
          }}
        >
          <Icon className="size-7" style={{ color: COLOR }} />
        </div>

        {/* Title */}
        <p className="mb-2 text-xl leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
          {title}
        </p>

        {/* Body */}
        <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
          {body}
        </p>

        {/* Price callout */}
        <div
          className="mb-5 rounded-xl px-4 py-3"
          style={{
            backgroundColor: `${COLOR}10`,
            border: `1.5px solid ${COLOR}25`,
            borderBottom: `3px solid ${COLOR_DARK}30`,
          }}
        >
          <p className="text-lg" style={{ color: COLOR, fontWeight: 900 }}>
            $3 / month
          </p>
          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
            Per household. Everyone benefits.
          </p>
        </div>

        {/* Upgrade button */}
        <motion.button
          type="button"
          whileTap={{ y: 2 }}
          onClick={() => router.push("/settings/billing")}
          className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
          style={{
            backgroundColor: COLOR,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            fontWeight: 800,
          }}
        >
          Upgrade to Premium
        </motion.button>

        {/* Learn more */}
        <button
          type="button"
          onClick={() => router.push("/settings/billing")}
          className="mt-3 w-full text-center text-sm"
          style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
        >
          Learn more
        </button>
      </div>

      {/* Blurred preview */}
      {MockPreview && (
        <div
          style={{
            filter: "blur(3px)",
            pointerEvents: "none",
            opacity: 0.6,
            marginTop: "24px",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <MockPreview />
        </div>
      )}
    </div>
  );
}
