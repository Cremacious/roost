import { relativeTime } from "@/lib/utils/time";

describe("relativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'Just now' for dates within the last minute", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    jest.setSystemTime(now.getTime());
    const thirtySecondsAgo = new Date("2026-01-01T11:59:30Z");
    expect(relativeTime(thirtySecondsAgo)).toBe("Just now");
  });

  it("returns minutes ago for dates within the last hour", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    jest.setSystemTime(now.getTime());
    const fiveMinutesAgo = new Date("2026-01-01T11:55:00Z");
    expect(relativeTime(fiveMinutesAgo)).toBe("5m ago");
  });

  it("returns hours ago for dates within the last day", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    jest.setSystemTime(now.getTime());
    const threeHoursAgo = new Date("2026-01-01T09:00:00Z");
    expect(relativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("returns 'Yesterday' for dates about 24 hours ago", () => {
    const now = new Date("2026-01-02T12:00:00Z");
    jest.setSystemTime(now.getTime());
    const yesterday = new Date("2026-01-01T12:00:00Z");
    expect(relativeTime(yesterday)).toBe("Yesterday");
  });

  it("returns days ago for older dates", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    jest.setSystemTime(now.getTime());
    const fiveDaysAgo = new Date("2026-01-05T12:00:00Z");
    expect(relativeTime(fiveDaysAgo)).toBe("5d ago");
  });

  it("accepts a Date object", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    jest.setSystemTime(now.getTime());
    const date = new Date("2026-01-01T11:59:30Z");
    expect(relativeTime(date)).toBe("Just now");
  });
});
