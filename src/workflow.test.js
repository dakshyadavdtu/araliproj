import { describe, expect, it } from 'vitest'
import {
  createDefaultNode,
  createEmptySequence,
  createSampleSequence,
  getNodeSummary,
  getSequenceNarrative,
  loadSequence,
  saveSequence,
  STORAGE_KEY,
  validateNode,
  validateSequence,
} from './workflow.js'
import {
  addNode,
  createSequenceState,
  deleteNode,
  loadExample,
  markSaved,
  moveNode,
  renameSequence,
  selectNode,
  selectIsDirty,
  sequenceReducer,
} from './store.js'

class MemoryStorage {
  values = new Map()

  getItem(key) {
    return this.values.get(key) ?? null
  }

  setItem(key, value) {
    this.values.set(key, value)
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

function rootState(sequenceState) {
  return { sequence: sequenceState }
}

describe('workflow domain', () => {
  it('requires the four core steps and accepts the complete sample', () => {
    const empty = validateSequence(createEmptySequence())
    const sample = validateSequence(createSampleSequence())

    expect(empty.isReady).toBe(false)
    expect(empty.missingTypes).toEqual(['scheduler', 'enrollment', 'exit', 'email'])
    expect(empty.summary).toBe('0 of 4 steps ready')
    expect(sample.isReady).toBe(true)
    expect(sample.readyCount).toBe(5)
  })

  it('validates scheduler, enrollment, exit, and email details', () => {
    const scheduler = createDefaultNode('scheduler')
    scheduler.config = { ...scheduler.config, frequency: 'weekly', time: '09:00' }
    expect(validateNode(scheduler).errors.weekday).toBe('Choose a weekday.')

    const enrollment = createDefaultNode('enrollment')
    enrollment.config = { contactName: 'Alex', email: 'not-an-email' }
    expect(validateNode(enrollment).errors.email).toBe('Enter a valid email address.')

    const exit = createDefaultNode('exit')
    exit.config = { condition: 'after-days', days: 0 }
    expect(validateNode(exit).errors.days).toBe('Enter a whole number greater than zero.')

    const email = createDefaultNode('email')
    email.config.subject = 'Welcome'
    expect(validateNode(email).errors.body).toBe('Write the email message.')
  })

  it('builds natural summaries and a narrative from current data', () => {
    const scheduler = createDefaultNode('scheduler')
    scheduler.config = {
      ...scheduler.config,
      frequency: 'weekly',
      weekday: 'tuesday',
      time: '10:30',
    }

    expect(getNodeSummary(scheduler)).toBe('Every Tuesday at 10:30 AM')

    const narrative = getSequenceNarrative(createSampleSequence())
    expect(narrative.intro).toBe('This sequence runs every weekday at 9:00 AM.')
    expect(narrative.steps).toContain('Alex Morgan is enrolled.')
    expect(narrative.steps).toContain('They receive “Welcome to Acme”.')
  })
})

describe('sequence slice', () => {
  it('enforces one scheduler and no more than two emails', () => {
    let state = createSequenceState(null)

    state = sequenceReducer(state, addNode({ nodeType: 'scheduler' }))
    state = sequenceReducer(state, addNode({ nodeType: 'scheduler' }))
    state = sequenceReducer(state, addNode({ nodeType: 'email' }))
    state = sequenceReducer(state, addNode({ nodeType: 'email' }))
    state = sequenceReducer(state, addNode({ nodeType: 'email' }))

    expect(state.sequence.nodes.filter((node) => node.type === 'scheduler')).toHaveLength(1)
    expect(state.sequence.nodes.filter((node) => node.type === 'email')).toHaveLength(2)
  })

  it('reorders nodes and keeps selection valid after deletion', () => {
    let state = sequenceReducer(createSequenceState(null), loadExample())
    const lastNode = state.sequence.nodes.at(-1)
    state = sequenceReducer(state, selectNode(lastNode.id))

    state = sequenceReducer(state, moveNode({ nodeId: lastNode.id, toIndex: 1 }))
    expect(state.sequence.nodes[1].id).toBe(lastNode.id)

    state = sequenceReducer(state, deleteNode(lastNode.id))
    expect(state.sequence.nodes.some((node) => node.id === lastNode.id)).toBe(false)
    expect(state.selectedNodeId).not.toBe(lastNode.id)
  })

  it('derives dirty state from the last saved snapshot', () => {
    const initial = createSequenceState(null)
    const renamed = sequenceReducer(initial, renameSequence('Sales welcome'))
    const saved = sequenceReducer(renamed, markSaved({ savedAt: '2026-08-12T12:00:00.000Z' }))

    expect(selectIsDirty(rootState(initial))).toBe(false)
    expect(selectIsDirty(rootState(renamed))).toBe(true)
    expect(selectIsDirty(rootState(saved))).toBe(false)
  })
})

describe('local persistence', () => {
  it('round-trips a schema-versioned sequence', () => {
    const storage = new MemoryStorage()
    const saved = saveSequence(createSampleSequence(), storage)

    expect(saved).not.toBeNull()
    expect(loadSequence(storage)).toEqual(saved)
  })

  it('falls back safely when saved data is malformed or incompatible', () => {
    const storage = new MemoryStorage()

    storage.setItem(STORAGE_KEY, '{broken json')
    expect(loadSequence(storage)).toBeNull()

    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }))
    expect(loadSequence(storage)).toBeNull()
  })
})
