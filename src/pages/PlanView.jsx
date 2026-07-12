import { useParams, useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'

import { getPlan } from '../lib/planStorage.js'
import {
  SplitRows,
  WeekColumns,
  MileageBar,
  mileageValueText,
  ChartLegend,
  buildChartData,
  PlanVizStyle,
} from '../components/PlanCharts.jsx'

// Screen 5: Main Plan View for one plan.
// A single aligned two-column grid: left "Full Program" (per-day columns),
// right "Weekly Mileage" (horizontal bars). Each week is one row spanning both
// halves, so the two sides line up exactly. Clicking a row opens Week Detail.
function PlanView() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const plan = getPlan(planId)

  if (!plan) {
    return (
      <Container className="py-5">
        <p>Plan not found.</p>
        <Button variant="link" className="px-0" onClick={() => navigate('/plans')}>
          ← Back to My Plans
        </Button>
      </Container>
    )
  }

  const logs = plan.logs || {}
  const weeks = buildChartData(plan.weeks, logs)
  // Shared scales so bars/columns are comparable across weeks.
  const maxDay = Math.max(
    ...weeks.flatMap((w) => w.days.map((d) => Math.max(d.planned, d.actual || 0))),
    1,
  )
  const maxWeek = Math.max(...weeks.map((w) => Math.max(w.plannedTotal, w.actualTotal)), 1)

  const rows = weeks.map((w) => ({
    ...w,
    key: w.number,
    tip: (
      <>
        Week {w.number} · {w.phase}
        <br />
        planned {w.plannedTotal} mi · actual {w.actualTotal} mi
      </>
    ),
  }))

  return (
    <Container fluid className="py-4 plan-viz">
      <PlanVizStyle />

      <Button variant="link" className="px-0" onClick={() => navigate('/plans')}>
        ← My Plans
      </Button>
      <h2 className="mb-1">{plan.title}</h2>
      <div className="text-muted mb-3">
        {plan.createdFrom?.raceDistance} · race {plan.raceDate}
      </div>

      <Card>
        <Card.Body>
          <SplitRows
            leftHeader="Full Program"
            rightHeader="Weekly Mileage"
            rows={rows}
            onSelect={(r) => navigate(`/plan/${planId}/week/${r.number}`)}
            renderLeft={(w) => (
              <>
                <span className="viz-label" style={{ width: 34 }}>Wk {w.number}</span>
                <div className="flex-grow-1">
                  <WeekColumns week={w} maxDay={maxDay} />
                </div>
              </>
            )}
            renderRight={(w) => (
              <>
                <div className="flex-grow-1">
                  <MileageBar planned={w.plannedTotal} actual={w.actualTotal} max={maxWeek} />
                </div>
                <span className="viz-value" style={{ width: 74, textAlign: 'right' }}>
                  {mileageValueText(w.plannedTotal, w.actualTotal)}
                </span>
              </>
            )}
          />
        </Card.Body>
      </Card>

      <ChartLegend />
    </Container>
  )
}

export default PlanView
