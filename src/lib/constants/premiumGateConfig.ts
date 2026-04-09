import {
  BarChart2,
  Bell,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Coins,
  DollarSign,
  FileText,
  Palette,
  ShoppingCart,
  UserPlus,
  UtensilsCrossed,
} from 'lucide-react';

export interface PremiumGateFeatureConfig {
  featureColor: string;
  featureHex: string;
  featureDarkHex: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  perks: string[];
  valueProp: string;
}

const VALUE_PROP = "One $4/month subscription covers your entire household — that's less than $1/month per person for a family of five.";

export const PREMIUM_GATE_CONFIG: Record<string, PremiumGateFeatureConfig> = {
  chores: {
    featureColor: 'var(--roost-chores, #EF4444)',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
    icon: CheckSquare,
    title: "Chores that actually get done.",
    subtitle: "Set it and forget it — Roost handles the nagging.",
    perks: [
      "Recurring chores — auto-reset daily, weekly, or monthly",
      "Chore streaks — build consistency over time",
      "Leaderboard — weekly points rankings for your household",
      "Completion history — every chore ever completed, searchable",
      "Chore categories — organize by room or type",
      "Unlimited chores — no cap on what you track",
    ],
    valueProp: VALUE_PROP,
  },

  grocery: {
    featureColor: 'var(--roost-grocery, #F59E0B)',
    featureHex: '#F59E0B',
    featureDarkHex: '#B45309',
    icon: ShoppingCart,
    title: "Grocery runs, zero chaos.",
    subtitle: "Multiple lists, meal plan sync, and no more forgotten items.",
    perks: [
      "Multiple named lists — Costco run, Target trip, weekly shop",
      "Meal plan integration — add meal ingredients straight to your list",
      "Unlimited items per list",
      "Real-time sync — everyone sees changes instantly",
    ],
    valueProp: VALUE_PROP,
  },

  expenses: {
    featureColor: 'var(--roost-expenses, #22C55E)',
    featureHex: '#22C55E',
    featureDarkHex: '#159040',
    icon: DollarSign,
    title: "No more awkward money talks.",
    subtitle: "Split bills fairly, track balances, and settle up automatically.",
    perks: [
      "Expense splitting — split any bill between any members",
      "Debt simplification — one clean settle-up, no web of IOUs",
      "Full expense history — every transaction, forever",
      "Balance tracking — always know who owes what",
      "Receipt scanning — snap a receipt and split it instantly",
      "Recurring expenses — set monthly bills once",
      "Spending insights — see where your household money goes",
      "Budget tracking — set limits and get alerts",
      "Data export — download your expense history",
    ],
    valueProp: VALUE_PROP,
  },

  calendar: {
    featureColor: 'var(--roost-calendar, #3B82F6)',
    featureHex: '#3B82F6',
    featureDarkHex: '#1D4ED8',
    icon: CalendarDays,
    title: "A calendar the whole house shares.",
    subtitle: "Recurring events so you never have to re-enter the same thing twice.",
    perks: [
      "Recurring events — set daily, weekly, or monthly repeats",
      "Household-wide visibility — everyone sees the same calendar",
      "Unlimited events — no cap",
    ],
    valueProp: VALUE_PROP,
  },

  tasks: {
    featureColor: 'var(--roost-tasks, #EC4899)',
    featureHex: '#EC4899',
    featureDarkHex: '#9D174D',
    icon: ClipboardList,
    title: "Tasks for the whole household.",
    subtitle: "Assign, track, and close out tasks together.",
    perks: [
      "Unlimited tasks — no cap",
      "Assign tasks to any household member",
      "Due dates and priority levels",
      "Full task completion history",
    ],
    valueProp: VALUE_PROP,
  },

  notes: {
    featureColor: 'var(--roost-notes, #A855F7)',
    featureHex: '#A855F7',
    featureDarkHex: '#6B21A8',
    icon: FileText,
    title: "Notes worth keeping.",
    subtitle: "Rich text formatting for notes that actually communicate.",
    perks: [
      "Rich text formatting — bold, italic, lists, headings",
      "Unlimited notes",
      "Shared household notes — pin important info for everyone",
    ],
    valueProp: VALUE_PROP,
  },

  reminders: {
    featureColor: 'var(--roost-reminders, #06B6D4)',
    featureHex: '#06B6D4',
    featureDarkHex: '#0E7490',
    icon: Bell,
    title: "Never let anything slip.",
    subtitle: "Recurring reminders that reset automatically and reach whoever needs them.",
    perks: [
      "Recurring reminders — set once, repeat forever",
      "Notify specific household members",
      "Notify the whole household at once",
      "Auto-reset after someone marks it done",
      "Unlimited reminders — no 5-reminder cap",
    ],
    valueProp: VALUE_PROP,
  },

  meals: {
    featureColor: 'var(--roost-meals, #F97316)',
    featureHex: '#F97316',
    featureDarkHex: '#C2410C',
    icon: UtensilsCrossed,
    title: "Dinner, decided.",
    subtitle: "Suggest meals, vote as a household, and sync straight to your grocery list.",
    perks: [
      "Meal suggestions — propose meals for the week",
      "Household voting — everyone votes on what's for dinner",
      "Grocery integration — add ingredients to your list in one tap",
      "Meal bank — save your household's favorite meals",
      "Unlimited meal history",
    ],
    valueProp: VALUE_PROP,
  },

  allowances: {
    featureColor: 'var(--roost-chores, #EF4444)',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
    icon: Coins,
    title: "Teach kids about earning.",
    subtitle: "Tie chore completion to allowances and reward the work that gets done.",
    perks: [
      "Set allowance amounts per child member",
      "Tie payouts to chore completion",
      "Track earned vs. paid amounts",
      "Allowance history per member",
    ],
    valueProp: VALUE_PROP,
  },

  guests: {
    featureColor: '#EF4444',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
    icon: UserPlus,
    title: "Invite guests to your household.",
    subtitle: "Add temporary members who can see and contribute without a full account.",
    perks: [
      "Guest member access — limited view for short-term members",
      "No account required for guests",
      "Admin controls who guests can see and do",
      "Remove guests anytime instantly",
    ],
    valueProp: VALUE_PROP,
  },

  themes: {
    featureColor: '#EF4444',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
    icon: Palette,
    title: "Make Roost yours.",
    subtitle: "Unlock all five themes and give your household its own look and feel.",
    perks: [
      "Midnight — dark mode with red accents",
      "Forest — deep green, calm and focused",
      "Slate — cool grey, minimal and clean",
      "Sand — warm neutral, easy on the eyes",
      "All future themes included automatically",
    ],
    valueProp: VALUE_PROP,
  },

  stats: {
    featureColor: '#EF4444',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
    icon: BarChart2,
    title: "See how your household runs.",
    subtitle: "Detailed stats across every feature — chores, expenses, tasks, and more.",
    perks: [
      "Chore completion rates per member",
      "Expense trends over time",
      "Task completion history",
      "Streak records and personal bests",
      "Household activity over time",
    ],
    valueProp: VALUE_PROP,
  },
};
