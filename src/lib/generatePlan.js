// Real training-plan generation.
//
// Turns the onboarding answers (race distance/date, fitness, days/week, current
// weekly mileage, current + goal pace) into a week-by-week plan following
// standard endurance-training rules:
//
//   • ~9%/week volume growth, capped, with a step-back (recovery) week every 4th
//     week — the classic 3:1 build:recover cycle.
//   • Phases: Base → Build → Peak → Taper, sized as a share of the plan length.
//   • Long run grows on the same curve but is capped at ~35% of weekly volume and
//     a per-distance ceiling (you never run the full race distance in training).
//   • Paces derived from an inferred threshold pace, anchored on the goal race
//     pace (with a sanity check against the current easy pace) and the current
//     easy pace for recovery running.
//   • Timeline clamped to a sane window per distance; anything unusual is surfaced
//     as a warning rather than silently producing a risky plan.
//
// Output shape is identical to what `makePlan` produced before, so PlanView /
// WeekDetail / PlanCharts consume it unchanged: weeks[] of
// { number, phase, mileage, days[] }, each day
// { id, label, dateLabel, type, distance, pace, note, structure[], tips[] }.

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const GROWTH = 1.09 // ~9% weekly volume increase (stays under the 10% rule)
const STEPBACK = 0.8 // recovery week drops to 80% of the last hard week
const LONG_RUN_FRACTION = 0.35 // long run capped at ~35% of the week's volume

// Per-distance tuning. `peak` weekly mileage is a ceiling by fitness level so a
// low-mileage beginner isn't ramped to an advanced runner's volume.
const DISTANCE_CONFIG = {
  '5K': {
    miles: 3.1,
    minWeeks: 4, maxWeeks: 10,
    longRunCeil: 6,
    peak: { Beginner: 15, Intermediate: 20, Advanced: 30 },
  },
  '10K': {
    miles: 6.2,
    minWeeks: 5, maxWeeks: 12,
    longRunCeil: 9,
    peak: { Beginner: 18, Intermediate: 25, Advanced: 35 },
  },
  'Half Marathon': {
    miles: 13.1,
    minWeeks: 8, maxWeeks: 16,
    longRunCeil: 12,
    peak: { Beginner: 25, Intermediate: 35, Advanced: 45 },
  },
  Marathon: {
    miles: 26.2,
    minWeeks: 12, maxWeeks: 20,
    longRunCeil: 22,
    peak: { Beginner: 35, Intermediate: 45, Advanced: 55 },
  },
}

const DEFAULT_CONFIG = DISTANCE_CONFIG['Half Marathon']

// Goal race pace relative to threshold pace (seconds/mi). Threshold ≈ 1-hour
// race effort; shorter races are run faster than threshold, longer ones slower.
const RACE_OFFSET_FROM_THRESHOLD = {
  '5K': -22,
  '10K': -8,
  'Half Marathon': 12,
  Marathon: 22,
}

// The most a goal race pace can realistically be faster than the current *easy*
// pace (seconds/mi). Beyond this we cap the goal and warn — easy pace already
// sits well off race pace, so a huge gap means an unrealistic goal.
const MAX_IMPROVEMENT = {
  '5K': 135,
  '10K': 120,
  'Half Marathon': 105,
  Marathon: 90,
}

// --- small helpers -------------------------------------------------------

const roundHalf = (x) => Math.round(x * 2) / 2
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)

// "8:30" or "8:30 / mi" → 510 seconds. Returns null if unparseable.
function parsePace(str) {
  if (!str) return null
  const m = String(str).match(/(\d+):(\d{1,2})/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

// 508 → "8:30 / mi". Paces are rounded to the nearest 10 seconds so targets are
// easy to read and run to (rounding the total handles the 6:55 → 7:00 carry).
function formatPace(sec) {
  const s = Math.max(0, Math.round(sec / 10) * 10)
  const mm = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss} / mi`
}

// 0.5 → "0.5 mi", 1 → "1 mi" (trims a trailing ".0").
function fmtMiles(mi) {
  return `${Number(mi.toFixed(2))} mi`
}

function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

// Monday of the week containing `date` (weeks run Mon–Sun).
function mondayOf(date) {
  const d = new Date(date)
  const offset = (d.getDay() + 6) % 7 // Sun=0 → 6, Mon=1 → 0, ...
  d.setDate(d.getDate() - offset)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// --- pace model ----------------------------------------------------------

// Derive per-workout paces from the current easy pace and goal race pace.
// Anchored on an inferred threshold pace so the relationships between easy,
// tempo, interval, and race paces stay physiologically sensible.
function derivePaces(distance, currentPaceStr, goalPaceStr, warnings) {
  let easySec = parsePace(currentPaceStr)
  let goalSec = parsePace(goalPaceStr)

  // Fall back to sane defaults if a pace is missing/garbled.
  if (!easySec) easySec = 9.5 * 60
  if (!goalSec) goalSec = easySec - 75

  // Sanity check: cap an unrealistically fast goal vs. the current easy pace.
  const maxImp = MAX_IMPROVEMENT[distance] ?? 105
  if (easySec - goalSec > maxImp) {
    const capped = easySec - maxImp
    warnings.push(
      `Your goal pace (${formatPace(goalSec)}) is very aggressive versus your current easy pace. ` +
        `Targets are set off a more attainable ${formatPace(capped)} — adjust either pace if that's off.`,
    )
    goalSec = capped
  }

  const offset = RACE_OFFSET_FROM_THRESHOLD[distance] ?? 12
  const threshold = goalSec - offset // T such that race pace = T + offset

  const easy = Math.max(easySec, threshold + 60) // easy is never faster than T+60
  const paces = {
    'Easy Run': formatPace(easy),
    'Long Run': formatPace(easy + 10),
    'Tempo Run': formatPace(threshold),
    Intervals: formatPace(threshold - 30),
    Recovery: formatPace(easy + 60), // slow jog between interval reps
    Rest: '—',
  }
  return { paces, racePace: formatPace(goalSec) }
}

