// Central place for reading/writing plans to localStorage. The whole app is
// client-side, so localStorage is our "database".
//
// Data model (multiple plans):
//   pacebuilder.plans  → { [id]: plan }   each plan owns its weeks + logs
//   pacebuilder.draft  → in-progress onboarding answers (before a plan exists)
//   pacebuilder.seeded → one-time flag so demo plans seed only once

import { SAMPLE_PLANS } from './samplePlan.js'

const PLANS_KEY = 'pacebuilder.plans'
const DRAFT_KEY = 'pacebuilder.draft'
const SEEDED_KEY = 'pacebuilder.seeded'

// Safe JSON read — returns `fallback` if the key is missing or corrupt.
function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getPlansMap() {
  return read(PLANS_KEY, {})
}

// --- Plans (collection) --------------------------------------------------

export function getPlans() {
  return Object.values(getPlansMap())
}

export function getPlan(id) {
  return getPlansMap()[id] || null
}

export function savePlan(plan) {
  const map = getPlansMap()
  map[plan.id] = plan
  write(PLANS_KEY, map)
}

export function deletePlan(id) {
  const map = getPlansMap()
  delete map[id]
  write(PLANS_KEY, map)
}

export function hasPlans() {
  return getPlans().length > 0
}

// Slug from the title plus a short random suffix, so titles can repeat.
export function createPlanId(title) {
  const slug = (title || 'plan')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const rand = Math.random().toString(36).slice(2, 8)
  return `${slug || 'plan'}-${rand}`
}

// --- Per-plan workout logs ----------------------------------------------

export function saveLog(planId, dayId, log) {
  const plan = getPlan(planId)
  if (!plan) return
  plan.logs = { ...(plan.logs || {}), [dayId]: log }
  savePlan(plan)
}

// --- Onboarding draft ----------------------------------------------------

export function getDraft() {
  return read(DRAFT_KEY, {})
}

export function saveDraft(answers) {
  write(DRAFT_KEY, answers)
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

// --- Seeding -------------------------------------------------------------

// Seed the demo plans once, so a first-time visitor sees a populated app.
// The flag means deleting the samples won't re-add them on reload.
export function seedSampleData() {
  if (localStorage.getItem(SEEDED_KEY)) return
  if (getPlans().length === 0) {
    SAMPLE_PLANS.forEach(savePlan)
  }
  localStorage.setItem(SEEDED_KEY, '1')
}
