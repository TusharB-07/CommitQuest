/* ============================================================
 * CommitQuest — Data layer
 * ------------------------------------------------------------
 * Two sources of commits, one shape: [{ date: Date }].
 *  1. demoData()  — seeded pseudo-random sample adventurer
 *  2. fetchGitHub(username) — real public data via GitHub API
 * Everything degrades gracefully (rate limits, typos, offline).
 * ============================================================ */
(function (global) {
  "use strict";

  const CQ = global.CQ = global.CQ || {};

  /* ---------- Seeded RNG so the demo looks identical ------ --
   * every time (mulberry32). Reproducible demos matter when
   * you're recording a hackathon video at 2am.
   * --------------------------------------------------------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Build a believable 15-week journey for "Luna Devsworth":
   * slow start, a messy gap (real life!), a comeback streak,
   * weekend bursts and a few night-owl commits.
   */
  function demoData() {
    const rand = mulberry32(20260930);
    const commits = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const DAYS = 105; // 15 weeks

    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * CQ.engine.DAY_MS);
      const dow = d.getDay();

      // Probability of coding that day — shaped like a real beginner:
      // inconsistent early, momentum later, plus one deliberate gap
      // around week 6 (the "life happened" dip).
      let p = 0.35 + 0.4 * ((DAYS - i) / DAYS);
      if (i > 40 && i < 47) p *= 0.15;          // burnout gap
      if (dow === 0 || dow === 6) p *= 0.7;     // weekends quieter
      if (i < 3) p = 1;                          // hot finish: last days active

      if (rand() < p) {
        const n = 1 + Math.floor(rand() * (rand() < 0.18 ? 7 : 3));
        for (let k = 0; k < n; k++) {
          const hour = rand() < 0.14 ? 22 + Math.floor(rand() * 2) // night owls
                                     : 9 + Math.floor(rand() * 11);
          d.setHours(hour % 24, Math.floor(rand() * 60), 0, 0);
          commits.push({ date: new Date(d) });
        }
      }
    }
    return {
      name: "Luna Devsworth",
      login: "luna-dev",
      avatar: null, // UI renders a generated gradient monogram
      bio: "Day 105 of learning to code. One commit at a time.",
      commits,
      source: "demo",
    };
  }

  /* ---------- Real GitHub data ---------------------------- --
   * GET /users/:u/events → PushEvent payloads contain commits.
   * Up to 3 pages (~300 events) to reach further back in time.
   * --------------------------------------------------------- */
  async function fetchGitHub(username) {
    const headers = { Accept: "application/vnd.github+json" };
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
    if (userRes.status === 404) throw new Error(`User "${username}" not found on GitHub.`);
    if (userRes.status === 403 || userRes.status === 429) {
      throw new Error("GitHub API rate limit reached (60 req/hr per IP). Try again soon — the demo stays available.");
    }
    if (!userRes.ok) throw new Error("GitHub request failed (" + userRes.status + ").");
    const user = await userRes.json();

    const commits = [];
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100&page=${page}`,
        { headers }
      );
      if (!res.ok) break; // partial data is better than an error screen
      const events = await res.json();
      if (!events.length) break;
      for (const ev of events) {
        if (ev.type !== "PushEvent") continue;
        const list = (ev.payload && ev.payload.commits) || [];
        for (const c of list) commits.push({ date: new Date(ev.created_at) });
      }
      if (events.length < 100) break;
    }

    if (!commits.length) {
      return { ...mapUser(user), commits: [], source: "github-empty" };
    }
    return { ...mapUser(user), commits, source: "github" };

    function mapUser(u) {
      return {
        name: u.name || u.login,
        login: u.login,
        avatar: u.avatar_url,
        bio: u.bio || "Public GitHub adventurer.",
      };
    }
  }

  CQ.data = { demoData, fetchGitHub, mulberry32 };
})(typeof window !== "undefined" ? window : globalThis);
