"use client";

import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  CalendarX,
  CheckSquare,
  ChefHat,
  Lightbulb,
  ListPlus,
  ListTodo,
  Palette,
  RefreshCw,
  Repeat,
  ShoppingCart,
  StickyNote,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

// ---- Config -----------------------------------------------------------------

interface PromptConfig {
  icon: React.ElementType;
  title: string;
  body: string;
}

const PROMPT_MAP: Record<string, PromptConfig> = {
  CHORES_LIMIT: {
    icon: CheckSquare,
    title: "You've used all 5 free chores.",
    body: "Real households need more than 5 chores. Upgrade to add unlimited chores, set recurring schedules, and unlock streaks and the leaderboard.",
  },
  RECURRING_CHORES_PREMIUM: {
    icon: RefreshCw,
    title: "Recurring chores are a premium feature.",
    body: "Set it once, it resets automatically. Daily dishes, weekly vacuuming, monthly deep cleans. Upgrade to never manually recreate a chore again.",
  },
  TASKS_LIMIT: {
    icon: ListTodo,
    title: "You've hit the 10 task limit.",
    body: "Households are messy. Upgrade to add unlimited tasks and keep everything on track.",
  },
  CALENDAR_LIMIT: {
    icon: CalendarX,
    title: "20 events this month. Not bad.",
    body: "Busy household? Upgrade for unlimited calendar events and recurring events for things like rent due dates and weekly family dinners.",
  },
  RECURRING_EVENTS_PREMIUM: {
    icon: Repeat,
    title: "Recurring events are premium.",
    body: "Stop re-adding the same events every month. Upgrade to set recurring events once and let Roost handle the rest.",
  },
  NOTES_LIMIT: {
    icon: StickyNote,
    title: "10 notes and counting.",
    body: "Upgrade for unlimited notes and keep your note history forever. Free tier notes expire after 30 days.",
  },
  REMINDERS_LIMIT: {
    icon: Bell,
    title: "5 active reminders on free.",
    body: "Upgrade for unlimited reminders, recurring schedules, and the ability to remind your whole household at once.",
  },
  RECURRING_REMINDERS_PREMIUM: {
    icon: BellRing,
    title: "Recurring reminders are premium.",
    body: "Set it once. Pay rent reminder every month. Dog's flea treatment every 6 weeks. Upgrade and never forget again.",
  },
  REMINDER_NOTIFY_PREMIUM: {
    icon: Users,
    title: "Notifying others is premium.",
    body: "On free you can only remind yourself. Upgrade to send reminders to specific household members or blast the whole house.",
  },
  MEAL_BANK_LIMIT: {
    icon: ChefHat,
    title: "5 meals in the bank.",
    body: "Upgrade to save unlimited meals, let the family vote on dinner, and add all ingredients to the grocery list in one tap.",
  },
  MEAL_SUGGESTIONS_PREMIUM: {
    icon: Lightbulb,
    title: "Meal suggestions are premium.",
    body: "Let the whole household vote on what's for dinner. Even the kids get a say. Upgrade to unlock suggestions and voting.",
  },
  MEAL_GROCERY_INTEGRATION_PREMIUM: {
    icon: ShoppingCart,
    title: "Grocery integration is premium.",
    body: "Tap once to add every ingredient from a meal to your shopping list. Upgrade to connect your meal plan to your grocery list.",
  },
  MEMBERS_LIMIT: {
    icon: UserPlus,
    title: "5 members on free.",
    body: "Got a big family or a full house? Upgrade for unlimited members and unlimited child accounts.",
  },
  LEADERBOARD_PREMIUM: {
    icon: Trophy,
    title: "The leaderboard is premium.",
    body: "See who's pulling their weight. Weekly rankings, points, and streaks for every household member. Upgrade to add some healthy competition.",
  },
  THEMES_PREMIUM: {
    icon: Palette,
    title: "More themes with premium.",
    body: "The default Roost Red is always free. Upgrade to unlock Midnight, Forest, Slate, and Sand themes and make the app yours.",
  },
  MULTIPLE_LISTS_PREMIUM: {
    icon: ListPlus,
    title: "One list not enough?",
    body: "Create named lists for different stores or trips. Costco run, Target haul, weekly shop. Keep them all organized and separate. Upgrade to unlock multiple grocery lists.",
  },
};

const FALLBACK: PromptConfig = {
  icon: Trophy,
  title: "This feature requires premium.",
  body: "Upgrade to $3/month to unlock all premium features for your household.",
};

// ---- Component --------------------------------------------------------------

interface UpgradePromptProps {
  code: string;
  onDismiss?: () => void;
}

export default function UpgradePrompt({ code, onDismiss }: UpgradePromptProps) {
  const config = PROMPT_MAP[code] ?? FALLBACK;
  const Icon = config.icon;

  return (
    <div className="space-y-5 px-1">
      {/* Icon */}
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: "rgba(0,0,0,0.06)",
          border: "1px solid rgba(0,0,0,0.10)",
          borderBottom: "2px solid rgba(0,0,0,0.15)",
        }}
      >
        <Icon className="size-5" style={{ color: "#374151" }} />
      </div>

      {/* Text */}
      <div className="space-y-1.5">
        <p
          className="text-base"
          style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
        >
          {config.title}
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
        >
          {config.body}
        </p>
      </div>

      {/* Upgrade button */}
      <Link href="/settings/billing">
        <motion.div
          whileTap={{ y: 2 }}
          className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
          style={{
            backgroundColor: "#EF4444",
            border: "1.5px solid #EF4444",
            borderBottom: "3px solid #C93B3B",
            fontWeight: 800,
          }}
        >
          Upgrade for $3/month
        </motion.div>
      </Link>

      {/* Maybe later */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex w-full items-center justify-center text-sm"
          style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
        >
          Maybe later
        </button>
      )}
    </div>
  );
}
