import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'

function App() {
  return (
    <>
      <NavBar />
      {/* Declarative routing: which component renders is decided by the URL. */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        {/* Catch-all falls back to Home so unknown hashes don't blank the page. */}
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}

export default App
