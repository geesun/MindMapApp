<template>
  <div id="app-root">
    <AppToolbar />
    <div class="app-body">
      <CanvasArea ref="canvasAreaRef" />
      <RightPanel v-if="mindmapStore.current" />
    </div>
    <NewMapDialog />
    <ExportDialog
      v-if="mindmapStore.showExportDialog"
      :export-data="exportData"
      @close="mindmapStore.showExportDialog = false"
    />
    <UnsavedDialog v-if="mindmapStore.showUnsavedDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AppToolbar from './components/AppToolbar.vue'
import CanvasArea from './components/CanvasArea.vue'
import RightPanel from './components/RightPanel.vue'
import NewMapDialog from './components/NewMapDialog.vue'
import ExportDialog from './components/ExportDialog.vue'
import UnsavedDialog from './components/UnsavedDialog.vue'
import './composables/useTheme'
import { useMindmapStore } from './stores/mindmap'
import { useMindmapFile } from './composables/useMindmapFile'
import { useAutosave } from './composables/useAutosave'
import { useLocale } from './composables/useLocale'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

const mindmapStore  = useMindmapStore()
const canvasAreaRef = ref<InstanceType<typeof CanvasArea> | null>(null)
const { guardDirty, saveMap, saveMapAs, openMap } = useMindmapFile()
const { locale } = useLocale()

// Start autosave
useAutosave()

// ── Window title ─────────────────────────────────────────────────────────────
watch(
  () => ({
    title: mindmapStore.current?.title,
    dirty: mindmapStore.current?.dirty,
    filePath: mindmapStore.current?.filePath,
  }),
  ({ title, dirty, filePath }) => {
    let label = 'MindMap'
    if (title) {
      // Use filename stem if saved, otherwise map title
      let name = title
      if (filePath) {
        const stem = filePath.replace(/\\/g, '/').split('/').pop() ?? filePath
        name = stem.replace(/\.mindmap\.md$/, '')
      }
      label = `${dirty ? '• ' : ''}${name} — MindMap`
    }
    getCurrentWindow().setTitle(label)
  },
  { immediate: true }
)

const exportData = computed(() => {
  if (!mindmapStore.showExportDialog) return null
  return canvasAreaRef.value?.mindCanvasRef?.getExportData() ?? null
})

function onKeydown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey

  if (ctrl && e.key === 'z') {
    e.preventDefault()
    mindmapStore.undo()
    return
  }

  if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
    e.preventDefault()
    mindmapStore.redo()
    return
  }

  if (ctrl && e.key === 'n') {
    e.preventDefault()
    guardDirty(() => { mindmapStore.showNewDialog = true })
    return
  }

  if (ctrl && e.shiftKey && e.key === 'S') {
    e.preventDefault()
    saveMapAs()
    return
  }

  if (ctrl && e.key === 's') {
    e.preventDefault()
    saveMap()
    return
  }

  if (ctrl && e.key === 'o') {
    e.preventDefault()
    guardDirty(() => openMap())
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)

  // Sync native menu labels to the current locale on startup.
  invoke('update_menu_labels', { locale: locale.value }).catch(() => {})

  // Intercept the OS window close button.
  listen<void>('close-requested', () => {
    guardDirty(() => invoke('force_close'))
  })

  // Native app menu events forwarded from Rust
  listen<void>('menu-file-new',         () => guardDirty(() => { mindmapStore.showNewDialog = true }))
  listen<void>('menu-file-open',        () => guardDirty(() => openMap()))
  listen<void>('menu-file-save',        () => saveMap())
  listen<void>('menu-file-save-as',     () => saveMapAs())
  listen<void>('menu-edit-add-child',   () => canvasAreaRef.value?.mindCanvasRef?.addChildToSelected())
  listen<void>('menu-edit-add-sibling', () => canvasAreaRef.value?.mindCanvasRef?.addSiblingToSelected())
})

// Keep "Add Child / Sibling" menu items in sync with whether a node is selected.
watch(
  () => mindmapStore.selectedId,
  (id) => { invoke('set_node_menu_enabled', { enabled: !!id }) },
  { immediate: true }
)

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
#app-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
