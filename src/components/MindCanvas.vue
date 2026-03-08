<template>
  <!-- SVG 画布 + 节点层叠 HTML -->
  <div
    class="mind-canvas"
    ref="canvasEl"
    @mousedown.self="onCanvasBgMousedown"
    @contextmenu.prevent
  >
    <!-- 平移/缩放容器 -->
    <div
      class="mind-stage"
      :style="stageStyle"
      ref="stageEl"
    >
      <!-- SVG 连线层: 1×1px anchor at stage origin, overflow:visible draws everywhere -->
      <svg class="mind-svg" width="1" height="1" viewBox="0 0 1 1" overflow="visible">
        <!-- 拖拽辅助线 -->
        <line
          v-if="drag.active && drag.guideLine"
          :x1="drag.guideLine.x1" :y1="drag.guideLine.y1"
          :x2="drag.guideLine.x2" :y2="drag.guideLine.y2"
          class="guide-line"
        />

        <!-- Layout links (bezier) -->
        <template v-for="link in links" :key="link.id">
          <path
            :d="link.d"
            :class="['mind-link', { 'mind-link--drag-target': drag.active && drag.targetParentId === link.parentId }]"
            :stroke="store.lineStyle.color"
            :stroke-width="store.lineStyle.width"
            :stroke-dasharray="lineDashArray"
            fill="none"
          />
        </template>
      </svg>

      <!-- HTML 节点层 -->
      <template v-for="n in flatNodes" :key="n.id">
        <!-- 编辑中的节点: SVG背景层独立在 contenteditable 外部 -->
        <template v-if="editingId === n.id">
          <!-- hexagon SVG background — sibling of the contenteditable, not inside it -->
          <svg v-if="nodeShape(n) === 'hexagon'"
               class="node-hex-bg node-hex-bg--abs"
               :style="{ left: nodeStyle(n).left, top: nodeStyle(n).top,
                         width: nodeStyle(n).width, height: nodeStyle(n).height }"
               :viewBox="`0 0 ${effectiveW(n)} ${n.h}`"
               preserveAspectRatio="none">
            <polygon :points="hexPoints(effectiveW(n), n.h)" v-bind="hexSvgAttrs(n)" />
            <polygon
              v-if="selectedId === n.id"
              :points="hexPoints(effectiveW(n), n.h, 6)"
              fill="none" stroke="var(--color-accent)" stroke-width="2"
            />
          </svg>
          <div
            :ref="el => { if (editingId === n.id) editInputEl = el as HTMLElement }"
            :class="nodeShape(n) === 'hexagon'
              ? 'mind-node mind-node--editing mind-node--hex-edit'
              : ['mind-node', 'mind-node--editing', nodeClass(n)]"
            :style="nodeStyle(n)"
            contenteditable="plaintext-only"
            @keydown="onEditKeydown"
            @blur="commitEdit"
            @input="onEditInput"
            @compositionend="onEditInput"
          />
        </template>
        <!-- 普通节点 -->
        <div
          v-else
          class="mind-node"
          :class="nodeClass(n)"
          :style="nodeStyle(n)"
          @click.stop="selectNode(n.id)"
          @dblclick.stop="startEdit(n.id)"
          @contextmenu.prevent.stop="openContextMenu($event, n.id)"
          @mousedown.stop="onNodeMousedown($event, n.id)"
        >
          <!-- hexagon SVG background + selection ring -->
          <svg v-if="nodeShape(n) === 'hexagon'"
               class="node-hex-bg"
               :viewBox="`0 0 ${effectiveW(n)} ${n.h}`"
               preserveAspectRatio="none">
            <polygon
              :points="hexPoints(effectiveW(n), n.h)"
              v-bind="hexSvgAttrs(n)"
            />
            <!-- selection ring: expanded outward like outline-offset on other shapes -->
            <polygon
              v-if="selectedId === n.id"
              :points="hexPoints(effectiveW(n), n.h, 6)"
              fill="none"
              stroke="var(--color-accent)"
              stroke-width="2"
            />
          </svg>
          <span
            :style="{
              position: 'relative',
              zIndex: 1,
              fontWeight: (n.bold || store.getNodeStyle(n.id).bold) ? 'bold' : undefined,
              fontStyle: (n.italic || store.getNodeStyle(n.id).italic) ? 'italic' : undefined,
            }"
          >{{ n.text }}</span>
        </div>
      </template>

    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      v-if="ctxMenu.visible"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :node-id="ctxMenu.nodeId"
      @close="ctxMenu.visible = false"
      @action="onContextAction"
    />

    <!-- 删除确认弹窗 -->
    <DeleteConfirmDialog
      v-if="deleteConfirm.visible"
      @confirm="doDelete"
      @cancel="deleteConfirm.visible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, reactive, onMounted, onUnmounted } from 'vue'
import { useMindmapStore } from '../stores/mindmap'
import type { MindNode } from '../types/mindmap'
import ContextMenu from './ContextMenu.vue'
import DeleteConfirmDialog from './DeleteConfirmDialog.vue'
import { useLocale } from '../composables/useLocale'

// ─── Store ────────────────────────────────────────────────────────────────────
const store = useMindmapStore()
const { t } = useLocale()

// ─── Canvas pan/zoom ──────────────────────────────────────────────────────────
const canvasEl = ref<HTMLDivElement | null>(null)
const stageEl  = ref<HTMLDivElement | null>(null)
const pan  = reactive({ x: 0, y: 0 })
const zoom = ref(1)

