# PaceBuilder

A client-only React single-page app scaffolded with **Vite**, styled with
**Bootstrap** via **react-bootstrap**, and routed with **react-router** in its
declarative mode. It is designed to be hosted as a **static site on GitHub
Pages** — there is **no server-side rendering** and **no Next.js**; it is pure
React + JavaScript.

This repo currently contains a small dummy app (Home + About pages, a shared
navbar) that exercises all three libraries so the wiring is verifiably working.

---

## Tech stack

| Library             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `react` / `react-dom` | UI library (function components + hooks)                 |
| `vite`              | Dev server & bundler — produces a static client-only SPA   |
| `bootstrap`         | CSS framework / theme (v5)                                 |
| `react-bootstrap`   | Bootstrap components exposed as React components            |
| `react-router-dom`  | Client-side routing, used in declarative mode              |

No TypeScript — the project is plain `.jsx` / JavaScript.

---

## How it was created

```bash
# 1. Scaffold a JavaScript (not TS) React app with Vite
npm create vite@latest PaceBuilder -- --template react

cd PaceBuilder

# 2. Install base dependencies
npm install

# 3. Add the UI + routing libraries
npm install bootstrap react-bootstrap react-router-dom
```

---

## Running & building

```bash
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
look like `.../PaceBuilder/#/about`. GitHub Pages is a dumb static file host: it
can't rewrite `/about` back to `index.html`, so with a normal `BrowserRouter` a
page refresh or deep link would 404. `HashRouter` keeps the route in the URL
fragment (`#/...`), which the browser never sends to the server — so refreshes
and deep links always work with zero server config. It's still fully
declarative.

### Deploy steps

```bash
npm run build                 # generates ./docs
git add docs
git commit -m "Build site"
git push
```

Then, once (first time only), in the GitHub repo:
**Settings → Pages → Build and deployment → Source: "Deploy from a branch" →
Branch: your default branch, folder: `/docs`.**

---

## Project structure

```
PaceBuilder/
├── index.html                # app shell; <title> + #root mount point
├── vite.config.js            # base path + build.outDir: 'docs'
├── package.json
├── docs/                      # build output (created by `npm run build`)
└── src/
    ├── main.jsx               # entry: Bootstrap CSS import + <HashRouter>
    ├── App.jsx                # declarative <Routes>/<Route> definitions
    ├── index.css              # minimal app CSS (Bootstrap does the heavy lifting)
    ├── components/
    │   └── NavBar.jsx         # react-bootstrap Navbar + react-router NavLinks
    └── pages/
        ├── Home.jsx           # demo: Card, Button, Alert, Row/Col, useNavigate
        └── About.jsx          # demo: Card, ListGroup, Badge, <Link>
```

### How the libraries connect

- **Bootstrap CSS** is imported once in `src/main.jsx`
  (`import 'bootstrap/dist/css/bootstrap.min.css'`) before the app's own styles.
- **react-bootstrap** components are imported per-component
  (e.g. `import Button from 'react-bootstrap/Button'`) so only what's used ships.
- **react-router** integrates with react-bootstrap through the `as` prop —
  e.g. `<Nav.Link as={NavLink} to="/about">` renders a Bootstrap-styled link
  that drives client-side navigation. Programmatic navigation uses the
  `useNavigate()` hook (see `Home.jsx`).
