import { useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'

import { clearDraft } from '../lib/planStorage.js'
import { usePlansModal } from '../components/PlansModalContext.jsx'

// Entry screen: title + two actions — create a new plan, or view saved plans.
function Landing() {
  const navigate = useNavigate()
  const plansModal = usePlansModal()

  function createNew() {
    clearDraft() // start the wizard fresh
    navigate('/onboarding')
  }

  return (
    <Container className="py-5 text-center">
      <div className="py-5">
        <span className="pb-hero-badge">🏃 Personalized run training</span>
        <h1 className="pb-hero-title">Welcome to PaceBuilder</h1>
        <p className="pb-hero-sub">
          Build a smart, week-by-week running plan tailored to your race, your
          timeline, and your current fitness — then track every workout as you go.
        </p>

        <div className="d-flex justify-content-center gap-3 flex-wrap">
          <Button size="lg" variant="primary" onClick={createNew}>
            Create a new plan
          </Button>
          <Button size="lg" variant="outline-secondary" onClick={plansModal.open}>
            View my plans
          </Button>
        </div>
      </div>
    </Container>
  )
}

export default Landing
