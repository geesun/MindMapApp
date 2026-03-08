<template>
  <div class="canvas-area">
    <!-- 画布主体 -->
    <div class="canvas-viewport" ref="viewport" :style="viewportStyle">

      <!-- 有导图时：完整树形画布 -->
      <MindCanvas v-if="store.current" ref="mindCanvasRef" />

      <!-- 空状态：欢迎页 -->
      <div v-else class="welcome-screen">

        <!-- Floating theme + locale toggles -->
        <div class="welcome-top-btns">
          <button class="welcome-theme-btn" @click="toggleTheme"
                  :title="theme === 'dark' ? t('切换到浅色模式', 'Switch to Light Mode') : t('切换到深色模式', 'Switch to Dark Mode')">
            <svg v-if="theme === 'dark'" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="8" cy="8" r="2.8"/>
              <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" stroke-linecap="round"/>
            </svg>
            <svg v-else viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 9.5A6 6 0 016.5 2a6 6 0 100 12A6 6 0 0014 9.5z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="welcome-theme-btn welcome-locale-btn" @click="toggleLocale"
                  :title="locale === 'zh' ? 'Switch to English' : '切换到中文'">
            {{ locale === 'zh' ? 'EN' : '中' }}
          </button>
        </div>

        <!-- Logo block — centered, upper area -->
        <div class="welcome-logo">
          <!-- New logo: layered hexagonal mind-map mark -->
          <svg class="logo-mark" viewBox="0 0 56 56" fill="none">
            <!-- Outer glow ring -->
            <circle cx="28" cy="28" r="26" fill="var(--color-accent)" opacity="0.08"/>
            <!-- Central node -->
            <circle cx="28" cy="28" r="7" fill="var(--color-accent)"/>
            <!-- Connector lines -->
            <line x1="28" y1="21" x2="28" y2="11"  stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
            <line x1="34" y1="24" x2="43" y2="17"  stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
            <line x1="34" y1="31" x2="43" y2="38"  stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
            <line x1="28" y1="35" x2="28" y2="45"  stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
            <line x1="22" y1="31" x2="13" y2="38"  stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
            <line x1="22" y1="24" x2="13" y2="17"  stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
            <!-- Satellite nodes -->
            <circle cx="28" cy="9"  r="4" fill="var(--color-accent)" opacity="0.75"/>
            <circle cx="45" cy="15" r="3.5" fill="var(--color-accent)" opacity="0.65"/>
            <circle cx="45" cy="40" r="3.5" fill="var(--color-accent)" opacity="0.65"/>
            <circle cx="28" cy="47" r="4" fill="var(--color-accent)" opacity="0.75"/>
            <circle cx="11" cy="40" r="3.5" fill="var(--color-accent)" opacity="0.65"/>
            <circle cx="11" cy="15" r="3.5" fill="var(--color-accent)" opacity="0.65"/>
          </svg>
          <div class="logo-text">
            <span class="logo-name">MindMap</span>
            <span class="logo-tagline">{{ t('清晰思考，结构呈现', 'Think Clearly, Structure Beautifully') }}</span>
          </div>
        </div>

        <!-- Two-column: actions + recent -->
        <div class="welcome-body">
          <!-- Left: action cards -->
          <div class="welcome-left">
            <div class="action-cards">
              <button class="action-card action-card--primary" @click="guardDirty(() => store.showNewDialog = true)">
                <span class="action-card-icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
                    <rect x="3" y="2" width="11" height="15" rx="1.5"/>
                    <path d="M10 2v5h4"/>
                    <path d="M6 10h6M9 7v5" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="action-card-body">
                  <span class="action-card-title">{{ t('新建导图', 'New Mind Map') }}</span>
                  <span class="action-card-desc">{{ t('从空白画布开始', 'Start from a blank canvas') }}</span>
                </span>
                <span class="action-card-shortcut">⌘N</span>
              </button>

              <button class="action-card" @click="guardDirty(() => openMap())">
                <span class="action-card-icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
                    <path d="M3 6A2 2 0 015 4h3.5L10 5.5h5A2 2 0 0117 7.5v7A2 2 0 0115 16.5H5A2 2 0 013 14.5V6z" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="action-card-body">
                  <span class="action-card-title">{{ t('打开文件', 'Open File') }}</span>
                  <span class="action-card-desc">{{ t('打开 .mindmap.md 文件', 'Open a .mindmap.md file') }}</span>
                </span>
                <span class="action-card-shortcut">⌘O</span>
              </button>

              <button class="action-card" @click="guardDirty(() => importMarkdown())">
                <span class="action-card-icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">
                    <path d="M10 3v10M7 10l3 3 3-3" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 15h14" stroke-linecap="round"/>
                  </svg>
                </span>
                <span class="action-card-body">
                  <span class="action-card-title">{{ t('导入 Markdown', 'Import Markdown') }}</span>
                  <span class="action-card-desc">{{ t('从 .md 文件转换', 'Convert from a .md file') }}</span>
                </span>
              </button>
            </div>
          </div>

          <!-- Right: recent files -->
          <div class="welcome-right">
            <p class="recent-heading">{{ t('最近打开', 'Recent Files') }}</p>
            <div v-if="recentFiles.length === 0" class="recent-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
                <path d="M12 8v4l2.5 2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="9"/>
              </svg>
              <span>{{ t('暂无最近文件', 'No recent files') }}</span>
            </div>
            <ul v-else class="recent-list">
              <li
                v-for="file in recentFiles"
                :key="file.path"
                class="recent-item"
                :title="file.path"
                @click="guardDirty(() => openRecentFile(file.path))"
              >
                <svg class="recent-file-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
                  <path d="M3 2A1 1 0 014 1h5.5L12 3.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2z" stroke-linejoin="round"/>
                  <path d="M9 1v3h3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="recent-item-body">
                  <span class="recent-item-name">{{ fileDisplayName(file.path) }}</span>
                  <span class="recent-item-path">{{ fileDir(file.path) }}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 — 仅在有导图时显示 -->
    <div v-if="store.current" class="canvas-statusbar">
      <div class="status-left">
        <span class="status-item">{{ t('节点数：', 'Nodes: ') }}<strong>{{ nodeCount }}</strong></span>
        <span class="status-divider" />
        <span class="status-item">{{ t('已选：', 'Selected: ') }}<strong>{{ store.selectedId ? 1 : 0 }}</strong></span>
      </div>
      <div class="status-right">
        <span class="status-item">{{ layoutLabel }}</span>
        <span class="status-divider" />
        <span class="status-item zoom-ctrl">
          <button class="zoom-btn" :title="t('缩小', 'Zoom Out')" @click="mindCanvasRef?.zoomOut()">−</button>
          <span class="zoom-text zoom-reset" :title="t('恢复 100%', 'Reset to 100%')" @click="mindCanvasRef?.resetZoom()">{{ zoomPercent }}%</span>
          <button class="zoom-btn" :title="t('放大', 'Zoom In')" @click="mindCanvasRef?.zoomIn()">+</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMindmapStore } from '../stores/mindmap'
