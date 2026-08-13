import { AlertCircle, CheckCircle2, ChevronRight, Trash2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import {
  getNodeSummary,
  getSequenceNarrative,
  NODE_LABELS,
  validateSequence,
} from './workflow.js'
import { NodeIcon } from './Workflow.jsx'

function Modal({ title, description, children, footer, onClose, wide = false }) {
  const closeRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        aria-describedby={description ? 'dialog-description' : undefined}
        aria-labelledby="dialog-title"
        aria-modal="true"
        className={`modal-card${wide ? ' modal-card-preview' : ''}`}
        onMouseDown={(event) => event.stopPropagation()}
        ref={dialogRef}
        role="dialog"
      >
        <header className="modal-heading">
          <div>
            <h2 id="dialog-title">{title}</h2>
            {description && <p id="dialog-description">{description}</p>}
          </div>
          <button aria-label="Close dialog" className="icon-button" onClick={onClose} ref={closeRef} type="button">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  )
}

export function PreviewDialog({ sequence, onClose }) {
  const validation = validateSequence(sequence)
  const narrative = getSequenceNarrative(sequence)
  const scheduler = sequence.nodes.find((node) => node.type === 'scheduler')
  const enrollment = sequence.nodes.find((node) => node.type === 'enrollment')
  const incomplete = [...new Set(validation.issues.map((issue) => issue.message))]

  return (
    <Modal
      description="A plain-language review generated from the current workflow."
      footer={<button className="btn btn-primary" onClick={onClose} type="button">Back to editing</button>}
      onClose={onClose}
      title="Sequence preview"
      wide
    >
      <div className="preview-summary">
        <div className="preview-summary-top">
          <h3>{sequence.name.trim() || 'Untitled sequence'}</h3>
          <span className="readiness-badge" data-ready={validation.valid}>
            {validation.valid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {validation.valid ? 'Ready to run' : 'Setup incomplete'}
          </span>
        </div>
        <p>{narrative.intro}</p>
        <div className="preview-facts">
          <div className="preview-fact"><span>Steps</span><strong>{sequence.nodes.length}</strong></div>
          <div className="preview-fact"><span>Schedule</span><strong>{scheduler ? getNodeSummary(scheduler) : 'Not added'}</strong></div>
          <div className="preview-fact"><span>Contact</span><strong>{enrollment?.config.contactName || 'Not added'}</strong></div>
        </div>
      </div>
      <ol className="preview-list">
        {sequence.nodes.map((node, index) => (
          <li className="preview-step" key={node.id}>
            <span className={`preview-step-icon preview-step-icon--${node.type}`}>
              <NodeIcon type={node.type} size={15} />
            </span>
            <span className="preview-step-copy">
              <strong>{NODE_LABELS[node.type]}</strong>
              <span>{getNodeSummary(node)}</span>
            </span>
            <span className="preview-step-number">{index + 1}</span>
          </li>
        ))}
      </ol>
      {incomplete.length > 0 && (
        <div className="incomplete-callout">
          <AlertCircle size={16} />
          <span><strong>Before this can run:</strong> {incomplete.join(' ')}</span>
        </div>
      )}
    </Modal>
  )
}

export function DeleteDialog({ target, onCancel, onDelete }) {
  return (
    <Modal
      description="This will remove the step and its settings from the sequence."
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onCancel} type="button">Keep step</button>
          <button className="btn btn-danger" onClick={onDelete} type="button">
            <Trash2 size={15} /> Delete step
          </button>
        </>
      )}
      onClose={onCancel}
      title={`Delete ${NODE_LABELS[target.type].toLowerCase()}?`}
    >
      <p className="dialog-copy">{getNodeSummary(target)}</p>
    </Modal>
  )
}

export function DiscardDialog({ onCancel, onDiscard }) {
  return (
    <Modal
      description="You have changes in the current step that have not been applied."
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onCancel} type="button">Keep editing</button>
          <button className="btn btn-danger" onClick={onDiscard} type="button">
            Discard and continue <ChevronRight size={15} />
          </button>
        </>
      )}
      onClose={onCancel}
      title="Discard unapplied edits?"
    >
      <p className="dialog-copy">Apply your changes first if you want to keep them.</p>
    </Modal>
  )
}

export function LeaveDialog({ onCancel, onLeave }) {
  return (
    <Modal
      description="This sequence has changes that have not been saved in this browser."
      footer={(
        <>
          <button className="btn btn-secondary" onClick={onCancel} type="button">Stay and review</button>
          <button className="btn btn-danger" onClick={onLeave} type="button">
            Leave without saving <ChevronRight size={15} />
          </button>
        </>
      )}
      onClose={onCancel}
      title="Leave with unsaved changes?"
    >
      <p className="dialog-copy">Save applied changes, or apply the current step edits, before leaving if you want to keep them.</p>
    </Modal>
  )
}
