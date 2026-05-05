import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const meals = pgTable('meals', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').$type<'breakfast' | 'lunch' | 'dinner' | 'snack'>(),
  description: text('description'),
  prepTime: integer('prep_time'),
  ingredients: text('ingredients').notNull().default('[]'),
  rotation: boolean('rotation').notNull().default(false),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

export const mealPlanSlots = pgTable('meal_plan_slots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  mealId: text('meal_id')
    .notNull()
    .references(() => meals.id, { onDelete: 'cascade' }),
  slotDate: text('slot_date').notNull(),
  slotType: text('slot_type').notNull().$type<'breakfast' | 'lunch' | 'dinner' | 'snack'>(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const mealSuggestions = pgTable('meal_suggestions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ingredients: text('ingredients').notNull().default('[]'),
  note: text('note'),
  prepTime: integer('prep_time'),
  targetSlotDate: text('target_slot_date'),
  targetSlotType: text('target_slot_type').$type<'breakfast' | 'lunch' | 'dinner' | 'snack'>(),
  status: text('status').notNull().default('suggested').$type<
    'suggested' | 'in_bank' | 'accepted' | 'rejected'
  >(),
  respondedBy: text('responded_by').references(() => users.id),
  respondedAt: timestamp('responded_at'),
  acceptedMealId: text('accepted_meal_id'),
  acceptedSlotId: text('accepted_slot_id'),
  suggestedBy: text('suggested_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const mealSuggestionVotes = pgTable('meal_suggestion_votes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  suggestionId: text('suggestion_id')
    .notNull()
    .references(() => mealSuggestions.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  voteType: text('vote_type').notNull().$type<'up' | 'down'>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
