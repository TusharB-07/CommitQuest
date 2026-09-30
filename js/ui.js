/* ============================================================
 * CommitQuest — UI layer
 * ------------------------------------------------------------
 * All DOM rendering lives here: garden heatmap, XP bar, quests,
 * achievements, toasts, confetti and the velocity chart.
 * It only ever consumes the state object from engine.evaluate().
 * ============================================================ */
(function (global) {
  "use strict";
  const CQ = global.CQ;
  const $ = (sel) => document.querySelector(sel);
  const E = CQ.engine;

  /* ---------- Toasts ------------------------------------- */
  function toast(msg, accent = "var(--accent)") {
    const box = $("#toasts");
    const el = document.createElement("div");
    el.className = "toast";
    el.style.borderLeftColor = accent;
    el.innerHTML = msg;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, 4200);
  }

  /* ---------- Confetti (tiny canvas burst) ---------------- */
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = $("#confetti"), ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const th = CQ.theme.colors();
    const colors = [th.lemon, th.coral, th.violet, th.mint, th.ink];
    const parts = Array.from({ length: 130 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 260,
      y: innerHeight / 3 + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3,
      s: Math.random() * 6 + 3, r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let t0 = performance.now();
    const start = t0;
    (function frame(now) {
      const dt = Math.min(32, now - t0); t0 = now;
      ctx.clearRect(0, 0, cv.width, cv.height);
      let alive = false;
      for (const p of parts) {
        p.vy += 0.02 * dt; p.x += p.vx * (dt / 16); p.y += p.vy * (dt / 16); p.r += p.vr;
        if (p.y < cv.height + 20) alive = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (alive && now - start < 5000) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  /* ---------- Garden heatmap ------------------------------ */
  function heatColor(n) {
    const HEAT = CQ.theme.heat();          // theme-aware palette
    if (n <= 0) return HEAT[0];
    return HEAT[Math.min(HEAT.length - 1, Math.ceil(n / 2))];
  }

  function renderGarden(state) {
    const g = $("#garden");
    g.innerHTML = "";
    const WEEKS = 15, DAYS = WEEKS * 7;
    const today = E.dayKey(new Date());

    for (let i = DAYS - 1; i >= 0; i--) {
      const key = today - i * E.DAY_MS;
      const n = state.dayMap.get(key) || 0;
      const cell = document.createElement("div");
      cell.className = "heat-cell";
      cell.style.background = heatColor(n);
      const d = new Date(key);
      cell.title = `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${n} commit${n === 1 ? "" : "s"}${n ? " · +" + Math.min(n, E.CONFIG.DAILY_XP_CAP_COMMITS) * E.CONFIG.XP_PER_COMMIT + "+ XP" : ""}`;
      // Recent high-growth days literally sprout plants.
      if (i < 7 && n > 0) {
        const plant = E.plantFor(n, state.streak.best);
        if (plant) { cell.textContent = plant; cell.style.fontSize = "10px"; cell.style.lineHeight = "13px"; cell.style.textAlign = "center"; cell.style.boxShadow = `0 0 8px ${CQ.theme.cssVar("--heat-4", "#22903f")}`; }
      }
      g.appendChild(cell);
    }

    // Milestone message under the garden
    const msg = $("#garden-msg");
    const plantsUnlocked = [...state.dayMap.values()].filter(v => v >= 5).length;
    if (plantsUnlocked > 0) {
      msg.classList.remove("hidden");
      msg.textContent = `🌳 ${plantsUnlocked} high-growth day${plantsUnlocked === 1 ? "" : "s"} detected — your garden is officially growing. Keep watering it.`;
    } else msg.classList.add("hidden");
  }

  /* ---------- Hero sparkline (static flourish) ------------ */
  function renderHeroSpark() {
    const host = $("#hero-spark");
    if (!host) return;
    const vals = [2, 5, 3, 7, 4, 8, 6, 9, 5, 10, 7, 12, 8, 11, 6, 13, 9, 14, 10, 12, 15, 11, 16, 13];
    const max = Math.max(...vals);
    host.innerHTML = vals.map((v, i) =>
      `<div class="rounded-sm w-[10px] ${i > vals.length - 8 ? 'bg-lemon' : 'bg-violet/50'}" style="height:${(v / max) * 100}%"></div>`
    ).join("");
  }

  /* ---------- Player card & streak ------------------------ */
  function renderPlayer(profile, state) {
    $("#p-name").textContent = profile.name;
    $("#p-title").textContent = `${profile.login} · ${profile.bio}`;
    $("#p-xp").textContent = state.xp.toLocaleString();
    $("#lvl-label").textContent = `Level ${state.level} · ${state.title}`;
    $("#lvl-next").textContent = `${state.xpIntoLevel} / ${state.xpNeededForNext} XP to Level ${state.level + 1}`;
    $("#xp-bar").style.width = (state.levelProgress * 100).toFixed(1) + "%";
    $("#stat-commits").textContent = state.totalCommits;
    $("#stat-streak").textContent = state.streak.current;
    $("#stat-best").textContent = state.streak.best;
    $("#stat-active").textContent = state.activeDays;

    const av = $("#p-avatar");
    if (profile.avatar) { av.src = profile.avatar; av.style.display = ""; }
    else {
      av.style.display = "none";
      // gradient monogram fallback
      let mono = $("#p-mono");
      if (!mono) {
        mono = document.createElement("div");
        mono.id = "p-mono";
        mono.className = "w-16 h-16 rounded-2xl bg-gradient-to-br from-coral to-violet grid place-items-center font-display font-bold text-txt text-2xl border border-line";
        av.parentNode.insertBefore(mono, av);
      }
      mono.textContent = (profile.name || "?").trim()[0].toUpperCase();
    }

    // Streak panel copy changes with intensity
    const s = state.streak.current;
    $("#streak-big").textContent = s;
    const phase = $("#streak-phase");
    phase.textContent = s >= 14 ? "Unstoppable" : s >= 7 ? "On fire" : s >= 3 ? "Warming up" : "Seedling";
    $("#streak-sub").textContent = s === 0
      ? "no active streak yet — one commit today restarts the engine"
      : `consecutive days with at least one commit${state.streak.shieldUsed ? " · 🛡️ shield saved you once" : ""}`;
  }

  /* ---------- Achievements ------------------------------- */
  function renderAchievements(unlockedIds, announceNew) {
    const host = $("#achievements");
    host.innerHTML = "";
    $("#ach-count").textContent = `(${unlockedIds.length}/${E.ACHIEVEMENTS.length})`;
    for (const a of E.ACHIEVEMENTS) {
      const got = unlockedIds.includes(a.id);
      const el = document.createElement("div");
      el.title = `${a.name} — ${a.desc}${got ? " ✓" : " (locked)"}`;
      el.className = "aspect-square rounded-xl grid place-items-center text-2xl border transition-all duration-500 " +
        (got ? "bg-lemon/10 border-lemon/40 shadow-glow" : "bg-ink border-line opacity-35 grayscale");
      el.textContent = a.icon;
      host.appendChild(el);
    }
    if (announceNew && announceNew.length) {
      for (const id of announceNew) {
        const a = E.ACHIEVEMENTS.find(x => x.id === id);
        toast(`🏆 Achievement unlocked: <strong>${a.name}</strong><br><span class="text-sub">${a.desc}</span>`, "var(--c-violet)");
      }
      confetti();
    }
  }

  /* ---------- Daily quests (localStorage-persisted) ------ */
  const QUESTS = [
    { id: "q-commit",  xp: 25, label: "Make at least one real commit today" },
    { id: "q-read",    xp: 15, label: "Read someone else's code for 15 minutes" },
    { id: "q-learn",   xp: 15, label: "Learn one new thing and write it down" },
    { id: "q-help",    xp: 20, label: "Answer or upvote a beginner's question" },
    { id: "q-clean",   xp: 10, label: "Rename one confusing variable" },
  ];
  const STORE_KEY = "commitquest.quests.v1";

  function loadQuests() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function saveQuests(done) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(done)); } catch {}
  }

  function renderQuests(onChange) {
    const done = loadQuests();
    const list = $("#quest-list");
    list.innerHTML = "";
    for (const q of QUESTS) {
      const li = document.createElement("li");
      const checked = !!done[q.id];
      li.innerHTML = `
        <label class="flex items-center gap-3 rounded-xl border ${checked ? "border-mint/50 bg-mint/10" : "border-line bg-ink/50"} p-3 cursor-pointer hover:border-accent transition">
          <input type="checkbox" class="accent-[var(--c-mint)] w-4 h-4" ${checked ? "checked" : ""} />
          <span class="text-sm flex-1 ${checked ? "line-through text-faint" : "text-txt"}">${q.label}</span>
          <span class="text-[11px] font-bold ${checked ? "text-mint" : "text-lemon"}">+${q.xp} XP</span>
        </label>`;
      li.querySelector("input").addEventListener("change", (e) => {
        done[q.id] = e.target.checked;
        if (!done["_claim_" + q.id] && e.target.checked) {
          done["_claim_" + q.id] = true; // bonus already granted once per quest ever
        }
        saveQuests(done);
        renderQuests(onChange);
        onChange(q, e.target.checked);
      });
      list.appendChild(li);
    }
  }

  /* ---------- Velocity chart ----------------------------- */
  let chart = null;
  let lastChartData = null;

  /* #rgb or #rrggbb -> rgba() with alpha (theme-aware fills) */
  function hexA(hex, a) {
    const h = hex.replace("#", "");
    const f = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(f, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function renderChart(state) {
    const canvas = $("#velocity-chart");
    if (!canvas || typeof Chart === "undefined") return;
    const labels = [], data = [];
    const today = E.dayKey(new Date());
    for (let w = 14; w >= 0; w--) {
      let sum = 0;
      for (let d = 0; d < 7; d++) {
        const key = today - (w * 7 + d) * E.DAY_MS;
        sum += state.dayMap.get(key) || 0;
      }
      labels.push(w === 0 ? "this wk" : `-${w}w`);
      data.push(sum);
    }
    if (chart) { chart.data.datasets[0].data = data; chart.update(); return; }
    lastChartData = { labels, data };
    buildChart(canvas, labels, data);
  }

  function buildChart(canvas, labels, data) {
    const th = CQ.theme.colors();
    const grid = CQ.theme.cssVar("--chart-grid", "rgba(23,32,58,.08)");
    const tick = CQ.theme.cssVar("--chart-tick", "#64748b");
    chart = new Chart(canvas, {
      type: "bar",
      data: { labels, datasets: [{
        data, borderRadius: 6, borderSkipped: false,
        backgroundColor: (c) => c.dataIndex >= 12 ? th.lemon : hexA(th.violet, .55),
        hoverBackgroundColor: th.mint,
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600 },
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: CQ.theme.cssVar("--bg-panel", "#fff"),
          borderColor: CQ.theme.cssVar("--border-line", "#e2e8f0"),
          borderWidth: 1, titleColor: th.ink, bodyColor: CQ.theme.cssVar("--text-sub", "#55607a"), padding: 10,
          callbacks: { label: (c) => ` ${c.parsed.y} commits` }
        }},
        scales: {
          x: { grid: { display: false }, ticks: { color: tick, font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: grid }, ticks: { color: tick, precision: 0 } },
        },
      }
    });
  }

  /* Re-skin the chart instantly when the theme flips. */
  document.addEventListener("cq:theme", () => {
    if (!chart) return;
    const canvas = document.querySelector("#velocity-chart");
    chart.destroy(); chart = null;
    if (canvas && lastChartData) buildChart(canvas, lastChartData.labels, lastChartData.data);
  });

  CQ.ui = { toast, confetti, renderGarden, renderHeroSpark, renderPlayer,
            renderAchievements, renderQuests, renderChart, QUESTS };
})(window);