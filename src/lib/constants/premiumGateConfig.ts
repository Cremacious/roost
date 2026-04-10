import {
  BarChart2,
  Bell,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Coins,
  DollarSign,
  FileText,
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

const VALUE_PROP = "One $4/month subscription covers your entire household. That's less than $1/month per person for a family of five.";

export const PREMIUM_GATE_CONFIG: Record<string, PremiumGateFeatureConfig> = {
  chores: {
    featureColor: 'var(--roost-chores, #EF4444)',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
    icon: CheckSquare,
    title: "Chores that actually get done.",
    subtitle: "Set it and forget it. Roost handles the nagging.",
    perks: [
      "Recurring chores that auto-reset daily, weekly, or monthly",
      "Streak tracking to build consistency over time",
      "Weekly leaderboard with points rankings for your whole household",
      "Full completion history so you can see every chore ever done",
      "Chore categories to organize by room or type",
      "Unlimited chores with no cap on what you track",
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
      "Multiple named lists for different stores or shopping trips",
      "Meal plan sync so ingredients go straight to your list",
      "Unlimited items per list",
      "Real-time sync so everyone sees changes the moment they happen",
    ],
    valueProp: VALUE_PROP,
  },

  expenses: {
    featureColor: 'var(--roost-expenses, #22C55E)',
    featureHex: '#22C55E',
    featureDarkHex: '#159040',
    icon: DollarSign,
    title: "Unlock the full picture.",
    subtitle: "Go beyond splitting bills — track budgets, scan receipts, and take control of every dollar.",
    perks: [
      "Snap a receipt and expenses fill themselves in",
      "Tag and sort spending by category",
      "Track subscriptions and regular bills automatically",
      "Set limits and get alerts before you overspend",
      "See where your money actually goes each month",
      "Download your expense history as CSV or PDF",
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
      "Recurring events that repeat daily, weekly, or monthly automatically",
      "Household-wide visibility so everyone shares the same calendar",
      "Unlimited events with no cap",
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
      "Unlimited tasks with no cap",
      "Assign tasks to any household member",
      "Due dates and priority levels to stay organized",
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
      "Rich text formatting with bold, italic, lists, and headings",
      "Unlimited notes",
      "Shared household notes so important info is pinned for everyone",
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
      "Recurring reminders that repeat forever once set",
      "Notify specific household members who need to see it",
      "Notify the whole household at once",
      "Auto-reset after someone marks a reminder done",
      "Unlimited reminders with no five-reminder cap",
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
      "Meal suggestions so anyone can propose meals for the week",
      "Household voting so everyone has a say in what's for dinner",
      "Grocery integration to add meal ingredients to your list in one tap",
      "Meal bank to save your household's favorite meals",
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
      "Set allowance amounts for each child member",
      "Tie payouts to chore completion so kids earn what they do",
      "Track earned versus paid amounts over time",
      "Full allowance history per member",
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
      "Guest member access for short-term or temporary members",
      "No account required for guests to participate",
      "Admin controls over what guests can see and do",
      "Remove guests instantly at any time",
    ],
    valueProp: VALUE_PROP,
  },

  stats: {
    featureColor: '#EF4444',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
    icon: BarChart2,
    title: "See how your household runs.",
    subtitle: "Detailed stats across every feature: chores, expenses, tasks, and more.",
    perks: [
      "Chore completion rates broken down per member",
      "Expense trends tracked over time",
      "Task completion history across your household",
      "Streak records and personal bests",
      "Full household activity over time",
    ],
    valueProp: VALUE_PROP,
  },
};
