import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";

describe("FREE_TIER_LIMITS", () => {
  it("defines member limit of 5", () => {
    expect(FREE_TIER_LIMITS.members).toBe(5);
  });

  it("defines chores limit of 5", () => {
    expect(FREE_TIER_LIMITS.chores).toBe(5);
  });

  it("defines tasks limit of 10", () => {
    expect(FREE_TIER_LIMITS.tasks).toBe(10);
  });

  it("defines grocery lists limit of 1", () => {
    expect(FREE_TIER_LIMITS.groceryLists).toBe(1);
  });
});

describe("allowance completion rate logic", () => {
  function calcCompletionRate(completed: number, total: number): number {
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
  }

  it("returns 100 when no chores assigned", () => {
    expect(calcCompletionRate(0, 0)).toBe(100);
  });

  it("returns 100 for full completion", () => {
    expect(calcCompletionRate(5, 5)).toBe(100);
  });

  it("returns 80 for 4/5 completion", () => {
    expect(calcCompletionRate(4, 5)).toBe(80);
  });

  it("returns 0 for no completions", () => {
    expect(calcCompletionRate(0, 5)).toBe(0);
  });

  it("determines earned status correctly", () => {
    const threshold = 80;
    expect(calcCompletionRate(4, 5) >= threshold).toBe(true);
    expect(calcCompletionRate(3, 5) >= threshold).toBe(false);
  });
});
