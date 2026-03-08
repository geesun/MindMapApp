<template>
  <div class="dialog-overlay" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span class="dialog-title">{{ t('导出思维导图', 'Export Mind Map') }}</span>
        <button class="close-btn" @click="emit('close')">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <line x1="3" y1="3" x2="13" y2="13" stroke-linecap="round"/>
            <line x1="13" y1="3" x2="3" y2="13" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Success state -->
      <template v-if="savedPath">
        <div class="dialog-body success-body">
          <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="7 13 10 16 17 9" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p class="success-title">{{ t('导出成功', 'Export Successful') }}</p>
          <p class="success-path">{{ savedPath }}</p>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="openFolder">{{ t('打开文件夹', 'Open Folder') }}</button>
          <button class="btn-primary" @click="emit('close')">{{ t('关闭', 'Close') }}</button>
        </div>
      </template>

      <!-- Export options state -->
      <template v-else>
        <div class="dialog-body">

          <!-- 格式 -->
          <div class="field-row">
            <label class="field-label">{{ t('导出格式', 'Format') }}</label>
            <div class="btn-group">
              <button
                v-for="f in formats" :key="f.value"
                class="seg-btn"
                :class="{ active: opts.format === f.value }"
                @click="opts.format = f.value"
              >{{ f.label }}</button>
            </div>
          </div>

          <!-- 显示范围 -->
          <div class="field-row">
            <label class="field-label">{{ t('显示范围', 'Range') }}</label>
            <div class="btn-group">
              <button class="seg-btn" :class="{ active: opts.range === 'full' }"     @click="opts.range = 'full'">{{ t('完整思维导图', 'Full Map') }}</button>
              <button class="seg-btn" :class="{ active: opts.range === 'selected', disabled: !hasSelected }"
                      :disabled="!hasSelected"
                      @click="hasSelected && (opts.range = 'selected')">{{ t('选中节点及子节点', 'Selected Subtree') }}</button>
            </div>
          </div>

          <!-- 背景设置 -->
          <div class="field-row">
            <label class="field-label">{{ t('背景设置', 'Background') }}</label>
            <div class="btn-group">
              <button class="seg-btn" :class="{ active: opts.background === 'transparent' }" @click="opts.background = 'transparent'">{{ t('透明背景', 'Transparent') }}</button>
              <button class="seg-btn" :class="{ active: opts.background === 'canvas' }"      @click="opts.background = 'canvas'">{{ t('画布背景色', 'Canvas Color') }}</button>
              <button class="seg-btn" :class="{ active: opts.background === 'white' }"       @click="opts.background = 'white'">{{ t('白色背景', 'White') }}</button>
              <button class="seg-btn" :class="{ active: opts.background === 'custom' }"      @click="opts.background = 'custom'">{{ t('自定义', 'Custom') }}</button>
            </div>
            <div v-if="opts.background === 'custom'" class="custom-bg-row">
              <input type="color" v-model="opts.customBg" class="color-picker"/>
              <span class="color-hex">{{ opts.customBg }}</span>
            </div>
          </div>

          <!-- PNG 专属：分辨率 + 画质 -->
          <template v-if="opts.format === 'png'">
            <div class="field-row">
              <label class="field-label">{{ t('分辨率', 'Resolution') }}</label>
              <div class="res-row">
                <button
                  v-for="r in resPresets" :key="r.label"
                  class="seg-btn"
                  :class="{ active: opts.width === r.w && opts.height === r.h }"
                  @click="setRes(r.w, r.h)"
                >{{ r.label }}</button>
                <button class="seg-btn" :class="{ active: isCustomRes }" @click="setCustomRes">{{ t('自定义', 'Custom') }}</button>
              </div>
              <div v-if="isCustomRes" class="custom-res-row">
                <input type="number" v-model.number="opts.width"  class="res-input" min="100" max="3840" @change="clampRes"/>
                <span class="res-sep">×</span>
                <input type="number" v-model.number="opts.height" class="res-input" min="100" max="2160" @change="clampRes"/>
                <span class="res-unit">px</span>
              </div>
          </div>
          </template>

          <!-- SVG 说明 -->
          <div v-else class="svg-hint">
            {{ t('SVG 为矢量格式，无分辨率限制，可无损缩放。', 'SVG is a vector format with no resolution limits, allowing lossless scaling.') }}
          </div>

        </div>

        <!-- Footer -->
        <div class="dialog-footer">
          <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
          <button class="btn-secondary" @click="emit('close')">{{ t('取消', 'Cancel') }}</button>
          <button class="btn-primary" :disabled="exporting" @click="doExport">
            <span v-if="exporting" class="spinner" />
            {{ exporting ? t('导出中…', 'Exporting…') : t('导出', 'Export') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { open as openPath } from '@tauri-apps/plugin-shell'
import { useMindmapStore } from '../stores/mindmap'
import { useExport } from '../composables/useExport'
import { useLocale } from '../composables/useLocale'
import type { ExportData, ExportOptions } from '../composables/useExport'


const props = defineProps<{
  exportData: ExportData | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store    = useMindmapStore()
const { runExport } = useExport()
const { t } = useLocale()

const hasSelected = computed(() => !!store.selectedId)

// ── Options ────────────────────────────────────────────────────────────────────
const opts = reactive<ExportOptions>({
  format:     'png',
  range:      'full',
  background: 'canvas',
  customBg:   '#ffffff',
  width:      1920,
  height:     1080,
})

// When range becomes invalid, reset it
watch(hasSelected, v => { if (!v) opts.range = 'full' })

const formats = [
  { value: 'png' as const, label: 'PNG' },
  { value: 'svg' as const, label: 'SVG' },
]

// ── Resolution presets ────────────────────────────────────────────────────────
const resPresets = [
  { label: '1920×1080', w: 1920, h: 1080 },
  { label: '2560×1440', w: 2560, h: 1440 },
  { label: '3840×2160', w: 3840, h: 2160 },
]

const isCustomRes = computed(() =>
  !resPresets.some(r => r.w === opts.width && r.h === opts.height)
)

function setRes(w: number, h: number) {
  opts.width = w; opts.height = h
}

function setCustomRes() {
  // Switch to custom without matching any preset
  opts.width = 1280; opts.height = 720
}

function clampRes() {
  opts.width  = Math.max(100, Math.min(3840, opts.width))
  opts.height = Math.max(100, Math.min(2160, opts.height))
}

// ── Export ─────────────────────────────────────────────────────────────────────
const exporting  = ref(false)
const errorMsg   = ref('')
const savedPath  = ref<string | null>(null)

async function doExport() {
  if (!props.exportData) {
    errorMsg.value = t('没有可导出的思维导图。', 'No mind map to export.')
    return
  }
  exporting.value = true
  errorMsg.value  = ''
  try {
    const path = await runExport(props.exportData, { ...opts })
    if (path) savedPath.value = path
    // null = user cancelled save dialog — keep dialog open
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    errorMsg.value = `${t('导出失败：', 'Export failed: ')}${msg}`
  } finally {
    exporting.value = false
  }
}

function openFolder() {
  if (!savedPath.value) return
  const sep   = savedPath.value.includes('/') ? '/' : '\\'
  const parts = savedPath.value.split(sep)
  parts.pop()
  const dir = parts.join(sep) || sep
  openPath(dir).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    errorMsg.value = `${t('无法打开文件夹：', 'Cannot open folder: ')}${msg}`
  })
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  backdrop-filter: blur(2px);
}

.dialog {
  width: 480px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.close-btn:hover { background: var(--color-surface-hover); color: var(--color-text-primary); }
.close-btn svg { width: 14px; height: 14px; }

.dialog-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  max-height: 60vh;
}

/* Field rows */
.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Segmented button groups */
.btn-group, .res-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.seg-btn {
  padding: 4px 12px;
  height: 28px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  white-space: nowrap;
}
.seg-btn:hover:not(.disabled):not([disabled]) {
  background: var(--color-surface-3);
  color: var(--color-text-primary);
}
.seg-btn.active {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.seg-btn.disabled,
.seg-btn[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Custom bg */
.custom-bg-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.color-picker {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
  padding: 2px;
  background: var(--color-surface-2);
}
.color-hex {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: monospace;
}

/* Custom resolution */
.custom-res-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.res-input {
  width: 72px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  font-size: 12px;
  text-align: center;
  padding: 0 6px;
}
.res-input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.res-sep, .res-unit {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* SVG hint */
.svg-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  border: 1px solid var(--color-border);
}

/* Success state */
.success-body {
  align-items: center;
  text-align: center;
  padding: 24px 20px 20px;
  gap: 10px;
}
.success-icon svg {
  width: 48px;
  height: 48px;
  color: var(--color-accent);
  stroke: var(--color-accent);
}
.success-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}
.success-path {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-family: monospace;
  word-break: break-all;
  max-width: 100%;
  margin: 0;
}

/* Footer */
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.error-msg {
  flex: 1;
  font-size: 12px;
  color: var(--color-danger);
}

.btn-secondary {
  padding: 0 16px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  cursor: pointer;
}
.btn-secondary:hover { background: var(--color-surface-3); color: var(--color-text-primary); }

.btn-primary {
  padding: 0 20px;
  height: 32px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: var(--color-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.12s;
}
.btn-primary:hover:not([disabled]) { background: var(--color-accent-hover); }
.btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; }

/* Spinner */
.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
