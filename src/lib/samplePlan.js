// Demo plans seeded on first load so the multi-plan flow is populated.
//
// These are now produced by the real generator (`generatePlan`) from synthetic
// onboarding answers, so they exercise the same code path a user's plan does.
// A fixed `today` keeps them deterministic regardless of when the app runs.

import { generatePlan } from './generatePlan.js'

// Treat "now" as this Monday when seeding, so sample dates/weeks are stable.
const SEED_TODAY = new Date(2026, 6, 13) // July 13, 2026 (month is 0-indexed)

// Build a full plan object from onboarding-style answers via the generator.
function makePlan({ id, title, distance, raceDate, fitnessLevel, daysPerWeek, currentPace, goalPace, weeklyMileage, logs }) {
  const inputs = {
    title,
    raceDistance: distance,
    raceDate,
    fitnessLevel,
    daysPerWeek,
    currentPace,
    goalPace,
    weeklyMileage,
  }
  const gen = generatePlan(inputs, { today: SEED_TODAY })
  return {
    id,
    title,
    createdFrom: inputs,
    generatedAt: gen.generatedAt,
    startDate: gen.startDate,
    raceDate,
    warnings: gen.warnings,
    weeks: gen.weeks,
    logs: logs || {},
  }
}

// Logs for the half-marathon plan's first ~3.5 weeks so the "logged" state is
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

// Demo plans seeded on first load. Stable ids keep seeding idempotent.
export const SAMPLE_PLANS = [
  makePlan({
    id: 'sample-madison-marathon',
    title: '2026 Madison Marathon',
    distance: 'Half Marathon',
    raceDate: '2026-09-06',
    fitnessLevel: 'Intermediate',
    daysPerWeek: '4',
    currentPace: '9:30',
    goalPace: '8:00',
    weeklyMileage: '20',
    logs: MADISON_LOGS,
  }),
  makePlan({
    id: 'sample-turkey-trot',
    title: 'Turkey Trot 5K',
    distance: '5K',
    raceDate: '2026-08-09',
    fitnessLevel: 'Intermediate',
    daysPerWeek: '4',
    currentPace: '9:15',
    goalPace: '7:30',
    weeklyMileage: '15',
  }),
]
