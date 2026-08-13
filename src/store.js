import { configureStore, createSelector, createSlice } from '@reduxjs/toolkit'
import {
  canAddNode,
  cloneSequence,
  createDefaultNode,
  createEmptySequence,
  createSampleSequence,
  DEFAULT_SEQUENCE_NAME,
  isSequenceDirty,
  validateSequence,
} from './workflow.js'

export function createSequenceState(saved = null) {
  const sequence = saved?.sequence ? cloneSequence(saved.sequence) : createEmptySequence()

  return {
    sequence,
    selectedNodeId: null,
    savedSnapshot: cloneSequence(sequence),
    lastSavedAt: saved?.savedAt ?? null,
  }
}

export const sequenceSlice = createSlice({
  name: 'sequence',
  initialState: createSequenceState(),
  reducers: {
    renameSequence(state, action) {
      state.sequence.name = action.payload
    },
    addNode: {
      reducer(state, action) {
        const { node, index } = action.payload
        if (!canAddNode(state.sequence.nodes, node.type).allowed) return
        if (state.sequence.nodes.some((existing) => existing.id === node.id)) return

        const insertionIndex = Math.min(
          Math.max(index ?? state.sequence.nodes.length, 0),
          state.sequence.nodes.length,
        )
        state.sequence.nodes.splice(insertionIndex, 0, node)
        state.selectedNodeId = node.id
      },
      prepare({ nodeType, index }) {
        return { payload: { node: createDefaultNode(nodeType), index } }
      },
    },
    updateNode(state, action) {
      const updatedNode = action.payload
      const index = state.sequence.nodes.findIndex((node) => node.id === updatedNode.id)
      if (index < 0 || state.sequence.nodes[index].type !== updatedNode.type) return
      state.sequence.nodes[index] = updatedNode
    },
    deleteNode(state, action) {
      const nodeId = action.payload
      const index = state.sequence.nodes.findIndex((node) => node.id === nodeId)
      if (index < 0) return

      state.sequence.nodes.splice(index, 1)
      if (state.selectedNodeId === nodeId) {
        state.selectedNodeId =
          state.sequence.nodes[index]?.id ?? state.sequence.nodes[index - 1]?.id ?? null
      }
    },
    moveNode(state, action) {
      const { nodeId, toIndex } = action.payload
      const fromIndex = state.sequence.nodes.findIndex((node) => node.id === nodeId)
      if (fromIndex < 0 || state.sequence.nodes.length < 2) return

      const destination = Math.min(Math.max(toIndex, 0), state.sequence.nodes.length - 1)
      if (destination === fromIndex) return

      const [node] = state.sequence.nodes.splice(fromIndex, 1)
      state.sequence.nodes.splice(destination, 0, node)
    },
    selectNode(state, action) {
      const nodeId = action.payload
      if (nodeId !== null && !state.sequence.nodes.some((node) => node.id === nodeId)) return
      state.selectedNodeId = nodeId
    },
    hydrateSequence(state, action) {
      const sequence = action.payload?.sequence ?? createEmptySequence()
      const savedAt = action.payload?.savedAt ?? null
      state.sequence = cloneSequence(sequence)
      state.savedSnapshot = cloneSequence(sequence)
      state.selectedNodeId = null
      state.lastSavedAt = savedAt
    },
    loadExample: {
      reducer(state, action) {
        state.sequence = action.payload
        state.selectedNodeId = null
      },
      prepare() {
        return { payload: createSampleSequence() }
      },
    },
    markSaved(state, action) {
      const savedAt = action.payload?.savedAt ?? new Date().toISOString()
      state.sequence.updatedAt = savedAt
      state.savedSnapshot = cloneSequence(state.sequence)
      state.lastSavedAt = savedAt
    },
    resetSequence(state) {
      state.sequence.name = DEFAULT_SEQUENCE_NAME
      state.sequence.nodes = []
      state.selectedNodeId = null
    },
  },
})

export const {
  renameSequence,
  addNode,
  updateNode,
  deleteNode,
  moveNode,
  selectNode,
  hydrateSequence,
  loadExample,
  markSaved,
  resetSequence,
} = sequenceSlice.actions

export const sequenceReducer = sequenceSlice.reducer

export function makeStore(preloadedState) {
  return configureStore({
    reducer: { sequence: sequenceReducer },
    preloadedState,
  })
}

export const store = makeStore()

export const selectSequenceState = (state) => state.sequence
export const selectSequence = (state) => state.sequence.sequence
export const selectSelectedNode = createSelector(
  [selectSequence, (state) => state.sequence.selectedNodeId],
  (sequence, selectedNodeId) =>
    sequence.nodes.find((node) => node.id === selectedNodeId) ?? null,
)
export const selectSequenceValidation = createSelector(
  [selectSequence],
  (sequence) => validateSequence(sequence),
)
export const selectIsDirty = createSelector(
  [selectSequence, (state) => state.sequence.savedSnapshot],
  (sequence, savedSnapshot) => isSequenceDirty(sequence, savedSnapshot),
)
export const selectReadiness = createSelector(
  [selectSequenceValidation],
  (validation) => ({
    isReady: validation.isReady,
    readyCount: validation.readyCount,
    totalCount: validation.totalCount,
    attentionCount: validation.attentionCount,
    summary: validation.summary,
  }),
)
