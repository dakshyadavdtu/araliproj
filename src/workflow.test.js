// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { describe, expect, it } from 'vitest'
import { afterEach } from 'vitest'
import App from './App.jsx'
import {
  createDefaultNode,
  createEmptySequence,
  createSampleSequence,
  getNodeSummary,
  getSequenceNarrative,
  getStorageKey,
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
  makeStore,
} from './store.js'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
  })
}

function renderApp() {
  const app = React.createElement(App)
  return render(React.createElement(Provider, { store: makeStore() }, app))
}

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

  it('keeps locally saved sequences separate for each account', () => {
    const storage = new MemoryStorage()
    const sequence = createSampleSequence()

    saveSequence(sequence, storage, 'user-a')

    expect(getStorageKey('user-a')).toBe(`${STORAGE_KEY}.user-a`)
    expect(loadSequence(storage, 'user-a')?.sequence.name).toBe('Acme welcome sequence')
    expect(loadSequence(storage, 'user-b')).toBeNull()
  })

  it('falls back safely when saved data is malformed or incompatible', () => {
    const storage = new MemoryStorage()

    storage.setItem(STORAGE_KEY, '{broken json')
    expect(loadSequence(storage)).toBeNull()

    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }))
    expect(loadSequence(storage)).toBeNull()
  })
})

describe('sequence builder', () => {
  it('opens the review flow from an empty sequence and loads the example', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Continue to assignment demo' }))
    expect(screen.getByRole('heading', { name: 'Start with your first step' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Load example' }))
    expect(screen.getByText('5 of 5 steps ready')).toBeInTheDocument()
    expect(screen.getByText('Every weekday at 9:00 AM')).toBeInTheDocument()
  })

  it('keeps the applied contact when an editor draft is cancelled', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Continue to assignment demo' }))
    await user.click(screen.getByRole('button', { name: 'Load example' }))
    await user.click(screen.getByRole('button', {
      name: 'Edit Enrollment: Enroll Alex Morgan · alex@example.com',
    }))

    const nameField = screen.getByRole('textbox', { name: 'Contact name *' })
    await user.clear(nameField)
    await user.type(nameField, 'Changed draft')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', {
      name: 'Edit Enrollment: Enroll Alex Morgan · alex@example.com',
    })).toBeInTheDocument()
    expect(screen.queryByText('Changed draft')).not.toBeInTheDocument()
  })

  it('shows useful incomplete-step guidance in Preview', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Continue to assignment demo' }))
    await user.click(screen.getByRole('button', { name: 'Add first step' }))
    await user.click(screen.getByRole('button', { name: /Send email/ }))
    await user.click(screen.getByRole('button', { name: 'Preview sequence' }))

    expect(screen.getByText(/Send email needs attention/)).toBeInTheDocument()
    expect(screen.getByText(/Add a scheduler step/)).toBeInTheDocument()
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument()
  })

  it('does not report unapplied editor work as saved', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Continue to assignment demo' }))
    await user.click(screen.getByRole('button', { name: 'Load example' }))
    await user.click(screen.getByRole('button', {
      name: 'Edit Enrollment: Enroll Alex Morgan · alex@example.com',
    }))
    await user.type(screen.getByRole('textbox', { name: 'Contact name *' }), ' draft')

    expect(screen.getByText('Unapplied step edits')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save sequence (Ctrl/Cmd + S)' })).toBeDisabled()
  })

  it('preserves draft protection when a different step is deleted', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Continue to assignment demo' }))
    await user.click(screen.getByRole('button', { name: 'Load example' }))
    await user.click(screen.getByRole('button', {
      name: 'Edit Enrollment: Enroll Alex Morgan · alex@example.com',
    }))
    await user.type(screen.getByRole('textbox', { name: 'Contact name *' }), ' draft')

    await user.click(screen.getByRole('button', { name: 'Delete Scheduler' }))
    await user.click(screen.getByRole('button', { name: 'Delete step' }))
    await user.click(screen.getByRole('button', {
      name: 'Edit Exit condition: Leave when the contact replies',
    }))

    expect(screen.getByRole('heading', { name: 'Discard unapplied edits?' })).toBeInTheDocument()
  })

  it('restores an explicitly saved sequence for the same guest session', async () => {
    const user = userEvent.setup()
    const view = renderApp()

    await user.click(screen.getByRole('button', { name: 'Continue to assignment demo' }))
    await user.click(screen.getByRole('button', { name: 'Load example' }))
    await user.click(screen.getByRole('button', {
      name: 'Edit Enrollment: Enroll Alex Morgan · alex@example.com',
    }))
    const name = screen.getByRole('textbox', { name: 'Contact name *' })
    await user.clear(name)
    await user.type(name, 'Taylor Reed')
    await user.click(screen.getByRole('button', { name: 'Apply changes' }))
    await user.click(screen.getByRole('button', { name: 'Save sequence (Ctrl/Cmd + S)' }))

    view.unmount()
    renderApp()

    await waitFor(() => {
      expect(screen.getByRole('button', {
        name: 'Edit Enrollment: Enroll Taylor Reed · alex@example.com',
      })).toBeInTheDocument()
    })
  })
})
