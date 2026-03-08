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
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

const mindmapStore  = useMindmapStore()
const canvasAreaRef = ref<InstanceType<typeof CanvasArea> | null>(null)
const { guardDirty, saveMap, saveMapAs, openMap } = useMindmapFile()

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

  // Intercept the OS window close button.
  // The Rust backend prevents the default close and emits this event so we can
  // show the unsaved-changes dialog before actually closing.
  // When the user confirms, we invoke force_close which calls window.destroy()
  // directly on the Rust side, bypassing the CloseRequested guard entirely.
  listen<void>('close-requested', () => {
    guardDirty(() => invoke('force_close'))
  })
})

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