// --- schedule layout -----------------------------------------------------

// Weekday roles by days/week. Index 0 = Monday … 6 = Sunday. null = rest day.
// LONG anchors the weekend; quality sits midweek buffered by easy/rest days.
const SCHEDULES = {
  3: [null, 'TEMPO', null, 'EASY', null, 'LONG', null],
  4: ['EASY', 'TEMPO', null, 'INTERVAL', null, 'LONG', null],
  5: ['EASY', 'TEMPO', 'EASY', 'INTERVAL', null, 'LONG', null],
  6: ['EASY', 'TEMPO', 'EASY', 'INTERVAL', 'EASY', 'LONG', null],
}

// Map a schedule role to a workout type for a given phase. During Base there is
// no hard running — everything but the long run is easy aerobic volume.
function roleToType(role, phase) {
  if (role === 'LONG') return 'Long Run'
  if (role === 'EASY' || !role) return 'Easy Run'
  if (phase === 'Base') return 'Easy Run'
  if (role === 'TEMPO') return 'Tempo Run'
  if (role === 'INTERVAL') return 'Intervals'
  return 'Easy Run'
}

// Work-rep length for interval sessions, by race distance. Shorter races train
// with shorter, faster reps; longer races with longer reps closer to race pace.
const INTERVAL_WORK_MILES = {
  '5K': 0.5,
  '10K': 0.5,
  'Half Marathon': 0.75,
  Marathon: 1,
}
const RECOVERY_MILES = 0.25 // easy jog between reps

// A structured interval session sized to roughly the day's prescribed distance:
// warmup, N × (work @ interval pace / recover @ jog pace), cooldown. Returns the
// structure plus the total mileage it adds up to, so the day's headline distance
// stays consistent with the breakdown (a short day can't hold a full rep set).
function buildIntervalStructure(distance, raceDistance, paces) {
  const warmup = 1.5
  const cooldown = 1
  const work = INTERVAL_WORK_MILES[raceDistance] ?? 0.75
  const perRep = work + RECOVERY_MILES
  const mainTarget = Math.max(distance - warmup - cooldown, perRep)
  const reps = clamp(Math.round(mainTarget / perRep), 3, 10)
  const miles = Number((warmup + cooldown + reps * perRep).toFixed(2))
  const structure = [
    { label: 'Warmup', detail: `${warmup} mi easy jog + 4 × strides` },
    {
      label: `Repeat ×${reps}`,
      repeat: {
        count: reps,
        steps: [
          { kind: 'Work', distance: fmtMiles(work), pace: paces.Intervals },
          { kind: 'Recover', distance: fmtMiles(RECOVERY_MILES), pace: paces.Recovery },
        ],
      },
    },
    { label: 'Cooldown', detail: `${cooldown} mi easy jog` },
  ]
  return { structure, miles }
}

// --- day builder (paces-aware; mirrors the old samplePlan buildDay) ------

