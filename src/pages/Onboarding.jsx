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
    key: 'weeklyMileage',
    type: 'number',
    label: 'About how many miles a week do you run right now?',
    suffix: 'mi / week',
    placeholder: '20',
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

// Live per-field validation. Returns an error string, or null when valid.
// Empty values return null — an unanswered step just hides "Next" (see below),
// it isn't an error to nag about before the user has typed anything.
function validateStep(step, value) {
  const v = String(value ?? '').trim()
  if (!v) return null

  switch (step.type) {
    case 'pace': {
      const m = v.match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return 'Use mm:ss format, e.g. 8:30'
      if (Number(m[2]) > 59) return 'Seconds must be between 00 and 59'
      const sec = Number(m[1]) * 60 + Number(m[2])
      if (sec < 180 || sec > 1200) return 'Enter a pace between 3:00 and 20:00 / mi'
      return null
    }
    case 'number': {
      const n = Number(v)
      if (!Number.isFinite(n)) return 'Enter a number'
      if (n < 0) return "Mileage can't be negative"
      if (n > 200) return 'That looks too high — enter your weekly miles'
      return null
    }
    case 'date': {
      const d = new Date(`${v}T00:00:00`)
      if (Number.isNaN(d.getTime())) return 'Pick a valid date'
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (d < today) return 'Race day is in the past — pick a future date'
      return null
    }
    case 'text':
      if (v.length > 60) return 'Keep the title under 60 characters'
      return null
    default:
      return null
  }
}

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
  const error = validateStep(step, rawValue)
  const canProceed = hasValue && !error

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

          <StepInput step={step} value={rawValue || ''} onChange={updateAnswer} invalid={Boolean(error)} />

          {/* Inline validation feedback for the current answer. */}
          <div className="text-danger small mt-2" style={{ minHeight: 20 }}>
            {error || ''}
          </div>

          {/* Next only appears once the step has a valid value. */}
          <div style={{ minHeight: 60 }} className="mt-3">
            {canProceed && (
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

// Renders the right control for a step's `type`. `invalid` toggles the
// red is-invalid state on free-text controls.
function StepInput({ step, value, onChange, invalid }) {
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
          isInvalid={invalid}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )

    case 'pace':
      return (
        <InputGroup className="mx-auto" style={{ maxWidth: 200 }} hasValidation>
          <Form.Control
            type="text"
            inputMode="numeric"
            placeholder="8:00"
            className="text-center"
            value={value}
            isInvalid={invalid}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          <InputGroup.Text>/mi</InputGroup.Text>
        </InputGroup>
      )

    case 'number':
      return (
        <InputGroup className="mx-auto" style={{ maxWidth: 220 }} hasValidation>
          <Form.Control
            type="number"
            inputMode="numeric"
            min="0"
            placeholder={step.placeholder || ''}
            className="text-center"
            value={value}
            isInvalid={invalid}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
          {step.suffix && <InputGroup.Text>{step.suffix}</InputGroup.Text>}
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
          isInvalid={invalid}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      )
  }
}

export default Onboarding