const stageStyle = computed(() => ({
  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom.value})`,
  transformOrigin: '0 0',
}))

// Center on mount / map change
watch(() => store.current?.id, () => nextTick(centerView), { immediate: true })

function centerView() {
  if (!canvasEl.value) return
  const { width, height } = canvasEl.value.getBoundingClientRect()
  pan.x = width  / 2
  pan.y = height / 2
}

// Wheel zoom
function onWheelZoom(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const next  = Math.min(2, Math.max(0.3, zoom.value * delta))
  // zoom around cursor
  if (!canvasEl.value) { zoom.value = next; return }
  const rect = canvasEl.value.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  pan.x = cx - (cx - pan.x) * (next / zoom.value)
  pan.y = cy - (cy - pan.y) * (next / zoom.value)
  zoom.value = next
}

// Canvas pan (drag background)
let panDrag = { active: false, sx: 0, sy: 0, px: 0, py: 0 }

function onCanvasBgMousedown(e: MouseEvent) {
  if (e.button !== 0) return
  selectedId.value = null
  panDrag = { active: true, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }
}

function onMousemove(e: MouseEvent) {
  if (panDrag.active) {
    pan.x = panDrag.px + (e.clientX - panDrag.sx)
    pan.y = panDrag.py + (e.clientY - panDrag.sy)
  }
  if (drag.active) onDragMove(e)
}

function onMouseup(e: MouseEvent) {
  panDrag.active = false
  if (drag.active) onDragEnd(e)
}

onMounted(() => {
  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup', onMouseup)
  canvasEl.value?.addEventListener('wheel', onWheelZoom, { passive: false })
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onMousemove)
  window.removeEventListener('mouseup', onMouseup)
  canvasEl.value?.removeEventListener('wheel', onWheelZoom)
})

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_H     = 36   // single-line node height
const H_GAP      = 60   // horizontal gap between levels
const V_GAP      = 18   // vertical gap between siblings
const NODE_PAD_H = 24   // total horizontal padding (12px each side)
const NODE_PAD_V = 10   // total vertical padding (5px each side)
const LINE_H     = 19   // line height per text line: matches CSS line-height:1.4 at 13px font
const LINE_H_ROOT = 22  // line height for root node: 15px × 1.4 ≈ 21 → 22
const HEX_INDENT = 14   // fixed horizontal indent for hexagon left/right points (px)

// ─── Canvas-based text measurement ───────────────────────────────────────────
// One offscreen canvas reused for all measurements (cheap, no layout thrash).
let _measureCanvas: HTMLCanvasElement | null = null
let _measureCtx: CanvasRenderingContext2D | null = null

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (!_measureCtx) {
    _measureCanvas = document.createElement('canvas')
    _measureCtx    = _measureCanvas.getContext('2d')
  }
  return _measureCtx
}

interface LayoutNode {
  id: string
  text: string
  bold?: boolean
  italic?: boolean
  depth: number
  // x = left edge, y = vertical CENTER of the node box
  x: number
  y: number
  w: number
  h: number
  parentId: string | null
  side: 'left' | 'right' | 'root' | 'top' | 'bottom'
}

/** Return the pixel width of the widest line of text at the given font.
 *  nodeId is optional — if provided, shape-specific horizontal padding is added. */
function measureTextWidth(text: string, bold: boolean, depth: number, nodeId?: string): number {
  const ctx = getMeasureCtx()
  const size   = depth === 0 ? 15 : depth >= 2 ? 12 : 13
  const weight = bold ? 'bold' : (depth === 0 ? '700' : depth === 1 ? '600' : 'normal')
  let rawW: number
  if (!ctx) {
    rawW = text.length * 8
  } else {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`
    const lines = text.split('\n')
    let maxW = 0
    for (const line of lines) {
      const w = ctx.measureText(line).width
      if (w > maxW) maxW = w
    }
    rawW = Math.ceil(maxW)
  }

  // Extra horizontal padding per shape
  let padH = NODE_PAD_H
  if (nodeId) {
    const shape = store.getNodeStyle(nodeId).shape ?? 'rounded'
    if (shape === 'hexagon') {
      // indent is fixed HEX_INDENT px on each side — just add 2 * HEX_INDENT to ensure
      // text fits inside the usable area (w - 2*HEX_INDENT).
      padH = NODE_PAD_H + 2 * HEX_INDENT
    } else if (shape === 'ellipse') {
      // Ellipse: usable width ≈ w * 0.82, so pad extra to ensure rawW fits inside
      padH = NODE_PAD_H + Math.ceil(rawW * 0.22) + 8
    } else if (shape === 'pill') {
      // Pill: border-radius clips corners slightly for multi-line; add small extra
      padH = NODE_PAD_H + 8
    }
  }
  return Math.max(60, rawW + padH)
}

/** Measure node height based on number of text lines.
 *  nodeId is optional — if provided, shape-specific vertical padding is added. */
function measureHeight(text: string, depth = 1, nodeId?: string): number {
  const lineH = depth === 0 ? LINE_H_ROOT : LINE_H
  const lines = text.split('\n').length

  let padV = NODE_PAD_V
  if (nodeId) {
    const shape = store.getNodeStyle(nodeId).shape ?? 'rounded'
    if (shape === 'ellipse') {
      // Ellipse: usable height ≈ h * 0.82; for multi-line add proportional extra
      padV = NODE_PAD_V + Math.ceil(lines * lineH * 0.22) + 8
    } else if (shape === 'pill') {
      // Pill with multi-line: rounded caps eat into corners; add extra per extra line
      padV = lines > 1 ? NODE_PAD_V + (lines - 1) * 6 + 8 : NODE_PAD_V
    } else if (shape === 'hexagon') {
      // Hexagon: angled top/bottom reduce usable height near edges for multi-line
      padV = lines > 1 ? NODE_PAD_V + (lines - 1) * 4 + 6 : NODE_PAD_V
    }
  }
  return Math.max(NODE_H, lines * lineH + padV)
}

