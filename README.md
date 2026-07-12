# PaceBuilder

A client-only React single-page app that generates **personalized, week-by-week
running training plans**. Scaffolded with **Vite**, built on **Bootstrap** via
**react-bootstrap**, and routed with **react-router** in its declarative mode.
It is designed to be hosted as a **static site on GitHub Pages** — there is **no
server-side rendering** and **no Next.js**; it is pure React + JavaScript, and
all data lives in the browser's `localStorage`.

Users create one or more named plans (e.g. *"2026 Madison Marathon"*), each built
from their race, timeline, and current fitness. Every plan is displayed as an
interactive week-by-week schedule with planned-vs-actual mileage charts, and each
day's workout can be logged (actual distance, pace, effort, notes).

---

## Features

- **Multiple plans**, stored locally and referenced by title. Create, open, and
  delete plans from a "My Plans" modal.
- **Onboarding wizard** — one question per screen with a progress indicator and
  typed inputs (selector boxes, date picker, pace fields). Plan title is the
  first question. A **Next** button appears once a step has a value, and the
  progress dots let you jump back to edit any earlier step.
- **Confirm / Review** screen summarizing every answer as cards; click any card
  to jump back and edit that step.
- **Plan overview** — an aligned two-column view: *Full Program* (per-day mileage
  columns per week) on the left and *Weekly Mileage* (planned-vs-actual bars) on
  the right, sharing one grid so rows line up exactly.
- **Week detail** — the same layout zoomed into a single week, one row per day.
- **Workout log** — a modal showing the prescribed workout plus editable actuals
  (distance, pace, a 1–5 effort rating, and notes).
- **Data visualizations** are hand-rolled inline SVG (planned = neutral gray,
  actual = brand blue), following a colorblind-safe two-series palette.
- A modern design system (Inter type, unified brand palette, soft elevation) is
  layered on top of Bootstrap.

Two demo plans are seeded on first load so the app is populated out of the box.

---

## Tech stack

| Library             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `react` / `react-dom` | UI library (function components + hooks)                 |
| `vite`              | Dev server & bundler — produces a static client-only SPA   |
| `bootstrap`         | CSS framework / theme (v5)                                 |
| `react-bootstrap`   | Bootstrap components exposed as React components            |
| `react-router-dom`  | Client-side routing, used in declarative mode              |

No TypeScript — the project is plain `.jsx` / JavaScript. There is no charting
dependency; the charts are custom SVG. Persistence is `localStorage` (no backend).

---

## Running & building

```bash
npm install       # install dependencies
npm run dev       # start the dev server (hot reload) at http://localhost:5173/PaceBuilder/
npm run build     # production build -> ./docs  (see GitHub Pages notes below)
npm run preview   # serve the production build locally to sanity-check it
npm run lint      # oxlint
```

---

## GitHub Pages setup

This project is configured so **you build locally and push the output**; there
is no CI/deploy automation.

Two settings in [`vite.config.js`](./vite.config.js) make this work:

1. **`base: '/PaceBuilder/'`** — GitHub project pages are served from
   `https://<user>.github.io/PaceBuilder/`, so every asset URL must be prefixed
   with the repo name. **If you rename the repo, update this value to match.**

2. **`build.outDir: 'docs'`** — `npm run build` writes the compiled site into
   `./docs` instead of the default `./dist`. GitHub Pages can serve directly
   from the `docs/` folder on your default branch, so no separate branch or
   build step is needed.

### Routing: why HashRouter

The app uses **`HashRouter`** (see [`src/main.jsx`](./src/main.jsx)), so routes
look like `.../PaceBuilder/#/plan/...`. GitHub Pages is a dumb static file host:
it can't rewrite `/plan/...` back to `index.html`, so with a normal
`BrowserRouter` a page refresh or deep link would 404. `HashRouter` keeps the
route in the URL fragment (`#/...`), which the browser never sends to the server
— so refreshes and deep links always work with zero server config. It's still
fully declarative.

### Deploy steps

```bash
npm run build                 # generates ./docs
git add -A
git commit -m "Build site"
git push
```

Then, once (first time only), in the GitHub repo:
**Settings → Pages → Build and deployment → Source: "Deploy from a branch" →
Branch: your default branch, folder: `/docs`.**

---

## Routes

| Path                              | Screen                                        |
| --------------------------------- | --------------------------------------------- |
| `/`                               | Landing (hero + Create / View my plans)       |
| `/onboarding`                     | Onboarding wizard                             |
| `/review`                         | Confirm / Review answers                      |
| `/plan/:planId`                   | Plan overview (Full Program + Weekly Mileage) |
| `/plan/:planId/week/:weekNumber`  | Week detail (per-day breakdown + log)         |

The plans list is a modal (openable from the navbar or landing page), not a route.

---

## Project structure

```
PaceBuilder/
├── index.html                # app shell; <title>, font links, #root mount point
├── vite.config.js            # base path + build.outDir: 'docs'
├── package.json
├── docs/                      # build output (created by `npm run build`)
└── src/
    ├── main.jsx               # entry: Bootstrap CSS import, <HashRouter>, demo seeding
    ├── App.jsx                # declarative <Routes> + shared PlansModal
    ├── index.css              # design system layered on Bootstrap (palette, type, elevation)
    ├── lib/
    │   ├── planStorage.js     # localStorage data layer (plans, draft, logs, seeding)
    │   └── samplePlan.js      # demo plans + week/day generation
    ├── components/
    │   ├── NavBar.jsx         # react-bootstrap Navbar + react-router NavLinks
    │   ├── PlansModal.jsx     # "My Plans" list modal (open / delete)
    │   ├── PlansModalContext.jsx  # context to open the modal from anywhere
    │   ├── PlanCharts.jsx     # SVG charts + aligned two-column layout
    │   └── WorkoutLogModal.jsx    # per-day prescribed view + editable log
    └── pages/
        ├── Landing.jsx        # entry screen
        ├── Onboarding.jsx     # multi-step wizard (typed inputs, progress dots)
        ├── Review.jsx         # confirm answers, generate plan
        ├── PlanView.jsx       # full plan overview
        └── WeekDetail.jsx     # single-week detail
```

### How the pieces connect

- **Bootstrap CSS** is imported once in `src/main.jsx`
  (`import 'bootstrap/dist/css/bootstrap.min.css'`) before the app's own styles,
  which override Bootstrap's CSS variables to apply the brand theme.
- **react-bootstrap** components are imported per-component
  (e.g. `import Button from 'react-bootstrap/Button'`) so only what's used ships.
- **react-router** integrates with react-bootstrap through the `as` prop —
  e.g. `<Navbar.Brand as={NavLink} to="/">` — and programmatic navigation uses
  the `useNavigate()` hook. Plans are addressed by id in the URL.
- **State/persistence** flows through `src/lib/planStorage.js`: the wizard writes
  a draft, Review commits it as a new plan, and the week view saves per-day logs —
  all in `localStorage`, so the app is fully client-side.
