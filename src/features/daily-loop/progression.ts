import type { DailyCompletion, DailyProgress } from "./api";

export const STARDUST_PER_LEVEL = 200;

export type SaverLevel = {
  level: number;
  name: string;
  currentStardust: number;
  nextLevelStardust: number;
  progressPercent: number;
};

const levelNames = ["Seedling", "Sprout", "Pathfinder", "Glowkeeper", "Dreambuilder"];

export function saverLevel(stardustTotal = 0): SaverLevel {
  const level = Math.floor(stardustTotal / STARDUST_PER_LEVEL) + 1;
  const currentStardust = stardustTotal % STARDUST_PER_LEVEL;
  return {
    level,
    name: levelNames[Math.min(level - 1, levelNames.length - 1)],
    currentStardust,
    nextLevelStardust: STARDUST_PER_LEVEL,
    progressPercent: Math.round((currentStardust / STARDUST_PER_LEVEL) * 100),
  };
}

export function completedToday(completions: DailyCompletion[], localDate: string) {
  return completions.find((completion) => completion.local_date === localDate) ?? null;
}

export function recentMoveDays(completions: DailyCompletion[], count = 7, today = new Date()) {
  const completedDates = new Set(completions.map((completion) => completion.local_date));
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (count - offset - 1));
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    return {
      key,
      label: new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(date),
      complete: completedDates.has(key),
      isToday: offset === count - 1,
    };
  });
}

export function emptyDailyProgress(userId: string): DailyProgress {
  return {
    user_id: userId,
    current_streak: 0,
    best_streak: 0,
    stardust_total: 0,
    completed_moves: 0,
    last_completed_on: null,
    updated_at: new Date(0).toISOString(),
  };
}
