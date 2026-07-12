import { useState } from 'react'
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'

import { PlanVizStyle } from './PlanCharts.jsx'

const EFFORT_LEVELS = [1, 2, 3, 4, 5]

// Screen 7: Workout Log / day detail.
// Header (day + date) → Planned summary bar → editable log: actual distance,
// actual pace, a 1–5 effort selector, notes. Cancel / Save in the footer.
// `onSave(log)` lets the parent decide where to persist (which plan).
function WorkoutLogModal({ show, onHide, day, existingLog, onSave }) {
  // Prefill from an existing log (sample data or a previous save). The parent
  // keys this modal by day id, so it remounts per day and re-runs this init.
  const [log, setLog] = useState(
    () => existingLog || { distance: '', pace: '', effort: '', notes: '' },
  )

  if (!day) return null

  function update(field, value) {
    setLog((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    onSave(log)
  }

  const planned =
    day.type === 'Rest' ? 'Rest' : `${day.type} | ${day.distance} @ ${day.pace}`

  return (
    <Modal show={show} onHide={onHide} centered contentClassName="plan-viz">
      <PlanVizStyle />

      {/* Header: day + date */}
      <Modal.Header closeButton>
        <Modal.Title className="h5 mb-0">
          {day.label}
          {day.dateLabel ? ` ${day.dateLabel}` : ''}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Planned — read-only prescription summary */}
        <div className="small text-muted mb-1">Planned</div>
        <div className="viz-daybar fw-bold mb-4" style={{ fontSize: '1.1rem' }}>
          {planned}
        </div>

        {/* Your Log — editable actuals */}
        <div className="small text-muted mb-2">Your Log</div>
        <Form>
          <Row className="g-3 mb-3">
            <Col xs={6}>
              <Form.Label>Actual Distance</Form.Label>
              <Form.Control
                value={log.distance}
                onChange={(e) => update('distance', e.target.value)}
                placeholder="miles"
              />
            </Col>
            <Col xs={6}>
              <Form.Label>Actual Pace</Form.Label>
              <Form.Control
                value={log.pace}
                onChange={(e) => update('pace', e.target.value)}
                placeholder="mm:ss/mi"
              />
            </Col>
          </Row>

          {/* Effort — 1–5 segmented selector */}
          <div className="d-flex align-items-center gap-2 mb-3">
            <Form.Label className="mb-0 me-2">Effort</Form.Label>
            {EFFORT_LEVELS.map((n) => (
              <Button
                key={n}
                variant={String(log.effort) === String(n) ? 'primary' : 'light'}
                onClick={() => update('effort', String(n))}
                style={{ width: 40 }}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Notes */}
          <Form.Label>Notes</Form.Label>
          <Form.Control
            value={log.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="How did it go?"
          />
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="light" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} style={{ minWidth: 96 }}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default WorkoutLogModal
