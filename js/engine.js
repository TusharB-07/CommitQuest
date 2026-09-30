/* ============================================================
 * CommitQuest — Game Engine (pure functions, zero DOM)
 * ------------------------------------------------------------
 * This module is intentionally free of any UI or network code:
 * it takes a list of commits and returns the entire game state.
 * That makes every rule testable (see tests/engine.test.html).
 * ============================================================ */
(function (global) {
  "use strict";

  const DAY_MS = 86400000;

  /** Normalize a Date to local midnight so we can compare "days". */
  function dayKey(dateLike) {
    const d = new Date(dateLike);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /** Group commits into a Map of { [dayKey]: count }. */
  function bucketByDay(commits) {
    const map = new Map();
    for (const c of commits) {
      const k = dayKey(c.date);
      map.set(k, (map.get(k) || 0) + 1);
    }
    return map;
  }

  /* ---------- XP & LEVELS -------------------------------- --
   * Rules (all tunable constants live here on purpose):
   *  - each commit = 10 XP
   *  - streak bonus: +2 XP per consecutive-day run, capped at +20
   *  - max 5 "counted" commits per day (anti-spam: pushing 50
   *    tiny commits shouldn't beat a thoughtful day)
   *  - level N requires cumulative sum of 100 * n^1.35 XP
   * --------------------------------------------------------- */
  const XP_PER_COMMIT = 10;
  const STREAK_BONUS_PER_DAY = 2;
  const STREAK_BONUS_CAP = 20;
  const DAILY_XP_CAP_COMMITS = 5;

  const TITLES = [
    "Sprout",               // 1
    "Spark",                // 2
    "Debug Apprentice",     // 3
    "Bug Hunter",           // 4
    "Branch Rider",         // 5
    "Merge Ninja",          // 6
    "Code Gardener",        // 7
    "Repo Ranger",          // 8
    "Commit Champion",      // 9
    "Open Source Legend",   // 10+
  ];

  /** Cumulative XP needed to REACH `level` (level 1 = 0 XP). */
  function xpForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    for (let n = 1; n < level; n++) total += Math.round(100 * Math.pow(n, 1.35));
    return total;
  }

  function levelFromXp(xp) {
    let lvl = 1;
    while (xp >= xpForLevel(lvl + 1)) lvl++;
    return lvl;
  }

  function titleForLevel(lvl) {
    return TITLES[Math.min(lvl, TITLES.length) - 1];
  }

  /* ---------- STREAKS (with the Streak Shield) ------------ --
   * A streak counts consecutive days with >=1 commit.
   * The Shield grants ONE grace gap of exactly one missed day
   * before the streak breaks — because beginners bounce back.
   * --------------------------------------------------------- */
  function computeStreaks(dayMap, today = dayKey(new Date())) {
    // Best streak ever (shield-aware over history).
    let best = 0, run = 0;
    const days = [...dayMap.keys()].sort((a, b) => a - b);
    for (let i = 0; i < days.length; i++) {
      if (i === 0) { run = 1; }
      else {
        const gap = (days[i] - days[i - 1]) / DAY_MS;
        run = gap === 1 ? run + 1 : (gap === 2 ? run + 2 /* shield absorbs 1 miss */ : 1);
      }
      best = Math.max(best, run);
    }

    // Current streak: walk backwards from today (or yesterday if
    // today has no commits yet — the day isn't over!). The walk may
    // cross AT MOST ONE grace gap of a single missed day, and that
    // one bridging gap consumes the Streak Shield. Consecutive gaps
    // are never allowed, so a broken run always terminates the walk.
    let current = 0;
    const startsToday = dayMap.has(today);
    let cursor = startsToday ? today : today - DAY_MS;
    let shieldUsed = false;
    let lastBridged = false;
    while (true) {
      if (dayMap.has(cursor)) {
        current++; lastBridged = false; cursor -= DAY_MS;
      } else if (!shieldUsed && !lastBridged && dayMap.has(cursor - DAY_MS)) {
        shieldUsed = true; lastBridged = true; cursor -= 2 * DAY_MS; // bridge one missed day
      } else break;
    }
    return { current, best, shieldUsed };
  }

  /* ---------- MAIN ENTRY POINT ---------------------------- --
   * evaluate(commits) -> full game state object
   * commits: [{ date: Date | ISO string }]
   * --------------------------------------------------------- */
  function evaluate(commits) {
    const dayMap = bucketByDay(commits);
    const { current, best, shieldUsed } = computeStreaks(dayMap);

    // XP accrues chronologically: each active day in a row earns
    // a growing streak bonus, capped so late-game stays fair.
    let xp = 0;
    const sortedDays = [...dayMap.keys()].sort((a, b) => a - b);
    let runLen = 0;
    for (let i = 0; i < sortedDays.length; i++) {
      if (i > 0 && (sortedDays[i] - sortedDays[i - 1]) / DAY_MS !== 1) runLen = 0;
      runLen++;
      const bonus = Math.min(runLen * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
      const counted = Math.min(dayMap.get(sortedDays[i]), DAILY_XP_CAP_COMMITS);
      xp += counted * (XP_PER_COMMIT + bonus);
    }

    const level = levelFromXp(xp);
    const curBase = xpForLevel(level);
    const nextBase = xpForLevel(level + 1);
    const progress = (xp - curBase) / (nextBase - curBase);

    const activeDays = dayMap.size;
    const totalCommits = commits.length;
    const nightOwl = commits.some(c => new Date(c.date).getHours() >= 22);
    const weekendWarrior = commits.some(c => [0, 6].includes(new Date(c.date).getDay()));

    return {
      totalCommits, activeDays, xp, level,
      title: titleForLevel(level),
      streak: { current, best, shieldUsed },
      levelProgress: Math.max(0, Math.min(1, progress)),
      xpIntoLevel: xp - curBase,
      xpNeededForNext: nextBase - curBase,
      flags: { nightOwl, weekendWarrior },
      dayMap,
    };
  }

  /* ---------- ACHIEVEMENTS -------------------------------- --
   * Declarative rules: add a badge without touching UI code.
   * --------------------------------------------------------- */
  const ACHIEVEMENTS = [
    { id: "first",     icon: "🌱", name: "First Seed",     desc: "Your very first commit",      test: s => s.totalCommits >= 1 },
    { id: "streak3",   icon: "⚡", name: "On Fire",        desc: "3-day streak",                test: s => s.streak.best >= 3 },
    { id: "streak7",   icon: "🔥", name: "Week Warrior",   desc: "7-day streak",                test: s => s.streak.best >= 7 },
    { id: "commits50", icon: "🧱", name: "Bricklayer",     desc: "50 commits",                  test: s => s.totalCommits >= 50 },
    { id: "nightowl",  icon: "🦉", name: "Night Owl",      desc: "A commit after 10 PM",        test: s => s.flags.nightOwl },
    { id: "weekend",   icon: "🏝️", name: "Weekend Hacker", desc: "Coded on a weekend",          test: s => s.flags.weekendWarrior },
    { id: "lvl5",      icon: "🎖️", name: "Rank 5",         desc: "Reached Level 5",             test: s => s.level >= 5 },
    { id: "gardener",  icon: "🌳", name: "Gardener",       desc: "Active on 30 different days", test: s => s.activeDays >= 30 },
  ];

  function unlockedAchievements(state) {
    return ACHIEVEMENTS.filter(a => a.test(state)).map(a => a.id);
  }

  /* ---------- GARDEN PLANTS ------------------------------- --
   * Milestones turn heatmap cells into plants — visible growth.
   * --------------------------------------------------------- */
  function plantFor(dayCount, streakBest) {
    if (dayCount === 0) return null;
    if (dayCount >= 8 && streakBest >= 7) return "🌳";
    if (dayCount >= 5) return "🌷";
    if (dayCount >= 3) return "🌿";
    return "🌱";
  }

  const API = {
    DAY_MS, dayKey, bucketByDay, computeStreaks, evaluate,
    xpForLevel, levelFromXp, titleForLevel,
    ACHIEVEMENTS, unlockedAchievements, plantFor,
    CONFIG: { XP_PER_COMMIT, STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP, DAILY_XP_CAP_COMMITS },
  };

  global.CQ = Object.assign(global.CQ || {}, { engine: API });
})(typeof window !== "undefined" ? window : globalThis);
