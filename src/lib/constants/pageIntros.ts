import {
  DollarSign,
  ShoppingCart,
  UtensilsCrossed,
  CheckSquare,
  CalendarDays,
  ListTodo,
  StickyNote,
  Bell,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import { SECTION_COLORS } from './colors'

// Content for a per-page, one-time intro popup. The first time a user visits a
// feature page, the matching intro shows once; dismissing it (Got It!) records
// the key in users.seen_intros so it never shows again for that account.
export interface PageIntroContent {
  introKey: string
  icon: LucideIcon
  color: string
  colorDark: string
  title: string
  body: string
  // When true, the intro is never shown to child accounts (used for /money,
  // which children are blocked from).
  hideForChildren?: boolean
}

export const PAGE_INTROS = {
  money: {
    introKey: 'money',
    icon: DollarSign,
    color: SECTION_COLORS.expenses.base,
    colorDark: SECTION_COLORS.expenses.dark,
    title: 'Money',
    body: 'Track shared expenses, split bills, and settle up with your housemates.',
    hideForChildren: true,
  },
  lists: {
    introKey: 'lists',
    icon: ShoppingCart,
    color: SECTION_COLORS.grocery.base,
    colorDark: SECTION_COLORS.grocery.dark,
    title: 'Grocery Lists',
    body: 'Shared grocery lists. Add items, check them off, and smart sort them by aisle.',
  },
  meals: {
    introKey: 'meals',
    icon: UtensilsCrossed,
    color: SECTION_COLORS.meals.base,
    colorDark: SECTION_COLORS.meals.dark,
    title: 'Meals',
    body: "Plan the week's meals, keep a meal bank, and push ingredients to your list.",
  },
  chores: {
    introKey: 'chores',
    icon: CheckSquare,
    color: SECTION_COLORS.chores.base,
    colorDark: SECTION_COLORS.chores.dark,
    title: 'Chores',
    body: 'Assign and complete recurring chores. Earn points and rewards along the way.',
  },
  calendar: {
    introKey: 'calendar',
    icon: CalendarDays,
    color: SECTION_COLORS.calendar.base,
    colorDark: SECTION_COLORS.calendar.dark,
    title: 'Calendar',
    body: "Shared household events. Add them, RSVP, and see what is coming up.",
  },
  tasks: {
    introKey: 'tasks',
    icon: ListTodo,
    color: SECTION_COLORS.tasks.base,
    colorDark: SECTION_COLORS.tasks.dark,
    title: 'Tasks',
    body: 'One-off to-dos you can assign, prioritize, and check off together.',
  },
  notes: {
    introKey: 'notes',
    icon: StickyNote,
    color: SECTION_COLORS.notes.base,
    colorDark: SECTION_COLORS.notes.dark,
    title: 'Notes',
    body: 'Shared household notes, plain or rich text. Jot down whatever matters.',
  },
  reminders: {
    introKey: 'reminders',
    icon: Bell,
    color: SECTION_COLORS.reminders.base,
    colorDark: SECTION_COLORS.reminders.dark,
    title: 'Reminders',
    body: 'Set reminders for the household, one-time or recurring.',
  },
  stats: {
    introKey: 'stats',
    icon: BarChart3,
    color: SECTION_COLORS.stats.base,
    colorDark: SECTION_COLORS.stats.dark,
    title: 'Household Stats',
    body: 'Household insights and activity, all in one place.',
  },
} satisfies Record<string, PageIntroContent>

export type PageIntroKey = keyof typeof PAGE_INTROS

// All valid intro keys. The dismiss-intro API validates against this list so
// seen_intros can only ever hold known keys.
export const PAGE_INTRO_KEYS: string[] = Object.values(PAGE_INTROS).map((i) => i.introKey)