// ─── Radial layout (left-right, root center, children alternate L/R) ──────────
function subtreeHeightRadial(node: MindNode, depth: number): number {
  const h = measureHeight(node.text, depth, node.id)
  if (!node.children.length) return h
  const childrenH = node.children.reduce((s, c) => s + subtreeHeightRadial(c, depth + 1) + V_GAP, -V_GAP)
  return Math.max(h, childrenH)
}

function layoutSubtreeRadial(
  node: MindNode,
  depth: number,
  centerY: number,
  side: 'left' | 'right',
  parentId: string | null,
  parentEdgeX: number,   // right edge of parent (right side) or left edge of parent (left side)
  result: LayoutNode[]
): void {
  const w = measureTextWidth(node.text, !!node.bold, depth, node.id)
  const h = measureHeight(node.text, depth, node.id)

  // Right side: node starts at parentEdgeX + H_GAP
  // Left  side: node ends   at parentEdgeX - H_GAP  (so x = that - w)
  const x = side === 'right'
    ? parentEdgeX + H_GAP
    : parentEdgeX - H_GAP - w

  result.push({
    id: node.id, text: node.text, bold: node.bold, italic: node.italic,
    depth, x, y: centerY, w, h, parentId, side
  })

  if (node.children.length) {
    const myRightEdge = side === 'right' ? x + w : x   // edge facing children
    const totalH = node.children.reduce((s, c) => s + subtreeHeightRadial(c, depth + 1) + V_GAP, -V_GAP)
    let cursor = centerY - totalH / 2
    for (const child of node.children) {
      const ch = subtreeHeightRadial(child, depth + 1)
      layoutSubtreeRadial(child, depth + 1, cursor + ch / 2, side, node.id, myRightEdge, result)
      cursor += ch + V_GAP
    }
  }
}

function buildRadialLayout(root: MindNode): LayoutNode[] {
  const result: LayoutNode[] = []
  const rw = measureTextWidth(root.text, !!root.bold, 0, root.id)
  const rh = measureHeight(root.text, 0, root.id)

  result.push({
    id: root.id, text: root.text, bold: root.bold, italic: root.italic,
    depth: 0, x: -rw / 2, y: 0, w: rw, h: rh, parentId: null, side: 'root'
  })

  const rightChildren = root.children.filter((_, i) => i % 2 === 0)
  const leftChildren  = root.children.filter((_, i) => i % 2 !== 0)

  const rightTotalH = rightChildren.reduce((s, c) => s + subtreeHeightRadial(c, 1) + V_GAP, -V_GAP)
  let rCursor = -rightTotalH / 2
  for (const child of rightChildren) {
    const ch = subtreeHeightRadial(child, 1)
    layoutSubtreeRadial(child, 1, rCursor + ch / 2, 'right', root.id, rw / 2, result)
    rCursor += ch + V_GAP
  }

  const leftTotalH = leftChildren.reduce((s, c) => s + subtreeHeightRadial(c, 1) + V_GAP, -V_GAP)
  let lCursor = -leftTotalH / 2
  for (const child of leftChildren) {
    const ch = subtreeHeightRadial(child, 1)
    layoutSubtreeRadial(child, 1, lCursor + ch / 2, 'left', root.id, -rw / 2, result)
    lCursor += ch + V_GAP
  }

  return result
}

// ─── Tree-LR layout (root left, all children extend right) ────────────────────
function subtreeHeightTree(node: MindNode, depth: number): number {
  const h = measureHeight(node.text, depth, node.id)
  if (!node.children.length) return h
  const childrenH = node.children.reduce((s, c) => s + subtreeHeightTree(c, depth + 1) + V_GAP, -V_GAP)
  return Math.max(h, childrenH)
}

function layoutSubtreeTreeLR(
  node: MindNode,
  depth: number,
  centerY: number,
  parentId: string | null,
  parentRightEdge: number,
  result: LayoutNode[]
): void {
  const w = measureTextWidth(node.text, !!node.bold, depth, node.id)
  const h = measureHeight(node.text, depth, node.id)
  const x = parentRightEdge + H_GAP
  result.push({
    id: node.id, text: node.text, bold: node.bold, italic: node.italic,
    depth, x, y: centerY, w, h, parentId, side: 'right'
  })

  if (node.children.length) {
    const totalH = node.children.reduce((s, c) => s + subtreeHeightTree(c, depth + 1) + V_GAP, -V_GAP)
    let cursor = centerY - totalH / 2
    for (const child of node.children) {
      const ch = subtreeHeightTree(child, depth + 1)
      layoutSubtreeTreeLR(child, depth + 1, cursor + ch / 2, node.id, x + w, result)
      cursor += ch + V_GAP
    }
  }
}

function buildTreeLRLayout(root: MindNode): LayoutNode[] {
  const result: LayoutNode[] = []
  const rw = measureTextWidth(root.text, !!root.bold, 0, root.id)
  const rh = measureHeight(root.text, 0, root.id)

  result.push({
    id: root.id, text: root.text, bold: root.bold, italic: root.italic,
    depth: 0, x: 0, y: 0, w: rw, h: rh, parentId: null, side: 'right'
  })

  const totalH = root.children.reduce((s, c) => s + subtreeHeightTree(c, 1) + V_GAP, -V_GAP)
  let rCursor = -totalH / 2
  for (const child of root.children) {
    const ch = subtreeHeightTree(child, 1)
    layoutSubtreeTreeLR(child, 1, rCursor + ch / 2, root.id, rw, result)
    rCursor += ch + V_GAP
  }
  return result
}

