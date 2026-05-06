import type { LucideIcon } from 'lucide-react'
import {
  CheckSquare, ShoppingBag, DollarSign, CalendarDays,
  FileText, Bell, UtensilsCrossed, Users, Star, BarChart2, Tag, UserPlus,
} from 'lucide-react'

export interface PremiumGateConfig {
  icon: LucideIcon
  title: string
  subtitle: string
  perks: string[]
  valueProp: string
  featureColor: string
  featureHex: string
  featureDarkHex: string
}

export const PREMIUM_GATE_CONFIG: Record<string, PremiumGateConfig> = {
  chores: {
    icon: CheckSquare,
    title: 'Unlock recurring chores',
    subtitle: 'Set it and forget it. Roost handles the nagging.',
    perks: ['Weekly, monthly, and custom frequencies', 'Chore history and analytics', 'Full leaderboard with streaks'],
    valueProp: 'Keep your household on schedule.',
    featureColor: 'chores',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
  },
  grocery: {
    icon: ShoppingBag,
    title: 'Unlock multiple grocery lists',
    subtitle: 'One list for Target, one for Costco, one for everything else.',
    perks: ['Unlimited named grocery lists', 'Smart sort by store section', 'Share lists across the household'],
    valueProp: 'Stop mixing up your shopping lists.',
    featureColor: 'grocery',
    featureHex: '#F59E0B',
    featureDarkHex: '#C87D00',
  },
  expenses: {
    icon: DollarSign,
    title: 'Unlock expense tracking',
    subtitle: 'Know who owes what without the awkward conversations.',
    perks: ['Split bills three ways', 'Receipt scanning with AI', 'Recurring expenses', 'Export to CSV or PDF'],
    valueProp: 'Settle up fairly every time.',
    featureColor: 'expenses',
    featureHex: '#22C55E',
    featureDarkHex: '#159040',
  },
  calendar: {
    icon: CalendarDays,
    title: 'Unlock recurring events',
    subtitle: 'Add once, show up forever.',
    perks: ['Daily, weekly, monthly, yearly recurrence', 'Custom end conditions', 'Household-wide visibility'],
    valueProp: 'Never forget the standing meetings.',
    featureColor: 'calendar',
    featureHex: '#3B82F6',
    featureDarkHex: '#1A5CB5',
  },
  tasks: {
    icon: CheckSquare,
    title: 'Unlock unlimited tasks',
    subtitle: 'Your household to-do list without a cap.',
    perks: ['Unlimited tasks', 'Priority levels', 'Due dates and assignees'],
    valueProp: 'Cross things off together.',
    featureColor: 'tasks',
    featureHex: '#EC4899',
    featureDarkHex: '#B02878',
  },
  notes: {
    icon: FileText,
    title: 'Unlock rich text notes',
    subtitle: 'More than just plain text.',
    perks: ['Headings, bold, italic, strikethrough', 'Checklists and task lists', 'Code blocks and links'],
    valueProp: 'Write notes that actually look good.',
    featureColor: 'notes',
    featureHex: '#A855F7',
    featureDarkHex: '#7C28C8',
  },
  reminders: {
    icon: Bell,
    title: 'Unlock recurring reminders',
    subtitle: 'Set it and forget it. Roost handles the nagging.',
    perks: ['Daily, weekly, monthly recurrence', 'Notify specific members or everyone', 'Custom repeat intervals'],
    valueProp: 'Nobody forgets what Roost reminds.',
    featureColor: 'reminders',
    featureHex: '#06B6D4',
    featureDarkHex: '#0891B2',
  },
  meals: {
    icon: UtensilsCrossed,
    title: 'Unlock the meal bank',
    subtitle: 'Plan your week without starting from scratch.',
    perks: ['Unlimited meals in the bank', 'Smart suggestions from the household', 'Push ingredients to grocery list'],
    valueProp: 'Dinner is answered before anyone asks.',
    featureColor: 'meals',
    featureHex: '#F97316',
    featureDarkHex: '#C4581A',
  },
  allowances: {
    icon: Star,
    title: 'Unlock rewards',
    subtitle: 'Motivate kids with chore-based rewards.',
    perks: ['Money, gifts, or activity rewards', 'Weekly or monthly periods', 'Completion threshold control'],
    valueProp: 'Kids do more when there is something in it for them.',
    featureColor: 'chores',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
  },
  guests: {
    icon: UserPlus,
    title: 'Unlock guest access',
    subtitle: 'Invite someone temporarily without making them a permanent member.',
    perks: ['Temporary access with expiry date', 'Guest-level permissions', 'Auto-expires when the time is up'],
    valueProp: 'Perfect for Airbnb guests or visiting family.',
    featureColor: 'expenses',
    featureHex: '#F59E0B',
    featureDarkHex: '#C87D00',
  },
  stats: {
    icon: BarChart2,
    title: 'Unlock household stats',
    subtitle: 'Detailed stats across every feature: chores, expenses, tasks, and more.',
    perks: ['Chore completion rates', 'Expense totals by category', 'Activity trends over time'],
    valueProp: 'See who is pulling their weight.',
    featureColor: 'stats',
    featureHex: '#6366F1',
    featureDarkHex: '#4F46E5',
  },
  'chore-categories': {
    icon: Tag,
    title: 'Unlock custom categories',
    subtitle: 'Organize chores the way your household actually works.',
    perks: ['Create unlimited custom categories', 'Members can suggest new ones', 'Custom icons and colors'],
    valueProp: 'Your household, your categories.',
    featureColor: 'chores',
    featureHex: '#EF4444',
    featureDarkHex: '#C93B3B',
  },
  members: {
    icon: Users,
    title: 'Unlock more members',
    subtitle: 'Bigger households deserve more spots.',
    perks: ['Up to unlimited members', 'Multiple households', 'Full permission control per member'],
    valueProp: 'Everyone in, nobody left out.',
    featureColor: 'expenses',
    featureHex: '#22C55E',
    featureDarkHex: '#159040',
  },
}
