import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MindMap, MindNode, LayoutType, NodeStyle, LineStyle } from '../types/mindmap'
import { DEFAULT_LINE_STYLE, DEFAULT_CANVAS_BG, DEFAULT_NODE_STYLE, ROOT_NODE_STYLE, LEVEL_STYLES_DARK, LEVEL_STYLES_LIGHT } from '../types/mindmap'
import type { CanvasBackground } from '../types/mindmap'
import { useTheme } from '../composables/useTheme'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function cloneNode(node: MindNode): MindNode {
  return {
    id: generateId(),
    text: node.text,
    bold: node.bold,
    italic: node.italic,
    children: node.children.map(cloneNode),
  }
}

/** Collect all descendant ids of a node (inclusive) */
function collectIds(node: MindNode): string[] {
  const ids: string[] = [node.id]
  for (const c of node.children) ids.push(...collectIds(c))
  return ids
}

/** Collect ancestor ids from root down to (but not including) targetId.
 *  Returns [] if targetId is root or not found. */
function ancestorIds(root: MindNode, targetId: string): string[] {
  function search(node: MindNode, path: string[]): string[] | null {
    if (node.id === targetId) return path
    for (const c of node.children) {
      const found = search(c, [...path, node.id])
      if (found) return found
    }
    return null
  }
  return search(root, []) ?? []
}

const HISTORY_LIMIT = 100

/** Deep-clone a MindMap for undo snapshots (strips non-serialisable fields) */
function cloneMap(map: MindMap): MindMap {
  return JSON.parse(JSON.stringify(map))
}

