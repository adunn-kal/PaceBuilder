import { useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'

import { getDraft, savePlan, clearDraft, createPlanId } from '../lib/planStorage.js'
import { buildSampleWeeks } from '../lib/samplePlan.js'

// Grid fields (after the full-width title). `step` is the wizard step index so
// clicking a card jumps back to edit that specific answer.
const FIELDS = [
  { key: 'currentPace', label: 'Current easy pace', step: 5 },
  { key: 'goalPace', label: 'Goal Pace', step: 6 },
  { key: 'fitnessLevel', label: 'Current Fitness', step: 3 },
  { key: 'daysPerWeek', label: 'Days per week', step: 4 },
  { key: 'raceDate', label: 'Race Date', step: 2, format: formatDate },
  { key: 'raceDistance', label: 'Distance', step: 1 },
]

// ISO date (2026-10-10) → M/D/YY (10/10/26).
function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${Number(m)}/${Number(d)}/${y.slice(2)}`
}

// Screen 4: Confirmation / Review.
// Answers shown as cards; click any card to jump back and edit that step.
// "Confirm" commits and writes a new plan.
function Review() {
  const navigate = useNavigate()
  const draft = getDraft()

  const edit = (step) => navigate('/onboarding', { state: { step } })

  function generatePlan() {
    const id = createPlanId(draft.title)
    // Shell placeholder: real plan generation (progressive mileage, phases,
    // pace targets, recovery weeks) plugs in here. For now we build a stand-in
    // week structure so the new plan is populated.
    const plan = {
      id,
      title: draft.title || 'Untitled Plan',
      createdFrom: draft,
      generatedAt: '2026-07-12',
      raceDate: draft.raceDate,
      weeks: buildSampleWeeks(),
      logs: {},
    }
    savePlan(plan)
    clearDraft()
    navigate(`/plan/${id}`)
  }

  return (
    <Container className="py-5">
      <h1 className="text-center mb-5">Confirm Plan</h1>

      <Row className="justify-content-center">
        <Col lg={9}>
          {/* Plan title — full width */}
          <InfoCard
            label="Plan Title"
            value={draft.title}
            onClick={() => edit(0)}
            className="mb-4"
          />

          {/* Remaining answers — responsive grid of cards */}
          <Row className="g-3">
            {FIELDS.map((f) => (
              <Col md={4} key={f.key}>
                <InfoCard
                  label={f.label}
                  value={f.format ? f.format(draft[f.key]) : draft[f.key]}
                  onClick={() => edit(f.step)}
                />
              </Col>
            ))}
          </Row>

          {/* Commit */}
          <Row className="justify-content-center mt-5">
            <Col md={7} className="d-grid">
              <Button size="lg" variant="primary" className="fw-bold py-3" onClick={generatePlan}>
                Confirm
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  )
}

// A card: label over the value. Clickable to edit the underlying step.
function InfoCard({ label, value, onClick, className = '' }) {
  return (
    <div role="button" onClick={onClick} className={`info-card text-center h-100 ${className}`}>
      <div className="info-label">{label}</div>
      <div className="info-value">{value || <span className="text-muted">Not set</span>}</div>
    </div>
  )
}

export default Review
