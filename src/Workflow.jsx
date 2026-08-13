import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  CheckCircle2,
  FileText,
  GitBranch,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { canAddNode, getNodeSummary, NODE_LABELS } from './workflow.js'

export const NODE_DETAILS = {
  scheduler: {
    icon: CalendarClock,
    description: 'Choose when this sequence starts.',
    pickerDescription: 'Choose when the sequence runs',
  },
  enrollment: {
    icon: UserPlus,
    description: 'Choose the contact who enters this sequence.',
    pickerDescription: 'Add the contact who enters',
  },
  exit: {
    icon: GitBranch,
    description: 'Decide when the contact should leave.',
    pickerDescription: 'Set when the sequence should stop',
  },
  email: {
    icon: Mail,
    description: 'Write an email for the enrolled contact.',
    pickerDescription: 'Send a message to the enrolled contact',
  },
}

export function NodeIcon({ type, size = 19 }) {
  const Icon = NODE_DETAILS[type].icon
  return <Icon aria-hidden="true" size={size} strokeWidth={1.9} />
}

function NodePicker({ nodes, onAdd, onClose }) {
  const pickerRef = useRef(null)

  useEffect(() => {
    pickerRef.current?.querySelector('button:not(:disabled)')?.focus()

    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }

    function closeOnOutsideClick(event) {
      if (!pickerRef.current?.contains(event.target)) onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [onClose])

  return (
    <div aria-label="Choose a step" className="node-picker" ref={pickerRef} role="group">
      <p className="picker-label">Add a step</p>
      {Object.entries(NODE_DETAILS).map(([type, details]) => {
        const availability = canAddNode(nodes, type)

        return (
          <button
            className="picker-option"
            disabled={!availability.allowed}
            key={type}
            onClick={() => onAdd(type)}
            title={availability.reason || undefined}
            type="button"
          >
            <span className={`picker-icon picker-icon--${type}`}>
              <NodeIcon type={type} size={17} />
            </span>
            <span>
              <strong>{NODE_LABELS[type]}</strong>
              <span>{details.pickerDescription}</span>
              {!availability.allowed && <span className="picker-limit">{availability.reason}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function AddControl({ index, nodes, openIndex, setOpenIndex, onAdd, end = false }) {
  const open = openIndex === index
  const triggerRef = useRef(null)

  function closePicker() {
    setOpenIndex(null)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <div className={`picker-anchor ${end ? 'end-add' : 'connector'}`}>
      <button
        aria-expanded={open}
        aria-label={end ? 'Add a step at the end' : `Add a step at position ${index + 1}`}
        className={end ? 'btn btn-secondary' : 'add-trigger'}
        onClick={() => setOpenIndex(open ? null : index)}
        ref={triggerRef}
        type="button"
      >
        <Plus size={end ? 16 : 15} />
        {end && 'Add step'}
      </button>
      {open && (
        <NodePicker
          nodes={nodes}
          onAdd={(type) => {
            onAdd(type, index)
            setOpenIndex(null)
          }}
          onClose={closePicker}
        />
      )}
    </div>
  )
}

function NodeCard({ node, index, total, selected, ready, onSelect, onMove, onDelete }) {
  return (
    <article className="node-card" data-node-type={node.type} data-selected={selected}>
      <button
        aria-label={`Edit ${NODE_LABELS[node.type]}: ${getNodeSummary(node)}`}
        className="node-main"
        onClick={onSelect}
        type="button"
      >
        <span className="node-icon"><NodeIcon type={node.type} /></span>
        <span className="node-copy">
          <span className="node-type">{NODE_LABELS[node.type]}</span>
          <span className="node-summary">{getNodeSummary(node)}</span>
        </span>
        <span className="status-pill" data-ready={ready}>
          {ready ? <Check size={13} /> : <AlertCircle size={13} />}
          {ready ? 'Ready' : 'Needs attention'}
        </span>
      </button>
      <div aria-label="Step controls" className="node-controls">
        <div className="node-order">
          <button
            aria-label={`Move ${NODE_LABELS[node.type]} up`}
            className="icon-button"
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
            type="button"
          >
            <ArrowUp size={14} />
          </button>
          <button
            aria-label={`Move ${NODE_LABELS[node.type]} down`}
            className="icon-button"
            disabled={index === total - 1}
            onClick={() => onMove(index + 1)}
            type="button"
          >
            <ArrowDown size={14} />
          </button>
        </div>
        <button
          aria-label={`Delete ${NODE_LABELS[node.type]}`}
          className="icon-button danger-icon"
          onClick={onDelete}
          type="button"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  )
}

export default function Workflow({
  sequence,
  validation,
  selectedNodeId,
  pickerIndex,
  onPickerChange,
  onAdd,
  onDelete,
  onMove,
  onSelect,
  onLoadExample,
}) {
  const firstStepTriggerRef = useRef(null)
  const progress = validation.totalCount
    ? Math.round((validation.readyCount / validation.totalCount) * 100)
    : 0
  const missingText = validation.missingTypes.length
    ? `Missing ${validation.missingTypes.map((type) => NODE_LABELS[type].toLowerCase()).join(', ')}`
    : validation.attentionCount
      ? `${validation.attentionCount} ${validation.attentionCount === 1 ? 'step' : 'steps'} to finish`
      : 'Everything is configured'

  return (
    <section aria-labelledby="workflow-title" className="workflow-pane">
      <div className="workflow-wrap">
        <header className="workflow-heading">
          <div>
            <p className="eyebrow">Sequence workflow</p>
            <h1 id="workflow-title">Build your sequence</h1>
            <p>Add the steps in order, then select any step to finish its setup.</p>
          </div>
          <span className="readiness-badge" data-ready={validation.valid}>
            {validation.valid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {validation.valid ? 'Ready to run' : 'Setup incomplete'}
          </span>
        </header>

        {sequence.nodes.length > 0 && (
          <div aria-label={validation.summary} className="progress-card">
            <div className="progress-copy">
              <span aria-hidden="true" className="progress-track">
                <span className="progress-fill" style={{ width: `${progress}%` }} />
              </span>
              <strong>{validation.summary}</strong>
            </div>
            <span className="missing-copy">{missingText}</span>
          </div>
        )}

        {sequence.nodes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-inner">
              <span className="empty-icon"><Sparkles size={24} /></span>
              <h2>Start with your first step</h2>
              <p>Set a schedule, enroll a contact, decide when they exit, and send a thoughtful email.</p>
              <div className="empty-actions">
                <div className="picker-anchor">
                  <button
                    aria-expanded={pickerIndex === 0}
                    className="btn btn-primary"
                    onClick={() => onPickerChange(pickerIndex === 0 ? null : 0)}
                    ref={firstStepTriggerRef}
                    type="button"
                  >
                    <Plus size={16} /> Add first step
                  </button>
                  {pickerIndex === 0 && (
                    <NodePicker
                      nodes={[]}
                      onAdd={(type) => {
                        onAdd(type, 0)
                        onPickerChange(null)
                      }}
                      onClose={() => {
                        onPickerChange(null)
                        window.requestAnimationFrame(() => firstStepTriggerRef.current?.focus())
                      }}
                    />
                  )}
                </div>
                <button className="btn btn-secondary" onClick={onLoadExample} type="button">
                  <FileText size={16} /> Load example
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="workflow-list">
            {sequence.nodes.map((node, index) => (
              <div className="step-block" key={node.id}>
                <NodeCard
                  index={index}
                  node={node}
                  onDelete={() => onDelete(node)}
                  onMove={(toIndex) => onMove(node.id, toIndex)}
                  onSelect={() => onSelect(node.id)}
                  ready={validation.nodeResults[node.id]?.valid ?? false}
                  selected={selectedNodeId === node.id}
                  total={sequence.nodes.length}
                />
                {index < sequence.nodes.length - 1 && (
                  <AddControl
                    index={index + 1}
                    nodes={sequence.nodes}
                    onAdd={onAdd}
                    openIndex={pickerIndex}
                    setOpenIndex={onPickerChange}
                  />
                )}
              </div>
            ))}
            <AddControl
              end
              index={sequence.nodes.length}
              nodes={sequence.nodes}
              onAdd={onAdd}
              openIndex={pickerIndex}
              setOpenIndex={onPickerChange}
            />
          </div>
        )}
      </div>
    </section>
  )
}
