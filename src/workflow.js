export const NODE_LIMITS = {
  scheduler: 1,
  enrollment: 1,
  exit: 1,
  email: 2,
}

export const NODE_LABELS = {
  scheduler: 'Scheduler',
  enrollment: 'Enrollment',
  exit: 'Exit condition',
  email: 'Send email',
}

export const REQUIRED_NODE_TYPES = ['scheduler', 'enrollment', 'exit', 'email']
export const STORAGE_VERSION = 1
export const STORAGE_KEY = 'arali.sequence-builder.v1'
export const DEFAULT_SEQUENCE_NAME = 'Untitled sequence'

const WEEKDAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const VALID_FREQUENCIES = ['', 'daily', 'weekdays', 'weekly']
const VALID_WEEKDAYS = ['', ...Object.keys(WEEKDAY_LABELS)]
const VALID_EXIT_CONDITIONS = ['', 'replies', 'opens-email', 'after-days']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createId(prefix) {
  const id = globalThis.crypto?.randomUUID?.()
  return id
    ? `${prefix}-${id}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getDefaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function createEmptySequence(name = DEFAULT_SEQUENCE_NAME) {
  const now = new Date().toISOString()

  return {
    id: createId('sequence'),
    name,
    createdAt: now,
    updatedAt: now,
    nodes: [],
  }
}

export function createDefaultNode(type) {
  const id = createId('step')

  switch (type) {
    case 'scheduler':
      return {
        id,
        type,
        config: {
          frequency: '',
          time: '',
          weekday: '',
          timezone: getDefaultTimezone(),
        },
      }
    case 'enrollment':
      return {
        id,
        type,
        config: { contactName: '', email: '' },
      }
    case 'exit':
      return {
        id,
        type,
        config: { condition: '', days: null },
      }
    case 'email':
      return {
        id,
        type,
        config: {
          recipient: 'enrolled-contact',
          subject: '',
          body: '',
        },
      }
    default:
      throw new Error(`Unknown node type: ${type}`)
  }
}

export function cloneSequence(sequence) {
  return {
    ...sequence,
    nodes: sequence.nodes.map((node) => ({
      ...node,
      config: { ...node.config },
    })),
  }
}

export function createSampleSequence() {
  const sequence = createEmptySequence('Acme welcome sequence')
  const scheduler = createDefaultNode('scheduler')
  const enrollment = createDefaultNode('enrollment')
  const exit = createDefaultNode('exit')
  const welcomeEmail = createDefaultNode('email')
  const followUpEmail = createDefaultNode('email')

  scheduler.config = {
    frequency: 'weekdays',
    time: '09:00',
    weekday: '',
    timezone: getDefaultTimezone(),
  }
  enrollment.config = {
    contactName: 'Alex Morgan',
    email: 'alex@example.com',
  }
  exit.config = { condition: 'replies', days: null }
  welcomeEmail.config = {
    recipient: 'enrolled-contact',
    subject: 'Welcome to Acme',
    body: 'Hi Alex,\n\nWelcome to Acme. Here are a few resources to help you get started.',
  }
  followUpEmail.config = {
    recipient: 'enrolled-contact',
    subject: 'Quick follow-up',
    body: 'Hi Alex,\n\nJust checking in. Reply if there is anything we can help with.',
  }

  sequence.nodes = [scheduler, enrollment, exit, welcomeEmail, followUpEmail]
  return sequence
}

export function countNodes(nodes, type) {
  return nodes.filter((node) => node.type === type).length
}

export function canAddNode(nodes, type) {
  const limit = NODE_LIMITS[type]

  if (!limit) {
    return { allowed: false, reason: 'This step type is not supported.' }
  }

  if (countNodes(nodes, type) < limit) {
    return { allowed: true, reason: '' }
  }

  return {
    allowed: false,
    reason:
      type === 'email'
        ? 'A sequence can contain up to two email steps.'
        : `A sequence can contain only one ${NODE_LABELS[type].toLowerCase()} step.`,
  }
}

export function formatTime(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export function getSchedulerSummary(node) {
  const time = formatTime(node.config.time)

  if (!node.config.frequency || !time) return 'Finish setup'
  if (node.config.frequency === 'daily') return `Every day at ${time}`
  if (node.config.frequency === 'weekdays') return `Every weekday at ${time}`
  if (!node.config.weekday) return 'Finish setup'

  return `Every ${WEEKDAY_LABELS[node.config.weekday]} at ${time}`
}

export function getNodeSummary(node) {
  switch (node.type) {
    case 'scheduler':
      return getSchedulerSummary(node)
    case 'enrollment': {
      const name = node.config.contactName.trim()
      const email = node.config.email.trim()
      return name && email ? `Enroll ${name} · ${email}` : 'Finish setup'
    }
    case 'exit':
      if (node.config.condition === 'replies') {
        return 'Leave when the contact replies'
      }
      if (node.config.condition === 'opens-email') {
        return 'Leave when the contact opens an email'
      }
      if (node.config.condition === 'after-days' && isPositiveInteger(node.config.days)) {
        const days = Number(node.config.days)
        return `Leave after ${days} ${days === 1 ? 'day' : 'days'}`
      }
      return 'Finish setup'
    case 'email': {
      const subject = node.config.subject.trim()
      return subject ? `Send “${subject}”` : 'Finish setup'
    }
    default:
      return 'Finish setup'
  }
}

function isPositiveInteger(value) {
  if (value === '' || value === null) return false
  const number = Number(value)
  return Number.isInteger(number) && number > 0
}

export function validateNode(node) {
  const errors = {}

  switch (node.type) {
    case 'scheduler':
      if (!node.config.frequency) errors.frequency = 'Choose a frequency.'
      if (!formatTime(node.config.time)) errors.time = 'Choose a valid time.'
      if (node.config.frequency === 'weekly' && !node.config.weekday) {
        errors.weekday = 'Choose a weekday.'
      }
      if (!node.config.timezone.trim()) errors.timezone = 'Choose a timezone.'
      break
    case 'enrollment':
      if (!node.config.contactName.trim()) {
        errors.contactName = 'Enter a contact name.'
      }
      if (!node.config.email.trim()) {
        errors.email = 'Enter an email address.'
      } else if (!EMAIL_PATTERN.test(node.config.email.trim())) {
        errors.email = 'Enter a valid email address.'
      }
      break
    case 'exit':
      if (!node.config.condition) errors.condition = 'Choose an exit condition.'
      if (node.config.condition === 'after-days' && !isPositiveInteger(node.config.days)) {
        errors.days = 'Enter a whole number greater than zero.'
      }
      break
    case 'email':
      if (!node.config.subject.trim()) errors.subject = 'Enter a subject line.'
      if (!node.config.body.trim()) errors.body = 'Write the email message.'
      break
    default:
      errors.type = 'This step type is not supported.'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function getReadinessSummary(readyCount, totalCount) {
  const attentionCount = totalCount - readyCount
  if (attentionCount === 1) return '1 step needs attention'
  return `${readyCount} of ${totalCount} steps ready`
}

export function validateSequence(sequence) {
  const nodeResults = {}
  const issues = []
  const ids = new Set()
  let readyCount = 0

  for (const node of sequence.nodes) {
    const result = validateNode(node)
    nodeResults[node.id] = result
    if (result.valid) readyCount += 1
    else {
      issues.push({
        code: 'invalid-node',
        message: `${NODE_LABELS[node.type] || 'Step'} needs attention.`,
        nodeId: node.id,
        nodeType: node.type,
      })
    }

    if (ids.has(node.id)) {
      issues.push({
        code: 'duplicate-id',
        message: 'Every step needs a unique ID.',
        nodeId: node.id,
        nodeType: node.type,
      })
    }
    ids.add(node.id)
  }

  const missingTypes = REQUIRED_NODE_TYPES.filter(
    (type) => countNodes(sequence.nodes, type) === 0,
  )

  for (const type of missingTypes) {
    issues.push({
      code: 'missing-step',
      message:
        type === 'email'
          ? 'Add at least one email step.'
          : `Add a ${NODE_LABELS[type].toLowerCase()} step.`,
      nodeType: type,
    })
  }

  for (const [type, limit] of Object.entries(NODE_LIMITS)) {
    if (countNodes(sequence.nodes, type) > limit) {
      issues.push({
        code: 'too-many-steps',
        message:
          type === 'email'
            ? 'A sequence can contain up to two email steps.'
            : `A sequence can contain only one ${NODE_LABELS[type].toLowerCase()} step.`,
        nodeType: type,
      })
    }
  }

  const totalCount = sequence.nodes.length + missingTypes.length
  const attentionCount = totalCount - readyCount

  return {
    valid: issues.length === 0,
    isReady: issues.length === 0,
    readyCount,
    readyNodeCount: readyCount,
    totalCount,
    totalStepCount: totalCount,
    attentionCount,
    missingTypes,
    missingNodeTypes: missingTypes,
    nodeResults,
    issues,
    summary: getReadinessSummary(readyCount, totalCount),
  }
}

export function getSequenceNarrative(sequence) {
  const scheduler = sequence.nodes.find((node) => node.type === 'scheduler')
  const scheduleSummary = scheduler ? getSchedulerSummary(scheduler) : 'Finish setup'
  const intro =
    scheduleSummary === 'Finish setup'
      ? 'The schedule still needs to be configured.'
      : `This sequence runs ${scheduleSummary.replace(/^Every/, 'every')}.`

  const steps = sequence.nodes.flatMap((node) => {
    if (node.type === 'scheduler') return []

    if (node.type === 'enrollment') {
      const name = node.config.contactName.trim()
      return [name ? `${name} is enrolled.` : 'Enrollment still needs to be configured.']
    }

    if (node.type === 'exit') {
      if (node.config.condition === 'replies') {
        return ['They leave the sequence if they reply.']
      }
      if (node.config.condition === 'opens-email') {
        return ['They leave the sequence if they open an email.']
      }
      if (node.config.condition === 'after-days' && isPositiveInteger(node.config.days)) {
        const days = Number(node.config.days)
        return [`They leave the sequence after ${days} ${days === 1 ? 'day' : 'days'}.`]
      }
      return ['The exit condition still needs to be configured.']
    }

    const subject = node.config.subject.trim()
    return [subject ? `They receive “${subject}”.` : 'An email still needs to be configured.']
  })

  return { intro, steps }
}

function sequenceSnapshot(sequence) {
  return {
    id: sequence.id,
    name: sequence.name,
    createdAt: sequence.createdAt,
    nodes: sequence.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      config: { ...node.config },
    })),
  }
}

export function isSequenceDirty(sequence, savedSnapshot) {
  if (!savedSnapshot) return true
  return JSON.stringify(sequenceSnapshot(sequence)) !== JSON.stringify(sequenceSnapshot(savedSnapshot))
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isString(value) {
  return typeof value === 'string'
}

function isDateString(value) {
  return isString(value) && value.length > 0 && !Number.isNaN(Date.parse(value))
}

function parseNode(value) {
  if (!isObject(value) || !isString(value.id) || !isObject(value.config)) return null
  const { config } = value

  if (value.type === 'scheduler') {
    if (
      !VALID_FREQUENCIES.includes(config.frequency) ||
      !isString(config.time) ||
      !VALID_WEEKDAYS.includes(config.weekday) ||
      !isString(config.timezone)
    ) return null
  } else if (value.type === 'enrollment') {
    if (!isString(config.contactName) || !isString(config.email)) return null
  } else if (value.type === 'exit') {
    if (
      !VALID_EXIT_CONDITIONS.includes(config.condition) ||
      !(config.days === null || isString(config.days) || typeof config.days === 'number')
    ) return null
  } else if (value.type === 'email') {
    if (
      config.recipient !== 'enrolled-contact' ||
      !isString(config.subject) ||
      !isString(config.body)
    ) return null
  } else {
    return null
  }

  return { id: value.id, type: value.type, config: { ...config } }
}

function parseSequence(value) {
  if (
    !isObject(value) ||
    !isString(value.id) ||
    !isString(value.name) ||
    !isDateString(value.createdAt) ||
    !isDateString(value.updatedAt) ||
    !Array.isArray(value.nodes)
  ) return null

  const nodes = value.nodes.map(parseNode)
  if (nodes.some((node) => node === null)) return null
  if (new Set(nodes.map((node) => node.id)).size !== nodes.length) return null

  for (const [type, limit] of Object.entries(NODE_LIMITS)) {
    if (countNodes(nodes, type) > limit) return null
  }

  return {
    id: value.id,
    name: value.name,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    nodes,
  }
}

function browserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function safeStorageScope(scope) {
  const normalized = typeof scope === 'string' ? scope.trim() : ''
  return normalized ? normalized.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 160) : ''
}

export function getStorageKey(scope) {
  const safeScope = safeStorageScope(scope)
  return safeScope ? `${STORAGE_KEY}.${safeScope}` : STORAGE_KEY
}

export function saveSequence(sequence, storage = browserStorage(), scope = '') {
  if (!storage) return null

  const savedAt = new Date().toISOString()
  const savedSequence = { ...cloneSequence(sequence), updatedAt: savedAt }
  const record = { version: STORAGE_VERSION, savedAt, sequence: savedSequence }

  try {
    storage.setItem(getStorageKey(scope), JSON.stringify(record))
    return record
  } catch {
    return null
  }
}

export function loadSequence(storage = browserStorage(), scope = '') {
  if (!storage) return null

  try {
    const raw = storage.getItem(getStorageKey(scope))
    if (!raw) return null

    const record = JSON.parse(raw)
    if (!isObject(record) || record.version !== STORAGE_VERSION || !isDateString(record.savedAt)) {
      return null
    }

    const sequence = parseSequence(record.sequence)
    return sequence
      ? { version: STORAGE_VERSION, savedAt: record.savedAt, sequence }
      : null
  } catch {
    return null
  }
}
