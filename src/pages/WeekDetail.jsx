import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'

import WorkoutLogModal from '../components/WorkoutLogModal.jsx'
import {
  SplitRows,
  MileageBar,
  mileageValueText,
  ChartLegend,
  PlanVizStyle,
  dayAbbrev,
} from '../components/PlanCharts.jsx'
import { getPlan, saveLog } from '../lib/planStorage.js'

const num = (v) => parseFloat(v) || 0

// Screen 6: Week Detail view, zoomed into one week.
// Same aligned two-column grid as the plan view, scoped to this week's days:
// left "Full Program" (workout per day), right "Weekly Mileage" (planned vs
// actual per day). Clicking a row opens that day's log.
function WeekDetail() {
  const { planId, weekNumber } = useParams()
  const navigate = useNavigate()
  const [activeDay, setActiveDay] = useState(null)
  // Bumped after a save so the view re-reads logs from storage.
  const [version, setVersion] = useState(0)

  const plan = getPlan(planId)
  const week = plan?.weeks.find((w) => String(w.number) === weekNumber)

  if (!plan || !week) {
    return (
      <Container className="py-5">
        <p>Week not found.</p>
        <Button variant="link" className="px-0" onClick={() => navigate('/plans')}>
          ← Back to My Plans
        </Button>
      </Container>
    )
  }

  const logs = plan.logs || {}

  function handleSave(log) {
    saveLog(planId, activeDay.id, log)
    setActiveDay(null)
    setVersion((v) => v + 1) // force re-read so the new log shows immediately
  }

  // One row per day, carrying both the prescription and planned/actual numbers.
  const rows = week.days.map((d) => {
    const log = logs[d.id]
    const planned = num(d.distance)
    const actual = log ? num(log.distance) : 0
    return {
      key: d.id,
      day: d,
      abbrev: dayAbbrev(d.label),
      desc: d.type === 'Rest' ? 'Rest' : `${d.type} | ${d.distance} @ ${d.pace}`,
      logged: Boolean(log),
      planned,
      actual,
      tip: (
        <>
          {d.label} · {d.type}
          <br />
          planned {planned || 0} mi{log && ` · actual ${actual} mi`}
        </>
      ),
    }
  })
  const maxDay = Math.max(...rows.map((r) => Math.max(r.planned, r.actual)), 1)

  return (
    <Container fluid className="py-4 plan-viz" key={version}>
      <PlanVizStyle />

      {/* Header — back arrow + week title */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button
          variant="light"
          className="d-flex align-items-center px-2 py-1"
          onClick={() => navigate(`/plan/${planId}`)}
          aria-label="Back to full plan"
        >
          ←
        </Button>
        <h2 className="mb-0">Week {week.number}</h2>
        <Badge bg="secondary">{week.phase}</Badge>
        <span className="text-muted">{week.mileage} mi total</span>
      </div>

      <Card>
        <Card.Body>
          <SplitRows
            leftHeader="Full Program"
            rightHeader="Weekly Mileage"
            rows={rows}
            onSelect={(r) => setActiveDay(r.day)}
            renderLeft={(r) => (
              <>
                <span className="viz-label" style={{ width: 28 }}>{r.abbrev}</span>
                <div className="viz-daybar flex-grow-1 d-flex align-items-center justify-content-between">
                  <span className="fw-semibold">{r.desc}</span>
                  {r.logged && <span title="Logged">✅</span>}
                </div>
              </>
            )}
            renderRight={(r) => (
              <>
                <div className="flex-grow-1">
                  <MileageBar planned={r.planned} actual={r.actual} max={maxDay} />
                </div>
                <span className="viz-value" style={{ width: 66, textAlign: 'right' }}>
                  {mileageValueText(r.planned, r.actual)}
                </span>
              </>
            )}
          />
        </Card.Body>
      </Card>

      <ChartLegend />

      {/* Screen 7: log modal, opened by a day row. Prefilled from any log. */}
      <WorkoutLogModal
        key={activeDay?.id}
        show={activeDay !== null}
        onHide={() => setActiveDay(null)}
        day={activeDay}
        existingLog={activeDay ? logs[activeDay.id] : null}
        onSave={handleSave}
      />
    </Container>
  )
}

export default WeekDetail
