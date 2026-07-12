import { useRef, useState } from 'react'

// Charts for the plan overview screens. Two series only:
//   Planned = recessive neutral gray track (the prescription / reference)
//   Actual  = accent blue (logged mileage), series-1 from the dataviz palette
//
// Left ("Full Program") and right ("Weekly Mileage") are rendered as a SINGLE
// two-column grid — one grid row per week/day — so the two halves always align
// exactly. Colors/ink/surfaces come from the dataviz reference palette via CSS
// custom properties so light/dark swap in one place.

const VIZ_STYLE = `
.plan-viz {
  /* The app is a single light theme, so the charts stay on light tokens too
     (keeps bars/ink consistent with the white cards regardless of OS theme). */
  --surface-1: #ffffff;
  --text-secondary: #667085;
  --text-muted: #98a2b3;
  --divider: #e7eaf0;
  --planned: #dfe3ea;   /* neutral reference track */
  --actual: #2a78d6;    /* brand blue, matches Bootstrap primary */
}
.plan-viz .viz-label {
  font-size: 0.8rem; color: var(--text-secondary);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.plan-viz .viz-value {
  font-size: 0.75rem; color: var(--text-muted);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.plan-viz .viz-daybar {
  background: var(--planned); border-radius: 6px;
  padding: 8px 12px; font-size: 0.85rem; min-height: 38px;
}

/* Aligned two-column layout — headers + one row per item. */
.plan-viz .pvs-headers,
.plan-viz .pvs-row {
  display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px;
}
.plan-viz .pvs-head { font-weight: 600; font-size: 0.95rem; padding-bottom: 6px; }
.plan-viz .pvs-right, .plan-viz .pvs-head-right {
  border-left: 1px solid var(--divider); padding-left: 20px;
}
.plan-viz .pvs-row { cursor: pointer; }
.plan-viz .pvs-row:hover { background: rgba(42, 120, 214, 0.06); }
/* Cells stretch to the row height so the divider is one continuous line;
   content is vertically centered inside each cell. */
.plan-viz .pvs-left, .plan-viz .pvs-right {
  display: flex; align-items: center; gap: 8px; padding-top: 4px; padding-bottom: 4px;
}

.plan-viz .viz-tip {
  position: absolute; pointer-events: none; z-index: 20;
  background: var(--surface-1); color: var(--text-secondary);
  border: 1px solid rgba(11,11,11,0.12); border-radius: 6px;
  padding: 4px 8px; font-size: 0.75rem; white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12); transform: translate(-50%, -115%);
}
`

const num = (v) => parseFloat(v) || 0

// Path for a bar/column with its DATA END rounded and its baseline end square.
function columnPath(cx, w, topY, baseY, r) {
  const x = cx - w / 2
  const x2 = cx + w / 2
  const rr = Math.min(r, w / 2, baseY - topY)
  return `M${x},${baseY} L${x},${topY + rr} Q${x},${topY} ${x + rr},${topY} L${x2 - rr},${topY} Q${x2},${topY} ${x2},${topY + rr} L${x2},${baseY} Z`
}

function hbarPath(x0, y, w, h, r) {
  const rr = Math.min(r, w, h / 2)
  const x2 = x0 + w
  return `M${x0},${y} L${x2 - rr},${y} Q${x2},${y} ${x2},${y + rr} L${x2},${y + h - rr} Q${x2},${y + h} ${x2 - rr},${y + h} L${x0},${y + h} Z`
}

// Shared hover tooltip: rows call show(content) / hide(); the container tracks
// the pointer so the floating box follows the cursor.
function useTooltip() {
  const ref = useRef(null)
  const [tip, setTip] = useState(null) // { x, y, content } | null

  function move(e) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setTip((t) => (t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : t))
  }
  const show = (content) => setTip((t) => ({ x: t?.x ?? 0, y: t?.y ?? 0, content }))
  const hide = () => setTip(null)

  const Tooltip = tip ? (
    <div className="viz-tip" style={{ left: tip.x, top: tip.y }}>{tip.content}</div>
  ) : null

  return { ref, move, show, hide, Tooltip }
}

