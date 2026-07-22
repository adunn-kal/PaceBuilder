# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server w/ hot reload at http://localhost:5173/PaceBuilder/
npm run build     # production build -> ./docs (NOT ./dist)
npm run preview   # serve the production build locally
npm run lint      # oxlint (see .oxlintrc.json — react + oxc plugins)
```

There is no test suite. Linting uses **oxlint**, not ESLint.

## What this is

A client-only React SPA (Vite + Bootstrap via react-bootstrap + react-router) that
generates week-by-week running training plans. **No backend, no SSR** — all state
lives in the browser's `localStorage`. Plain `.jsx`/JavaScript, no TypeScript.
Hosted as a static site on GitHub Pages.

## Deployment coupling (don't break these together)

Three settings must stay consistent for GitHub Pages hosting:

- **`base: '/PaceBuilder/'`** in `vite.config.js` — must match the repo name. If the
  repo is renamed, update this or all asset URLs 404.
- **`build.outDir: 'docs'`** — build writes to `./docs` (committed and pushed), because
  Pages serves from the `docs/` folder on the default branch. There is no CI; you build
  locally, commit `docs/`, and push.
- **`HashRouter`** (in `src/main.jsx`) — routes are `#/...` fragments so refreshes and
  deep links work on a dumb static host. Do not switch to `BrowserRouter`.

## Data flow & persistence

Everything routes through `src/lib/planStorage.js`, the single localStorage layer.
Three keys:

- `pacebuilder.plans` → `{ [id]: plan }` — each plan owns its `weeks` and `logs`.
- `pacebuilder.draft` → in-progress onboarding answers, before a plan exists.
- `pacebuilder.seeded` → one-time flag so demo plans (`SAMPLE_PLANS`) seed only once
  (deleting the samples won't re-add them on reload).

The onboarding flow is: **Onboarding wizard writes `draft`** (auto-saved on every
change) → **Review commits the draft into a new plan** via `savePlan` + `clearDraft`
→ navigate to `/plan/:planId`. Plans are addressed by id (slug + random suffix from
`createPlanId`) so titles can repeat.

Workout logs are keyed by **day id** (e.g. `"w1d1"` = week 1, day 1) inside
`plan.logs`; `effort` is a 1–5 rating. Day ids are generated in `generatePlan.js`.

## Plan generation

`src/lib/generatePlan.js` is the real generator. `generatePlan(inputs, { today })`
turns the onboarding answers into `{ weeks, warnings, generatedAt, startDate, raceDate }`
following standard training rules: ~9%/week volume growth capped by a per-distance
peak, a step-back (recovery) week every 4th week, Base→Build→Peak→Taper phases sized
as a share of the plan length, a long run capped at ~35% of weekly volume and a
per-distance ceiling, and paces derived from an inferred threshold pace. The final
week is a light taper with the race placed on its real weekday.

- **`Review.jsx`** calls `generatePlan(draft)` and renders `warnings` (tight timeline,
  aggressive goal) in an Alert before the user confirms, so answers can be edited.
- **`samplePlan.js`** builds the demo plans by calling `generatePlan` with synthetic
  answers and a fixed `today` (`SEED_TODAY`) so the samples are deterministic and
  exercise the same code path.

The generated plan shape must stay compatible with PlanView / WeekDetail / PlanCharts:
`weeks[]` of `{ number, phase, mileage, days[] }`, each day `{ id, label, dateLabel,
type, distance, pace, note, structure[], tips[] }`. `distance` is a string like
`"6 mi"` (consumers `parseFloat` it).

Tuning tables (per-distance week windows, peak mileage by fitness, long-run ceilings,
pace offsets) live at the top of `generatePlan.js`.

## UI conventions

- **react-bootstrap components are imported per-component** (`import Button from
  'react-bootstrap/Button'`) to keep the bundle small — follow this, don't barrel-import.
- **Bootstrap CSS is imported once** in `src/main.jsx` before `index.css`, which
  overrides Bootstrap's CSS variables (`--bs-primary`, etc.) to apply the brand theme.
  Style tokens live in `src/index.css`; custom classes like `.info-card`, `.choice-box`,
  `.wizard-dot` are defined there.
- **router + bootstrap integration** uses the `as` prop (`<Navbar.Brand as={NavLink}>`);
  programmatic navigation uses `useNavigate()`; cross-step editing passes
  `navigate('/onboarding', { state: { step } })`.
- **Charts are hand-rolled inline SVG** in `src/components/PlanCharts.jsx` — there is no
  charting library. Planned mileage = neutral gray, actual = brand blue (colorblind-safe
  two-series palette). The Plan overview and Week detail share one aligned grid so the
  "Full Program" and "Weekly Mileage" columns line up row-for-row.
- The **"My Plans" list is a modal, not a route** — opened from anywhere via
  `PlansModalContext`. `/plans` and `/plan` redirect home.
