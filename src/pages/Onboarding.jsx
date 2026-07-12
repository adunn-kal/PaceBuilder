import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'

import { getDraft, saveDraft } from '../lib/planStorage.js'

// Screen 3: Onboarding wizard.
// One question per screen. Each step declares an input `type` so we can show the
// right control (choice boxes, date, pace, text) instead of a plain text field.
const STEPS = [
  {
    key: 'title',
    type: 'text',
    label: 'What do you want to call this plan?',
    placeholder: 'e.g. 2026 Madison Marathon',
  },
  {
    key: 'raceDistance',
    type: 'choice',
    label: "What's your target race distance?",
    options: [
      { value: '5K', label: '5k' },
      { value: '10K', label: '10k' },
      { value: 'Half Marathon', label: '13.1 miles' },
      { value: 'Marathon', label: '26.2 miles' },
    ],
  },
  { key: 'raceDate', type: 'date', label: 'When is race day?' },
  {
    key: 'fitnessLevel',
    type: 'choice',
    label: 'How would you describe your current fitness?',
    options: [
      { value: 'Beginner', label: 'Beginner' },
      { value: 'Intermediate', label: 'Intermediate' },
      { value: 'Advanced', label: 'Advanced' },
    ],
  },
  {
    key: 'daysPerWeek',
    type: 'choice',
    label: 'How many days per week can you train?',
    options: [
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' },
      { value: '6', label: '6' },
    ],
  },
  { key: 'currentPace', type: 'pace', label: 'What is your current easy pace?' },
  { key: 'goalPace', type: 'pace', label: 'What is your goal race pace?' },
]

function Onboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  // Arriving from a Review card jumps straight to that step to edit it.
  const initialStep = Math.min(Math.max(location.state?.step ?? 0, 0), STEPS.length - 1)
  const [stepIndex, setStepIndex] = useState(initialStep)
  const [answers, setAnswers] = useState(() => getDraft())

  // Persist the draft as it changes so nothing is lost when jumping around or
  // editing later from the Review screen.
  useEffect(() => {
    saveDraft(answers)
  }, [answers])

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1
  const rawValue = answers[step.key]
  const hasValue = rawValue != null && String(rawValue).trim() !== ''

  function updateAnswer(value) {
    setAnswers((prev) => ({ ...prev, [step.key]: value }))
  }

  function goNext() {
    if (isLast) {
      navigate('/review')
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={9} lg={7} className="text-center">
          {/* Progress dots — click a filled dot to jump back to that step. */}
          <div className="d-flex justify-content-center gap-2 mb-5">
            {STEPS.map((s, i) => {
              const reached = i <= stepIndex
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-label={`Go to step ${i + 1}`}
                  disabled={!reached}
                  onClick={() => reached && setStepIndex(i)}
                  className="wizard-dot border-0 p-0"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: reached ? 'var(--bs-primary)' : '#d7dce3',
                    cursor: reached ? 'pointer' : 'default',
                  }}
                />
              )
            })}
          </div>

          <h3 className="mb-4">{step.label}</h3>

          <StepInput step={step} value={rawValue || ''} onChange={updateAnswer} />

          {/* Next only appears once the step has a value. */}
          <div style={{ minHeight: 60 }} className="mt-4">
            {hasValue && (
              <Button size="lg" variant="primary" onClick={goNext}>
                {isLast ? 'Review Answers →' : 'Next →'}
              </Button>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  )
}

// Renders the right control for a step's `type`.
function StepInput({ step, value, onChange }) {
  switch (step.type) {
    case 'choice':
      return (
        <div className="d-flex justify-content-center gap-3 flex-wrap">
          {step.options.map((o) => (
            <Button
              key={o.value}
              variant={value === o.value ? 'primary' : 'light'}
              className="choice-box"
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </Button>
          ))}
        </div>
      )

    case 'date':
      return (
        <Form.Control
          type="date"
          className="mx-auto text-center"
          style={{ maxWidth: 220 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )

    case 'pace':
      return (
        <InputGroup className="mx-auto" style={{ maxWidth: 200 }}>
          <Form.Control
            type="text"
            inputMode="numeric"
            placeholder="8:00"
            className="text-center"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <InputGroup.Text>/mi</InputGroup.Text>
        </InputGroup>
      )

    default: // text
      return (
        <Form.Control
          type="text"
          className="mx-auto text-center"
          style={{ maxWidth: 360 }}
          placeholder={step.placeholder || ''}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )
  }
}

export default Onboarding
