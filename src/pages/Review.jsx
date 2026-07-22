import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import Card from 'react-bootstrap/Card'
import Table from 'react-bootstrap/Table'

import { getDraft, savePlan, clearDraft, createPlanId } from '../lib/planStorage.js'
import { generatePlan } from '../lib/generatePlan.js'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Compact labels for the week-by-week table.
const TYPE_SHORT = {
  'Easy Run': 'Easy',
  'Tempo Run': 'Tempo',
  'Long Run': 'Long',
  Intervals: 'Intervals',
}
const shortType = (day) => (/race day/i.test(day.note) ? 'Race' : TYPE_SHORT[day.type] || day.type)
const shortPace = (pace) => (pace && pace !== '—' ? pace.replace(' / mi', '') : '')

// Grid fields (after the full-width title). `step` is the wizard step index so
// clicking a card jumps back to edit that specific answer. Indices match the
// STEPS order in Onboarding.jsx.
const FIELDS = [
  { key: 'currentPace', label: 'Current easy pace', step: 6 },
  { key: 'goalPace', label: 'Goal Pace', step: 7 },
  { key: 'fitnessLevel', label: 'Current Fitness', step: 3 },
  { key: 'weeklyMileage', label: 'Weekly mileage', step: 4, format: (v) => (v ? `${v} mi` : '') },
  { key: 'daysPerWeek', label: 'Days per week', step: 5 },
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

  // Generate up front so any timeline/pace warnings show before the user
  // commits, giving them a chance to jump back and edit an answer.
  const generated = useMemo(() => generatePlan(draft), [draft])

  function confirmPlan() {
    const id = createPlanId(draft.title)
    const plan = {
      id,
      title: draft.title || 'Untitled Plan',
      createdFrom: draft,
      generatedAt: generated.generatedAt,
      startDate: generated.startDate,
      raceDate: draft.raceDate,
      warnings: generated.warnings,
      weeks: generated.weeks,
      logs: {},
    }
    savePlan(plan)
    clearDraft()
    navigate(`/plan/${id}`)
  }

  return (
    <Container className="py-5">
      {/* Compact title header — click the plan name to rename it. */}
      <div className="text-center mb-5">
        <div className="review-eyebrow">Confirm your plan</div>
        <h1
          role="button"
          onClick={() => edit(0)}
          className="review-title mb-0 d-inline-block"
          title="Click to rename"
        >
          {draft.title || 'Untitled Plan'}
        </h1>
      </div>

      <Row className="justify-content-center">
        <Col lg={10}>
          {/* Heads-up about anything unusual (tight timeline, aggressive goal)
              so it can be fixed before committing. */}
          {generated.warnings.length > 0 && (
            <Alert variant="warning" className="mb-4">
              <Alert.Heading className="h6">Before you confirm</Alert.Heading>
              <ul className="mb-0 ps-3">
                {generated.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Answers — responsive grid of cards */}
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

          {/* Week-by-week preview of the generated plan. */}
          <h2 className="h5 mt-5 mb-3">
            Your {generated.weeks.length}-week plan
          </h2>
          <Card>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table className="plan-table mb-0 align-middle" size="sm">
                  <thead>
                    <tr>
                      <th>Wk</th>
                      <th>Phase</th>
                      {DOW.map((d) => (
                        <th key={d}>{d}</th>
                      ))}
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generated.weeks.map((w) => (
                      <tr key={w.number}>
                        <td className="fw-semibold">{w.number}</td>
                        <td>
                          <span className="pt-phase">{w.phase}</span>
                        </td>
                        {w.days.map((day) => (
                          <td key={day.id}>
                            {day.type === 'Rest' ? (
                              <span className="text-muted">—</span>
                            ) : (
                              <>
                                <div className="pt-type">{shortType(day)}</div>
                                <div className="pt-dist">{day.distance}</div>
                                <div className="pt-pace">{shortPace(day.pace)}</div>
                              </>
                            )}
                          </td>
                        ))}
                        <td className="text-end fw-semibold pt-total">{w.mileage} mi</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* Commit */}
          <Row className="justify-content-center mt-5">
            <Col md={7} className="d-grid">
              <Button size="lg" variant="primary" className="fw-bold py-3" onClick={confirmPlan}>
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