// ─── Tree-TB layout (root top, children go downward) ─────────────────────────
const H_GAP_TB = 40   // vertical gap between levels for top-down
const V_GAP_TB = 24   // horizontal gap between siblings for top-down

function subtreeWidthTree(node: MindNode, depth: number): number {
  const w = measureTextWidth(node.text, !!node.bold, depth, node.id)
  if (!node.children.length) return Math.max(MIN_NODE_W, w)
  const childrenW = node.children.reduce((s, c) => s + subtreeWidthTree(c, depth + 1) + V_GAP_TB, -V_GAP_TB)
  return Math.max(Math.max(MIN_NODE_W, w), childrenW)
}

function layoutSubtreeTreeTB(
  node: MindNode,
  depth: number,
  centerX: number,
  parentId: string | null,
  topY: number,        // TOP edge of this row of siblings (all siblings share same topY)
  result: LayoutNode[]
): void {
  const w = measureTextWidth(node.text, !!node.bold, depth, node.id)
  const h = measureHeight(node.text, depth, node.id)
  const ew = Math.max(MIN_NODE_W, w)
  const x = centerX - ew / 2
  const centerY = topY + h / 2   // y = vertical center, derived from shared top edge
  result.push({
    id: node.id, text: node.text, bold: node.bold, italic: node.italic,
    depth, x, y: centerY, w, h, parentId, side: 'top'
  })

  if (node.children.length) {
    // next row's top = this node's bottom + gap  (uses this node's actual h, not NODE_H)
    const nextTopY = topY + h + H_GAP_TB
    const totalW = node.children.reduce((s, c) => s + subtreeWidthTree(c, depth + 1) + V_GAP_TB, -V_GAP_TB)
    let cursor = centerX - totalW / 2
    for (const child of node.children) {
      const cw = subtreeWidthTree(child, depth + 1)
      layoutSubtreeTreeTB(child, depth + 1, cursor + cw / 2, node.id, nextTopY, result)
      cursor += cw + V_GAP_TB
    }
  }
}

function buildTreeTBLayout(root: MindNode): LayoutNode[] {
  const result: LayoutNode[] = []
  const rw = measureTextWidth(root.text, !!root.bold, 0, root.id)
  const rh = measureHeight(root.text, 0, root.id)
  const rew = Math.max(MIN_NODE_W, rw)
  result.push({
    id: root.id, text: root.text, bold: root.bold, italic: root.italic,
    depth: 0, x: -rew / 2, y: 0, w: rw, h: rh, parentId: null, side: 'top'
  })
  // children's top edge = root bottom + gap
  const childTopY = rh / 2 + H_GAP_TB
  const totalW = root.children.reduce((s, c) => s + subtreeWidthTree(c, 1) + V_GAP_TB, -V_GAP_TB)
  let cursor = -totalW / 2
  for (const child of root.children) {
    const cw = subtreeWidthTree(child, 1)
    layoutSubtreeTreeTB(child, 1, cursor + cw / 2, root.id, childTopY, result)
    cursor += cw + V_GAP_TB
  }
  return result
}

// ─── Main flatNodes computed ───────────────────────────────────────────────────

/**
 * Return a shallow-cloned tree where the node currently being edited
 * has its text replaced by the live editText value.
 * All other nodes share the same object references (cheap).
 */
function treeWithLiveEdit(root: MindNode): MindNode {
  if (!editingId.value) return root
  return patchNode(root)
}

function patchNode(n: MindNode): MindNode {
  if (n.id === editingId.value) {
    return { ...n, text: editText.value || n.text }
  }
  if (!n.children.length) return n
  const patchedChildren = n.children.map(patchNode)
  // Only clone if something actually changed
  const changed = patchedChildren.some((c, i) => c !== n.children[i])
  return changed ? { ...n, children: patchedChildren } : n
}

const flatNodes = computed<LayoutNode[]>(() => {
  if (!store.current) return []
  const root   = treeWithLiveEdit(store.current.root)
  const layout = store.current.layout ?? 'radial'

  if (layout === 'tree-lr')  return buildTreeLRLayout(root)
  if (layout === 'tree-tb')  return buildTreeTBLayout(root)
  return buildRadialLayout(root)   // 'radial' (default)
})

// ─── Build links (bezier / elbow curves) ─────────────────────────────────────
interface Link { id: string; d: string; parentId: string }

const links = computed<Link[]>(() => {
  const out: Link[] = []
  const layout = store.current?.layout ?? 'radial'
  const curve  = store.lineStyle.curve ?? 'bezier'

  for (const n of flatNodes.value) {
    if (!n.parentId) continue
    const parent = flatNodes.value.find(p => p.id === n.parentId)
    if (!parent) continue

    const pw = effectiveW(parent)
    const nw = effectiveW(n)

    let d: string

    if (layout === 'tree-tb') {
      const px = parent.x + pw / 2
      const py = parent.y + parent.h / 2   // bottom of parent
      const cx = n.x + nw / 2
      const cy = n.y - n.h / 2             // top of child
      if (curve === 'elbow') {
        // Right-angle elbow: down to midY, across, down to child
        const midY = (py + cy) / 2
        d = `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`
      } else {
        const midY = (py + cy) / 2
        d = `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`
      }
    } else {
      // Radial / tree-lr: n.y = center
      let ps: { x: number; y: number }
      let ce: { x: number; y: number }

      if (n.side === 'left') {
        ps = { x: parent.x,        y: parent.y }
        ce = { x: n.x + nw,        y: n.y }
      } else {
        ps = { x: parent.x + pw,   y: parent.y }
        ce = { x: n.x,             y: n.y }
      }

      if (curve === 'elbow') {
        // Right-angle elbow: across to midX, down/up, across to child
        const midX = (ps.x + ce.x) / 2
        d = `M ${ps.x} ${ps.y} L ${midX} ${ps.y} L ${midX} ${ce.y} L ${ce.x} ${ce.y}`
      } else {
        const dx = Math.abs(ce.x - ps.x) * 0.5
        if (n.side === 'left') {
          d = `M ${ps.x} ${ps.y} C ${ps.x - dx} ${ps.y}, ${ce.x + dx} ${ce.y}, ${ce.x} ${ce.y}`
        } else {
          d = `M ${ps.x} ${ps.y} C ${ps.x + dx} ${ps.y}, ${ce.x - dx} ${ce.y}, ${ce.x} ${ce.y}`
        }
      }
    }

    out.push({ id: `${n.parentId}-${n.id}`, d, parentId: n.parentId })
  }
  return out
})