import { useMindmapFile } from '../composables/useMindmapFile'
import { useRecentFiles } from '../composables/useRecentFiles'
import { useTheme } from '../composables/useTheme'
import { useLocale } from '../composables/useLocale'
import type { MindNode } from '../types/mindmap'
import MindCanvas from './MindCanvas.vue'

const store = useMindmapStore()
const { guardDirty, openMap, openRecentFile, importMarkdown } = useMindmapFile()
const { recentFiles } = useRecentFiles()
const { theme, toggle: toggleTheme } = useTheme()
const { locale, toggle: toggleLocale, t } = useLocale()
const viewport      = ref<HTMLDivElement | null>(null)
const mindCanvasRef = ref<InstanceType<typeof MindCanvas> | null>(null)

defineExpose({ mindCanvasRef })

const zoomPercent = computed(() => {
  const z = mindCanvasRef.value?.zoom
  // z is a Ref<number> when accessed via component instance
  const val = (z && typeof z === 'object' && 'value' in z) ? (z as { value: number }).value : (z ?? 1)
  return Math.round(val * 100)
})

function countNodes(node: MindNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0)
}

const nodeCount = computed(() =>
  store.current ? countNodes(store.current.root) : 0
)

const layoutLabelMap = computed<Record<string, string>>(() => ({
  radial:    t('放射状布局', 'Radial Layout'),
  'tree-lr': t('树形（左→右）', 'Tree (Left→Right)'),
  'tree-tb': t('树形（上→下）', 'Tree (Top→Bottom)'),
}))

const layoutLabel = computed(() =>
  store.current ? (layoutLabelMap.value[store.current.layout] ?? store.current.layout) : '—'
)

/** Return just the filename stem from a full path */
function fileDisplayName(filePath: string): string {
  const name = filePath.replace(/\\/g, '/').split('/').pop() ?? filePath
  return name.replace(/\.mindmap\.md$/, '')
}

