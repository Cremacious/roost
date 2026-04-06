"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  addDays,
  format,
  startOfWeek,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import {
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  Loader2,
  Plus,
  ShoppingCart,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { relativeTime } from "@/lib/utils/time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import MealSheet, { type MealData } from "@/components/meals/MealSheet";
import MealSlotSheet, { type MealRow, type SlotRow } from "@/components/meals/MealSlotSheet";
import SuggestionSheet from "@/components/meals/SuggestionSheet";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import UpgradePrompt from "@/components/shared/UpgradePrompt";
import { PageContainer } from "@/components/layout/PageContainer";

const COLOR = SECTION_COLORS.meals;
const COLOR_DARK = "#C4581A";

// ---- Types ------------------------------------------------------------------

interface PlannerResponse {
  slots: SlotRow[];
  weekStart: string;
  weekEnd: string;
}

interface MealsResponse {
  meals: MealData[];
}

interface SuggestionRow {
  id: string;
  meal_name: string;
  note: string | null;
  suggested_by: string;
  created_at: string | null;
  suggester_name: string | null;
  suggester_avatar: string | null;
  upvotes: number;
  downvotes: number;
  userVote: string | null;
}

interface SuggestionsResponse {
  suggestions: SuggestionRow[];
}

// ---- Constants --------------------------------------------------------------

const SLOT_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Snack"] as const;

type Tab = "planner" | "bank" | "suggestions";

// ---- Helpers ----------------------------------------------------------------

function getMondayOfWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

// ---- Sub-components ---------------------------------------------------------

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ y: 1 }}
      className="flex-1 rounded-xl py-2 text-sm"
      style={{
        backgroundColor: active ? COLOR + "18" : "transparent",
        border: active ? `1.5px solid ${COLOR}30` : "1.5px solid transparent",
        borderBottom: active ? `3px solid ${COLOR_DARK}50` : "3px solid transparent",
        color: active ? COLOR : "var(--roost-text-muted)",
        fontWeight: active ? 800 : 600,
      }}
    >
      {label}
    </motion.button>
  );
}

// ---- Page -------------------------------------------------------------------