function buildDay({ weekNumber, dayIndex, type, distance, paces, startDate, raceDistance, isRace, racePace }) {
  const id = `w${weekNumber}d${dayIndex + 1}`
  const date = addDays(startDate, (weekNumber - 1) * 7 + dayIndex)
  const base = {
    id,
    label: DAY_NAMES[dayIndex],
    dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
    type,
    distance: type === 'Rest' ? '—' : `${distance} mi`,
    pace: paces[type],
    note: '',
    structure: [],
    tips: [],
  }

  if (isRace) {
    return {
      ...base,
      pace: racePace,
      note: 'Race day — trust your training, start controlled, and finish strong. 🏁',
      structure: [
        { label: 'Warmup', detail: '10–15 min easy jog + strides (skip for the marathon)' },
        { label: 'Race', detail: `${distance} mi at goal race pace` },
        { label: 'After', detail: 'Easy walk + rehydrate + refuel' },
      ],
      tips: ['Hold back the first third — negative split if you can.', 'Stick to fueling you practiced.'],
    }
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
          { label: 'Main', detail: `${roundHalf(Math.max(distance - 3, 1))} mi at tempo pace` },
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
          { label: 'Main', detail: `${roundHalf(Math.max(distance - 2, 1))} mi at long-run pace` },
          { label: 'Finish', detail: 'Last 1 mi slightly faster (negative split)' },
        ],
        tips: ['Practice race-day fueling.', 'Hydrate every 20–30 min.'],
      }
    case 'Intervals': {
      const { structure, miles } = buildIntervalStructure(distance, raceDistance, paces)
      return {
        ...base,
        distance: `${miles} mi`, // headline distance matches the breakdown total
        note: 'Speed work. Short, hard reps with recovery jogs between.',
        structure,
        tips: ['Hit an even effort across all reps.', 'Recovery jogs stay slow and honest.'],
      }
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

// --- phase + volume planning ---------------------------------------------

// Assign a phase label to each week. Taper and Peak are sized first, the rest
// splits Base/Build ~55/45.
function planPhases(weeks) {
  const taper = clamp(Math.round(weeks * 0.12), 1, 3)
  const nonTaper = weeks - taper
  const peak = clamp(Math.round(weeks * 0.15), 1, Math.max(1, nonTaper - 1))
  const baseBuild = nonTaper - peak
  const baseW = Math.max(1, Math.round(baseBuild * 0.55))
  const buildW = Math.max(0, baseBuild - baseW)

  const phases = []
  for (let i = 0; i < weeks; i++) {
    if (i < baseW) phases.push('Base')
    else if (i < baseW + buildW) phases.push('Build')
    else if (i < baseW + buildW + peak) phases.push('Peak')
    else phases.push('Taper')
  }
  return phases
}

// Weekly volume curve: grow from the runner's current mileage toward the capped
// peak with step-back weeks, then taper down over the final weeks.
function planVolumes(weeks, phases, start, cap) {
  const taperCount = phases.filter((p) => p === 'Taper').length
  const hardWeeks = weeks - taperCount

  const volumes = []
  let lastHard = clamp(start, 1, cap)
  volumes[0] = lastHard

  for (let i = 1; i < hardWeeks; i++) {
    const isRecovery = (i + 1) % 4 === 0 && i < hardWeeks - 1 // every 4th week, never the last peak week
    if (isRecovery) {
      volumes[i] = roundHalf(Math.min(lastHard, cap) * STEPBACK)
    } else {
      const v = Math.min(lastHard * GROWTH, cap)
      volumes[i] = roundHalf(v)
      lastHard = v
    }
  }

  // Taper: descend from the peak. Race week (last) is the lightest.
  const peakVol = volumes[hardWeeks - 1] || lastHard
  const factorsByCount = { 1: [0.6], 2: [0.75, 0.55], 3: [0.8, 0.65, 0.5] }
  const factors = factorsByCount[taperCount] || [0.6]
  for (let k = 0; k < taperCount; k++) {
    volumes[hardWeeks + k] = roundHalf(peakVol * factors[k])
  }
  return volumes
}

// --- week assembly -------------------------------------------------------

function buildWeek({ number, phase, volume, longRun, daysPerWeek, paces, startDate, raceDistance }) {
  const schedule = SCHEDULES[daysPerWeek] || SCHEDULES[4]

  // Long run takes its share; the remaining volume is split across the other
  // running days.
  const longCapped = Math.min(longRun, volume)
  const runningRoles = schedule.filter(Boolean)
  const otherRunCount = runningRoles.length - 1 // excludes the long run
  const perOther = otherRunCount > 0 ? (volume - longCapped) / otherRunCount : 0

  const days = schedule.map((role, dayIndex) => {
    if (!role) return buildDay({ weekNumber: number, dayIndex, type: 'Rest', distance: 0, paces, startDate })

    const type = roleToType(role, phase)
    let distance
    if (role === 'LONG') {
      distance = roundHalf(longCapped)
    } else {
      // Quality days need a floor so their warmup/cooldown math stays sane.
      const floor = type === 'Tempo Run' || type === 'Intervals' ? 3 : 2
      distance = Math.max(roundHalf(perOther), floor)
    }
    return buildDay({ weekNumber: number, dayIndex, type, distance, paces, startDate, raceDistance })
  })

  const mileage = sumMileage(days)
  return { number, phase, mileage, days }
}

// The final week: a light taper of a couple short shakeout runs plus the race
// itself, placed on the actual race-day weekday. Everything else is rest — you
// arrive fresh, not fatigued.
function buildRaceWeek({ number, paces, startDate, raceDayIndex, raceMiles, racePace }) {
  const easyIndices = new Set(
    [raceDayIndex - 2, raceDayIndex - 4].filter((i) => i >= 0), // shakeouts before race day
  )

  const days = DAY_NAMES.map((_, dayIndex) => {
    if (dayIndex === raceDayIndex) {
      return buildDay({ weekNumber: number, dayIndex, type: 'Long Run', distance: raceMiles, paces, startDate, isRace: true, racePace })
    }
    if (easyIndices.has(dayIndex)) {
      return buildDay({ weekNumber: number, dayIndex, type: 'Easy Run', distance: 3, paces, startDate })
    }
    return buildDay({ weekNumber: number, dayIndex, type: 'Rest', distance: 0, paces, startDate })
  })

  return { number, phase: 'Taper', mileage: sumMileage(days), days }
}

function sumMileage(days) {
  return Math.round(days.reduce((sum, d) => sum + (parseFloat(d.distance) || 0), 0) * 10) / 10
}

// --- public API ----------------------------------------------------------

// Generate a plan from onboarding answers.
//   inputs: { raceDistance, raceDate, fitnessLevel, daysPerWeek, currentPace,
//             goalPace, weeklyMileage }
//   options.today: Date to treat as "now" (defaults to the real today) — lets
//             sample data build deterministically regardless of run date.
//
// Returns { weeks, warnings, generatedAt, startDate, raceDate }.
export function generatePlan(inputs, options = {}) {
  const warnings = []
  const distance = inputs.raceDistance || 'Half Marathon'
  const config = DISTANCE_CONFIG[distance] || DEFAULT_CONFIG
  const fitness = inputs.fitnessLevel || 'Intermediate'
  const daysPerWeek = clamp(Number(inputs.daysPerWeek) || 4, 3, 6)

  const today = options.today ? new Date(options.today) : new Date()
  today.setHours(0, 0, 0, 0)

  // Race week and how many whole weeks we actually have to work with.
  const raceDateObj = inputs.raceDate ? parseISO(inputs.raceDate) : addDays(today, config.maxWeeks * 7)
  const raceMonday = mondayOf(raceDateObj)
  const startMonday = mondayOf(today)
  const availableWeeks = Math.floor((raceMonday - startMonday) / (7 * 86400000)) + 1

  let weeks = clamp(availableWeeks, 1, config.maxWeeks)
  if (availableWeeks < config.minWeeks) {
    warnings.push(
      `Only ${Math.max(availableWeeks, 0)} week${availableWeeks === 1 ? '' : 's'} until race day — ` +
        `a ${distance} usually needs at least ${config.minWeeks}. This plan is compressed; ` +
        `ease off if anything hurts, or pick a later race date.`,
    )
  } else if (availableWeeks > config.maxWeeks) {
    warnings.push(
      `You have ${availableWeeks} weeks before the race. This plan covers the final ${config.maxWeeks} — ` +
        `keep building easy aerobic base until it starts.`,
    )
  }

  // Plan starts so its last week is race week.
  const startDate = addDays(raceMonday, -(weeks - 1) * 7)

  const phases = planPhases(weeks)
  const startMileage = clamp(Number(inputs.weeklyMileage) || Math.round(config.peak[fitness] * 0.55), 5, 120)
  const peakCap = Math.max(config.peak[fitness] || DEFAULT_CONFIG.peak.Intermediate, startMileage * 1.1)
  const volumes = planVolumes(weeks, phases, startMileage, peakCap)

  const { paces, racePace } = derivePaces(distance, inputs.currentPace, inputs.goalPace, warnings)
  const raceDayIndex = (raceDateObj.getDay() + 6) % 7 // 0 = Mon … 6 = Sun

  const weeksOut = []
  for (let i = 0; i < weeks; i++) {
    const number = i + 1
    if (i === weeks - 1) {
      // Final week is race week: light taper + the race on its real weekday.
      weeksOut.push(
        buildRaceWeek({ number, paces, startDate, raceDayIndex, raceMiles: config.miles, racePace }),
      )
      continue
    }
    const volume = volumes[i]
    const longRun = Math.min(roundHalf(volume * LONG_RUN_FRACTION), config.longRunCeil)
    weeksOut.push(
      buildWeek({ number, phase: phases[i], volume, longRun, daysPerWeek, paces, startDate, raceDistance: distance }),
    )
  }

  return {
    weeks: weeksOut,
    warnings,
    generatedAt: iso(today),
    startDate: iso(startDate),
    raceDate: inputs.raceDate,
  }
}