/** Return a shortened directory portion of a path */
function fileDir(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const idx = normalized.lastIndexOf('/')
  if (idx < 0) return ''
  return normalized.slice(0, idx)
}
const viewportStyle = computed(() => {
  const bg = store.canvasBg
  const color = bg.color

  // Pattern line color — adapt to bg luminance
  const isDark = isColorDark(color)
  const lineColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'

  let patternImage = 'none'
  let patternSize  = '20px 20px'

  function svgUri(svgContent: string, w: number, h: number): string {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>${svgContent}</svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }

  if (bg.pattern === 'dots') {
    patternImage = svgUri(`<circle cx='10' cy='10' r='1.2' fill='${lineColor}'/>`, 20, 20)
    patternSize  = '20px 20px'
  } else if (bg.pattern === 'grid') {
    patternImage = svgUri(
      `<path d='M 20 0 L 0 0 0 20' fill='none' stroke='${lineColor}' stroke-width='0.5'/>`,
      20, 20
    )
    patternSize  = '20px 20px'
  } else if (bg.pattern === 'diagonal') {
    patternImage = svgUri(
      `<line x1='-2' y1='2' x2='2' y2='-2' stroke='${lineColor}' stroke-width='1'/>` +
      `<line x1='0' y1='16' x2='16' y2='0' stroke='${lineColor}' stroke-width='1'/>` +
      `<line x1='14' y1='18' x2='18' y2='14' stroke='${lineColor}' stroke-width='1'/>`,
      16, 16
    )
    patternSize  = '16px 16px'
  }

  return {
    backgroundColor: color,
    backgroundImage: patternImage,
    backgroundSize:  patternSize,
  }
})

/** Simple luminance check — returns true if hex color is dark */
function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  // Perceived luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128
}
</script>

<style scoped>
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.canvas-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  /* background is now set dynamically via viewportStyle */
}

/* ── Welcome screen ──────────────────────────────────────────────── */
.welcome-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 10vh;
  gap: 36px;
  overflow: auto;
  background: var(--color-bg);
}

/* Floating theme+locale toggles in top-right corner */
.welcome-top-btns {
  position: absolute;
  top: 12px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.welcome-theme-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--color-text-disabled);
  transition: background 0.12s, color 0.12s;
}
.welcome-theme-btn svg {
  width: 16px;
  height: 16px;
}
.welcome-theme-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-accent);
}

/* Locale button text variant */
.welcome-locale-btn {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Logo block */
.welcome-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.logo-mark {
  width: 64px;
  height: 64px;
  filter: drop-shadow(0 4px 16px var(--color-accent-glow));
}

.logo-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.logo-name {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--color-text-primary);
  line-height: 1;
}

.logo-tagline {
  font-size: var(--font-size-sm);
  color: var(--color-text-disabled);
  letter-spacing: 0.3px;
}

/* Body: two-column row */
.welcome-body {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

/* Left column */
.welcome-left {
  width: 256px;
  flex-shrink: 0;
}

/* Action cards */
.action-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 10px var(--spacing-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  width: 100%;
}
.action-card:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-sm);
}
.action-card--primary {
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  background: var(--color-accent-light);
}
.action-card--primary:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm), 0 0 0 3px var(--color-accent-glow);
}

.action-card-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
  color: var(--color-accent);
  flex-shrink: 0;
}
.action-card--primary .action-card-icon {
  background: var(--color-accent);
  color: #fff;
}
.action-card-icon svg {
  width: 17px;
  height: 17px;
}

.action-card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.action-card-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
}
.action-card--primary .action-card-title {
  color: var(--color-accent);
}
.action-card-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-disabled);
  margin-top: 2px;
}

.action-card-shortcut {
  font-size: var(--font-size-xs);
  color: var(--color-text-disabled);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1px 5px;
  font-family: monospace;
  flex-shrink: 0;
  line-height: 1.8;
}

/* Right column — recent files */
.welcome-right {
  width: 256px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.recent-heading {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 0 2px 4px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}

.recent-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl) 0;
  color: var(--color-text-disabled);
  font-size: var(--font-size-sm);
}
.recent-empty svg {
  width: 28px;
  height: 28px;
  opacity: 0.35;
}

.recent-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 7px var(--spacing-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.12s;
  min-width: 0;
}
.recent-item:hover {
  background: var(--color-surface-hover);
}

.recent-file-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--color-accent);
  opacity: 0.7;
}

.recent-item-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.recent-item-name {
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-item-path {
  font-size: var(--font-size-xs);
  color: var(--color-text-disabled);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

/* 状态栏 */
.canvas-statusbar {
  height: 26px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 var(--spacing-md);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}
.status-left, .status-right {
  display: flex; align-items: center; gap: var(--spacing-sm);
}
.status-item {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.status-item strong { color: var(--color-text-primary); font-weight: 500; }
.status-divider { width: 1px; height: 12px; background: var(--color-border); }
.zoom-ctrl { display: flex; align-items: center; gap: 4px; }
.zoom-btn {
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 3px; font-size: 14px; line-height: 1;
  color: var(--color-text-secondary); cursor: pointer; transition: background 0.1s;
}
.zoom-btn:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.zoom-text {
  font-size: var(--font-size-xs); color: var(--color-text-secondary);
  min-width: 32px; text-align: center;
}
.zoom-reset {
  cursor: pointer;
  border-radius: 3px;
  padding: 0 2px;
  transition: background 0.1s, color 0.1s;
}
.zoom-reset:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
</style>