export default function MealsPage() {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const userId = sessionData?.user?.id ?? "";
  const isAdmin = false; // will be refined via useHousehold if needed

  const [tab, setTab] = useState<Tab>("planner");
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Sheet state
  const [mealSheet, setMealSheet] = useState<{ open: boolean; meal?: MealData | null }>({ open: false });
  const [slotSheet, setSlotSheet] = useState<{
    open: boolean;
    slotDate: Date | null;
    slotType: string;
    existingSlot?: SlotRow | null;
    preSelectedMeal?: MealRow | null;
  }>({ open: false, slotDate: null, slotType: "dinner" });
  const [suggestionSheet, setSuggestionSheet] = useState(false);
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);

  // Confirmation dialog state
  const [groceryConfirm, setGroceryConfirm] = useState<MealData | null>(null);
  const [approveConfirm, setApproveConfirm] = useState<SuggestionRow | null>(null);

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEnd = addDays(weekStart, 6);
  const today = getMondayOfWeek(new Date());
  const isCurrentWeek = isSameDay(weekStart, today);

  // ---- Queries ---------------------------------------------------------------

  const plannerQuery = useQuery<PlannerResponse>({
    queryKey: ["planner", weekStartStr],
    queryFn: async () => {
      const r = await fetch(`/api/meals/planner?weekStart=${weekStartStr}`);
      if (!r.ok) throw new Error("Failed to load planner");
      return r.json();
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 2,
  });

  const mealsQuery = useQuery<MealsResponse>({
    queryKey: ["meals"],
    queryFn: async () => {
      const r = await fetch("/api/meals");
      if (!r.ok) throw new Error("Failed to load meals");
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  const suggestionsQuery = useQuery<SuggestionsResponse>({
    queryKey: ["suggestions"],
    queryFn: async () => {
      const r = await fetch("/api/meals/suggestions");
      if (!r.ok) throw new Error("Failed to load suggestions");
      return r.json();
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 2,
    enabled: tab === "suggestions",
  });

  // ---- Mutations -------------------------------------------------------------

  const voteMutation = useMutation({
    mutationFn: async ({ id, vote }: { id: string; vote: string }) => {
      const r = await fetch(`/api/meals/suggestions/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to vote");
      }
      return r.json();
    },
    onMutate: async ({ id, vote }) => {
      await queryClient.cancelQueries({ queryKey: ["suggestions"] });
      const prev = queryClient.getQueryData<SuggestionsResponse>(["suggestions"]);
      queryClient.setQueryData<SuggestionsResponse>(["suggestions"], (old) => {
        if (!old) return old;
        return {
          suggestions: old.suggestions.map((s) => {
            if (s.id !== id) return s;
            const wasVoted = s.userVote === vote;
            const upvotes = s.upvotes + (vote === "up" ? (wasVoted ? -1 : 1) : 0) + (s.userVote === "up" && vote === "down" ? -1 : 0);
            const downvotes = s.downvotes + (vote === "down" ? (wasVoted ? -1 : 1) : 0) + (s.userVote === "down" && vote === "up" ? -1 : 0);
            return { ...s, upvotes, downvotes, userVote: wasVoted ? null : vote };
          }),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["suggestions"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });

  const addToGroceryMutation = useMutation({
    mutationFn: async (mealId: string) => {
      const r = await fetch(`/api/meals/${mealId}/add-to-grocery`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        const err = new Error(d.error ?? "Failed to add to grocery list") as Error & { code?: string };
        err.code = d.code;
        throw err;
      }
      return r.json();
    },
    onSuccess: (data: { added: number }) => {
      queryClient.invalidateQueries({ queryKey: ["grocery-items"] });
      setGroceryConfirm(null);
      toast.success(`Added ${data.added} ingredient${data.added !== 1 ? "s" : ""} to Shopping List`, {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code) { setGroceryConfirm(null); setUpgradeCode(err.code); return; }
      toast.error("Could not add ingredients", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, addToBank }: { id: string; addToBank: boolean }) => {
      const r = await fetch(`/api/meals/suggestions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addToBank }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to approve suggestion");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      setApproveConfirm(null);
      toast.success("Added to meal bank", {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
    },
    onError: (err: Error) => {
      toast.error("Could not approve suggestion", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  // ---- Derived data ----------------------------------------------------------

  const allMeals = mealsQuery.data?.meals ?? [];
  const slots = plannerQuery.data?.slots ?? [];
  const suggestions = suggestionsQuery.data?.suggestions ?? [];

  const filteredMeals = allMeals.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      categoryFilter === "All" || m.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchSearch && matchCat;
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  function getSlot(date: Date, slotType: string): SlotRow | undefined {
    const dateStr = format(date, "yyyy-MM-dd");
    return slots.find((s) => s.slot_date === dateStr && s.slot_type === slotType);
  }

  function openSlot(date: Date, slotType: string) {
    const existing = getSlot(date, slotType);
    setSlotSheet({ open: true, slotDate: date, slotType, existingSlot: existing ?? null, preSelectedMeal: null });
  }

  function openSlotForMeal(meal: MealData) {
    setSlotSheet({ open: true, slotDate: null, slotType: "dinner", existingSlot: null, preSelectedMeal: meal as MealRow });
  }

  // ---- Planner tab -----------------------------------------------------------

  function PlannerTab() {
    return (
      <div className="space-y-4">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => setWeekStart((d) => addDays(d, -7))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
              backgroundColor: "var(--roost-surface)",
            }}
          >
            <ChevronLeft className="size-4" style={{ color: "var(--roost-text-secondary)" }} />
          </motion.button>

          <div className="flex flex-1 flex-col items-center">
            <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
            </p>
            {!isCurrentWeek && (
              <button
                type="button"
                onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
                className="mt-0.5 text-xs"
                style={{ color: COLOR, fontWeight: 700 }}
              >
                This week
              </button>
            )}
          </div>

          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => setWeekStart((d) => addDays(d, 7))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              border: "1.5px solid var(--roost-border)",
              borderBottom: "3px solid var(--roost-border-bottom)",
              backgroundColor: "var(--roost-surface)",
            }}
          >
            <ChevronRight className="size-4" style={{ color: "var(--roost-text-secondary)" }} />
          </motion.button>
        </div>

        {/* Loading */}
        {plannerQuery.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Week grid */}
        {!plannerQuery.isLoading && (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3" style={{ minWidth: "980px" }}>
              {weekDays.map((day) => {
                const todayDay = isToday(day);
                return (
                  <div key={day.toISOString()} className="flex-1">
                    {/* Day header */}
                    <div className="mb-2 flex flex-col items-center gap-0.5">
                      <span
                        className="text-xs uppercase"
                        style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
                      >
                        {format(day, "EEE")}
                      </span>
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                        style={{
                          backgroundColor: todayDay ? COLOR : "transparent",
                          color: todayDay ? "#ffffff" : "var(--roost-text-primary)",
                          fontWeight: 800,
                        }}
                      >
                        {format(day, "d")}
                      </span>
                    </div>

                    {/* Slots */}
                    <div className="space-y-1.5">
                      {SLOT_TYPES.map((slotType) => {
                        const slot = getSlot(day, slotType);
                        const mealName = slot?.meal_name ?? slot?.custom_meal_name;

                        return slot ? (
                          <motion.button
                            key={slotType}
                            type="button"
                            onClick={() => openSlot(day, slotType)}
                            whileTap={{ y: 1 }}
                            className="w-full rounded-xl p-2 text-left"
                            style={{
                              backgroundColor: COLOR + "10",
                              border: `1.5px solid ${COLOR}25`,
                              borderBottom: `3px solid ${COLOR_DARK}40`,
                            }}
                          >
                            <p
                              className="truncate text-[11px] leading-tight"
                              style={{ color: COLOR, fontWeight: 700 }}
                            >
                              {mealName}
                            </p>
                            <p
                              className="mt-0.5 text-[10px] uppercase"
                              style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                            >
                              {SLOT_LABELS[slotType]}
                            </p>
                          </motion.button>
                        ) : (
                          <motion.button
                            key={slotType}
                            type="button"
                            onClick={() => openSlot(day, slotType)}
                            whileTap={{ y: 1 }}
                            className="w-full rounded-xl p-2 text-left"
                            style={{
                              border: "1.5px dashed var(--roost-border)",
                              borderBottom: "3px dashed var(--roost-border-bottom)",
                            }}
                          >
                            <p
                              className="text-[10px] uppercase"
                              style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                            >
                              {SLOT_LABELS[slotType]}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!plannerQuery.isLoading && slots.length === 0 && (
          <div
            className="flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center"
            style={{
              border: "1.5px dashed var(--roost-border)",
              borderBottom: "3px dashed var(--roost-border-bottom)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Nothing planned yet.
            </p>
            <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              Tap any slot to add a meal.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ---- Bank tab --------------------------------------------------------------

  function BankTab() {
    const ingredients = (m: MealData) => {
      try {
        return m.ingredients ? (JSON.parse(m.ingredients) as string[]).filter(Boolean) : [];
      } catch {
        return [];
      }
    };

    if (mealsQuery.isLoading) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your meal bank..."
          className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
          style={{
            border: "1.5px solid var(--roost-border)",
            borderBottom: "3px solid var(--roost-border-bottom)",
            color: "var(--roost-text-primary)",
            fontWeight: 600,
            backgroundColor: "var(--roost-surface)",
          }}
        />

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <motion.button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                whileTap={{ y: 1 }}
                className="shrink-0 rounded-full px-4 py-1.5 text-sm"
                style={{
                  backgroundColor: active ? COLOR : "var(--roost-surface)",
                  border: `1.5px solid ${active ? COLOR : "var(--roost-border)"}`,
                  borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                  color: active ? "#ffffff" : "var(--roost-text-secondary)",
                  fontWeight: active ? 800 : 600,
                }}
              >
                {cat}
              </motion.button>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredMeals.length === 0 && (
          <EmptyState
            icon={ChefHat}
            title="Your meal bank is empty."
            body="Add your household favorites so you can plan meals in seconds."
            buttonLabel="Add a meal"
            onButtonClick={() => setMealSheet({ open: true, meal: null })}
            color={COLOR}
          />
        )}

        {/* Meal cards */}
        {filteredMeals.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMeals.map((m, i) => {
              const ing = ingredients(m);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
                  className="flex flex-col rounded-2xl p-4"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "4px solid var(--roost-border-bottom)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-base leading-tight"
                      style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
                    >
                      {m.name}
                    </p>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] capitalize"
                      style={{
                        backgroundColor: COLOR + "18",
                        color: COLOR,
                        fontWeight: 700,
                        border: `1px solid ${COLOR}25`,
                      }}
                    >
                      {m.category}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="mt-1.5 flex items-center gap-3">
                    {m.prep_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" style={{ color: "var(--roost-text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                          {m.prep_time} min
                        </span>
                      </div>
                    )}
                    {ing.length > 0 && (
                      <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                        {ing.length} ingredient{ing.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {m.description && (
                    <p
                      className="mt-2 line-clamp-2 text-xs"
                      style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
                    >
                      {m.description}
                    </p>
                  )}

                  {/* Ingredient count — Fix 6 */}
                  {ing.length === 0 && (
                    <p className="mt-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      No ingredients added
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <motion.button
                      type="button"
                      onClick={() => openSlotForMeal(m)}
                      whileTap={{ y: 1 }}
                      className="flex flex-1 items-center justify-center rounded-xl py-2 text-xs"
                      style={{
                        backgroundColor: COLOR + "12",
                        border: `1.5px solid ${COLOR}25`,
                        borderBottom: `3px solid ${COLOR_DARK}40`,
                        color: COLOR,
                        fontWeight: 800,
                      }}
                    >
                      Add to planner
                    </motion.button>
                    {ing.length > 0 && (
                      <motion.button
                        type="button"
                        onClick={() => setGroceryConfirm(m)}
                        whileTap={{ y: 1 }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: "#22C55E12",
                          border: "1.5px solid #22C55E25",
                          borderBottom: "3px solid #16A34A40",
                          color: "#22C55E",
                        }}
                      >
                        <ShoppingCart className="size-4" />
                      </motion.button>
                    )}
                    <motion.button
                      type="button"
                      onClick={() => setMealSheet({ open: true, meal: m })}
                      whileTap={{ y: 1 }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        border: "1.5px solid var(--roost-border)",
                        borderBottom: "3px solid var(--roost-border-bottom)",
                        color: "var(--roost-text-muted)",
                        backgroundColor: "var(--roost-bg)",
                      }}
                    >
                      <UtensilsCrossed className="size-4" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---- Suggestions tab -------------------------------------------------------

  function SuggestionsTab() {
    if (suggestionsQuery.isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      );
    }

    if (suggestions.length === 0) {
      return (
        <EmptyState
          icon={Lightbulb}
          title="No suggestions yet."
          body="Anyone in the household can suggest a meal. Even the kids get a vote."
          buttonLabel="Suggest a meal"
          onButtonClick={() => setSuggestionSheet(true)}
          color={COLOR}
        />
      );
    }

    return (
      <div className="space-y-3">
        {suggestions.map((s, i) => {
          const isTop = i === 0 && s.upvotes > 0;
          const userUpvoted = s.userVote === "up";
          const userDownvoted = s.userVote === "down";

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
              className="relative rounded-2xl p-4"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "4px solid var(--roost-border-bottom)",
              }}
            >
              {/* Top pick badge */}
              {isTop && (
                <div className="absolute right-4 top-4 flex items-center gap-1">
                  <Trophy className="size-3.5" style={{ color: "#F59E0B" }} />
                  <span className="text-xs" style={{ color: "#F59E0B", fontWeight: 700 }}>
                    Top pick
                  </span>
                </div>
              )}

              {/* Meal name */}
              <p
                className="pr-20 text-base leading-tight"
                style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
              >
                {s.meal_name}
              </p>

              {/* Suggested by */}
              <div className="mt-2 flex items-center gap-1.5">
                <MemberAvatar
                  name={s.suggester_name ?? "?"}
                  avatarColor={s.suggester_avatar}
                  size="sm"
                />
                <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  {s.suggester_name ?? "Someone"}
                </span>
                {s.created_at && (
                  <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    · {relativeTime(new Date(s.created_at))}
                  </span>
                )}
              </div>

              {/* Note */}
              {s.note && (
                <p
                  className="mt-2 text-sm italic"
                  style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
                >
                  "{s.note}"
                </p>
              )}

              {/* Vote row */}
              <div className="mt-3 flex items-center gap-2">
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => voteMutation.mutate({ id: s.id, vote: "up" })}
                  className="flex h-9 items-center gap-1.5 rounded-xl px-3"
                  style={{
                    backgroundColor: userUpvoted ? COLOR + "18" : "var(--roost-bg)",
                    border: `1.5px solid ${userUpvoted ? COLOR + "40" : "var(--roost-border)"}`,
                    borderBottom: `3px solid ${userUpvoted ? COLOR_DARK + "60" : "var(--roost-border-bottom)"}`,
                    color: userUpvoted ? COLOR : "var(--roost-text-muted)",
                  }}
                >
                  <ThumbsUp className="size-3.5" />
                  <span className="text-sm" style={{ fontWeight: 700 }}>
                    {s.upvotes}
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => voteMutation.mutate({ id: s.id, vote: "down" })}
                  className="flex h-9 items-center gap-1.5 rounded-xl px-3"
                  style={{
                    backgroundColor: userDownvoted ? "#EF444418" : "var(--roost-bg)",
                    border: `1.5px solid ${userDownvoted ? "#EF444440" : "var(--roost-border)"}`,
                    borderBottom: `3px solid ${userDownvoted ? "#C93B3B60" : "var(--roost-border-bottom)"}`,
                    color: userDownvoted ? "#EF4444" : "var(--roost-text-muted)",
                  }}
                >
                  <ThumbsDown className="size-3.5" />
                  <span className="text-sm" style={{ fontWeight: 700 }}>
                    {s.downvotes}
                  </span>
                </motion.button>

                <div className="flex-1" />

                {/* Admin: approve */}
                <motion.button
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => setApproveConfirm(s)}
                  className="flex h-9 items-center rounded-xl px-3 text-xs"
                  style={{
                    backgroundColor: "#22C55E12",
                    border: "1.5px solid #22C55E25",
                    borderBottom: "3px solid #16A34A40",
                    color: "#22C55E",
                    fontWeight: 700,
                  }}
                >
                  Add to bank
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: "var(--roost-bg)", minHeight: "100vh" }}
    >
      <PageContainer className="flex flex-col gap-4">
      <PageHeader
        title="Meals"
        color={COLOR}
        action={
          tab === "bank" ? (
            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={() => setMealSheet({ open: true, meal: null })}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
              }}
            >
              <Plus className="size-5" />
            </motion.button>
          ) : tab === "suggestions" ? (
            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={() => setSuggestionSheet(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
              }}
            >
              <Plus className="size-5" />
            </motion.button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-2xl p-1"
        style={{ backgroundColor: "var(--roost-surface)", border: "1.5px solid var(--roost-border)" }}
      >
        <TabButton label="Planner" active={tab === "planner"} onClick={() => setTab("planner")} />
        <TabButton label="Meal Bank" active={tab === "bank"} onClick={() => setTab("bank")} />
        <TabButton label="Suggestions" active={tab === "suggestions"} onClick={() => setTab("suggestions")} />
      </div>

      {/* Suggestions header */}
      {tab === "suggestions" && (
        <div>
          <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            Vote for what you want to eat.
          </p>
        </div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.15 }}
        >
          {tab === "planner" && <PlannerTab />}
          {tab === "bank" && <BankTab />}
          {tab === "suggestions" && <SuggestionsTab />}
        </motion.div>
      </AnimatePresence>

      {/* Sheets */}
      <MealSlotSheet
        open={slotSheet.open}
        onClose={() => setSlotSheet((s) => ({ ...s, open: false }))}
        slotDate={slotSheet.slotDate}
        slotType={slotSheet.slotType}
        existingSlot={slotSheet.existingSlot}
        meals={allMeals as MealRow[]}
        weekStart={weekStartStr}
        preSelectedMeal={slotSheet.preSelectedMeal}
        existingSlots={slots}
      />

      <MealSheet
        open={mealSheet.open}
        onClose={() => setMealSheet({ open: false })}
        meal={mealSheet.meal}
        onUpgradeRequired={(code) => { setMealSheet({ open: false }); setUpgradeCode(code); }}
      />

      <SuggestionSheet
        open={suggestionSheet}
        onClose={() => setSuggestionSheet(false)}
        onUpgradeRequired={(code) => { setSuggestionSheet(false); setUpgradeCode(code); }}
      />

      {/* Upgrade prompt */}
      <Sheet open={!!upgradeCode} onOpenChange={(v) => !v && setUpgradeCode(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-2" style={{ backgroundColor: "var(--roost-surface)" }}>
          <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: COLOR }} />
          {upgradeCode && <UpgradePrompt code={upgradeCode} onDismiss={() => setUpgradeCode(null)} />}
        </SheetContent>
      </Sheet>

      {/* Grocery confirm dialog (Fix 1) */}
      {groceryConfirm && (() => {
        let ing: string[] = [];
        try { ing = groceryConfirm.ingredients ? (JSON.parse(groceryConfirm.ingredients) as string[]).filter(Boolean) : []; } catch { ing = []; }
        const preview = ing.slice(0, 5);
        const extra = ing.length - 5;
        return (
          <Dialog open={!!groceryConfirm} onOpenChange={(v) => !v && setGroceryConfirm(null)}>
            <DialogContent style={{ backgroundColor: "var(--roost-surface)" }}>
              <DialogHeader>
                <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
                  Add ingredients to grocery list?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  This will add {ing.length} ingredient{ing.length !== 1 ? "s" : ""} from{" "}
                  <span style={{ fontWeight: 800, color: "var(--roost-text-primary)" }}>{groceryConfirm.name}</span>{" "}
                  to your Shopping List:
                </p>
                <ul className="space-y-1">
                  {preview.map((item, i) => (
                    <li key={i} className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                      {item}
                    </li>
                  ))}
                  {extra > 0 && (
                    <li className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      + {extra} more
                    </li>
                  )}
                </ul>
              </div>
              <DialogFooter className="flex gap-2">
                <motion.button
                  type="button"
                  onClick={() => setGroceryConfirm(null)}
                  whileTap={{ y: 1 }}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                  style={{
                    backgroundColor: "var(--roost-bg)",
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-secondary)",
                    fontWeight: 700,
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  disabled={addToGroceryMutation.isPending}
                  onClick={() => addToGroceryMutation.mutate(groceryConfirm.id)}
                  whileTap={{ y: 1 }}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
                  style={{
                    backgroundColor: "#22C55E",
                    border: "1.5px solid #22C55E",
                    borderBottom: "3px solid #16A34A",
                    fontWeight: 800,
                  }}
                >
                  {addToGroceryMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Add to list"
                  )}
                </motion.button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Approve confirm dialog (Fix 2) */}
      <Dialog open={!!approveConfirm} onOpenChange={(v) => !v && setApproveConfirm(null)}>
        <DialogContent style={{ backgroundColor: "var(--roost-surface)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
              Add to meal bank?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            <span style={{ fontWeight: 800, color: "var(--roost-text-primary)" }}>{approveConfirm?.meal_name}</span>{" "}
            will be added to your meal bank. You can add more details like ingredients and prep time afterwards.
          </p>
          <DialogFooter className="flex gap-2">
            <motion.button
              type="button"
              onClick={() => setApproveConfirm(null)}
              whileTap={{ y: 1 }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-secondary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              disabled={approveMutation.isPending}
              onClick={() => approveConfirm && approveMutation.mutate({ id: approveConfirm.id, addToBank: true })}
              whileTap={{ y: 1 }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                fontWeight: 800,
              }}
            >
              {approveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Add to bank"
              )}
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </PageContainer>
    </motion.div>
  );
}
