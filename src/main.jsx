import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

// Bootstrap CSS must be imported once, before our own styles, so app styles win.
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'

import App from './App.jsx'
import { seedSampleData } from './lib/planStorage.js'

// Seed demo plans on first load so the app is populated out of the box.
seedSampleData()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* HashRouter keeps routing 100% client-side (URLs look like /#/about),
        which works on GitHub Pages with no server-side rewrite config. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
