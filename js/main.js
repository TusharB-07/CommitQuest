/* ============================================================
 * CommitQuest — App controller
 * ------------------------------------------------------------
 * Wires data -> engine -> ui. Manages quest XP bonuses,
 * level-up detection, achievement announcements and the
 * GitHub username lookup with graceful fallbacks.
 * ============================================================ */
(function () {
  "use strict";
  const CQ = window.CQ, E = CQ.engine, UI = CQ.ui;
  const $ = (s) => document.querySelector(s);

  const QUEST_STORE = "commitquest.bonusxp.v1";
  let currentProfile = null;   // { name, login, avatar, bio }
  let baseState = null;        // engine state from commits alone
  let prevLevel = null;
  let prevUnlocked = [];

  /* ---------- Derived state (commits + quest bonuses) ----- */
  function loadBonusXp() {
    try { return JSON.parse(localStorage.getItem(QUEST_STORE)) || {}; } catch { return {}; }
  }
  function saveBonusXp(b) {
    try { localStorage.setItem(QUEST_STORE, JSON.stringify(b)); } catch {}
  }
  function bonusSum(b) {
    // Each claimed quest stores its xp once; unchecking does NOT
    // remove already-earned XP (you really did the thing).
    return UI.QUESTS.reduce((sum, q) => sum + (b[q.id] ? q.xp : 0), 0);
  }

  function renderAll(announceDeltas = true) {
    const state = E.evaluate(currentProfile.commits);
    const extra = bonusSum(loadBonusXp());
    if (extra > 0) {
      state.xp += extra;
      state.level = E.levelFromXp(state.xp);
      state.title = E.titleForLevel(state.level);
      const curBase = E.xpForLevel(state.level), nextBase = E.xpForLevel(state.level + 1);
      state.levelProgress = Math.max(0, Math.min(1, (state.xp - curBase) / (nextBase - curBase)));
      state.xpIntoLevel = state.xp - curBase;
      state.xpNeededForNext = nextBase - curBase;
    }
    baseState = state;

    UI.renderPlayer(currentProfile, state);
    UI.renderGarden(state);
    UI.renderChart(state);

    const unlocked = E.unlockedAchievements(state);
    const newly = announceDeltas ? unlocked.filter(id => !prevUnlocked.includes(id)) : [];
    UI.renderAchievements(unlocked, newly);

    if (prevLevel !== null && state.level > prevLevel && announceDeltas) {
      UI.toast(`⭐ <strong>Level up!</strong> You are now Level ${state.level} — <em>${state.title}</em>.`, "var(--accent)");
      UI.confetti();
    }
    prevLevel = state.level;
    prevUnlocked = unlocked;
  }

  /* ---------- Quest interactions -------------------------- */
  function onQuestChange(q, checked) {
    const b = loadBonusXp();
    if (checked && !b[q.id]) {
      b[q.id] = true;
      saveBonusXp(b);
      UI.toast(`🏹 Quest complete: <strong>+${q.xp} XP</strong> banked!`, "var(--c-mint)");
    } else if (!checked) {
      b[q.id] = false;
      saveBonusXp(b);
    }
    renderAll(true);
  }

  /* ---------- GitHub lookup ------------------------------- */
  async function lookup(username) {
    const note = $("#lookup-note"), btn = $("#lookup-btn");
    btn.disabled = true;
    note.textContent = `Fetching @${username}'s public activity…`;
    note.className = "text-xs mt-2 h-4 text-faint";
    try {
      const profile = await CQ.data.fetchGitHub(username);
      currentProfile = profile;
      prevLevel = null; prevUnlocked = [];
      if (profile.source === "github-empty") {
        note.textContent = `@${profile.login} has no push events in the last ~90 days of GitHub's event feed — stats will be modest. That's fine: Level 1 is one commit away.`;
        note.className = "text-xs mt-2 h-4 text-coral";
      } else {
        note.textContent = `Loaded real data for @${profile.login} from the GitHub API 🎉`;
        note.className = "text-xs mt-2 h-4 text-mint";
      }
      renderAll(false);
    } catch (err) {
      note.textContent = "⚠ " + err.message + " — demo adventurer stays loaded.";
      note.className = "text-xs mt-2 h-4 text-coral";
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- Scroll reveal (functional fix: the .reveal
   * CSS hides sections at opacity 0 until an observer adds
   * the .in class — without this, content stays invisible.) - */
  function setupReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      }
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  /* ---------- Theme toggle (light/dark) ------------------- */
  function setupThemeToggle() {
    const tt = document.getElementById("theme-toggle");
    if (!tt) return;
    tt.addEventListener("click", () => CQ.theme.toggle());
    // Re-render theme-painted widgets with the new palette
    document.addEventListener("cq:theme", () => {
      if (baseState) UI.renderGarden(baseState);   // heatmap cells are JS-painted
      if (currentProfile) UI.renderPlayer(currentProfile, baseState || UI.lastState);
    });
  }

  /* ---------- Boot ---------------------------------------- */
  function boot() {
    setupThemeToggle();
    setupReveal();
    UI.renderHeroSpark();
    currentProfile = CQ.data.demoData();
    renderAll(false);
    UI.renderQuests(onQuestChange);

    $("#lookup-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#username").value.trim();
      if (v) lookup(v);
    });

    $("#cta-demo").addEventListener("click", () => {
      document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => UI.toast("👋 Meet <strong>Luna</strong>, a sample adventurer. Type any GitHub username above to see <em>your</em> quest board.", "var(--c-coral)"), 600);
    });

    // First-visit welcome
    const seen = (() => { try { return localStorage.getItem("commitquest.seen"); } catch { return "1"; } })();
    if (!seen) {
      setTimeout(() => UI.toast("🌱 Welcome to <strong>CommitQuest</strong>! Everything you see is real math on real commits.", "var(--c-violet)"), 1200);
      try { localStorage.setItem("commitquest.seen", "1"); } catch {}
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
