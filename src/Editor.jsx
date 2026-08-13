import { AlertCircle, Eye, PanelRight, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NODE_LABELS, validateNode } from './workflow.js'
import { NODE_DETAILS, NodeIcon } from './Workflow.jsx'

const WEEKDAYS = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
]

const TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p className="field-error" id={id} role="alert">
      <AlertCircle aria-hidden="true" size={13} /> {message}
    </p>
  )
}

function SchedulerFields({ draft, update, errors }) {
  const zones = TIMEZONES.includes(draft.config.timezone)
    ? TIMEZONES
    : [draft.config.timezone, ...TIMEZONES].filter(Boolean)

  return (
    <div className="form-section">
      <div className="form-field">
        <span className="field-label">Frequency <span className="required-mark">*</span></span>
        <div
          aria-describedby={errors.frequency ? 'frequency-error' : undefined}
          aria-label="Frequency"
          aria-required="true"
          className="segmented-control"
          role="group"
        >
          {[
            ['daily', 'Daily'],
            ['weekdays', 'Weekdays'],
            ['weekly', 'Weekly'],
          ].map(([value, label]) => (
            <button
              aria-pressed={draft.config.frequency === value}
              className="segment"
              data-selected={draft.config.frequency === value}
              key={value}
              onClick={() => update({
                frequency: value,
                weekday: value === 'weekly' ? draft.config.weekday : '',
              })}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <FieldError id="frequency-error" message={errors.frequency} />
      </div>

      <div className="field-row">
        <div className="form-field">
          <label htmlFor="schedule-time">Time <span className="required-mark">*</span></label>
          <input
            aria-describedby={errors.time ? 'time-error' : undefined}
            aria-invalid={Boolean(errors.time)}
            className="text-input"
            id="schedule-time"
            onChange={(event) => update({ time: event.target.value })}
            required
            type="time"
            value={draft.config.time}
          />
          <FieldError id="time-error" message={errors.time} />
        </div>
        {draft.config.frequency === 'weekly' && (
          <div className="form-field">
            <label htmlFor="schedule-weekday">Weekday <span className="required-mark">*</span></label>
            <select
              aria-invalid={Boolean(errors.weekday)}
              aria-describedby={errors.weekday ? 'weekday-error' : undefined}
              className="select-input"
              id="schedule-weekday"
              onChange={(event) => update({ weekday: event.target.value })}
              required
              value={draft.config.weekday}
            >
              <option value="">Choose day</option>
              {WEEKDAYS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <FieldError id="weekday-error" message={errors.weekday} />
          </div>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="schedule-timezone">Timezone <span className="required-mark">*</span></label>
        <select
          aria-describedby={errors.timezone ? 'timezone-error' : 'timezone-hint'}
          aria-invalid={Boolean(errors.timezone)}
          className="select-input"
          id="schedule-timezone"
          onChange={(event) => update({ timezone: event.target.value })}
          required
          value={draft.config.timezone}
        >
          {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </select>
        <p className="field-hint" id="timezone-hint">Times will follow this timezone.</p>
        <FieldError id="timezone-error" message={errors.timezone} />
      </div>
    </div>
  )
}

function EnrollmentFields({ draft, update, errors }) {
  return (
    <div className="form-section">
      <div className="form-field">
        <label htmlFor="contact-name">Contact name <span className="required-mark">*</span></label>
        <input
          aria-describedby={errors.contactName ? 'contact-name-error' : undefined}
          aria-invalid={Boolean(errors.contactName)}
          autoComplete="name"
          className="text-input"
          id="contact-name"
          onChange={(event) => update({ contactName: event.target.value })}
          placeholder="Alex Morgan"
          required
          value={draft.config.contactName}
        />
        <FieldError id="contact-name-error" message={errors.contactName} />
      </div>
      <div className="form-field">
        <label htmlFor="contact-email">Email address <span className="required-mark">*</span></label>
        <input
          aria-describedby={errors.email ? 'contact-email-error' : 'contact-email-hint'}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className="text-input"
          id="contact-email"
          inputMode="email"
          onChange={(event) => update({ email: event.target.value })}
          placeholder="alex@example.com"
          required
          type="email"
          value={draft.config.email}
        />
        <p className="field-hint" id="contact-email-hint">This contact receives every email in the sequence.</p>
        <FieldError id="contact-email-error" message={errors.email} />
      </div>
    </div>
  )
}

function ExitFields({ draft, update, errors }) {
  const options = [
    ['replies', 'Contact replies', 'Stop after any reply is received.'],
    ['opens-email', 'Contact opens an email', 'Stop after an email open is recorded.'],
    ['after-days', 'After a number of days', 'Stop after a fixed time in the sequence.'],
  ]

  return (
    <div className="form-section">
      <div className="form-field">
        <span className="field-label">Leave the sequence when <span className="required-mark">*</span></span>
        <div
          aria-describedby={errors.condition ? 'condition-error' : undefined}
          aria-label="Exit condition"
          aria-required="true"
          className="radio-stack"
          role="radiogroup"
        >
          {options.map(([value, title, description]) => (
            <label className="radio-option" data-selected={draft.config.condition === value} key={value}>
              <input
                checked={draft.config.condition === value}
                name="exit-condition"
                onChange={() => update({
                  condition: value,
                  days: value === 'after-days' ? draft.config.days : null,
                })}
                required
                type="radio"
              />
              <span className="radio-copy">
                <strong>{title}</strong>
                <span>{description}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="condition-error" message={errors.condition} />
      </div>
      {draft.config.condition === 'after-days' && (
        <div className="form-field">
          <label htmlFor="exit-days">Number of days <span className="required-mark">*</span></label>
          <input
            aria-describedby={errors.days ? 'days-error' : undefined}
            aria-invalid={Boolean(errors.days)}
            className="text-input"
            id="exit-days"
            min="1"
            onChange={(event) => update({ days: event.target.value === '' ? null : Number(event.target.value) })}
            required
            step="1"
            type="number"
            value={draft.config.days ?? ''}
          />
          <FieldError id="days-error" message={errors.days} />
        </div>
      )}
    </div>
  )
}

function EmailFields({ draft, enrollment, update, errors }) {
  const name = enrollment?.config.contactName.trim() || 'Enrolled contact'
  const email = enrollment?.config.email.trim() || 'Uses the enrollment email'

  return (
    <div className="form-section">
      <div className="form-field">
        <span className="field-label">Recipient</span>
        <div className="recipient-context">
          <span className="recipient-avatar"><Users size={14} /></span>
          <span><strong>{name}</strong><span>{email}</span></span>
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="email-subject">Subject <span className="required-mark">*</span></label>
        <input
          aria-describedby={errors.subject ? 'subject-error' : undefined}
          aria-invalid={Boolean(errors.subject)}
          className="text-input"
          id="email-subject"
          maxLength={120}
          onChange={(event) => update({ subject: event.target.value })}
          placeholder="Welcome to Acme"
          required
          value={draft.config.subject}
        />
        <FieldError id="subject-error" message={errors.subject} />
      </div>
      <div className="form-field">
        <label htmlFor="email-body">Message <span className="required-mark">*</span></label>
        <textarea
          aria-describedby={errors.body ? 'body-error' : 'body-hint'}
          aria-invalid={Boolean(errors.body)}
          className="textarea-input"
          id="email-body"
          onChange={(event) => update({ body: event.target.value })}
          placeholder={`Hi ${enrollment?.config.contactName.split(' ')[0] || 'there'},\n\nWrite your message here.`}
          required
          value={draft.config.body}
        />
        <p className="field-hint" id="body-hint">Plain text keeps this sequence easy to review.</p>
        <FieldError id="body-error" message={errors.body} />
      </div>
      {(draft.config.subject || draft.config.body) && (
        <div className="email-preview">
          <div className="email-preview-label"><Eye size={13} /> Email preview</div>
          <div className="email-preview-content">
            <strong>{draft.config.subject || 'No subject'}</strong>
            <p>{draft.config.body || 'Your message will appear here.'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Editor({ node, enrollment, open, onClose, onApply, onDraftChange }) {
  const [draft, setDraft] = useState(() => node ? structuredClone(node) : null)
  const [showErrors, setShowErrors] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 860px)').matches)
  const inspectorRef = useRef(null)
  const changed = Boolean(node && draft && JSON.stringify(node.config) !== JSON.stringify(draft.config))
  const validation = useMemo(() => draft ? validateNode(draft) : null, [draft])
  const errors = showErrors ? validation?.errors || {} : {}

  const cancel = useCallback(() => {
    setDraft(node ? structuredClone(node) : null)
    setShowErrors(false)
    onDraftChange(false)
    onClose()
  }, [node, onClose, onDraftChange])

  useEffect(() => {
    onDraftChange(changed)
    return () => onDraftChange(false)
  }, [changed, onDraftChange])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)')
    const updateMobile = () => setIsMobile(media.matches)
    updateMobile()
    media.addEventListener('change', updateMobile)
    return () => media.removeEventListener('change', updateMobile)
  }, [])

  useEffect(() => {
    if (!isMobile || !open || !node) return undefined

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => {
      inspectorRef.current?.querySelector('input, select, textarea, button')?.focus()
    })

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancel()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = inspectorRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [cancel, isMobile, node, open])

  function update(config) {
    setDraft((current) => ({ ...current, config: { ...current.config, ...config } }))
  }

  function apply() {
    setShowErrors(true)
    if (!draft || !validation?.valid) {
      window.requestAnimationFrame(() => {
        inspectorRef.current?.querySelector('[aria-invalid="true"]')?.focus()
      })
      return
    }
    onApply(draft)
    setShowErrors(false)
  }

  return (
    <aside
      aria-hidden={isMobile && !open ? 'true' : undefined}
      aria-label="Step editor"
      aria-modal={isMobile && open ? 'true' : undefined}
      className="inspector"
      data-open={open}
      inert={isMobile && !open ? true : undefined}
      ref={inspectorRef}
      role={isMobile && open ? 'dialog' : undefined}
    >
      {!node || !draft ? (
        <div className="inspector-empty">
          <div>
            <span className="inspector-empty-icon"><PanelRight size={21} /></span>
            <h2>Select a step to edit</h2>
            <p>Your workflow stays visible while you fine-tune each step.</p>
          </div>
        </div>
      ) : (
        <div className="inspector-inner" data-node-type={draft.type}>
          <header className="inspector-header">
            <div className="inspector-heading">
              <span className="node-icon"><NodeIcon type={draft.type} /></span>
              <div>
                <p className="eyebrow">Step settings</p>
                <h2>{NODE_LABELS[draft.type]}</h2>
                <p>{NODE_DETAILS[draft.type].description}</p>
              </div>
            </div>
            <button aria-label="Close step editor" className="icon-button mobile-only" onClick={cancel} type="button">
              <X size={18} />
            </button>
          </header>
          <div className="inspector-body">
            {draft.type === 'scheduler' && <SchedulerFields draft={draft} errors={errors} update={update} />}
            {draft.type === 'enrollment' && <EnrollmentFields draft={draft} errors={errors} update={update} />}
            {draft.type === 'exit' && <ExitFields draft={draft} errors={errors} update={update} />}
            {draft.type === 'email' && <EmailFields draft={draft} enrollment={enrollment} errors={errors} update={update} />}
          </div>
          <footer className="inspector-footer">
            <span aria-live="polite">{changed && <span className="draft-state">Unapplied edits</span>}</span>
            <div className="button-row">
              <button className="btn btn-quiet" onClick={cancel} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={apply} type="button">Apply changes</button>
            </div>
          </footer>
        </div>
      )}
    </aside>
  )
}
