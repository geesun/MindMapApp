export type LayoutType = 'radial' | 'tree-lr' | 'tree-tb'

export interface MindNode {
  id: string
  text: string
  bold?: boolean
  italic?: boolean
  children: MindNode[]
}

export type NodeShape = 'rect' | 'rounded' | 'pill' | 'ellipse' | 'hexagon'

/** Per-node visual overrides (all fields optional — undefined means "use default") */
export interface NodeStyle {
  bg?:           string     // background color
  textColor?:    string     // text color
  bold?:         boolean    // bold text
  italic?:       boolean    // italic text
  underline?:    boolean    // underline text
  strikethrough?: boolean   // strikethrough text
  borderWidth?:  number     // 0 = no border
  borderColor?:  string     // border color (defaults to textColor)
  shape?:        NodeShape  // node shape
}

/** Global line (connection) style for the whole map */
export interface LineStyle {
  color:     string              // hex
  width:     number              // px 1-8
  type:      'solid' | 'dashed' | 'dotted'
  curve:     'bezier' | 'elbow' // connection path style
}

export const DEFAULT_LINE_STYLE: LineStyle = {
  color: '#999999',
  width: 2,
  type:  'solid',
  curve: 'bezier',
}

export type CanvasBgPattern = 'none' | 'dots' | 'grid' | 'diagonal'

/** Canvas background for the whole map */
export interface CanvasBackground {
  color:   string            // hex background color
  pattern: CanvasBgPattern   // overlay pattern
}

export const DEFAULT_CANVAS_BG: CanvasBackground = {
  color:   '#1e1e2e',
  pattern: 'dots',
}

export const DEFAULT_NODE_STYLE: NodeStyle = {
  bg:          '#ffffff',
  textColor:   '#1a1a1a',
  bold:        false,
  italic:      false,
  underline:   false,
  strikethrough: false,
  borderWidth: 0,
  borderColor: '#999999',
  shape:       'rounded',
}

/**
 * Modern dark-theme default for newly created nodes.
 * Subtle dark surface, soft light text, no border.
 */
export const DEFAULT_NODE_STYLE_DARK: NodeStyle = {
  bg:          '#2a2a3c',
  textColor:   '#e2e8f0',
  bold:        false,
  italic:      false,
  underline:   false,
  strikethrough: false,
  borderWidth: 0,
  borderColor: '#555577',
  shape:       'rounded',
}

/**
 * Modern light-theme default for newly created nodes.
 * Clean white card, near-black text, no border.
 */
export const DEFAULT_NODE_STYLE_LIGHT: NodeStyle = {
  bg:          '#ffffff',
  textColor:   '#1e293b',
  bold:        false,
  italic:      false,
  underline:   false,
  strikethrough: false,
  borderWidth: 0,
  borderColor: '#cbd5e1',
  shape:       'rounded',
}

/**
 * Depth-indexed default styles for dark theme.
 * Index 0 = level 1 (children of root), 1 = level 2, 2 = level 3+.
 * Colors: blue → teal → purple.
 */
export const LEVEL_STYLES_DARK: NodeStyle[] = [
  // Level 1 — vivid blue
  { bg: '#1e3a5f', textColor: '#bfdbfe', bold: false, italic: false, underline: false, strikethrough: false, borderWidth: 0, borderColor: '#3b82f6', shape: 'rounded' },
  // Level 2 — warm teal
  { bg: '#14443d', textColor: '#99f6e4', bold: false, italic: false, underline: false, strikethrough: false, borderWidth: 0, borderColor: '#2dd4bf', shape: 'rounded' },
  // Level 3+ — soft purple
  { bg: '#2e1f5e', textColor: '#ddd6fe', bold: false, italic: false, underline: false, strikethrough: false, borderWidth: 0, borderColor: '#8b5cf6', shape: 'rounded' },
]

/**
 * Depth-indexed default styles for light theme.
 * Index 0 = level 1 (children of root), 1 = level 2, 2 = level 3+.
 * Colors: blue → mint → lavender.
 */
export const LEVEL_STYLES_LIGHT: NodeStyle[] = [
  // Level 1 — soft sky blue
  { bg: '#dbeafe', textColor: '#1e40af', bold: false, italic: false, underline: false, strikethrough: false, borderWidth: 0, borderColor: '#93c5fd', shape: 'rounded' },
  // Level 2 — soft mint green
  { bg: '#d1fae5', textColor: '#065f46', bold: false, italic: false, underline: false, strikethrough: false, borderWidth: 0, borderColor: '#6ee7b7', shape: 'rounded' },
  // Level 3+ — soft lavender
  { bg: '#ede9fe', textColor: '#4c1d95', bold: false, italic: false, underline: false, strikethrough: false, borderWidth: 0, borderColor: '#c4b5fd', shape: 'rounded' },
]

/**
 * Default style for the root node — distinct accent to set it apart.
 * Indigo/blue background, white bold text.
 */
export const ROOT_NODE_STYLE: NodeStyle = {
  bg:          '#4f46e5',
  textColor:   '#ffffff',
  bold:        true,
  italic:      false,
  underline:   false,
  strikethrough: false,
  borderWidth: 0,
  borderColor: '#6366f1',
  shape:       'rounded',
}

export interface MindMap {
  id: string
  title: string          // 文件标题（对应根节点 text 或文件名）
  layout: LayoutType
  root: MindNode
  filePath?: string      // 本地文件路径（未保存时为 undefined）
  dirty: boolean         // 是否有未保存的修改
  createdAt: number
  updatedAt: number
  /** Node id → explicit per-node style overrides. */
  nodeStyles?: Record<string, NodeStyle>
  /**
   * Global default style applied to all newly created nodes.
   * Per-node overrides in nodeStyles take precedence over this.
   */
  defaultNodeStyle?: NodeStyle
  /**
   * Subtree-scoped default styles.
   * Key = the ancestor node id that defines the zone.
   * Newly created nodes inside that subtree inherit this style
   * (merged on top of defaultNodeStyle, closest ancestor wins).
   */
  subtreeDefaults?: Record<string, NodeStyle>
  lineStyle?: LineStyle
  background?: CanvasBackground
}
