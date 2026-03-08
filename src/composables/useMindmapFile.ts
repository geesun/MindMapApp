import { save, open } from '@tauri-apps/plugin-dialog'
import { writeFile, readTextFile } from '@tauri-apps/plugin-fs'
import { deleteDraft } from './useAutosave'
import type { MindMap, MindNode, NodeStyle, LineStyle, CanvasBackground, LayoutType } from '../types/mindmap'
import { DEFAULT_LINE_STYLE, DEFAULT_CANVAS_BG, DEFAULT_NODE_STYLE } from '../types/mindmap'
import { useMindmapStore } from '../stores/mindmap'
import { useRecentFiles } from './useRecentFiles'

// ── Mini YAML frontmatter parser ──────────────────────────────────────────────
// Only handles the fixed known fields used in our format. No general YAML needed.

function parseColor(val: string): string {
  return val.replace(/^["']|["']$/g, '').trim()
}

function parseNumber(val: string): number {
  return Number(val.trim())
}

function parseString(val: string): string {
  return val.replace(/^["']|["']$/g, '').trim()
}

/** Parse the YAML frontmatter block (content between the two --- lines) */
function parseFrontmatter(yaml: string): Partial<{
  layout: LayoutType
  background: CanvasBackground
  lineStyle: LineStyle
  defaultNodeStyle: NodeStyle
}> {
  const result: ReturnType<typeof parseFrontmatter> = {}

  // layout
  const layoutMatch = yaml.match(/^\s{2}layout:\s*(.+)$/m)
  if (layoutMatch) {
    const v = parseString(layoutMatch[1])
    if (v === 'radial' || v === 'tree-lr' || v === 'tree-tb') {
      result.layout = v
    }
  }

  // background.color
  const bgColorMatch = yaml.match(/^\s{4}color:\s*(.+)$/m)
  // background.pattern
  const bgPatternMatch = yaml.match(/^\s{4}pattern:\s*(.+)$/m)
  if (bgColorMatch || bgPatternMatch) {
    result.background = {
      color: bgColorMatch ? parseColor(bgColorMatch[1]) : DEFAULT_CANVAS_BG.color,
      pattern: bgPatternMatch
        ? (parseString(bgPatternMatch[1]) as CanvasBackground['pattern'])
        : DEFAULT_CANVAS_BG.pattern,
    }
  }

  // lineStyle section — find it by grabbing content under "lineStyle:"
  const lineStyleSection = yaml.match(/^\s{2}lineStyle:\s*\n((?:\s{4}.+\n?)*)/m)
  if (lineStyleSection) {
    const sec = lineStyleSection[1]
    const ls: Partial<LineStyle> = {}
    const colorM = sec.match(/^\s{4}color:\s*(.+)$/m)
    const widthM = sec.match(/^\s{4}width:\s*(.+)$/m)
    const typeM  = sec.match(/^\s{4}type:\s*(.+)$/m)
    const curveM = sec.match(/^\s{4}curve:\s*(.+)$/m)
    if (colorM) ls.color = parseColor(colorM[1])
    if (widthM) ls.width = parseNumber(widthM[1])
    if (typeM)  ls.type  = parseString(typeM[1]) as LineStyle['type']
    if (curveM) ls.curve = parseString(curveM[1]) as LineStyle['curve']
    result.lineStyle = { ...DEFAULT_LINE_STYLE, ...ls }
  }

  // defaultNodeStyle section
  const defNodeSection = yaml.match(/^\s{2}defaultNodeStyle:\s*\n((?:\s{4}.+\n?)*)/m)
  if (defNodeSection) {
    const sec = defNodeSection[1]
    const ns: Partial<NodeStyle> = {}
    const bgM    = sec.match(/^\s{4}bg:\s*(.+)$/m)
    const tcM    = sec.match(/^\s{4}textColor:\s*(.+)$/m)
    const shapeM = sec.match(/^\s{4}shape:\s*(.+)$/m)
    const boldM  = sec.match(/^\s{4}bold:\s*(.+)$/m)
    const italicM= sec.match(/^\s{4}italic:\s*(.+)$/m)
    if (bgM)    ns.bg        = parseColor(bgM[1])
    if (tcM)    ns.textColor = parseColor(tcM[1])
    if (shapeM) ns.shape     = parseString(shapeM[1]) as NodeStyle['shape']
    if (boldM)  ns.bold      = parseString(boldM[1]) === 'true'
    if (italicM)ns.italic    = parseString(italicM[1]) === 'true'
    result.defaultNodeStyle = { ...DEFAULT_NODE_STYLE, ...ns }
  }

  return result
}

/** Serialize a NodeStyle object to compact JSON, omitting undefined/default values */
function styleToJson(style: NodeStyle): string {
  // Only include fields that deviate from a clean slate (avoid storing empty keys)
  const out: Record<string, unknown> = {}
  if (style.bg          !== undefined) out.bg          = style.bg
  if (style.textColor   !== undefined) out.textColor   = style.textColor
  if (style.bold        !== undefined) out.bold        = style.bold
  if (style.italic      !== undefined) out.italic      = style.italic
  if (style.underline   !== undefined) out.underline   = style.underline
  if (style.strikethrough !== undefined) out.strikethrough = style.strikethrough
  if (style.borderWidth !== undefined) out.borderWidth = style.borderWidth
  if (style.borderColor !== undefined) out.borderColor = style.borderColor
  if (style.shape       !== undefined) out.shape       = style.shape
  return JSON.stringify(out)
}

// ── Serializer ────────────────────────────────────────────────────────────────

/** Compare two NodeStyle objects field-by-field for equality */
function stylesEqual(a: NodeStyle, b: NodeStyle): boolean {
  const keys: (keyof NodeStyle)[] = [
    'bg', 'textColor', 'bold', 'italic', 'underline', 'strikethrough',
    'borderWidth', 'borderColor', 'shape',
  ]
  for (const k of keys) {
    if (a[k] !== b[k]) return false
  }
  return true
}

export function serialize(map: MindMap): string {
  const lines: string[] = []

  // The global default style that every node starts from.
  // A nodeStyle entry that equals this is redundant and can be omitted.
  const globalDefault: NodeStyle = { ...DEFAULT_NODE_STYLE }

  // ── YAML frontmatter ──
  lines.push('---')
  lines.push('mindmap:')
  lines.push('  version: 1')
  lines.push(`  layout: ${map.layout}`)

  const bg = map.background ?? DEFAULT_CANVAS_BG
  lines.push('  background:')
  lines.push(`    color: "${bg.color}"`)
  lines.push(`    pattern: ${bg.pattern}`)

  const ls = map.lineStyle ?? DEFAULT_LINE_STYLE
  lines.push('  lineStyle:')
  lines.push(`    color: "${ls.color}"`)
  lines.push(`    width: ${ls.width}`)
  lines.push(`    type: ${ls.type}`)
  lines.push(`    curve: ${ls.curve}`)

  lines.push('---')
  lines.push('')

  // ── Node tree ──
  function serializeNode(node: MindNode, depth: number) {
    const prefix = '#'.repeat(depth + 1)
    // \n in text ↔ <br> in markdown
    const text = node.text.replace(/\n/g, '<br>')
    lines.push(`${prefix} ${text}`)

    // Per-node style comment — only write if it differs from the global default.
    const ns = map.nodeStyles?.[node.id]
    if (ns && Object.keys(ns).length > 0) {
      const effective: NodeStyle = { ...globalDefault, ...ns }
      if (!stylesEqual(effective, globalDefault)) {
        lines.push(`<!-- style: ${styleToJson(ns)} -->`)
      }
    }

    lines.push('')

    for (const child of node.children) {
      serializeNode(child, depth + 1)
    }
  }

  serializeNode(map.root, 0)

  return lines.join('\n')
}

// ── Deserializer ──────────────────────────────────────────────────────────────

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function deserialize(content: string, filePath: string): MindMap {
  const now = Date.now()

  // Split frontmatter
  let yamlContent = ''
  let body = content

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (fmMatch) {
    yamlContent = fmMatch[1]
    body = fmMatch[2]
  }

  const fm = parseFrontmatter(yamlContent)

  // Parse heading lines + comments
  type RawNode = {
    depth: number
    text: string
    nodeStyle?: NodeStyle
    subtreeDefault?: NodeStyle
  }

  const rawNodes: RawNode[] = []
  const bodyLines = body.split(/\r?\n/)
  let i = 0

  while (i < bodyLines.length) {
    const line = bodyLines[i]
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const depth = headingMatch[1].length - 1
      const text = headingMatch[2].trim().replace(/<br>/gi, '\n')
      const raw: RawNode = { depth, text }

      // Look ahead for comment lines immediately following
      let j = i + 1
      while (j < bodyLines.length) {
        const nextLine = bodyLines[j].trim()
        const styleCommentMatch = nextLine.match(/^<!--\s*style:\s*(\{.*\})\s*-->$/)
        const subtreeCommentMatch = nextLine.match(/^<!--\s*subtreeDefault:\s*(\{.*\})\s*-->$/)
        if (styleCommentMatch) {
          try { raw.nodeStyle = JSON.parse(styleCommentMatch[1]) } catch { /* ignore */ }
          j++
        } else if (subtreeCommentMatch) {
          try { raw.subtreeDefault = JSON.parse(subtreeCommentMatch[1]) } catch { /* ignore */ }
          j++
        } else if (nextLine === '') {
          j++
          // Keep scanning blank lines between comments and next heading
        } else {
          break
        }
      }
      // Only advance past the comments we consumed (not blank lines after)
      // We already handled i++ below; reset i based on what we peeked
      rawNodes.push(raw)
      i = j
    } else {
      i++
    }
  }

  // Build node tree
  const nodeStyles: Record<string, NodeStyle> = {}
  const subtreeDefaults: Record<string, NodeStyle> = {}

  function buildTree(index: number, parentDepth: number): { node: MindNode; nextIndex: number } | null {
    if (index >= rawNodes.length) return null
    const raw = rawNodes[index]
    if (raw.depth !== parentDepth + 1) return null

    const node: MindNode = {
      id: generateId(),
      text: raw.text,
      children: [],
    }

    if (raw.nodeStyle && Object.keys(raw.nodeStyle).length > 0) {
      nodeStyles[node.id] = raw.nodeStyle
    }
    if (raw.subtreeDefault && Object.keys(raw.subtreeDefault).length > 0) {
      subtreeDefaults[node.id] = raw.subtreeDefault
    }

    let nextIndex = index + 1
    while (nextIndex < rawNodes.length) {
      const childResult = buildTree(nextIndex, raw.depth)
      if (!childResult) break
      node.children.push(childResult.node)
      nextIndex = childResult.nextIndex
    }

    return { node, nextIndex }
  }

  let root: MindNode
  if (rawNodes.length === 0 || rawNodes[0].depth !== 0) {
    // Fallback: empty root
    root = { id: generateId(), text: '未命名主题', children: [] }
  } else {
    const rootRaw = rawNodes[0]
    root = { id: generateId(), text: rootRaw.text, children: [] }
    if (rootRaw.nodeStyle && Object.keys(rootRaw.nodeStyle).length > 0) {
      nodeStyles[root.id] = rootRaw.nodeStyle
    }
    if (rootRaw.subtreeDefault && Object.keys(rootRaw.subtreeDefault).length > 0) {
      subtreeDefaults[root.id] = rootRaw.subtreeDefault
    }

    let nextIndex = 1
    while (nextIndex < rawNodes.length) {
      const childResult = buildTree(nextIndex, 0)
      if (!childResult) break
      root.children.push(childResult.node)
      nextIndex = childResult.nextIndex
    }
  }

  const map: MindMap = {
    id: generateId(),
    title: root.text,
    layout: fm.layout ?? 'radial',
    root,
    filePath,
    dirty: false,
    createdAt: now,
    updatedAt: now,
    background: fm.background,
    lineStyle: fm.lineStyle,
    nodeStyles: Object.keys(nodeStyles).length > 0 ? nodeStyles : undefined,
  }

  return map
}

/** Parse headings AND markdown lists from content (no frontmatter / style comments).
 *  Used for Import — creates a plain map with no styles.
 *
 *  Rules:
 *  - `# Heading` at level N → raw depth N-1 (# = 0, ## = 1, …)
 *  - `- item` / `* item` at indent I (0-based, unit = 2 spaces or 1 tab) under the
 *    most recent heading → raw depth = heading_depth + 1 + I
 *  - Depths are then normalized so the minimum depth becomes 0.
 */
export function importFromMarkdown(content: string): MindMap {
  const now = Date.now()

  type RawNode = { depth: number; text: string }
  const rawNodes: RawNode[] = []

  // Track the depth of the most recent heading so list items know where to attach.
  let lastHeadingDepth = -1

  for (const line of content.split(/\r?\n/)) {
    // Heading line: # text
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const depth = headingMatch[1].length - 1
      rawNodes.push({ depth, text: headingMatch[2].trim() })
      lastHeadingDepth = depth
      continue
    }

    // List item line: leading spaces/tabs then - or * or digit.
    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/)
    if (listMatch) {
      const indent = listMatch[1]
      // Compute indent level: each 2 spaces or 1 tab = 1 level
      const indentLevel = Math.floor(indent.replace(/\t/g, '  ').length / 2)
      // Attach under the last heading (or virtual depth -1 if no heading seen yet)
      const baseDepth = lastHeadingDepth >= 0 ? lastHeadingDepth : -1
      rawNodes.push({ depth: baseDepth + 1 + indentLevel, text: listMatch[3].trim() })
    }
  }

  if (rawNodes.length === 0) {
    const root: MindNode = { id: generateId(), text: '未命名主题', children: [] }
    return { id: generateId(), title: root.text, layout: 'radial', root, dirty: false, createdAt: now, updatedAt: now }
  }

  // Normalize depths so the minimum depth becomes 0
  const minDepth = rawNodes.reduce((m, r) => Math.min(m, r.depth), rawNodes[0].depth)
  for (const r of rawNodes) r.depth -= minDepth

  function buildTree(index: number, parentDepth: number): { node: MindNode; nextIndex: number } | null {
    if (index >= rawNodes.length) return null
    const raw = rawNodes[index]
    if (raw.depth !== parentDepth + 1) return null

    const node: MindNode = { id: generateId(), text: raw.text, children: [] }
    let nextIndex = index + 1
    while (nextIndex < rawNodes.length) {
      const r = buildTree(nextIndex, raw.depth)
      if (!r) break
      node.children.push(r.node)
      nextIndex = r.nextIndex
    }
    return { node, nextIndex }
  }

  let root: MindNode
  if (rawNodes[0].depth === 0) {
    root = { id: generateId(), text: rawNodes[0].text, children: [] }
    let nextIndex = 1
    while (nextIndex < rawNodes.length) {
      const r = buildTree(nextIndex, 0)
      if (!r) break
      root.children.push(r.node)
      nextIndex = r.nextIndex
    }
  } else {
    // Multiple roots (e.g. file starts with ## — after normalization they're at depth 0)
    // Shouldn't happen after normalization, but handle it by wrapping in a synthetic root
    root = { id: generateId(), text: '未命名主题', children: [] }
    let nextIndex = 0
    while (nextIndex < rawNodes.length) {
      const r = buildTree(nextIndex, 0)
      if (!r) { nextIndex++; continue }
      root.children.push(r.node)
      nextIndex = r.nextIndex
    }
  }

  return {
    id: generateId(),
    title: root.text,
    layout: 'radial',
    root,
    dirty: false,
    createdAt: now,
    updatedAt: now,
  }
}

// ── File I/O ──────────────────────────────────────────────────────────────────

async function writeMapToFile(map: MindMap, filePath: string): Promise<void> {
  const content = serialize(map)
  const encoder = new TextEncoder()
  await writeFile(filePath, encoder.encode(content))
}

export function useMindmapFile() {
  const store = useMindmapStore()
  const { addRecentFile } = useRecentFiles()

  /** Guard against unsaved changes. If dirty, shows UnsavedDialog; otherwise runs action immediately. */
  function guardDirty(action: () => void): void {
    if (store.current?.dirty) {
      store.pendingAction = action
      store.showUnsavedDialog = true
    } else {
      action()
    }
  }

  async function saveMap(): Promise<void> {
    if (!store.current) return
    if (store.current.filePath) {
      await writeMapToFile(store.current, store.current.filePath)
      store.current.dirty = false
      addRecentFile(store.current.filePath, store.current.title)
      await deleteDraft(store.current.id)
    } else {
      await saveMapAs()
    }
  }

  async function saveMapAs(): Promise<void> {
    if (!store.current) return
    const filePath = await save({
      defaultPath: `${store.current.title}.mindmap.md`,
      filters: [{ name: 'MindMap Markdown', extensions: ['mindmap.md'] }],
    })
    if (!filePath) return
    await writeMapToFile(store.current, filePath)
    const mapId = store.current.id
    store.current.filePath = filePath
    store.current.dirty = false
    addRecentFile(filePath, store.current.title)
    await deleteDraft(mapId)
  }

  async function openMap(): Promise<void> {
    const filePath = await open({
      multiple: false,
      filters: [{ name: 'MindMap Markdown', extensions: ['mindmap.md'] }],
    })
    if (!filePath || typeof filePath !== 'string') return
    const content = await readTextFile(filePath)
    const map = deserialize(content, filePath)
    store.loadMap(map)
    addRecentFile(filePath, map.title)
  }

  async function importMarkdown(): Promise<void> {
    const filePath = await open({
      multiple: false,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    if (!filePath || typeof filePath !== 'string') return
    const content = await readTextFile(filePath)
    const map = importFromMarkdown(content)
    store.loadMap(map)
  }

  async function openRecentFile(filePath: string): Promise<void> {
    try {
      const content = await readTextFile(filePath)
      const map = deserialize(content, filePath)
      store.loadMap(map)
      addRecentFile(filePath, map.title)
    } catch {
      // File may have been moved/deleted — remove from recents
      const { removeRecentFile } = useRecentFiles()
      removeRecentFile(filePath)
    }
  }

  return { guardDirty, saveMap, saveMapAs, openMap, openRecentFile, importMarkdown }
}