// SVG bounding box — no longer needed (SVG is 1×1 with overflow:visible)

// ─── Node styles ──────────────────────────────────────────────────────────────
const MIN_NODE_W = 80   // minimum node width in px

/** The width the node box actually renders at — same value used in layout AND links. */
function effectiveW(n: LayoutNode): number {
  return Math.max(MIN_NODE_W, n.w)
}

/** Map lineStyle.type → SVG stroke-dasharray value */
const lineDashArray = computed<string>(() => {
  const t = store.lineStyle.type
  if (t === 'dashed') return '6 3'
  if (t === 'dotted') return '2 3'
  return 'none'
})

/** Return the shape for a node (from store style override, defaulting to 'rounded') */
function nodeShape(n: LayoutNode): string {
  return store.getNodeStyle(n.id).shape ?? 'rounded'
}

/** Generate SVG polygon points for a hexagon fitting in w×h.
 *  indent is fixed (HEX_INDENT px) — the horizontal distance from the left/right
 *  edge to the top-left/bottom-left corner.
 *  outset: pushes every edge outward by exactly `outset` px (uniform perpendicular gap),
 *  used to draw a selection ring with consistent spacing on all sides. */
function hexPoints(w: number, h: number, outset = 0): string {
  const indent = HEX_INDENT
  const pts: [number, number][] = [
    [indent,     0 ],   // top-left
    [w - indent, 0 ],   // top-right
    [w,          h/2],  // right
    [w - indent, h ],   // bottom-right
    [indent,     h ],   // bottom-left
    [0,          h/2],  // left
  ]
  if (outset === 0) {
    return pts.map(([x, y]) => `${x},${y}`).join('  ')
  }

  // For each vertex, compute the miter-join outset direction.
  // This pushes every *edge* outward by exactly `outset` px (perpendicular distance).
  const n = pts.length
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n]
    const c = pts[i]
    const q = pts[(i + 1) % n]

    // Unit vectors along the two edges meeting at c
    const e1x = c[0] - p[0], e1y = c[1] - p[1]  // incoming edge direction
    const e2x = q[0] - c[0], e2y = q[1] - c[1]  // outgoing edge direction
    const l1 = Math.hypot(e1x, e1y) || 1
    const l2 = Math.hypot(e2x, e2y) || 1
    const u1x = e1x / l1, u1y = e1y / l1
    const u2x = e2x / l2, u2y = e2y / l2

    // Outward normals (SVG y-down, polygon is CW → right-hand normal points out)
    const nx1 =  u1y, ny1 = -u1x  // right normal of incoming edge
    const nx2 =  u2y, ny2 = -u2x  // right normal of outgoing edge

    // Miter direction = average of the two normals, normalized
    let mx = nx1 + nx2, my = ny1 + ny2
    const ml = Math.hypot(mx, my) || 1
    mx /= ml; my /= ml

    // Scale so perpendicular distance to each adjacent edge = outset
    // scale = outset / cos(half_angle) = outset / dot(miter, edge_normal)
    const dot = mx * nx2 + my * ny2
    const scale = dot > 0.1 ? outset / dot : outset * 2

    out.push([c[0] + mx * scale, c[1] + my * scale])
  }
  return out.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('  ')
}

/** SVG fill/stroke attrs for the hexagon polygon, derived from node style */
function hexSvgAttrs(n: LayoutNode): Record<string, string | number> {
  const s = store.getNodeStyle(n.id)
  // Determine fill: use node-specific bg, or fall back to the CSS class colour
  // We pass it explicitly so the SVG always has a real colour (SVG default fill is black)
  const fill = s.bg ?? (
    n.depth === 0 ? 'var(--color-accent)'
    : n.depth === 1 ? 'var(--color-surface-2)'
    : 'var(--color-surface)'
  )
  const hasBorder = (s.borderWidth ?? 0) > 0 || s.borderColor !== undefined
  const strokeColor = s.borderColor ?? s.textColor ?? 'var(--color-border)'
  const strokeWidth = s.borderWidth ?? (hasBorder ? 1.5 : 0)
  return {
    fill,
    stroke:        hasBorder ? strokeColor : 'none',
    'stroke-width': hasBorder ? strokeWidth : 0,
  }
}

