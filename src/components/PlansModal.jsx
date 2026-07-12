import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from 'react-bootstrap/Modal'
import ListGroup from 'react-bootstrap/ListGroup'
import Button from 'react-bootstrap/Button'
import Badge from 'react-bootstrap/Badge'
import Alert from 'react-bootstrap/Alert'

import { getPlans, deletePlan, clearDraft } from '../lib/planStorage.js'
import { usePlansModal } from './PlansModalContext.jsx'

// "My Plans" modal: every saved plan by title, with open + delete. Deletion is
// confirmed inline (an alert at the top) to avoid stacking modals.
function PlansModal() {
  const { show, close } = usePlansModal()
  const navigate = useNavigate()
  const [pendingDelete, setPendingDelete] = useState(null) // plan | null

  // Read fresh each render so opening the modal always reflects storage.
  const plans = getPlans()

  function openPlan(id) {
    close()
    setPendingDelete(null)
    navigate(`/plan/${id}`)
  }

  function createNew() {
    clearDraft()
    close()
    setPendingDelete(null)
    navigate('/onboarding')
  }

  function confirmDelete() {
    deletePlan(pendingDelete.id)
    setPendingDelete(null)
  }

  // Progress = logged workouts / prescribed running days across the plan.
  function progress(plan) {
    const logged = Object.keys(plan.logs || {}).length
    const runDays = plan.weeks.reduce(
      (n, w) => n + w.days.filter((d) => d.type !== 'Rest').length,
      0,
    )
    return { logged, runDays }
  }

  return (
    <Modal show={show} onHide={close} centered>
      <Modal.Header closeButton>
        <Modal.Title>My Plans</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {pendingDelete && (
          <Alert variant="danger" className="d-flex align-items-center justify-content-between">
            <span>
              Delete <strong>{pendingDelete.title}</strong> and all its logs?
            </span>
            <span className="d-flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={confirmDelete}>
                Delete
              </Button>
            </span>
          </Alert>
        )}

        {plans.length === 0 ? (
          <p className="text-center text-muted py-4 mb-0">
            No plans yet. Create your first one to get started.
          </p>
        ) : (
          <ListGroup>
            {plans.map((plan) => {
              const { logged, runDays } = progress(plan)
              return (
                <ListGroup.Item
                  key={plan.id}
                  className="d-flex justify-content-between align-items-center py-3"
                >
                  <div role="button" className="flex-grow-1" onClick={() => openPlan(plan.id)}>
                    <div className="fw-semibold">{plan.title}</div>
                    <div className="small text-muted">
                      {plan.createdFrom?.raceDistance} · race {plan.raceDate} ·{' '}
                      {plan.weeks.length} weeks
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <Badge bg={logged > 0 ? 'success' : 'secondary'}>
                      {logged}/{runDays} logged
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => setPendingDelete(plan)}
                    >
                      Delete
                    </Button>
                  </div>
                </ListGroup.Item>
              )
            })}
          </ListGroup>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" onClick={createNew}>
          + New Plan
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default PlansModal
