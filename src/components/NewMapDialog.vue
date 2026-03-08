<template>
  <!-- 遮罩层 -->
  <Teleport to="body">
    <div v-if="store.showNewDialog" class="dialog-overlay" @click.self="cancel">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">

        <!-- 标题栏 -->
        <div class="dialog-header">
          <h2 id="dialog-title" class="dialog-title">{{ t('新建思维导图', 'New Mind Map') }}</h2>
          <button class="dialog-close" @click="cancel" :title="t('取消', 'Cancel')">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
              <line x1="3" y1="3" x2="13" y2="13" stroke-linecap="round"/>
              <line x1="13" y1="3" x2="3" y2="13" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- 内容 -->
        <div class="dialog-body">
          <!-- 导图名称 -->
          <div class="form-field">
            <label class="form-label" for="map-title">{{ t('导图名称', 'Map Title') }}</label>
            <input
              id="map-title"
              ref="titleInput"
              v-model="title"
              class="form-input"
              type="text"
              :placeholder="t('未命名主题', 'Untitled')"
              maxlength="80"
              @keydown.enter="confirm"
              @keydown.esc="cancel"
            />
          </div>

          <!-- 初始布局选择 -->
          <div class="form-field">
            <label class="form-label">{{ t('初始布局', 'Initial Layout') }}</label>
            <div class="layout-grid">
              <button
                v-for="l in layouts"
                :key="l.value"
                class="layout-card"
                :class="{ active: selectedLayout === l.value }"
                @click="selectedLayout = l.value"
                @dblclick="confirmWithLayout(l.value)"
                type="button"
              >
                <!-- 布局图示 -->
                <div class="layout-preview">
                  <!-- 放射状 -->
                  <svg v-if="l.value === 'radial'" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="5" fill="currentColor" opacity="0.9"/>
                    <circle cx="24" cy="7" r="3.5" fill="currentColor" opacity="0.5"/>
                    <circle cx="24" cy="41" r="3.5" fill="currentColor" opacity="0.5"/>
                    <circle cx="7" cy="24" r="3.5" fill="currentColor" opacity="0.5"/>
                    <circle cx="41" cy="24" r="3.5" fill="currentColor" opacity="0.5"/>
                    <circle cx="11" cy="11" r="3" fill="currentColor" opacity="0.35"/>
                    <circle cx="37" cy="37" r="3" fill="currentColor" opacity="0.35"/>
                    <circle cx="37" cy="11" r="3" fill="currentColor" opacity="0.35"/>
                    <circle cx="11" cy="37" r="3" fill="currentColor" opacity="0.35"/>
                    <line x1="24" y1="19" x2="24" y2="10.5" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="24" y1="29" x2="24" y2="37.5" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="19" y1="24" x2="10.5" y2="24" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="29" y1="24" x2="37.5" y2="24" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="20.5" y1="20.5" x2="14" y2="14" stroke="currentColor" stroke-width="1" opacity="0.35"/>
                    <line x1="27.5" y1="27.5" x2="34" y2="34" stroke="currentColor" stroke-width="1" opacity="0.35"/>
                    <line x1="27.5" y1="20.5" x2="34" y2="14" stroke="currentColor" stroke-width="1" opacity="0.35"/>
                    <line x1="20.5" y1="27.5" x2="14" y2="34" stroke="currentColor" stroke-width="1" opacity="0.35"/>
                  </svg>
                  <!-- 树形左→右 -->
                  <svg v-else-if="l.value === 'tree-lr'" viewBox="0 0 48 48" fill="none">
                    <rect x="2" y="19" width="12" height="10" rx="2" fill="currentColor" opacity="0.8"/>
                    <rect x="22" y="7" width="10" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                    <rect x="22" y="20" width="10" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                    <rect x="22" y="33" width="10" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                    <rect x="36" y="4" width="10" height="6" rx="2" fill="currentColor" opacity="0.3"/>
                    <rect x="36" y="12" width="10" height="6" rx="2" fill="currentColor" opacity="0.3"/>
                    <rect x="36" y="33" width="10" height="6" rx="2" fill="currentColor" opacity="0.3"/>
                    <line x1="14" y1="24" x2="22" y2="11" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="14" y1="24" x2="22" y2="24" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="14" y1="24" x2="22" y2="37" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="32" y1="11" x2="36" y2="7" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                    <line x1="32" y1="11" x2="36" y2="15" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                    <line x1="32" y1="37" x2="36" y2="36" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                  </svg>
                  <!-- 树形上→下 -->
                  <svg v-else-if="l.value === 'tree-tb'" viewBox="0 0 48 48" fill="none">
                    <rect x="17" y="2" width="14" height="10" rx="2" fill="currentColor" opacity="0.8"/>
                    <rect x="4" y="20" width="10" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                    <rect x="19" y="20" width="10" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                    <rect x="34" y="20" width="10" height="8" rx="2" fill="currentColor" opacity="0.5"/>
                    <rect x="4" y="36" width="8" height="6" rx="2" fill="currentColor" opacity="0.3"/>
                    <rect x="14" y="36" width="8" height="6" rx="2" fill="currentColor" opacity="0.3"/>
                    <line x1="24" y1="12" x2="9" y2="20" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="24" y1="12" x2="24" y2="20" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="24" y1="12" x2="39" y2="20" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
                    <line x1="9" y1="28" x2="8" y2="36" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                    <line x1="9" y1="28" x2="18" y2="36" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                  </svg>
                </div>
                <span class="layout-label">{{ l.label }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 操作栏 -->
        <div class="dialog-footer">
          <button class="btn-cancel" @click="cancel" type="button">{{ t('取消', 'Cancel') }}</button>
          <button class="btn-confirm" @click="confirm" type="button">{{ t('创建', 'Create') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useMindmapStore } from '../stores/mindmap'
import { useLocale } from '../composables/useLocale'
import type { LayoutType } from '../types/mindmap'

const store = useMindmapStore()
const { t } = useLocale()

const title = ref('未命名主题')
const selectedLayout = ref<LayoutType>('radial')
const titleInput = ref<HTMLInputElement | null>(null)

const layouts = computed<{ label: string; value: LayoutType }[]>(() => [
  { label: t('放射状', 'Radial'), value: 'radial' },
  { label: t('树形（左→右）', 'Tree (Left→Right)'), value: 'tree-lr' },
  { label: t('树形（上→下）', 'Tree (Top→Bottom)'), value: 'tree-tb' },
])

// 弹窗打开时，重置表单并聚焦输入框
watch(() => store.showNewDialog, async (open) => {
  if (open) {
    title.value = t('未命名主题', 'Untitled')
    selectedLayout.value = 'radial'
    await nextTick()
    titleInput.value?.select()
  }
})

function confirm() {
  const mapTitle = title.value.trim() || t('未命名主题', 'Untitled')
  store.newMap(selectedLayout.value)
  // 把自定义名称写入根节点
  if (store.current) {
    store.current.title = mapTitle
    store.current.root.text = mapTitle
  }
  store.showNewDialog = false
}

function confirmWithLayout(layout: LayoutType) {
  selectedLayout.value = layout
  confirm()
}

function cancel() {
  store.showNewDialog = false
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
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.dialog {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 460px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 标题栏 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-light);
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.dialog-close {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.dialog-close svg {
  width: 14px;
  height: 14px;
}
.dialog-close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

/* 内容 */
.dialog-body {
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-input {
  height: 34px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

/* 布局网格 */
.layout-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.layout-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--spacing-sm) var(--spacing-xs);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  color: var(--color-text-secondary);
}
.layout-card:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.layout-card.active {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.layout-preview {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.layout-preview svg {
  width: 48px;
  height: 48px;
}

.layout-label {
  font-size: 11px;
  text-align: center;
  line-height: 1.3;
}

/* 底部操作栏 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

.btn-cancel {
  height: 32px;
  padding: 0 var(--spacing-lg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: background 0.12s;
}
.btn-cancel:hover {
  background: var(--color-surface-hover);
}

.btn-confirm {
  height: 32px;
  padding: 0 var(--spacing-lg);
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: #fff;
  font-size: var(--font-size-md);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s;
  border: none;
}
.btn-confirm:hover {
  background: var(--color-accent-hover);
}
</style>
