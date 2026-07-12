// A fully populated fake plan so the UI can be seen with realistic data before
// the real generator exists. An 8-week half-marathon build, 4 running days a
// week, with the first ~3.5 weeks already logged.

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Week 1 Monday. Each day's calendar date is derived from this so the day
// detail header can show "Monday 7/13". The real generator will derive this
// from the user's start date instead.
const PLAN_START = new Date(2026, 6, 13) // July 13, 2026 (month is 0-indexed)

function dayDateLabel(weekNumber, dayIndex) {
  const d = new Date(PLAN_START)
  d.setDate(d.getDate() + (weekNumber - 1) * 7 + dayIndex)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// Prescribed pace targets by workout type (min/mi).
const PACE = {
  'Easy Run': '9:30 / mi',
  'Tempo Run': '8:00 / mi',
  'Long Run': '9:45 / mi',
  Intervals: '7:15 / mi',
  Rest: '—',
}

// Coaching note + structured breakdown templates per workout type.
function buildDay(weekNumber, dayIndex, type, distance) {
  const id = `w${weekNumber}d${dayIndex + 1}`
  const base = {
    id,
    label: DAY_NAMES[dayIndex],
    dateLabel: dayDateLabel(weekNumber, dayIndex),
    type,
    distance: type === 'Rest' ? '—' : `${distance} mi`,
    pace: PACE[type],
    note: '',
    structure: [],
    tips: [],
  }

  switch (type) {
    case 'Easy Run':
      return {
        ...base,
        note: 'Conversational effort — you should be able to talk in full sentences.',
        structure: [
          { label: 'Warmup', detail: '5 min brisk walk / light jog' },
          { label: 'Main', detail: `${distance} mi at easy pace` },
          { label: 'Cooldown', detail: '5 min walk + light stretching' },
        ],
        tips: ['Keep heart rate in zone 2.', "Don't chase pace — effort is the target."],
      }
    case 'Tempo Run':
      return {
        ...base,
        note: 'Comfortably hard. A pace you could hold for about an hour.',
        structure: [
          { label: 'Warmup', detail: '1.5 mi easy jog' },
          { label: 'Main', detail: `${distance - 2.5} mi at tempo pace` },
          { label: 'Cooldown', detail: '1 mi easy jog' },
        ],
        tips: ['Settle into rhythm — no surging.', 'Focus on relaxed form under fatigue.'],
      }
    case 'Long Run':
      return {
        ...base,
        note: 'Time on feet. Build endurance; keep it steady and controlled.',
        structure: [
          { label: 'Warmup', detail: '1 mi easy to settle in' },
          { label: 'Main', detail: `${distance - 2} mi at long-run pace` },
          { label: 'Finish', detail: 'Last 1 mi slightly faster (negative split)' },
        ],
        tips: ['Practice race-day fueling.', 'Hydrate every 20–30 min.'],
      }
    case 'Intervals':
      return {
        ...base,
        note: 'Speed work. Short, hard reps with recovery jogs between.',
        structure: [
          { label: 'Warmup', detail: '1.5 mi easy jog + strides' },
          { label: 'Main', detail: '6 × 800m at interval pace, 400m jog recovery' },
          { label: 'Cooldown', detail: '1 mi easy jog' },
        ],
        tips: ['Hit an even effort across all reps.', 'Recovery jogs stay slow and honest.'],
      }
    default:
      return {
        ...base,
        note: 'Full rest or light cross-training. Recovery is where you adapt.',
        structure: [],
        tips: ['Sleep and nutrition matter as much as the running.'],
      }
  }
}

// Long-run distance + phase per week. Week 4 is a step-back recovery week.
const WEEK_TEMPLATE = [
  { number: 1, phase: 'Base', long: 6 },
  { number: 2, phase: 'Base', long: 7 },
  { number: 3, phase: 'Base', long: 8 },
  { number: 4, phase: 'Build', long: 6 }, // recovery / step-back week
  { number: 5, phase: 'Build', long: 9 },
  { number: 6, phase: 'Build', long: 10 },
  { number: 7, phase: 'Build', long: 11 },
  { number: 8, phase: 'Taper', long: 8 }, // race week
]

// Mon–Sun schedule. Long-run distance is injected from the template.
function buildWeek({ number, phase, long }) {
  const days = [
    buildDay(number, 0, 'Easy Run', 4),
    buildDay(number, 1, 'Tempo Run', 5),
    buildDay(number, 2, 'Rest', 0),
    buildDay(number, 3, number >= 5 ? 'Intervals' : 'Easy Run', 4),
    buildDay(number, 4, 'Rest', 0),
    buildDay(number, 5, 'Long Run', long),
    buildDay(number, 6, 'Rest', 0),
  ]
  const mileage = days.reduce((sum, d) => sum + (parseFloat(d.distance) || 0), 0)
  return { number, phase, mileage, days }
}

// Half-marathon build — 8 weeks (week 4 is a step-back recovery week).
const HALF_TEMPLATE = WEEK_TEMPLATE

// Short 5K tune-up — 4 weeks, no logs yet (shows a fresh, unlogged plan).
const FIVEK_TEMPLATE = [
  { number: 1, phase: 'Base', long: 3 },
  { number: 2, phase: 'Base', long: 4 },
  { number: 3, phase: 'Build', long: 5 },
  { number: 4, phase: 'Taper', long: 3 },
]

// Build a full plan object (matches the shape a real generated plan will have).
function makePlan({ id, title, distance, raceDate, template, currentPace, goalPace, logs }) {
  return {
    id,
    title,
    createdFrom: {
      title,
      raceDistance: distance,
      raceDate,
      fitnessLevel: 'Intermediate',
      daysPerWeek: '4',
      currentPace,
      goalPace,
    },
    generatedAt: '2026-07-12',
    raceDate,
    weeks: template.map(buildWeek),
    logs: logs || {},
  }
}

// Logs for the marathon plan's first ~3.5 weeks so the "logged" state is
// visible. Keyed by day id (e.g. "w1d1"). `effort` is a 1–5 rating.
const MADISON_LOGS = {
  w1d1: { distance: '4.2', pace: '8:55/mi', effort: '2', notes: 'Felt good today, it was very hot' },
  w1d2: { distance: '5.0', pace: '7:58/mi', effort: '4', notes: 'Tempo felt controlled.' },
  w1d4: { distance: '4.1', pace: '9:35/mi', effort: '2', notes: 'Recovery pace, all good.' },
  w1d6: { distance: '6.0', pace: '9:50/mi', effort: '3', notes: 'Steady, negative split the last mile.' },

  w2d1: { distance: '4.0', pace: '9:28/mi', effort: '2', notes: '' },
  w2d2: { distance: '5.0', pace: '7:55/mi', effort: '4', notes: 'Windy — worked for it.' },
  w2d4: { distance: '4.0', pace: '9:40/mi', effort: '2', notes: '' },
  w2d6: { distance: '7.0', pace: '9:47/mi', effort: '3', notes: 'Fueled at mile 4, felt strong.' },

  w3d1: { distance: '4.2', pace: '9:19/mi', effort: '2', notes: '' },
  w3d2: { distance: '5.0', pace: '7:52/mi', effort: '4', notes: 'Best tempo yet.' },
  w3d4: { distance: '4.0', pace: '9:33/mi', effort: '2', notes: '' },
  w3d6: { distance: '8.0', pace: '9:44/mi', effort: '4', notes: 'Long but manageable.' },

  w4d1: { distance: '4.0', pace: '9:41/mi', effort: '2', notes: 'Recovery week — kept it chill.' },
}

// Demo plans seeded on first load so the multi-plan flow is populated. Stable
// ids keep seeding idempotent.
export const SAMPLE_PLANS = [
  makePlan({
    id: 'sample-madison-marathon',
    title: '2026 Madison Marathon',
    distance: 'Half Marathon',
    raceDate: '2026-09-06',
    template: HALF_TEMPLATE,
    currentPace: '9:30 / mi',
    goalPace: '8:00 / mi',
    logs: MADISON_LOGS,
  }),
  makePlan({
    id: 'sample-turkey-trot',
    title: 'Turkey Trot 5K',
    distance: '5K',
    raceDate: '2026-08-09',
    template: FIVEK_TEMPLATE,
    currentPace: '9:15 / mi',
    goalPace: '7:30 / mi',
  }),
]

// Stand-in for real generation: build the week structure for a new plan.
// (Uses the half-marathon template regardless of inputs, for now.)
export function buildSampleWeeks() {
  return HALF_TEMPLATE.map(buildWeek)
}
