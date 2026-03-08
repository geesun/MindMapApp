<template>
  <aside class="right-panel">

    <!-- ── 画布背景面板 ── -->
    <section class="panel-section">
      <div class="section-header" @click="toggle('canvasBg')">
        <span class="section-title">{{ t('画布背景', 'Canvas Background') }}</span>
        <svg class="chevron" :class="{ open: expanded.canvasBg }"
             viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div v-show="expanded.canvasBg" class="section-body">
        <!-- 背景颜色 -->
        <div class="field">
          <label class="field-label">{{ t('背景颜色', 'Background Color') }}</label>
          <div class="color-row">
            <div class="color-swatches">
              <button v-for="c in canvasBgColors" :key="c"
                      class="swatch"
                      :style="{ background: c }"
                      :class="{ active: store.canvasBg.color === c }"
                      @click="store.setCanvasBg({ color: c })" />
            </div>
            <input type="color" class="color-picker" :value="store.canvasBg.color"
                   @input="store.setCanvasBg({ color: ($event.target as HTMLInputElement).value })"
                   :title="t('自定义颜色', 'Custom color')" />
          </div>
        </div>

        <!-- 背景纹理 -->
        <div class="field">
          <label class="field-label">{{ t('纹理', 'Pattern') }}</label>
          <div class="pattern-options">
            <button v-for="pt in patternTypes" :key="pt.value"
                    class="pattern-btn"
                    :class="{ active: store.canvasBg.pattern === pt.value }"
                    :title="pt.label"
                    @click="store.setCanvasBg({ pattern: pt.value as any })">
              <!-- mini SVG preview of each pattern -->
              <svg viewBox="0 0 28 20" class="pattern-preview">
                <rect width="28" height="20" fill="currentColor" opacity="0.05"/>
                <template v-if="pt.value === 'dots'">
                  <circle v-for="(pos, i) in dotPositions" :key="i" :cx="pos[0]" :cy="pos[1]" r="0.8" fill="currentColor" opacity="0.6"/>
                </template>
                <template v-else-if="pt.value === 'grid'">
                  <line v-for="x in [7,14,21]" :key="'gx'+x" :x1="x" y1="0" :x2="x" y2="20" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
                  <line v-for="y in [5,10,15]" :key="'gy'+y" x1="0" :y1="y" x2="28" :y2="y" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
                </template>
                <template v-else-if="pt.value === 'diagonal'">
                  <line v-for="(off, i) in [-14,0,14,28,42]" :key="i" :x1="off" y1="0" :x2="off+20" y2="20" stroke="currentColor" stroke-width="0.7" opacity="0.5"/>
                </template>
                <template v-else>
                  <!-- none: blank -->
                </template>
              </svg>
              <span>{{ pt.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider" />

    <!-- ── 节点样式面板 ── -->
    <section class="panel-section">
      <div class="section-header" @click="toggle('nodeStyle')">
        <span class="section-title">{{ t('节点样式', 'Node Style') }}</span>
        <svg class="chevron" :class="{ open: expanded.nodeStyle }"
             viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div v-show="expanded.nodeStyle" class="section-body">
        <!-- 无地图时提示 -->
        <div v-if="!store.current" class="disabled-hint">
          {{ t('请先新建或打开一个思维导图', 'Create or open a mind map first') }}
        </div>
        <!-- 无节点选中时的提示 -->
        <div v-else-if="nodeStyleDisabled" class="disabled-hint">
          {{ t('请先选择一个节点', 'Select a node first') }}
        </div>

        <!-- 以下所有控件在 disabled 时加 .field--disabled -->
        <!-- 背景色 -->
        <div class="field" :class="{ 'field--disabled': nodeStyleDisabled }">
          <label class="field-label">{{ t('背景色', 'Background') }}</label>
          <div class="color-row">
            <div class="color-swatches">
              <button v-for="c in nodeColors" :key="c"
                      class="swatch"
                      :style="{ background: c }"
                      :class="{ active: nodeBg === c }"
                      :disabled="nodeStyleDisabled"
                      @click="applyNodeBg(c)" />
            </div>
            <input type="color" class="color-picker" :value="nodeBg"
                   :disabled="nodeStyleDisabled"
                   @input="applyNodeBg(($event.target as HTMLInputElement).value)"
                   title="自定义颜色" />
          </div>
        </div>

        <!-- 文字颜色 -->
        <div class="field" :class="{ 'field--disabled': nodeStyleDisabled }">
          <label class="field-label">{{ t('文字颜色', 'Text Color') }}</label>
          <div class="color-row">
            <div class="color-swatches">
              <button v-for="c in textColors" :key="c"
                      class="swatch"
                      :style="{ background: c }"
                      :class="{ active: nodeTextColor === c }"
                      :disabled="nodeStyleDisabled"
                      @click="applyTextColor(c)" />
            </div>
            <input type="color" class="color-picker" :value="nodeTextColor"
                   :disabled="nodeStyleDisabled"
                   @input="applyTextColor(($event.target as HTMLInputElement).value)" />
          </div>
        </div>

        <!-- 文字样式 -->
        <div class="field" :class="{ 'field--disabled': nodeStyleDisabled }">
          <label class="field-label">{{ t('文字样式', 'Text Style') }}</label>
          <div class="text-style-row">
            <button class="text-style-btn" :class="{ active: nodeTextBold }"
                    :disabled="nodeStyleDisabled"
                    @click="applyTextStyle('bold', !nodeTextBold)" :title="t('加粗', 'Bold')">
              <strong>B</strong>
            </button>
            <button class="text-style-btn" :class="{ active: nodeTextItalic }"
                    :disabled="nodeStyleDisabled"
                    @click="applyTextStyle('italic', !nodeTextItalic)" :title="t('斜体', 'Italic')">
              <em>I</em>
            </button>
            <button class="text-style-btn" :class="{ active: nodeTextUnderline }"
                    :disabled="nodeStyleDisabled"
                    @click="applyTextStyle('underline', !nodeTextUnderline)" :title="t('下划线', 'Underline')">
              <span style="text-decoration:underline">U</span>
            </button>
            <button class="text-style-btn" :class="{ active: nodeTextStrike }"
                    :disabled="nodeStyleDisabled"
                    @click="applyTextStyle('strikethrough', !nodeTextStrike)" :title="t('中划线', 'Strikethrough')">
              <span style="text-decoration:line-through">S</span>
            </button>
          </div>
        </div>

        <!-- 节点形状 -->
        <div class="field" :class="{ 'field--disabled': nodeStyleDisabled }">
          <label class="field-label">{{ t('节点形状', 'Node Shape') }}</label>
          <div class="shape-options">
            <button v-for="sh in shapes" :key="sh.value"
                    class="shape-btn"
                    :class="{ active: nodeShape === sh.value }"
                    :title="sh.label"
                    :disabled="nodeStyleDisabled"
                    @click="applyShape(sh.value)">
              <svg viewBox="0 0 36 20" fill="none">
                <rect v-if="sh.value === 'rect'"
                      x="2" y="2" width="32" height="16" rx="0"
                      stroke="currentColor" stroke-width="1.5" fill="none"/>
                <rect v-else-if="sh.value === 'rounded'"
                      x="2" y="2" width="32" height="16" rx="5"
                      stroke="currentColor" stroke-width="1.5" fill="none"/>
                <rect v-else-if="sh.value === 'pill'"
                      x="2" y="2" width="32" height="16" rx="8"
                      stroke="currentColor" stroke-width="1.5" fill="none"/>
                <ellipse v-else-if="sh.value === 'ellipse'"
                         cx="18" cy="10" rx="16" ry="8"
                         stroke="currentColor" stroke-width="1.5" fill="none"/>
                <polygon v-else-if="sh.value === 'hexagon'"
                         points="9,2 27,2 34,10 27,18 9,18 2,10"
                         stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
              <span>{{ sh.label }}</span>
            </button>
          </div>
        </div>

        <!-- 边框颜色 -->
        <div class="field" :class="{ 'field--disabled': nodeStyleDisabled }">
          <label class="field-label">{{ t('边框颜色', 'Border Color') }}</label>
          <div class="color-row">
            <div class="color-swatches">
              <!-- "无边框" swatch — colored box with diagonal slash -->
              <button class="swatch swatch--none"
                      :class="{ active: !nodeBorderEnabled }"
                      :disabled="nodeStyleDisabled"
                      :title="t('无边框', 'No border')"
                      @click="applyBorder(false)">
                <svg viewBox="0 0 14 14" width="14" height="14">
                  <line x1="1" y1="13" x2="13" y2="1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
              <button v-for="c in borderColors" :key="c"
                      class="swatch"
                      :style="{ background: c }"
                      :class="{ active: nodeBorderEnabled && nodeBorderColor === c }"
                      :disabled="nodeStyleDisabled"
                      @click="applyBorderColor(c)" />
            </div>
            <input type="color" class="color-picker" :value="nodeBorderColor"
                   :disabled="nodeStyleDisabled"
                   @input="applyBorderColor(($event.target as HTMLInputElement).value)" />
          </div>
        </div>

        <!-- 重置 / 应用到子节点 -->
        <div class="style-footer">
          <button class="reset-btn" :disabled="nodeStyleDisabled" @click="resetNodeStyle">{{ t('重置样式', 'Reset Style') }}</button>
          <button class="apply-subtree-btn" :disabled="nodeStyleDisabled" @click="applyToSubtree">{{ t('应用到子节点', 'Apply to Children') }}</button>
        </div>
      </div>
    </section>

    <div class="section-divider" />

    <!-- 连线样式面板 -->
    <section class="panel-section">
      <div class="section-header" @click="toggle('lineStyle')">
        <span class="section-title">{{ t('连线样式', 'Line Style') }}</span>
        <svg class="chevron" :class="{ open: expanded.lineStyle }"
             viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div v-show="expanded.lineStyle" class="section-body">
        <!-- 连线颜色 -->
        <div class="field">
          <label class="field-label">{{ t('颜色', 'Color') }}</label>
          <div class="color-row">
            <div class="color-swatches">
              <button v-for="c in lineColors" :key="c"
                      class="swatch"
                      :style="{ background: c }"
                      :class="{ active: store.lineStyle.color === c }"
                      @click="store.setLineStyle({ color: c })" />
            </div>
            <input type="color" class="color-picker" :value="store.lineStyle.color"
                   @input="store.setLineStyle({ color: ($event.target as HTMLInputElement).value })" />
          </div>
        </div>

        <!-- 粗细 -->
        <div class="field">
          <div class="field-label-row">
            <label class="field-label">{{ t('粗细', 'Width') }}</label>
            <span class="field-value">{{ store.lineStyle.width }}px</span>
          </div>
          <div class="slider-wrap">
            <input type="range" :value="store.lineStyle.width" min="1" max="8" class="range-input"
                   @input="store.setLineStyle({ width: Number(($event.target as HTMLInputElement).value) })"
                   :style="{ '--pct': ((store.lineStyle.width - 1) / 7 * 100) + '%' }" />
          </div>
        </div>

        <!-- 线型 -->
        <div class="field">
          <label class="field-label">{{ t('线型', 'Line Type') }}</label>
          <div class="line-types">
            <button v-for="lt in lineTypes" :key="lt.value"
                    class="line-type-btn"
                    :class="{ active: store.lineStyle.type === lt.value }"
                    @click="store.setLineStyle({ type: lt.value as 'solid' | 'dashed' | 'dotted' })"
                    :title="lt.label">
              <svg viewBox="0 0 40 10" :stroke-dasharray="lt.dash">
                <line x1="2" y1="5" x2="38" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 连接形式 -->
        <div class="field">
          <label class="field-label">{{ t('连接形式', 'Curve Type') }}</label>
          <div class="line-types">
            <button v-for="ct in curveTypes" :key="ct.value"
                    class="line-type-btn"
                    :class="{ active: store.lineStyle.curve === ct.value }"
                    @click="store.setLineStyle({ curve: ct.value as 'bezier' | 'elbow' })"
                    :title="ct.label">
              <svg viewBox="0 0 40 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path v-if="ct.value === 'bezier'" d="M2 10 C12 10, 28 10, 38 10" stroke-width="1.5"/>
                <path v-if="ct.value === 'bezier'" d="M2 16 C12 16, 28 4, 38 4" stroke-width="1.5" opacity="0.4"/>
                <polyline v-if="ct.value === 'elbow'" points="2,10 20,10 20,4 38,4" stroke-width="1.5"/>
              </svg>
              <span>{{ ct.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <div class="section-divider" />

    <!-- 布局设置面板 -->
    <section class="panel-section">
      <div class="section-header" @click="toggle('layout')">
        <span class="section-title">{{ t('布局设置', 'Layout') }}</span>
        <svg class="chevron" :class="{ open: expanded.layout }"
             viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <div v-show="expanded.layout" class="section-body">
        <div class="layout-options">
          <button v-for="l in layouts" :key="l.value"
                  class="layout-option"
                  :class="{ active: selectedLayout === l.value }"
                  :title="l.label"
                  @click="selectedLayout = l.value">
            <span>{{ l.short }}</span>
          </button>
        </div>
      </div>
    </section>

  </aside>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import { useMindmapStore } from '../stores/mindmap'
import { useTheme } from '../composables/useTheme'
import { useLocale } from '../composables/useLocale'
import type { LayoutType, NodeShape, CanvasBgPattern } from '../types/mindmap'
import { DEFAULT_NODE_STYLE } from '../types/mindmap'

const store = useMindmapStore()
const { theme } = useTheme()
const { t } = useLocale()

const expanded = reactive({
  canvasBg:  true,
  nodeStyle: true,
  lineStyle: true,
  layout: true,
})

function toggle(key: keyof typeof expanded) {
  expanded[key] = !expanded[key]
}

// ── Apply scope ────────────────────────────────────────────────────────────────

/** Whether node style controls should be disabled */
const nodeStyleDisabled = computed(() => !store.current || !store.selectedId)

/**
 * The style object shown in the panel controls.
 * Always shows the fully resolved style of the selected node.
 */
const selectedStyle = computed(() => {
  if (!store.current || !store.selectedId) return DEFAULT_NODE_STYLE
  return store.getNodeStyle(store.selectedId)
})

const nodeBg            = computed(() => selectedStyle.value.bg          ?? DEFAULT_NODE_STYLE.bg!)
const nodeTextColor     = computed(() => selectedStyle.value.textColor   ?? DEFAULT_NODE_STYLE.textColor!)
const nodeTextBold      = computed(() => selectedStyle.value.bold        ?? false)
const nodeTextItalic    = computed(() => selectedStyle.value.italic      ?? false)
const nodeTextUnderline = computed(() => selectedStyle.value.underline   ?? false)
const nodeTextStrike    = computed(() => selectedStyle.value.strikethrough ?? false)
const nodeBorderEnabled = computed(() => (selectedStyle.value.borderWidth ?? 0) > 0)
const nodeBorderColor   = computed(() => selectedStyle.value.borderColor ?? DEFAULT_NODE_STYLE.borderColor!)
const nodeShape         = computed<NodeShape>(() => selectedStyle.value.shape ?? DEFAULT_NODE_STYLE.shape!)

// ── Apply helpers ──────────────────────────────────────────────────────────────

function applyPatch(patch: Parameters<typeof store.setNodeStyle>[1]) {
  if (!store.selectedId) return
  store.setNodeStyle(store.selectedId, patch, 'node')
}

function applyNodeBg(color: string)          { applyPatch({ bg: color }) }
function applyTextColor(color: string)       { applyPatch({ textColor: color }) }
function applyTextStyle(key: 'bold' | 'italic' | 'underline' | 'strikethrough', val: boolean) {
  applyPatch({ [key]: val })
}
function applyBorder(enabled: boolean)       { applyPatch({ borderWidth: enabled ? 1.5 : 0 }) }
function applyBorderColor(color: string)     { applyPatch({ borderColor: color, borderWidth: 1.5 }) }
function applyShape(shape: NodeShape)        { applyPatch({ shape }) }

function resetNodeStyle() {
  if (!store.selectedId) return
  store.clearNodeStyle(store.selectedId, 'node')
}

/** Apply the current node's fully resolved style to all descendants. */
function applyToSubtree() {
  if (!store.selectedId) return
  // Use the fully resolved style (not just the explicit override), so that
  // "apply to subtree" works even after a reset (when override is empty).
  const resolved = store.getNodeStyle(store.selectedId)
  store.setNodeStyle(store.selectedId, resolved, 'subtree')
}

// ── Color / type presets ───────────────────────────────────────────────────────
const nodeColors   = ['#ffffff', '#fff3cd', '#d4edda', '#cce5ff', '#f8d7da', '#e2d9f3', '#d1ecf1', '#f5f5f5']
const textColors   = ['#1a1a1a', '#333333', '#4a7cf6', '#e53e3e', '#38a169', '#d69e2e', '#805ad5', '#ffffff']
const borderColors = ['#999999', '#4a7cf6', '#e53e3e', '#38a169', '#d69e2e', '#805ad5', '#1a1a1a']

// Shapes
const shapes = computed<{ label: string; value: NodeShape }[]>(() => [
  { label: t('矩形',     'Rect'),    value: 'rect'    },
  { label: t('圆角矩形', 'Rounded'), value: 'rounded' },
  { label: t('胶囊形',   'Pill'),    value: 'pill'    },
  { label: t('椭圆形',   'Ellipse'), value: 'ellipse' },
  { label: t('六边形',   'Hexagon'), value: 'hexagon' },
])

// Line style
const lineColors = ['#999999', '#4a7cf6', '#e53e3e', '#38a169', '#d69e2e', '#805ad5', '#1a1a1a', '#cccccc']
const lineTypes = computed(() => [
  { label: t('实线', 'Solid'),  value: 'solid',  dash: 'none' },
  { label: t('虚线', 'Dashed'), value: 'dashed', dash: '6 3' },
  { label: t('点线', 'Dotted'), value: 'dotted', dash: '2 3' },
])
const curveTypes = computed(() => [
  { label: t('曲线', 'Bezier'), value: 'bezier' },
  { label: t('折线', 'Elbow'),  value: 'elbow'  },
])

// Layout — backed by store
const selectedLayout = computed<LayoutType>({
  get: () => store.current?.layout ?? 'radial',
  set: (val: LayoutType) => store.setLayout(val),
})
const layouts = computed<{ label: string; short: string; value: LayoutType }[]>(() => [
  { label: t('放射状',       'Radial'),           short: t('放射状', 'Radial'),   value: 'radial'  },
  { label: t('树形(左→右)',  'Tree (Left→Right)'), short: t('左→右',  'L → R'),    value: 'tree-lr' },
  { label: t('树形(上→下)',  'Tree (Top→Bottom)'), short: t('上→下',  'T → B'),    value: 'tree-tb' },
])

// Canvas background presets — split by theme
const darkBgColors  = ['#141416', '#1c1c1e', '#1e1e2e', '#0f172a', '#18181b', '#1a1a2e', '#0d1117', '#111827']
const lightBgColors = ['#ede8e0', '#f5f0e8', '#ffffff', '#f8fafc', '#fafaf9', '#f0fdf4', '#fef9f0', '#f5f5f0']
const canvasBgColors = computed(() => theme.value === 'dark' ? darkBgColors : lightBgColors)
const patternTypes = computed<{ label: string; value: CanvasBgPattern }[]>(() => [
  { label: t('无',   'None'),     value: 'none'     },
  { label: t('点阵', 'Dots'),     value: 'dots'     },
  { label: t('网格', 'Grid'),     value: 'grid'     },
  { label: t('斜线', 'Diagonal'), value: 'diagonal' },
])

// Dot positions for pattern preview (dots)
const dotPositions: [number, number][] = [
  [4,4],[11,4],[18,4],[25,4],
  [4,10],[11,10],[18,10],[25,10],
  [4,16],[11,16],[18,16],[25,16],
]
</script>

<style scoped>
.right-panel {
  width: var(--panel-width);
  flex-shrink: 0;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* 区块 */
.panel-section {
  flex-shrink: 0;
}

.section-divider {
  height: 1px;
  background: var(--color-border-light);
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}
.section-header:hover {
  background: var(--color-surface-hover);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
}

.chevron {
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.chevron.open {
  transform: rotate(180deg);
}

.section-body {
  padding: var(--spacing-xs) var(--spacing-md) var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

/* 表单字段 */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* 颜色选择器行 */
.color-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.color-swatches {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1;
}
.swatch {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: transform 0.1s;
  outline: none;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
}
.swatch:hover {
  transform: scale(1.15);
}
.swatch.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}
.color-picker {
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
}

/* 文字样式按钮 */
.text-style-row {
  display: flex;
  gap: 4px;
}
.text-style-btn {
  width: 30px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.text-style-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.text-style-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

/* 节点形状选择 */
.shape-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}
.shape-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 2px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  font-size: 9px;
  line-height: 1.2;
}
.shape-btn svg {
  width: 36px;
  height: 20px;
}
.shape-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.shape-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.swatch--none {
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  box-shadow: 0 0 0 1px var(--color-border);
}
.swatch--none.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
  color: var(--color-accent);
}

/* label + value row */
.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.field-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-light);
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 18px;
  min-width: 28px;
  text-align: center;
}

/* Slider wrapper + track */
.slider-wrap {
  position: relative;
  height: 20px;
  display: flex;
  align-items: center;
}

/* Range input — fully custom cross-browser */
.range-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border: none;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(
    to right,
    var(--color-accent) 0%,
    var(--color-accent) var(--pct, 0%),
    var(--color-border) var(--pct, 0%),
    var(--color-border) 100%
  );
}

/* Thumb — WebKit */
.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--color-accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
}
.range-input::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 4px var(--color-accent-light);
}
.range-input:active::-webkit-slider-thumb {
  transform: scale(1.25);
  box-shadow: 0 0 0 6px var(--color-accent-light);
}

