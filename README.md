# 🌱 CommitQuest — *Your first commit is Level 1.*

> **Turn your real GitHub coding journey into an RPG adventure.**
> Levels, XP, streaks with a Streak Shield, daily quests, achievements and a living contribution garden — computed from **real commits**, not vibes.
> Built for **FirstCommit – Beginner's Paradise** (Devpost), mobile-first and 100% free.

<!-- TODO(submission): drop a real screenshot at `docs/screenshot.png` and uncomment
![CommitQuest dashboard](docs/screenshot.png) -->

🖼️ *Live demo deployed automatically to GitHub Pages — see the website link on this repo.*

---

## 💡 The problem (why this exists)

Beginners quit coding for one reason above all others: **invisible progress.**

You spend three evenings fighting `git rebase`, learn something real… and the only feedback you get is a slightly less empty repo. GitHub's contribution graph is a wall of tiny squares — it never says *"hey, look how far you've come."* Motivation dies where feedback is missing.

**CommitQuest fixes the feedback loop.** It takes activity you already produce (commits) and translates it into the reward systems games have used for decades: XP curves, levels with names, streaks that forgive, quests that tell you *what to do today*, and a garden that visibly grows as you do.

## ✨ What it does

| Feature | What you see | Where it lives |
|---|---|---|
| **Real data, no login** | Type any public GitHub username → live quest board via the read-only REST API | `js/data.js` |
| **XP & Levels** | Every commit earns XP; 10 named ranks from *Sprout* → *Open Source Legend* | `js/engine.js` |
| **🔥 Streak + 🛡️ Streak Shield** | One missed day doesn't nuke your streak — beginners bounce back, so the game forgives once per run | `js/engine.js` |
| **🌱 Contribution Garden** | A 15-week heatmap where high-growth days literally sprout plants (🌱→🌿→🌷→🌳) | `js/ui.js` |
| **🏹 Daily Quests** | Concrete beginner missions ("rename one confusing variable") with XP bonuses, persisted in `localStorage` | `js/ui.js` |
| **🏆 Achievements** | 8 declarative badges (Night Owl, Bricklayer…) — add new ones without touching UI code | `js/engine.js` |
| **📈 Velocity chart** | Weekly commit rhythm via Chart.js — consistency beats intensity | `js/ui.js` |
| **🌗 Light / dark theme** | One toggle re-skins every JS-painted widget (heatmap, chart, toasts, confetti); follows your OS preference on first visit | `js/theme.js` |
| **Level-up confetti & toasts** | Dopamine, responsibly engineered | `js/ui.js` |

## 🚀 Run it (30 seconds)

No build step, no dependencies to install, no API keys.

```bash
# Option A — just open it
open index.html            # macOS   (double-click works too)

# Option B — serve it properly (recommended, avoids file:// quirks)
python3 -m http.server 8000
# then visit http://localhost:8000
```

**Try these:**
- Click **⚡ Explore the live demo** — Luna, a seeded sample adventurer, loads instantly (works offline).
- Type a real username (`torvalds`, `gaearon`, or **your own**) and press **Load →**.
- Check off a Daily Quest — watch XP tick up, then refresh: it persists.

### Tests

```bash
node tests/node-smoke.js        # engine unit checks in Node
# open tests/engine.test.html   # the same suite rendered in-browser
```

## 🧠 How it works (the architecture I'd defend in an oral exam)

Three strict layers, communicating through plain data — deliberately like a mini game engine:

```
data layer          pure game logic           presentation
js/data.js   ──►    js/engine.js       ──►    js/ui.js + index.html
(GitHub API /       (zero DOM, zero            (rendering, charts,
 seeded demo)        network — 100%             toasts, confetti,
                    testable functions)        localStorage)
                          ▲
                          │  js/main.js = thin controller:
                          │  wires events, detects level-ups,
                          │  merges quest-bonus XP into state
```

**Design decisions & trade-offs** (judges love this section — here's my honesty):

1. **The engine is pure.** `engine.evaluate(commits)` is a deterministic function: same commits → same state. That's why I could unit-test streak math in Node before ever opening a browser — and why the browser test page runs the exact same module.
2. **Streak Shield over Duolingo-style punishment.** Classic streaks break on the first missed day, which is precisely when a beginner gives up. My walk-back algorithm allows exactly **one bridged gap** per streak and flags `shieldUsed` in the UI. Two consecutive gaps still break it — forgiveness without losing stakes.
3. **Anti-spam XP cap.** Only the first 5 commits/day count for XP, so "commit everything 40 times" can't farm levels. Consistency > noise.
4. **Graceful degradation everywhere.** Rate-limited GitHub? Typo'd username? Offline laptop at 2am? The app falls back to the seeded demo dataset and *tells you why* instead of showing a red error. (60 req/hr unauthenticated limit is documented in the FAQ too.)
5. **Trade-off I'd change next:** Tailwind via Play CDN keeps the hackathon iteration loop instant, but production would use a compiled Tailwind build; emoji-as-art keeps assets tiny and playful, but real illustrations would be the next polish pass.
6. **Privacy-first by construction:** there is *no backend*. Nothing to leak because nothing is collected — all personalization lives in your browser's `localStorage`.

## 🧰 Tech stack

HTML5 · Vanilla JS (ES2020, IIFE modules) · Tailwind CSS (Play CDN) · Chart.js 4 · GitHub REST API · Canvas 2D (confetti) · localStorage · Google Fonts (Space Grotesk / Inter)

## 🗺️ Roadmap

- [ ] OAuth + GraphQL contributions API for full-history stats (not just last ~90 days of events)
- [ ] Party mode: teams share a streak cauldron
- [ ] PWA manifest + weekly recap e-mail ("your garden grew 🌷")
- [ ] Compiled Tailwind + real illustration set

## 🤖 AI disclosure (per hackathon rules)

AI assistance was used as a learning aid for brainstorming feature scope, reviewing my streak-boundary edge cases, and copy-editing docs. **All architecture decisions, game-rule tuning (XP curve, shield semantics, caps), and every line shipped were written, debugged and verified by me during the hackathon** — including fixing two real streak-algorithm bugs caught by my own tests (see git history: the shield-walk and double-bridge fixes).

## 👤 Author

**Tushar N Biswas** — First hackathon, first commit, first level. 🌱

---

*Made at FirstCommit – Beginner's Paradise. Your future starts with one commit.*
