<template>
  <header v-if="mindmapStore.current" class="app-header">

    <!-- File group -->
    <div class="tool-group">
      <button class="tool-btn" :title="t('新建 (Ctrl+N)', 'New (Ctrl+N)')" @click="guardDirty(() => mindmapStore.showNewDialog = true)">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <rect x="2" y="1" width="7.5" height="11" rx="1"/>
          <path d="M6.5 1v3.5H10" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M4.5 7.5h4M6.5 5.5v4" stroke-linecap="round"/>
        </svg>
        <span>{{ t('新建', 'New') }}</span>
      </button>
      <button class="tool-btn" :title="t('打开 (Ctrl+O)', 'Open (Ctrl+O)')" @click="guardDirty(() => openMap())">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M1.5 4.5A1.2 1.2 0 012.7 3.3h2.3L6.3 4.5h5A1.2 1.2 0 0112.5 5.7v5.1A1.2 1.2 0 0111.3 12H2.7A1.2 1.2 0 011.5 10.8V4.5z" stroke-linejoin="round"/>
        </svg>
        <span>{{ t('打开', 'Open') }}</span>
      </button>
      <button class="tool-btn" :title="t('保存 (Ctrl+S)', 'Save (Ctrl+S)')" :disabled="!mindmapStore.current" @click="saveMap()">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M2 12V2h7.5L12 4.5V12a.5.5 0 01-.5.5H2.5A.5.5 0 012 12z" stroke-linejoin="round"/>
          <rect x="4.5" y="2" width="4" height="3" rx="0.4"/>
          <rect x="3.5" y="8" width="7" height="3.5" rx="0.4"/>
        </svg>
        <span>{{ t('保存', 'Save') }}</span>
      </button>
      <button class="tool-btn" :title="t('另存为 (Ctrl+Shift+S)', 'Save As (Ctrl+Shift+S)')" :disabled="!mindmapStore.current" @click="saveMapAs()">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M2 12V2h7.5L12 4.5V12a.5.5 0 01-.5.5H2.5A.5.5 0 012 12z" stroke-linejoin="round"/>
          <rect x="4.5" y="2" width="4" height="3" rx="0.4"/>
          <rect x="3.5" y="8" width="7" height="3.5" rx="0.4"/>
          <path d="M9.5 10.5l1.5-1.5 1.5 1.5M11 9v3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ t('另存为', 'Save As') }}</span>
      </button>
    </div>

    <div class="tool-sep" />

    <!-- History group -->
    <div class="tool-group">
      <button class="tool-btn" :title="t('撤销 (Ctrl+Z)', 'Undo (Ctrl+Z)')" :disabled="!mindmapStore.canUndo" @click="mindmapStore.undo()">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M1.5 5h6.5a3.5 3.5 0 010 7H4" stroke-linecap="round"/>
          <path d="M4 2.5L1.5 5 4 7.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ t('撤销', 'Undo') }}</span>
      </button>
      <button class="tool-btn" :title="t('恢复 (Ctrl+Y)', 'Redo (Ctrl+Y)')" :disabled="!mindmapStore.canRedo" @click="mindmapStore.redo()">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M12.5 5H6a3.5 3.5 0 000 7h4" stroke-linecap="round"/>
          <path d="M10 2.5L12.5 5 10 7.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>{{ t('恢复', 'Redo') }}</span>
      </button>
    </div>

    <div class="tool-sep" />

    <!-- IO group -->
    <div class="tool-group">
      <button class="tool-btn" :title="t('导入 Markdown', 'Import Markdown')" @click="guardDirty(() => importMarkdown())">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M7 9.5V2.5" stroke-linecap="round"/>
          <path d="M4.5 7L7 9.5 9.5 7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12h10" stroke-linecap="round"/>
        </svg>
        <span>{{ t('导入', 'Import') }}</span>
      </button>
      <button class="tool-btn" :title="t('导出', 'Export')" :disabled="!mindmapStore.current" @click="mindmapStore.showExportDialog = true">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
          <path d="M7 4.5V11.5" stroke-linecap="round"/>
          <path d="M4.5 7L7 4.5 9.5 7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12h10" stroke-linecap="round"/>
        </svg>
        <span>{{ t('导出', 'Export') }}</span>
      </button>
    </div>

    <!-- Spacer + theme + locale -->
    <div class="tool-spacer" />

    <!-- Theme toggle -->
    <button class="tool-btn tool-btn--icon" @click="toggleTheme"
            :title="theme === 'dark' ? t('切换到浅色模式', 'Switch to Light Mode') : t('切换到深色模式', 'Switch to Dark Mode')">
      <svg v-if="theme === 'dark'" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
        <circle cx="7" cy="7" r="2.5"/>
        <path d="M7 1.5V3M7 11v1.5M1.5 7H3M11 7h1.5M3 3l1 1M10 10l1 1M11 3l-1 1M4 10l-1 1" stroke-linecap="round"/>
      </svg>
      <svg v-else viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
        <path d="M12.5 8.5A5.5 5.5 0 015.5 1.5a5.5 5.5 0 100 11 5.5 5.5 0 007-4z" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Locale toggle -->
    <button class="tool-btn tool-btn--icon tool-btn--locale" @click="toggleLocale"
            :title="locale === 'zh' ? 'Switch to English' : '切换到中文'">
      {{ locale === 'zh' ? 'EN' : '中' }}
    </button>

  </header>
</template>

<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import { useLocale } from '../composables/useLocale'
import { useMindmapStore } from '../stores/mindmap'
import { useMindmapFile } from '../composables/useMindmapFile'

const { theme, toggle: toggleTheme } = useTheme()
const { locale, toggle: toggleLocale, t } = useLocale()
const mindmapStore = useMindmapStore()
const { guardDirty, saveMap, saveMapAs, openMap, importMarkdown } = useMindmapFile()
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  height: var(--header-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  z-index: 100;
  padding: 0 10px;
  gap: 4px;
}

/* Group of buttons that share a pill container */
.tool-group {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--color-surface-2);
  border-radius: var(--radius-lg);
  padding: 3px 4px;
}

.tool-sep {
  width: 1px;
  height: 16px;
  background: var(--color-border);
  margin: 0 2px;
  flex-shrink: 0;
}

.tool-spacer { flex: 1; }

/* Text + icon button */
.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  flex-shrink: 0;
}
.tool-btn svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}
.tool-btn:hover {
  background: var(--color-surface-3);
  color: var(--color-text-primary);
}
.tool-btn:active {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}
.tool-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

/* Icon-only variant (theme toggle) */
.tool-btn--icon {
  width: 30px;
  height: 30px;
  padding: 0;
  justify-content: center;
  border-radius: var(--radius-md);
  background: transparent;
}
.tool-btn--icon:hover {
  background: var(--color-surface-2);
  color: var(--color-accent);
}

/* Locale toggle: slightly wider for "EN" / "中" text */
.tool-btn--locale {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
