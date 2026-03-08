<template>
  <Teleport to="body">
    <!-- Backdrop to close -->
    <div class="ctx-backdrop" @click="emit('close')" @contextmenu.prevent="emit('close')" />

    <ul
      class="ctx-menu"
      :style="menuStyle"
      @click.stop
    >
      <li class="ctx-item" @click="act('addChild')">
        <svg class="ctx-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="6" width="5" height="4" rx="1"/>
          <rect x="9" y="2" width="5" height="4" rx="1"/>
          <rect x="9" y="10" width="5" height="4" rx="1"/>
          <path d="M7 8h2M11.5 6v4" stroke-linecap="round"/>
        </svg>
        <span>{{ t('添加子节点', 'Add Child') }}</span>
        <span class="ctx-hint">Tab</span>
      </li>
      <li v-if="!isRoot" class="ctx-item" @click="act('addSibling')">
        <svg class="ctx-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="4" width="5" height="4" rx="1"/>
          <rect x="2" y="10" width="5" height="4" rx="1"/>
          <path d="M4.5 8v2" stroke-linecap="round"/>
        </svg>
        <span>{{ t('添加同级节点', 'Add Sibling') }}</span>
        <span class="ctx-hint">Enter</span>
      </li>

      <li class="ctx-separator" />

      <li class="ctx-item" @click="act('copy')">
        <svg class="ctx-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="5" y="1" width="9" height="11" rx="1.5"/>
          <rect x="2" y="4" width="9" height="11" rx="1.5"/>
        </svg>
        <span>{{ t('复制', 'Copy') }}</span>
        <span class="ctx-hint">Ctrl+C</span>
      </li>
      <li v-if="!isRoot" class="ctx-item" @click="act('cut')">
        <svg class="ctx-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="4" cy="12" r="2.5"/>
          <circle cx="12" cy="12" r="2.5"/>
          <path d="M4 9.5L8 5l4 4.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8 5V2" stroke-linecap="round"/>
        </svg>
        <span>{{ t('剪切', 'Cut') }}</span>
        <span class="ctx-hint">Ctrl+X</span>
      </li>
      <li :class="['ctx-item', { disabled: !hasClipboard }]" @click="hasClipboard && act('paste')">
        <svg class="ctx-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="4" y="4" width="9" height="11" rx="1.5"/>
          <path d="M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" stroke-linecap="round"/>
        </svg>
        <span>{{ t('粘贴为子节点', 'Paste as Child') }}</span>
        <span class="ctx-hint">Ctrl+V</span>
      </li>

      <li v-if="!isRoot" class="ctx-separator" />

      <li v-if="!isRoot" class="ctx-item ctx-item--danger" @click="act('delete')">
        <svg class="ctx-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ t('删除节点', 'Delete Node') }}</span>
        <span class="ctx-hint">Del</span>
      </li>
    </ul>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMindmapStore } from '../stores/mindmap'
import { useLocale } from '../composables/useLocale'

const props = defineProps<{
  x: number
  y: number
  nodeId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'action', action: string): void
}>()

const store = useMindmapStore()
const { t } = useLocale()

const isRoot = computed(() => store.current?.root.id === props.nodeId)
const hasClipboard = computed(() => !!store.clipboard)

// Clamp menu within viewport
const MENU_W = 210
const MENU_H = 260

const menuStyle = computed(() => {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const x = Math.min(props.x, vw - MENU_W - 8)
  const y = Math.min(props.y, vh - MENU_H - 8)
  return { left: `${x}px`, top: `${y}px` }
})

function act(action: string) {
  emit('action', action)
}
</script>

<style scoped>
.ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
}

.ctx-menu {
  position: fixed;
  z-index: 501;
  min-width: 200px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-xs) 0;
  list-style: none;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 6px var(--spacing-md);
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}
.ctx-item:hover {
  background: var(--color-accent-light);
  color: var(--color-accent);
}
.ctx-item.disabled {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}
.ctx-item.disabled:hover {
  background: none;
  color: var(--color-text-disabled);
}
.ctx-item--danger {
  color: var(--color-danger);
}
.ctx-item--danger:hover {
  background: rgba(255, 69, 58, 0.1);
  color: var(--color-danger);
}

.ctx-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.ctx-hint {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--color-text-disabled);
  padding-left: var(--spacing-md);
}
.ctx-item:hover .ctx-hint {
  color: var(--color-accent);
  opacity: 0.7;
}

.ctx-separator {
  height: 1px;
  background: var(--color-border-light);
  margin: var(--spacing-xs) 0;
}
</style>
