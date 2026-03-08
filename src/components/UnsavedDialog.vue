<template>
  <Teleport to="body">
    <div class="overlay" @click.self="onCancel">
      <div class="dialog" role="alertdialog" aria-modal="true">
        <div class="dialog-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 9v4M12 17h.01" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="dialog-content">
          <h3 class="dialog-title">{{ t('有未保存的修改', 'Unsaved Changes') }}</h3>
          <p class="dialog-desc">{{ t('当前文件有未保存的修改，是否继续？', 'The current file has unsaved changes. Continue anyway?') }}</p>
        </div>
        <div class="dialog-actions">
          <button class="btn-cancel" @click="onCancel">{{ t('取消', 'Cancel') }}</button>
          <button class="btn-confirm" @click="onConfirm">{{ t('不保存，继续', 'Discard & Continue') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useMindmapStore } from '../stores/mindmap'
import { useLocale } from '../composables/useLocale'

const store = useMindmapStore()
const { t } = useLocale()

function onConfirm() {
  const action = store.pendingAction
  store.showUnsavedDialog = false
  store.pendingAction = null
  if (action) action()
}

function onCancel() {
  store.showUnsavedDialog = false
  store.pendingAction = null
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
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
  padding: var(--spacing-xl);
  width: 360px;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  text-align: center;
}

.dialog-icon svg {
  width: 40px;
  height: 40px;
  color: var(--color-warning, #f59e0b);
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.dialog-desc {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.dialog-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-xs);
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
  border: none;
  transition: opacity 0.12s;
}
.btn-confirm:hover {
  opacity: 0.85;
}
</style>