// Aligned two-column list. Each `row` (needs `key` and optional `tip`) becomes
// one grid row; renderLeft/renderRight draw the two halves so they line up.
export function SplitRows({ leftHeader, rightHeader, rows, renderLeft, renderRight, onSelect }) {
  const { ref, move, show, hide, Tooltip } = useTooltip()
  return (
    <div className="position-relative" ref={ref} onMouseMove={move}>
      <div className="pvs-headers">
        <div className="pvs-head">{leftHeader}</div>
        <div className="pvs-head pvs-head-right">{rightHeader}</div>
      </div>
      {rows.map((r) => (
        <div
          key={r.key}
          className="pvs-row"
          onClick={() => onSelect?.(r)}
          onMouseEnter={() => r.tip && show(r.tip)}
          onMouseLeave={hide}
        >
          <div className="pvs-left">{renderLeft(r)}</div>
          <div className="pvs-right">{renderRight(r)}</div>
        </div>
      ))}
      {Tooltip}
    </div>
  )
}

// Left half: a week's daily columns (planned gray, actual blue in front).
export function WeekColumns({ week, maxDay }) {
  const W = 210
  const H = 60
  const base = H - 4
  const top = 6
  const slot = W / 7
  const scale = (mi) => (maxDay ? (mi / maxDay) * (base - top) : 0)
  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      {week.days.map((d, i) => {
        const cx = i * slot + slot / 2
        return (
          <g key={d.id}>
            {d.planned > 0 && (
              <path d={columnPath(cx, 16, base - scale(d.planned), base, 3)} fill="var(--planned)" />
            )}
            {d.actual != null && d.actual > 0 && (
              <path d={columnPath(cx, 9, base - scale(d.actual), base, 3)} fill="var(--actual)" />
            )}
            <title>
              {d.label}: planned {d.planned || 0} mi
              {d.actual != null ? ` · actual ${d.actual} mi` : ''}
            </title>
          </g>
        )
      })}
    </svg>
  )
}

// Right half: a single horizontal bar (planned track + actual fill).
export function MileageBar({ planned, actual, max }) {
  const W = 200
  const H = 18
  const barH = 14
  const y = (H - barH) / 2
  const scale = (mi) => (max ? (mi / max) * W : 0)
  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      {planned > 0 && <path d={hbarPath(0, y, scale(planned), barH, 4)} fill="var(--planned)" />}
      {actual > 0 && <path d={hbarPath(0, y, scale(actual), barH, 4)} fill="var(--actual)" />}
    </svg>
  )
}

// Value label shown at the end of a mileage bar ("19.3/19 mi" or "—" for rest).
export function mileageValueText(planned, actual) {
  if (!(planned > 0)) return '—'
  return `${actual > 0 ? `${actual}/` : ''}${planned} mi`
}

// Short day-of-week label for row gutters (Monday → "M", Thursday → "Th").
export function dayAbbrev(name) {
  const map = { Monday: 'M', Tuesday: 'Tu', Wednesday: 'W', Thursday: 'Th', Friday: 'F', Saturday: 'Sa', Sunday: 'Su' }
  return map[name] || name.slice(0, 2)
}

// Shared legend — identity never relies on color alone.
export function ChartLegend() {
  return (
    <div className="d-flex justify-content-center gap-4 mt-3">
      <span className="d-inline-flex align-items-center gap-2 viz-label">
        <span style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--planned)' }} />
        Planned
      </span>
      <span className="d-inline-flex align-items-center gap-2 viz-label">
        <span style={{ width: 14, height: 14, borderRadius: 3, background: 'var(--actual)' }} />
        Actual
      </span>
    </div>
  )
}

// Enrich raw plan weeks + logs into the per-day / per-week numbers the charts need.
export function buildChartData(weeks, logs) {
  return weeks.map((week) => {
    const days = week.days.map((d) => {
      const log = logs[d.id]
      return {
        id: d.id,
        label: d.label,
        type: d.type,
        planned: num(d.distance),
        actual: log ? num(log.distance) : null,
      }
    })
    return {
      number: week.number,
      phase: week.phase,
      days,
      plannedTotal: Math.round(days.reduce((s, d) => s + d.planned, 0) * 10) / 10,
      actualTotal: Math.round(days.reduce((s, d) => s + (d.actual || 0), 0) * 10) / 10,
    }
  })
}

// Style tag consumers mount once inside a `.plan-viz` root.
export function PlanVizStyle() {
  return <style>{VIZ_STYLE}</style>
}