/* Thumb — Firefox */
.range-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--color-accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
}
.range-input::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 4px var(--color-accent-light);
}
.range-input::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: var(--color-border);
}

/* 线型选择 */
.line-types {
  display: flex;
  gap: var(--spacing-xs);
}
.line-type-btn {
  flex: 1;
  height: 28px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  color: var(--color-text-secondary);
  background: var(--color-surface);
}
.line-type-btn svg {
  width: 36px;
  height: 10px;
}
.line-type-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.line-type-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

/* 布局选项 */
.layout-options {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--spacing-xs);
}
.layout-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: var(--spacing-sm) var(--spacing-xs);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-surface);
  text-align: center;
  line-height: 1.3;
  word-break: keep-all;
}
.layout-option:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.layout-option.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

/* 重置按钮 */
.style-footer {
  display: flex;
  gap: var(--spacing-xs);
}

.reset-btn,
.apply-subtree-btn {
  flex: 1;
  padding: 5px 4px;
  font-size: var(--font-size-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reset-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.apply-subtree-btn:hover {
  border-color: var(--color-success);
  color: var(--color-success);
}
.reset-btn:disabled,
.apply-subtree-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* ── Disabled state for node style fields ── */
.field--disabled {
  opacity: 0.38;
  pointer-events: none;
  user-select: none;
}
.disabled-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-disabled);
  background: var(--color-surface-hover);
  border-radius: var(--radius-sm);
  padding: 5px 8px;
  text-align: center;
}

/* ── Pattern selector ── */
.pattern-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.pattern-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 2px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  font-size: 9px;
  line-height: 1.2;
}
.pattern-btn svg.pattern-preview {
  width: 28px;
  height: 20px;
}
.pattern-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.pattern-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
}
</style>