export const useMindmapStore = defineStore('mindmap', () => {
  // ── State ────────────────────────────────────────────────────────────────
  const current           = ref<MindMap | null>(null)
  const showNewDialog     = ref(false)
  const showExportDialog  = ref(false)
  const showUnsavedDialog = ref(false)
  const pendingAction     = ref<(() => void) | null>(null)
  const selectedId        = ref<string | null>(null)
  const lastAddedId       = ref<string | null>(null)
  const clipboard         = ref<{ node: MindNode; cut: boolean } | null>(null)

  // ── History (undo / redo) ─────────────────────────────────────────────────
  const undoStack = ref<MindMap[]>([])
  const redoStack = ref<MindMap[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  /** Call BEFORE any mutation to push the current state onto the undo stack. */
  function pushHistory() {
    if (!current.value) return
    undoStack.value.push(cloneMap(current.value))
    if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift()
    // Any new action clears the redo branch
    redoStack.value = []
  }

  function undo() {
    if (!canUndo.value || !current.value) return
    redoStack.value.push(cloneMap(current.value))
    const prev = undoStack.value.pop()!
    current.value = prev
    // Restore selectedId only if it still exists in the restored map
    if (selectedId.value) {
      const stillExists = !!findNodeIn(prev.root, selectedId.value)
      if (!stillExists) selectedId.value = null
    }
  }

  function redo() {
    if (!canRedo.value || !current.value) return
    undoStack.value.push(cloneMap(current.value))
    const next = redoStack.value.pop()!
    current.value = next
    if (selectedId.value) {
      const stillExists = !!findNodeIn(next.root, selectedId.value)
      if (!stillExists) selectedId.value = null
    }
  }

  /** Helper for undo/redo: find a node in a given root (no store dependency) */
  function findNodeIn(root: MindNode, id: string): MindNode | null {
    const queue: MindNode[] = [root]
    while (queue.length) {
      const n = queue.shift()!
      if (n.id === id) return n
      queue.push(...n.children)
    }
    return null
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function markDirty() {
    if (!current.value) return
    current.value.dirty     = true
    current.value.updatedAt = Date.now()
  }

  /** Find a node by id (BFS). Returns null if not found. */
  function findNode(id: string): MindNode | null {
    if (!current.value) return null
    const queue: MindNode[] = [current.value.root]
    while (queue.length) {
      const n = queue.shift()!
      if (n.id === id) return n
      queue.push(...n.children)
    }
    return null
  }

  /** Find parent of a node by id. */
  function findParent(id: string): MindNode | null {
    if (!current.value) return null
    function search(node: MindNode): MindNode | null {
      for (const c of node.children) {
        if (c.id === id) return node
        const found = search(c)
        if (found) return found
      }
      return null
    }
    return search(current.value.root)
  }

  // ── Default style helpers ─────────────────────────────────────────────────

  /**
   * Compute the effective inherited default style for a node.
   * Precedence (lowest → highest):
   *   1. DEFAULT_NODE_STYLE (compile-time baseline)
   *   2. map.defaultNodeStyle (global map default)
   *   3. map.subtreeDefaults[ancestor] — ancestors from root → parent,
   *      with closer ancestors winning over farther ones
   */
  function getEffectiveDefault(nodeId: string): NodeStyle {
    if (!current.value) return { ...DEFAULT_NODE_STYLE }

    // Base: compile-time defaults only.
    // map.defaultNodeStyle is intentionally NOT merged here — it only affects
    // future new nodes (applied at creation time via stampDefaultStyle).
    let result: NodeStyle = { ...DEFAULT_NODE_STYLE }

    // Merge subtree defaults from ancestors (root → direct parent order)
    const subtreeDefaults = current.value.subtreeDefaults
    if (subtreeDefaults) {
      const ancestors = ancestorIds(current.value.root, nodeId)
      // Include the node itself — a subtree default on a node applies to its children
      // when they are being created, so we include the parent (= the node above newNode)
      for (const aid of ancestors) {
        if (subtreeDefaults[aid]) {
          result = { ...result, ...subtreeDefaults[aid] }
        }
      }
      // Also include the node's own subtree default if the node itself has one
      // (so that children of this node will inherit it, but the node's nodeStyles
      //  still takes final precedence below)
      if (subtreeDefaults[nodeId]) {
        result = { ...result, ...subtreeDefaults[nodeId] }
      }
    }

    return result
  }

  /**
   * Get the fully resolved style for a node:
   * effective default (global + subtree chain) merged with explicit per-node overrides.
   */
  function getNodeStyle(id: string): NodeStyle {
    const base = getEffectiveDefault(id)
    const override = current.value?.nodeStyles?.[id] ?? {}
    return { ...base, ...override }
  }

  /**
   * Get only the explicit per-node overrides (not merged with defaults).
   * Used internally when we need to read what was explicitly set.
   */
  function getNodeStyleOverride(id: string): NodeStyle {
    return current.value?.nodeStyles?.[id] ?? {}
  }

  // ── Node style setters ────────────────────────────────────────────────────

  /**
   * Set the global default node style (applies to all future new nodes).
   * Does NOT retroactively change existing nodes.
   */
  function setDefaultNodeStyle(patch: Partial<NodeStyle>) {
    if (!current.value) return
    pushHistory()
    current.value.defaultNodeStyle = {
      ...(current.value.defaultNodeStyle ?? DEFAULT_NODE_STYLE),
      ...patch,
    }
    markDirty()
  }

  /**
   * Reset the global default node style to the compile-time baseline.
   */
  function resetDefaultNodeStyle() {
    if (!current.value) return
    pushHistory()
    current.value.defaultNodeStyle = { ...DEFAULT_NODE_STYLE }
    markDirty()
  }

  /**
   * Set a subtree-scoped default for a node.
   * All nodes newly created inside that node's subtree will inherit this style.
   * Does NOT retroactively change existing nodes.
   */
  function setSubtreeDefault(nodeId: string, patch: Partial<NodeStyle>) {
    if (!current.value) return
    pushHistory()
    if (!current.value.subtreeDefaults) current.value.subtreeDefaults = {}
    const existing = current.value.subtreeDefaults[nodeId] ?? {}
    current.value.subtreeDefaults[nodeId] = { ...existing, ...patch }
    markDirty()
  }

  /**
   * Clear the subtree-scoped default for a node (falls back to global default).
   */
  function clearSubtreeDefault(nodeId: string) {
    if (!current.value?.subtreeDefaults) return
    pushHistory()
    delete current.value.subtreeDefaults[nodeId]
    markDirty()
  }

  /**
   * Apply a partial NodeStyle as an explicit per-node override.
   * scope:
   *   'node'     → only the given node
   *   'subtree'  → node + all descendants
   *   'all'      → every node in the map
   */
  function setNodeStyle(
    id: string,
    patch: Partial<NodeStyle>,
    scope: 'node' | 'subtree' | 'all' = 'node'
  ) {
    if (!current.value) return
    pushHistory()
    if (!current.value.nodeStyles) current.value.nodeStyles = {}
    const styles = current.value.nodeStyles

    let targetIds: string[]
    if (scope === 'all') {
      targetIds = collectIds(current.value.root)
    } else if (scope === 'subtree') {
      const node = findNode(id)
      targetIds = node ? collectIds(node) : [id]
    } else {
      targetIds = [id]
    }

    for (const tid of targetIds) {
      styles[tid] = { ...styles[tid], ...patch }
    }
    markDirty()
  }

  /** Clear explicit per-node style overrides */
  function clearNodeStyle(id: string, scope: 'node' | 'subtree' | 'all' = 'node') {
    if (!current.value?.nodeStyles) return
    pushHistory()
    const styles = current.value.nodeStyles

    let targetIds: string[]
    if (scope === 'all') {
      targetIds = collectIds(current.value.root)
    } else if (scope === 'subtree') {
      const node = findNode(id)
      targetIds = node ? collectIds(node) : [id]
    } else {
      targetIds = [id]
    }

    for (const tid of targetIds) {
      delete styles[tid]
    }
    markDirty()
  }

  // ── Line style ─────────────────────────────────────────────────────────────

  const lineStyle = computed<LineStyle>(() => current.value?.lineStyle ?? DEFAULT_LINE_STYLE)

  function setLineStyle(patch: Partial<LineStyle>) {
    if (!current.value) return
    pushHistory()
    current.value.lineStyle = { ...lineStyle.value, ...patch }
    markDirty()
  }

  // ── Canvas background ───────────────────────────────────────────────────────

  const canvasBg = computed<CanvasBackground>(() => {
    if (current.value?.background) return current.value.background
    const { theme } = useTheme()
    return {
      color: theme.value === 'dark' ? '#141416' : '#ede8e0',
      pattern: DEFAULT_CANVAS_BG.pattern,
    }
  })

  function setCanvasBg(patch: Partial<CanvasBackground>) {
    if (!current.value) return
    pushHistory()
    current.value.background = { ...canvasBg.value, ...patch }
    markDirty()
  }

  // ── CRUD actions ──────────────────────────────────────────────────────────

  function newMap(layout: LayoutType = 'radial') {
    const now = Date.now()
    const { theme } = useTheme()
    const defaultBgColor = theme.value === 'dark' ? '#141416' : '#ede8e0'
    const rootId = generateId()
    current.value = {
      id: generateId(),
      title: '未命名主题',
      layout,
      root: { id: rootId, text: '未命名主题', children: [] },
      background: { color: defaultBgColor, pattern: DEFAULT_CANVAS_BG.pattern },
      nodeStyles: { [rootId]: { ...ROOT_NODE_STYLE } },
      dirty: false,
      createdAt: now,
      updatedAt: now,
    }
    selectedId.value = null
    clipboard.value  = null
    undoStack.value  = []
    redoStack.value  = []
  }

  function updateNodeText(id: string, text: string) {
    const node = findNode(id)
    if (!node) return
    pushHistory()
    node.text = text
    if (current.value && id === current.value.root.id) current.value.title = text
    markDirty()
  }

  function toggleBold(id: string) {
    const node = findNode(id)
    if (!node) return
    pushHistory()
    node.bold = !node.bold
    // Use setNodeStyle but it will call pushHistory again — prevent double-push
    // by directly mutating nodeStyles inline (same logic as setNodeStyle 'node')
    if (!current.value) return
    if (!current.value.nodeStyles) current.value.nodeStyles = {}
    current.value.nodeStyles[id] = { ...current.value.nodeStyles[id], bold: node.bold }
    markDirty()
  }

  function toggleItalic(id: string) {
    const node = findNode(id)
    if (!node) return
    pushHistory()
    node.italic = !node.italic
    if (!current.value) return
    if (!current.value.nodeStyles) current.value.nodeStyles = {}
    current.value.nodeStyles[id] = { ...current.value.nodeStyles[id], italic: node.italic }
    markDirty()
  }

  /**
   * Compute the style to stamp onto a newly created child node.
   * Uses depth-based level styles (level 1 / 2 / 3+) keyed to the active theme.
   * Never inherits the root's accent style.
   */
  function styleForNewChild(parentId: string): NodeStyle {
    const { theme } = useTheme()
    const levelStyles = theme.value === 'dark' ? LEVEL_STYLES_DARK : LEVEL_STYLES_LIGHT

    if (!current.value) return { ...levelStyles[0] }

    // Compute child depth: parent depth + 1.  Root is depth 0, so its children are depth 1.
    const parentDepth = ancestorIds(current.value.root, parentId).length  // 0 for root's children
    const childDepth  = parentDepth + 1   // 1-based relative to root

    // depth 1 → index 0, depth 2 → index 1, depth 3+ → index 2
    const idx = Math.min(childDepth - 1, levelStyles.length - 1)
    return { ...levelStyles[Math.max(0, idx)] }
  }

  /** Add a child node under the given parent id */
  function addChild(parentId: string, text = '新节点') {
    const parent = findNode(parentId)
    if (!parent) return
    pushHistory()
    const newNode: MindNode = { id: generateId(), text, children: [] }
    parent.children.push(newNode)
    // Stamp initial style onto the new node
    if (!current.value!.nodeStyles) current.value!.nodeStyles = {}
    current.value!.nodeStyles[newNode.id] = styleForNewChild(parentId)
    lastAddedId.value = newNode.id
    selectedId.value  = newNode.id
    markDirty()
  }

  /** Add a sibling node after the given node */
  function addSibling(id: string, text = '新节点') {
    if (!current.value) return
    // Root has no sibling
    if (current.value.root.id === id) { addChild(id, text); return }
    const parent = findParent(id)
    if (!parent) return
    pushHistory()
    const idx = parent.children.findIndex(c => c.id === id)
    const newNode: MindNode = { id: generateId(), text, children: [] }
    parent.children.splice(idx + 1, 0, newNode)
    // Stamp initial style onto the new node (same logic as addChild)
    if (!current.value.nodeStyles) current.value.nodeStyles = {}
    current.value.nodeStyles[newNode.id] = styleForNewChild(parent.id)
    lastAddedId.value = newNode.id
    selectedId.value  = newNode.id
    markDirty()
  }

  /** Delete a node (and all its descendants) */
  function deleteNode(id: string) {
    if (!current.value) return
    if (current.value.root.id === id) return // cannot delete root
    const parent = findParent(id)
    if (!parent) return
    pushHistory()
    parent.children = parent.children.filter(c => c.id !== id)
    if (selectedId.value === id) selectedId.value = null
    markDirty()
  }

  /**
   * Promote (Shift+Tab): move node up one level —
   * becomes a sibling of its current parent, inserted after it.
   */
  function promoteNode(id: string) {
    if (!current.value) return
    if (current.value.root.id === id) return
    const parent = findParent(id)
    if (!parent) return
    const grandParent = findParent(parent.id)
    if (!grandParent) return // parent is root → already at level 1
    pushHistory()
    // Remove from parent
    const nodeIdx = parent.children.findIndex(c => c.id === id)
    const [node]  = parent.children.splice(nodeIdx, 1)

    // Insert after parent in grandParent
    const parentIdx = grandParent.children.findIndex(c => c.id === parent.id)
    grandParent.children.splice(parentIdx + 1, 0, node)
    selectedId.value = node.id
    markDirty()
  }

  /**
   * Move a node to a new parent (drag & drop).
   * Prevents moving to a descendant.
   */
  function moveNode(id: string, newParentId: string) {
    if (!current.value || id === newParentId) return
    const oldParent = findParent(id)
    if (!oldParent) return
    if (oldParent.id === newParentId) return // no-op
    pushHistory()
    const nodeIdx = oldParent.children.findIndex(c => c.id === id)
    const [node]  = oldParent.children.splice(nodeIdx, 1)

    const newParent = findNode(newParentId)
    if (!newParent) { oldParent.children.splice(nodeIdx, 0, node); return } // rollback
    newParent.children.push(node)
    markDirty()
  }

  // ── Clipboard ─────────────────────────────────────────────────────────────

  function copyNode(id: string) {
    const node = findNode(id)
    if (!node) return
    clipboard.value = { node: cloneNode(node), cut: false }
  }

  function cutNode(id: string) {
    if (!current.value || current.value.root.id === id) return
    const node = findNode(id)
    if (!node) return
    clipboard.value = { node: cloneNode(node), cut: true }
    // Delete original immediately on cut
    deleteNode(id)
  }

  /**
   * Paste clipboard node as a child of the given target node.
   */
  function pasteNode(targetId: string) {
    if (!clipboard.value) return
    const target = findNode(targetId)
    if (!target) return
    pushHistory()
    const pasted = cloneNode(clipboard.value.node)
    target.children.push(pasted)
    lastAddedId.value = pasted.id
    selectedId.value  = pasted.id
    markDirty()
  }

  function setLayout(layout: LayoutType) {
    if (!current.value) return
    pushHistory()
    current.value.layout = layout
    markDirty()
  }

  /** Replace the currently loaded map (or clear it with null). */
  function loadMap(map: MindMap | null) {
    if (map) {
      const { theme } = useTheme()
      const levelStyles = theme.value === 'dark' ? LEVEL_STYLES_DARK : LEVEL_STYLES_LIGHT

      // Inject theme-aware background if missing
      if (!map.background) {
        map.background = {
          color: theme.value === 'dark' ? '#141416' : '#ede8e0',
          pattern: DEFAULT_CANVAS_BG.pattern,
        }
      }

      // Stamp depth-based styles onto any nodes that have no explicit nodeStyles entry.
      // This covers: imported markdown, old files saved without per-node styles.
      if (!map.nodeStyles) map.nodeStyles = {}
      const styles = map.nodeStyles

      function stampNode(node: MindNode, depth: number) {
        if (!styles[node.id]) {
          if (depth === 0) {
            styles[node.id] = { ...ROOT_NODE_STYLE }
          } else {
            const idx = Math.min(depth - 1, levelStyles.length - 1)
            styles[node.id] = { ...levelStyles[idx] }
          }
        }
        for (const child of node.children) stampNode(child, depth + 1)
      }

      stampNode(map.root, 0)
    }
    current.value    = map
    selectedId.value = null
    clipboard.value  = null
    undoStack.value  = []
    redoStack.value  = []
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  return {
    current,
    showNewDialog,
    showExportDialog,
    showUnsavedDialog,
    pendingAction,
    selectedId,
    lastAddedId,
    clipboard,
    lineStyle,
    canvasBg,
    // undo / redo
    canUndo,
    canRedo,
    undo,
    redo,
    // helpers
    findNode,
    findParent,
    getNodeStyle,
    getNodeStyleOverride,
    getEffectiveDefault,
    // actions
    newMap,
    loadMap,
    updateNodeText,
    toggleBold,
    toggleItalic,
    addChild,
    addSibling,
    deleteNode,
    promoteNode,
    moveNode,
    copyNode,
    cutNode,
    pasteNode,
    setLayout,
    setNodeStyle,
    clearNodeStyle,
    setDefaultNodeStyle,
    resetDefaultNodeStyle,
    setSubtreeDefault,
    clearSubtreeDefault,
    setLineStyle,
    setCanvasBg,
  }
})