function nodeStyle(n: LayoutNode) {
  const base: Record<string, string> = {
    left:   `${n.x}px`,
    top:    `${n.y - n.h / 2}px`,
    width:  `${effectiveW(n)}px`,
    height: `${n.h}px`,
  }

  const s = store.getNodeStyle(n.id)
  const shape = s.shape ?? 'rounded'

  if (shape === 'hexagon') {
    // Hexagon uses an SVG background layer — clear all CSS visual decoration on the div
    // so no rect background / border / shadow / radius / outline bleeds through
    base.background   = 'transparent'
    base.border       = 'none'
    base.borderRadius = '0'
    base.boxShadow    = 'none'
    base.outline      = 'none'
  } else {
    // Background — set via CSS variable so hover filter still works
    if (s.bg) base['--node-bg'] = s.bg

    // Border — apply whenever borderWidth OR borderColor is explicitly set
    if (s.borderWidth !== undefined || s.borderColor) {
      const bw = s.borderWidth ?? 1.5
      if (bw === 0) {
        base.border = 'none'
      } else {
        const bc = s.borderColor ?? s.textColor ?? 'currentColor'
        base.border = `${bw}px solid ${bc}`
      }
    }

    if (shape === 'rect') {
      base.borderRadius = '0'
    } else if (shape === 'pill') {
      base.borderRadius = '999px'
      // Pill: ensure horizontal padding accounts for the rounded caps
      const capR = n.h / 2
      const minPadH = Math.ceil(capR * 0.5)
      base.padding = `5px ${Math.max(12, minPadH)}px`
    } else if (shape === 'ellipse') {
      base.borderRadius = '50%'
      // Ellipse: text must stay inside the inscribed rectangle (≈ w*0.71 × h*0.71)
      // We achieved this by enlarging w/h in measureTextWidth/measureHeight.
      // Add extra CSS padding to visually push text toward center.
      const padH = Math.ceil(effectiveW(n) * 0.1)
      const padV = Math.ceil(n.h * 0.1)
      base.padding = `${padV}px ${padH}px`
    }
    // 'rounded' — keep default var(--radius-md) from CSS class
  }

  if (s.textColor) base.color = s.textColor

  // Text decorations
  const decorations: string[] = []
  if (s.underline)     decorations.push('underline')
  if (s.strikethrough) decorations.push('line-through')
  if (decorations.length) base.textDecoration = decorations.join(' ')

  if (s.bold)   base.fontWeight = 'bold'
  if (s.italic) base.fontStyle  = 'italic'

  return base
}

function nodeClass(n: LayoutNode) {
  const shape = store.getNodeStyle(n.id).shape ?? 'rounded'
  return {
    'mind-node--root':     n.depth === 0,
    'mind-node--level1':   n.depth === 1,
    'mind-node--deep':     n.depth >= 2,
    // for hexagon, selection is shown via SVG ring — suppress CSS outline
    'mind-node--selected': selectedId.value === n.id && shape !== 'hexagon',
    'mind-node--left':     n.side === 'left',
    'mind-node--right':    n.side === 'right' || n.side === 'root' || n.side === 'top' || n.side === 'bottom',
  }
}

// ─── Selection ────────────────────────────────────────────────────────────────
const selectedId = ref<string | null>(null)

function selectNode(id: string) {
  selectedId.value = id
  store.selectedId = id
}

// Sync store selectedId
watch(selectedId, v => { store.selectedId = v })

// ─── Editing ──────────────────────────────────────────────────────────────────
const editingId   = ref<string | null>(null)
const editText    = ref('')
const editInputEl = ref<HTMLElement | null>(null)

async function startEdit(id: string) {
  const n = flatNodes.value.find(n => n.id === id)
  if (!n) return
  selectedId.value = id
  editText.value   = n.text
  editingId.value  = id
  await nextTick()
  const el = editInputEl.value
  if (!el) return
  // Set initial text content (innerText preserves newlines)
  el.innerText = n.text
  // Select all text
  el.focus()
  const range = document.createRange()
  const sel   = window.getSelection()
  range.selectNodeContents(el)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

function onEditInput(_e: Event) {
  // Keep editText in sync so flatNodes recomputes live (children reposition as text changes)
  const el = editInputEl.value
  if (el) {
    editText.value = el.innerText.replace(/\n$/, '')
  }
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    e.stopPropagation()
    commitEdit()
  } else if (e.key === 'Escape') {
    e.stopPropagation()
    cancelEdit()
  }
  // Shift+Enter: browser inserts \n naturally into contenteditable
}

