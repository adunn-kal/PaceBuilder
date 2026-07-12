import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import PlansModal from './components/PlansModal.jsx'
import { PlansModalProvider } from './components/PlansModalContext.jsx'
import Landing from './pages/Landing.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Review from './pages/Review.jsx'
import PlanView from './pages/PlanView.jsx'
import WeekDetail from './pages/WeekDetail.jsx'

function App() {
  return (
    // Provider makes the "My Plans" modal openable from anywhere (navbar, landing).
    <PlansModalProvider>
      <NavBar />
      {/* Declarative routing mirrors the screen inventory:
          Landing → Onboarding wizard → Review → per-plan Plan view → Week detail.
          Plans are addressed by id, so the app can hold many at once; the plan
          list is a modal rather than a route. */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/review" element={<Review />} />
        <Route path="/plan/:planId" element={<PlanView />} />
        <Route path="/plan/:planId/week/:weekNumber" element={<WeekDetail />} />
        {/* The old list routes are now the modal — send them home. */}
        <Route path="/plans" element={<Navigate to="/" replace />} />
        <Route path="/plan" element={<Navigate to="/" replace />} />
        {/* Catch-all falls back to Landing so unknown hashes don't blank the page. */}
        <Route path="*" element={<Landing />} />
      </Routes>

      {/* Single modal instance for the whole app. */}
      <PlansModal />
    </PlansModalProvider>
  )
}

export default App
