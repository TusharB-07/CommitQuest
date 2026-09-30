// Node smoke test for the CommitQuest engine + demo data.
// Run with: node tests/node-smoke.js
global.window = global;
require("../js/engine.js");
require("../js/data.js");
require("../js/theme.js"); // must be loadable outside the browser too (no top-level DOM access)

const E = globalThis.CQ.engine;
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else { console.log("ok  :", m); } };

assert(typeof globalThis.CQ.theme === "object" && !!globalThis.CQ.theme.PALETTES.light, "theme module exposes light + dark palettes");

function dayAgo(n, hour = 12, count = 1) {
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const arr = [];
  for (let i = 0; i < count; i++) arr.push({ date: new Date(base.getTime() - n * E.DAY_MS + hour * 3600e3) });
  return arr;
}

let s = E.evaluate([]);
assert(s.xp === 0 && s.level === 1, "empty history -> level 1, 0 XP");

s = E.evaluate(dayAgo(0));
assert(s.streak.current === 1 && s.title === "Sprout", "one commit today -> streak 1, Sprout");

s = E.evaluate([...dayAgo(2), ...dayAgo(1), ...dayAgo(0)]);
assert(s.streak.current === 3 && !s.streak.shieldUsed, "consecutive days accumulate without spending the shield (got " + s.streak.current + ")");

s = E.evaluate([...dayAgo(5), ...dayAgo(4), ...dayAgo(3), ...dayAgo(1), ...dayAgo(0)]);
assert(s.streak.current === 4 && s.streak.shieldUsed, "streak shield bridges one missed day (got " + s.streak.current + ")");

s = E.evaluate([...dayAgo(6), ...dayAgo(3), ...dayAgo(2), ...dayAgo(1), ...dayAgo(0)]);
assert(s.streak.current === 4, "walk stops after one bridge — old run at -6 unreachable (got " + s.streak.current + ")");

s = E.evaluate(dayAgo(0, 23, 2));
assert(s.flags.nightOwl, "night owl flag on 23:00 commit");

s = E.evaluate(dayAgo(0, 12, 50));
assert(s.totalCommits === 50 && s.activeDays === 1 && s.xp <= 5 * (E.CONFIG.XP_PER_COMMIT + E.CONFIG.STREAK_BONUS_CAP), "daily XP cap counts max 5 commits");

for (let l = 1; l <= 10; l++) assert(E.levelFromXp(E.xpForLevel(l)) === l, "level round-trip L" + l);

const d1 = CQ.data.demoData(), d2 = CQ.data.demoData();
assert(d1.commits.length === d2.commits.length, "demo data is seeded/deterministic (" + d1.commits.length + " commits)");

const st = E.evaluate(d1.commits);
console.log("\nDEMO STATE:", JSON.stringify({
  commits: st.totalCommits, activeDays: st.activeDays, xp: st.xp,
  level: st.level, title: st.title, streak: st.streak,
  achievements: E.unlockedAchievements(st).length + "/" + E.ACHIEVEMENTS.length,
}, null, 1));
assert(st.totalCommits > 40 && st.streak.best >= 5, "demo dataset looks alive");

console.log(process.exitCode ? "\nSOME TESTS FAILED" : "\nALL NODE SMOKE TESTS PASSED");
