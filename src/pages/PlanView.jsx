import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Table from 'react-bootstrap/Table'

import WorkoutLogModal from '../components/WorkoutLogModal.jsx'
import { getPlan, saveLog } from '../lib/planStorage.js'
import {
  SplitRows,
  WeekColumns,
  MileageBar,
  mileageValueText,
  ChartLegend,
  buildChartData,
  PlanVizStyle,
} from '../components/PlanCharts.jsx'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TYPE_SHORT = {
  'Easy Run': 'Easy',
  'Tempo Run': 'Tempo',
  'Long Run': 'Long',
  Intervals: 'Intervals',
}
const shortType = (day) => (/race day/i.test(day.note) ? 'Race' : TYPE_SHORT[day.type] || day.type)
const shortPace = (pace) => (pace && pace !== '—' ? pace.replace(' / mi', '') : '')
const num = (v) => parseFloat(v) || 0

// Screen 5: Main Plan View for one plan.
// Two ways to see the same plan, switched by a toggle:
//   • Chart — the aligned "Full Program" columns + "Weekly Mileage" bars.
//   • Table — a week-by-week grid of planned vs. actual; click a day to log it.
function PlanView() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const [view, setView] = useState('chart') // 'chart' | 'table'
  const [activeDay, setActiveDay] = useState(null)
  // Bumped after a save so the view re-reads logs from storage.
  const [version, setVersion] = useState(0)

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

  function handleSave(log) {
    saveLog(planId, activeDay.id, log)
    setActiveDay(null)
    setVersion((v) => v + 1) // force re-read so the new log shows immediately
  }

  return (
    <Container fluid className="py-4 plan-viz" key={version}>
      <PlanVizStyle />

      <Button variant="link" className="px-0" onClick={() => navigate('/plans')}>
        ← My Plans
      </Button>

      {/* Header — title + view toggle */}
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h2 className="mb-1">{plan.title}</h2>
          <div className="text-muted">
            {plan.createdFrom?.raceDistance} · race {plan.raceDate}
          </div>
        </div>
        <ButtonGroup aria-label="Switch view">
          <Button
            variant={view === 'table' ? 'primary' : 'light'}
            onClick={() => setView('table')}
          >
            Table
          </Button>
          <Button
            variant={view === 'chart' ? 'primary' : 'light'}
            onClick={() => setView('chart')}
          >
            Chart
          </Button>
        </ButtonGroup>
      </div>

      {view === 'chart' ? (
        <ChartView plan={plan} logs={logs} planId={planId} navigate={navigate} />
      ) : (
        <TableView plan={plan} logs={logs} onSelectDay={setActiveDay} />
      )}

      <ChartLegend />

      {/* Day log modal (table view): click a day to open, prefilled from any log. */}
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

// Graphical view — the original aligned two-column grid. A week row opens its
// Week Detail page.
function ChartView({ plan, logs, planId, navigate }) {
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
  )
}

// Tabular view — a day per column, weeks as rows, planned + actual per cell.
// Clicking any day opens the log modal for it.
function TableView({ plan, logs, onSelectDay }) {
  return (
    <Card>
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table className="plan-table plan-table--interactive mb-0 align-middle" size="sm">
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
              {plan.weeks.map((w) => {
                const plannedTotal = Math.round(w.days.reduce((s, d) => s + num(d.distance), 0) * 10) / 10
                const actualTotal =
                  Math.round(
                    w.days.reduce((s, d) => s + (logs[d.id] ? num(logs[d.id].distance) : 0), 0) * 10,
                  ) / 10
                return (
                  <tr key={w.number}>
                    <td className="fw-semibold">{w.number}</td>
                    <td>
                      <span className="pt-phase">{w.phase}</span>
                    </td>
                    {w.days.map((day) => (
                      <DayCell key={day.id} day={day} log={logs[day.id]} onClick={() => onSelectDay(day)} />
                    ))}
                    <td className="text-end pt-total">
                      <div className="fw-semibold">{plannedTotal} mi</div>
                      {actualTotal > 0 && <div className="pt-actual">{actualTotal} mi</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  )
}

// One day cell: planned prescription, plus the logged actual (blue) if present.
function DayCell({ day, log, onClick }) {
  return (
    <td className="pt-cell" role="button" onClick={onClick} title="Click to log / edit">
      {day.type === 'Rest' ? (
        <span className="text-muted">—</span>
      ) : (
        <>
          <div className="pt-type">{shortType(day)}</div>
          <div className="pt-dist">{day.distance}</div>
          <div className="pt-pace">{shortPace(day.pace)}</div>
          {log && (
            <div className="pt-actual">
              ✓ {num(log.distance)} mi{log.pace ? ` · ${log.pace.replace('/mi', '')}` : ''}
            </div>
          )}
        </>
      )}
    </td>
  )
}

export default PlanView