function commitEdit() {
  if (!editingId.value || !store.current) return
  const el = editInputEl.value
  // Read text from the contenteditable element; fall back to stored editText
  const raw = el ? el.innerText : editText.value
  // Normalize: trim leading/trailing whitespace, collapse trailing newline browsers insert
  const trimmed = raw.replace(/\n$/, '').trim()
  if (trimmed) {
    store.updateNodeText(editingId.value, trimmed)
  }
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

// ─── Context menu ─────────────────────────────────────────────────────────────
const ctxMenu = reactive({ visible: false, x: 0, y: 0, nodeId: '' })

function openContextMenu(e: MouseEvent, id: string) {
  selectedId.value = id
  store.selectedId = id
  ctxMenu.visible = true
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.nodeId = id
}

type CtxAction = 'addChild' | 'addSibling' | 'delete' | 'copy' | 'cut' | 'paste'
function onContextAction(action: string) {
  ctxMenu.visible = false
  const id = ctxMenu.nodeId
  const a = action as CtxAction
  if (a === 'addChild')   { store.addChild(id, t('新节点', 'New Node'));   nextTick(() => { store.lastAddedId && startEdit(store.lastAddedId) }) }
  if (a === 'addSibling') { store.addSibling(id, t('新节点', 'New Node')); nextTick(() => { store.lastAddedId && startEdit(store.lastAddedId) }) }
  if (a === 'delete')     { tryDelete(id) }
  if (a === 'copy')       { store.copyNode(id) }
  if (a === 'cut')        { store.cutNode(id) }
  if (a === 'paste')      { store.pasteNode(id) }
}

// ─── Delete with confirm ──────────────────────────────────────────────────────
const deleteConfirm = reactive({ visible: false, nodeId: '' })

function tryDelete(id: string) {
  const node = store.findNode(id)
  if (!node) return
  if (node.children.length > 0) {
    deleteConfirm.nodeId = id
    deleteConfirm.visible = true
  } else {
    store.deleteNode(id)
    selectedId.value = null
    store.selectedId = null
  }
}

function doDelete() {
  store.deleteNode(deleteConfirm.nodeId)
  selectedId.value = null
  store.selectedId = null
  deleteConfirm.visible = false
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  // Don't intercept when editing
  if (editingId.value) return

  const id = selectedId.value
  const ctrl = e.ctrlKey || e.metaKey

  if (ctrl && e.key === 'c') { e.preventDefault(); id && store.copyNode(id); return }
  if (ctrl && e.key === 'x') { e.preventDefault(); id && store.cutNode(id);  return }
  if (ctrl && e.key === 'v') { e.preventDefault(); id && store.pasteNode(id); return }

  if (ctrl && e.key === 'b') {
    e.preventDefault(); id && store.toggleBold(id); return
  }
  if (ctrl && e.key === 'i') {
    e.preventDefault(); id && store.toggleItalic(id); return
  }

  if (!id) return

  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault()
    store.addChild(id, t('新节点', 'New Node'))
    nextTick(() => { if (store.lastAddedId) startEdit(store.lastAddedId) })
    return
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    // For root node, Enter also adds child
    const isRoot = store.current?.root.id === id
    e.preventDefault()
    if (isRoot) {
      store.addChild(id, t('新节点', 'New Node'))
    } else {
      store.addSibling(id, t('新节点', 'New Node'))
    }
    nextTick(() => { if (store.lastAddedId) startEdit(store.lastAddedId) })
    return
  }
  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault()
    store.promoteNode(id)
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const isRoot = store.current?.root.id === id
    if (isRoot) return // cannot delete root
    e.preventDefault()
    tryDelete(id)
    return
  }
  // F2 to start edit
  if (e.key === 'F2') {
    e.preventDefault()
    startEdit(id)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

// ─── Drag to reorder / reparent ───────────────────────────────────────────────
interface DragState {
  active: boolean
  nodeId: string
  startX: number
  startY: number
  curX: number
  curY: number
  targetParentId: string | null
  guideLine: { x1: number; y1: number; x2: number; y2: number } | null
}

const drag: DragState = reactive({
  active: false, nodeId: '', startX: 0, startY: 0, curX: 0, curY: 0,
  targetParentId: null, guideLine: null,
})

const DRAG_THRESHOLD = 6

function onNodeMousedown(e: MouseEvent, id: string) {
  if (e.button !== 0) return
  drag.active  = false
  drag.nodeId  = id
  drag.startX  = e.clientX
  drag.startY  = e.clientY
  drag.curX    = e.clientX
  drag.curY    = e.clientY
}

function onDragMove(e: MouseEvent) {
  if (!drag.nodeId) return
  const dx = e.clientX - drag.startX
  const dy = e.clientY - drag.startY
  if (!drag.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
  drag.active = true
  drag.curX   = e.clientX
  drag.curY   = e.clientY

  // Find closest node to snap to as parent
  if (!canvasEl.value) return
  const rect  = canvasEl.value.getBoundingClientRect()
  // Convert cursor to stage coords
  const sx = (e.clientX - rect.left - pan.x) / zoom.value
  const sy = (e.clientY - rect.top  - pan.y) / zoom.value

  let best: LayoutNode | null = null
  let bestDist = Infinity
  for (const n of flatNodes.value) {
    if (n.id === drag.nodeId) continue
    // Skip descendants of dragged node
    if (isDescendant(drag.nodeId, n.id)) continue
    const nx = n.x + n.w / 2
    const ny = n.y
    const d = Math.hypot(nx - sx, ny - sy)
    if (d < bestDist && d < 120) { bestDist = d; best = n }
  }
  drag.targetParentId = best?.id ?? null
  if (best) {
    drag.guideLine = { x1: best.x + best.w / 2, y1: best.y, x2: sx, y2: sy }
  } else {
    drag.guideLine = null
  }
}

function onDragEnd(_e: MouseEvent) {
  if (drag.active && drag.targetParentId && drag.nodeId) {
    store.moveNode(drag.nodeId, drag.targetParentId)
    selectedId.value = drag.nodeId
    store.selectedId = drag.nodeId
  }
  drag.active = false
  drag.nodeId = ''
  drag.targetParentId = null
  drag.guideLine = null
}

function isDescendant(ancestorId: string, nodeId: string): boolean {
  const node = store.findNode(ancestorId)
  if (!node) return false
  function check(n: MindNode): boolean {
    if (n.id === nodeId) return true
    return n.children.some(check)
  }
  return node.children.some(check)
}

// ─── Export data ──────────────────────────────────────────────────────────────
import type { ExportData, LayoutNodeExport, LinkExport } from '../composables/useExport'

function getExportData(): ExportData | null {
  if (!stageEl.value || !store.current) return null

  function cssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  }

  const accentColor   = cssVar('--color-accent')   || '#4f8ef7'
  const surface2Color = cssVar('--color-surface-2') || '#3a3a3c'
  const surfaceColor  = cssVar('--color-surface')   || '#2c2c2e'
  const textPrimary   = cssVar('--color-text-primary') || '#f5f5f7'
  const borderColor   = cssVar('--color-border')    || 'rgba(255,255,255,0.08)'

  const exportNodes: LayoutNodeExport[] = flatNodes.value.map(n => {
    const s = store.getNodeStyle(n.id)
    const depth = n.depth

    const defaultBg =
      depth === 0 ? accentColor
      : depth === 1 ? surface2Color
      : surfaceColor

    const defaultText = depth === 0 ? '#ffffff' : textPrimary

    const fontSize    = depth === 0 ? 15 : depth >= 2 ? 12 : 13
    const fontWeight  = depth === 0 ? '700' : depth === 1 ? '600' : 'normal'

    return {
      id:            n.id,
      text:          n.text,
      depth,
      x:             n.x,
      y:             n.y,
      w:             effectiveW(n),
      h:             n.h,
      parentId:      n.parentId,
      side:          n.side,
      bg:            s.bg          ?? defaultBg,
      textColor:     s.textColor   ?? defaultText,
      bold:          s.bold        ?? false,
      italic:        s.italic      ?? false,
      underline:     s.underline   ?? false,
      strikethrough: s.strikethrough ?? false,
      borderWidth:   s.borderWidth ?? (depth === 1 ? 1.5 : depth >= 2 ? 1 : 0),
      borderColor:   s.borderColor ?? borderColor,
      shape:         s.shape       ?? 'rounded',
      fontSize,
      fontWeight,
    }
  })

  const exportLinks: LinkExport[] = links.value.map(l => ({ ...l }))

  return {
    stageEl: stageEl.value,
    flatNodes: exportNodes,
    links: exportLinks,
  }
}

// expose startEdit / tryDelete for use from App.vue shortcuts
function zoomIn() {
  const next = Math.min(2, zoom.value * 1.2)
  if (!canvasEl.value) { zoom.value = next; return }
  const { width, height } = canvasEl.value.getBoundingClientRect()
  const cx = width / 2
  const cy = height / 2
  pan.x = cx - (cx - pan.x) * (next / zoom.value)
  pan.y = cy - (cy - pan.y) * (next / zoom.value)
  zoom.value = next
}

function zoomOut() {
  const next = Math.max(0.3, zoom.value / 1.2)
  if (!canvasEl.value) { zoom.value = next; return }
  const { width, height } = canvasEl.value.getBoundingClientRect()
  const cx = width / 2
  const cy = height / 2
  pan.x = cx - (cx - pan.x) * (next / zoom.value)
  pan.y = cy - (cy - pan.y) * (next / zoom.value)
  zoom.value = next
}

function resetZoom() {
  zoom.value = 1
  centerView()
}

defineExpose({ startEdit, tryDelete, selectedId, getExportData, zoom, zoomIn, zoomOut, resetZoom })
</script>

<style scoped>
.mind-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: default;
}

