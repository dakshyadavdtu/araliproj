import { CheckCircle2, Eye, LogOut, Save, Send } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DeleteDialog, DiscardDialog, PreviewDialog } from './Dialogs.jsx'
import Editor from './Editor.jsx'
import {
  addNode,
  deleteNode,
  loadExample,
  markSaved,
  moveNode,
  renameSequence,
  selectIsDirty,
  selectSelectedNode,
  selectSequence,
  selectSequenceState,
  selectSequenceValidation,
  selectNode,
  updateNode,
} from './store.js'
import { NODE_LABELS, saveSequence } from './workflow.js'
import Workflow from './Workflow.jsx'

function savedLabel(iso) {
  if (!iso) return 'Not saved yet'
  if (Date.now() - new Date(iso).getTime() < 60_000) return 'Saved just now'
  return `Saved at ${new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))}`
}

function AccountControl({ account, onLeave }) {
  return (
    <div className="account-control">
      {account.picture
        ? <img alt="" referrerPolicy="no-referrer" src={account.picture} />
        : <span className="account-avatar">{account.name?.slice(0, 1).toUpperCase() || 'G'}</span>}
      <span className="account-copy">
        <strong>{account.name}</strong>
        <span>{account.isGuest ? 'Demo preview' : account.email}</span>
      </span>
      <button
        aria-label={account.isGuest ? 'Exit demo preview' : 'Sign out'}
        className="icon-button"
        onClick={onLeave}
        title={account.isGuest ? 'Exit demo' : 'Sign out'}
        type="button"
      >
        <LogOut size={16} />
      </button>
    </div>
  )
}

export default function Builder({ account, onLeave }) {
  const dispatch = useDispatch()
  const sequence = useSelector(selectSequence)
  const selected = useSelector(selectSelectedNode)
  const validation = useSelector(selectSequenceValidation)
  const dirty = useSelector(selectIsDirty)
  const { selectedNodeId, lastSavedAt } = useSelector(selectSequenceState)
  const [pickerIndex, setPickerIndex] = useState(null)
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [draftChanged, setDraftChanged] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = useCallback((message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2200)
  }, [])

  const save = useCallback(() => {
    const saved = saveSequence(sequence)
    if (!saved) {
      showToast('Could not save in this browser')
      return
    }
    dispatch(markSaved({ savedAt: saved.savedAt }))
    showToast('Sequence saved')
  }, [dispatch, sequence, showToast])

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        save()
      }
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [save])

  useEffect(() => {
    function warnBeforeLeave(event) {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [dirty])

  function selectStep(nodeId) {
    if (nodeId === selectedNodeId) {
      setMobileEditorOpen(true)
      return
    }
    if (draftChanged) {
      setPendingAction({ kind: 'select', nodeId })
      return
    }
    dispatch(selectNode(nodeId))
    setMobileEditorOpen(true)
  }

  function insertStep(nodeType, index) {
    if (draftChanged) {
      setPendingAction({ kind: 'add', nodeType, index })
      return
    }
    dispatch(addNode({ nodeType, index }))
    setMobileEditorOpen(true)
  }

  function discardAndContinue() {
    if (pendingAction.kind === 'select') {
      dispatch(selectNode(pendingAction.nodeId))
    } else {
      dispatch(addNode({ nodeType: pendingAction.nodeType, index: pendingAction.index }))
    }
    setPendingAction(null)
    setDraftChanged(false)
    setMobileEditorOpen(true)
  }

  const enrollment = sequence.nodes.find((node) => node.type === 'enrollment')

  return (
    <main className="app-shell">
      <header className="topbar">
        <div aria-label="Sequences" className="brand">
          <span className="brand-mark"><Send size={18} /></span>
          <span className="brand-copy"><span>Workspace</span><strong>Sequences</strong></span>
        </div>
        <div className="sequence-title-wrap">
          <label className="sr-only" htmlFor="sequence-name">Sequence name</label>
          <input
            className="sequence-name"
            id="sequence-name"
            maxLength={80}
            onChange={(event) => dispatch(renameSequence(event.target.value))}
            value={sequence.name}
          />
        </div>
        <div className="topbar-actions">
          <div aria-live="polite" className="save-state">
            <strong data-dirty={dirty}>
              {dirty ? 'Unsaved changes' : lastSavedAt ? 'All changes saved' : 'No changes yet'}
            </strong>
            <span>{savedLabel(lastSavedAt)}</span>
          </div>
          <button aria-label="Preview sequence" className="btn btn-secondary" onClick={() => setPreviewOpen(true)} type="button">
            <Eye size={16} /><span>Preview</span>
          </button>
          <button
            aria-label="Save sequence (Ctrl/Cmd + S)"
            className="btn btn-primary"
            disabled={!dirty}
            onClick={save}
            title="Save (Ctrl/Cmd + S)"
            type="button"
          >
            <Save size={16} /><span>Save</span>
          </button>
          <AccountControl account={account} onLeave={onLeave} />
        </div>
      </header>

      <div className="builder-layout">
        <Workflow
          onAdd={insertStep}
          onDelete={setDeleteTarget}
          onLoadExample={() => {
            dispatch(loadExample())
            showToast('Example loaded — review and save when ready')
          }}
          onMove={(nodeId, toIndex) => dispatch(moveNode({ nodeId, toIndex }))}
          onPickerChange={setPickerIndex}
          onSelect={selectStep}
          pickerIndex={pickerIndex}
          selectedNodeId={selectedNodeId}
          sequence={sequence}
          validation={validation}
        />

        {mobileEditorOpen && selected && (
          <button
            aria-label="Close step editor"
            className="mobile-inspector-backdrop"
            onClick={() => setMobileEditorOpen(false)}
            type="button"
          />
        )}
        <Editor
          enrollment={enrollment}
          key={selected?.id || 'empty-editor'}
          node={selected}
          onApply={(node) => {
            dispatch(updateNode(node))
            setDraftChanged(false)
            setMobileEditorOpen(false)
            showToast(`${NODE_LABELS[node.type]} updated`)
          }}
          onClose={() => {
            setDraftChanged(false)
            setMobileEditorOpen(false)
          }}
          onDraftChange={setDraftChanged}
          open={mobileEditorOpen}
        />
      </div>

      {previewOpen && <PreviewDialog onClose={() => setPreviewOpen(false)} sequence={sequence} />}
      {deleteTarget && (
        <DeleteDialog
          onCancel={() => setDeleteTarget(null)}
          onDelete={() => {
            dispatch(deleteNode(deleteTarget.id))
            setDeleteTarget(null)
            setDraftChanged(false)
            showToast('Step deleted')
          }}
          target={deleteTarget}
        />
      )}
      {pendingAction && (
        <DiscardDialog onCancel={() => setPendingAction(null)} onDiscard={discardAndContinue} />
      )}
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} /> {toast}</div>}
    </main>
  )
}