/* Stage: panned/zoomed container, positioned relative to canvas center */
.mind-stage {
  position: absolute;
  top: 0; left: 0;
  will-change: transform;
}

/* SVG overlay: 1×1 anchor at stage origin, paths drawn with overflow:visible */
.mind-svg {
  position: absolute;
  top: 0; left: 0;
  overflow: visible;
  pointer-events: none;
}

/* Bezier links — color/width/dash are set via inline SVG attributes from lineStyle */
.mind-link {
  opacity: 0.7;
  transition: opacity 0.15s;
}
.mind-link--drag-target {
  stroke: var(--color-success);
  opacity: 0.9;
  stroke-width: 2.5;
}

/* Guide line during drag */
.guide-line {
  stroke: var(--color-success);
  stroke-width: 2;
  stroke-dasharray: 5 4;
  opacity: 0.8;
}

/* Nodes: positioned absolutely inside the stage */
.mind-node {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 13px;
  line-height: 1.4;
  user-select: none;
  cursor: pointer;
  transition: box-shadow 0.15s, outline 0.1s, filter 0.15s;
  box-sizing: border-box;
  padding: 5px 12px;
  white-space: pre;
  overflow: visible;
  /* background falls back through CSS variable → class defaults */
  background: var(--node-bg, transparent);
}

/* Hexagon background SVG layer — fills the node box, sits behind text */
.node-hex-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  transition: filter 0.15s;
  z-index: 0;
}
/* When used as a sibling of the editing div (not a child), position against the stage */
.node-hex-bg--abs {
  inset: unset;
  width: unset;
  height: unset;
}
.mind-node:hover .node-hex-bg {
  filter: brightness(1.07);
}

/* Left-side nodes: same centering as right-side, visually mirror */
.mind-node--left {
  justify-content: center;
}

/* Root */
.mind-node--root {
  background: var(--node-bg, var(--color-accent));
  color: #fff;
  font-size: 15px;
  line-height: 1.4;
  font-weight: 700;
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 20px var(--color-accent-glow);
  cursor: pointer;
  z-index: 10;
}
.mind-node--root:hover {
  filter: brightness(1.07);
}

/* Level 1 */
.mind-node--level1 {
  background: var(--node-bg, var(--color-surface-2));
  color: var(--color-text-primary);
  font-weight: 600;
  border: 1.5px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}
.mind-node--level1:hover {
  filter: brightness(1.05);
}

/* Deep (level 2+) */
.mind-node--deep {
  background: var(--node-bg, var(--color-surface));
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-light);
  font-size: 12px;
}
.mind-node--deep:hover {
  filter: brightness(1.05);
}

/* Selected */
.mind-node--selected {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Editing mode: contenteditable div, auto-sizes via live layout recompute */
.mind-node--editing {
  cursor: text;
  outline: 2px solid var(--color-accent) !important;
  outline-offset: 2px;
  white-space: pre;
  overflow: visible;
}
/* Hexagon editing: the SVG sibling handles all visuals; this div is a transparent input layer */
.mind-node--hex-edit {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  border-radius: 0 !important;
}

/* contenteditable needs explicit line-height to match span inside display node */
.mind-node--editing br {
  /* browsers sometimes insert a trailing <br>; keep it invisible */
  display: block;
  content: '';
}

</style>
