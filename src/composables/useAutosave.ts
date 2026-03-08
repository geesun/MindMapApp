import { ref, watch, onUnmounted } from 'vue'
import { writeFile, readTextFile, mkdir, exists, readDir, remove } from '@tauri-apps/plugin-fs'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { useMindmapStore } from '../stores/mindmap'
import { useMindmapFile, serialize } from './useMindmapFile'

// How long to wait after the last change before autosaving (ms)
const AUTOSAVE_DELAY = 30_000

// Subfolder inside AppLocalData for draft files
const DRAFTS_DIR = 'drafts'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// Module-level singleton so any component can read the status
export const autosaveStatus = ref<AutosaveStatus>('idle')
export const autosaveLastTime = ref<number | null>(null)

export interface DraftEntry {
  /** The map id (also the filename stem) */
  id: string
  /** Title extracted from the draft content */
  title: string
  /** mtime of the draft file (ms since epoch) */
  savedAt: number
}

/** Derive a stable draft filename from the map id */
function draftFileName(mapId: string): string {
  return `${DRAFTS_DIR}/${mapId}.mindmap.md`
}

async function ensureDraftsDir(): Promise<void> {
  const dirExists = await exists(DRAFTS_DIR, { baseDir: BaseDirectory.AppLocalData })
  if (!dirExists) {
    await mkdir(DRAFTS_DIR, { baseDir: BaseDirectory.AppLocalData, recursive: true })
  }
}

async function writeDraft(mapId: string, content: Uint8Array): Promise<void> {
  await ensureDraftsDir()
  await writeFile(draftFileName(mapId), content, { baseDir: BaseDirectory.AppLocalData })
}

/** Delete the draft file for a given map id (silently ignores if missing). */
export async function deleteDraft(mapId: string): Promise<void> {
  try {
    const path = draftFileName(mapId)
    const fileExists = await exists(path, { baseDir: BaseDirectory.AppLocalData })
    if (fileExists) {
      await remove(path, { baseDir: BaseDirectory.AppLocalData })
    }
  } catch (e) {
    console.warn('[autosave] deleteDraft failed:', e)
  }
}

/**
 * List all draft files in AppLocalData/drafts/.
 * Extracts the title from the first heading line (# ...) in each file.
 * Returns entries sorted newest-first.
 */
export async function listDrafts(): Promise<DraftEntry[]> {
  try {
    const dirExists = await exists(DRAFTS_DIR, { baseDir: BaseDirectory.AppLocalData })
    if (!dirExists) return []

    const entries = await readDir(DRAFTS_DIR, { baseDir: BaseDirectory.AppLocalData })
    const drafts: DraftEntry[] = []

    for (const entry of entries) {
      if (!entry.name?.endsWith('.mindmap.md')) continue
      // filename is <id>.mindmap.md
      const id = entry.name.replace(/\.mindmap\.md$/, '')

      // Read file to extract title
      let title = id
      let savedAt = Date.now()
      try {
        const content = await readTextFile(`${DRAFTS_DIR}/${entry.name}`, {
          baseDir: BaseDirectory.AppLocalData,
        })
        // Find first heading line: # Some Title
        const headingMatch = content.match(/^#\s+(.+)$/m)
        if (headingMatch) title = headingMatch[1].trim()

        // Extract savedAt from the file's last-modified time via mtime embedded
        // in the frontmatter comment line we write: <!-- savedAt: <ms> -->
        const savedAtMatch = content.match(/^<!--\s*savedAt:\s*(\d+)\s*-->$/m)
        if (savedAtMatch) savedAt = parseInt(savedAtMatch[1], 10)
      } catch {
        // skip unreadable files
        continue
      }

      drafts.push({ id, title, savedAt })
    }

    // Newest first
    return drafts.sort((a, b) => b.savedAt - a.savedAt)
  } catch (e) {
    console.warn('[autosave] listDrafts failed:', e)
    return []
  }
}

/**
 * Read the raw content of a single draft file.
 * Returns null if the file does not exist or cannot be read.
 */
export async function readDraft(mapId: string): Promise<string | null> {
  try {
    const path = draftFileName(mapId)
    const fileExists = await exists(path, { baseDir: BaseDirectory.AppLocalData })
    if (!fileExists) return null
    return await readTextFile(path, { baseDir: BaseDirectory.AppLocalData })
  } catch {
    return null
  }
}

export function useAutosave() {
  const store = useMindmapStore()
  const { saveMap } = useMindmapFile()

  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  async function performSave() {
    const map = store.current
    if (!map || !map.dirty) return

    autosaveStatus.value = 'saving'
    try {
      if (map.filePath) {
        // Already has a path — silent in-place save
        await saveMap()
        // Remove any leftover draft for this map (e.g. was unsaved before, now has a path)
        await deleteDraft(map.id)
      } else {
        // New unsaved map — write to AppLocalData/drafts/<id>.mindmap.md
        // Prepend a savedAt comment so listDrafts() can read the mtime without
        // relying on filesystem metadata (which Tauri fs doesn't expose cheaply).
        const now = Date.now()
        const raw = serialize(map)
        const withMeta = `<!-- savedAt: ${now} -->\n${raw}`
        const encoder = new TextEncoder()
        await writeDraft(map.id, encoder.encode(withMeta))
        // map.dirty stays true — this is only a draft backup, not a real save.
      }
      autosaveStatus.value = 'saved'
      autosaveLastTime.value = Date.now()
    } catch (e) {
      console.error('[autosave] failed:', e)
      autosaveStatus.value = 'error'
    }

    // Reset back to idle after 3 s so the status indicator fades out
    setTimeout(() => {
      if (autosaveStatus.value === 'saved' || autosaveStatus.value === 'error') {
        autosaveStatus.value = 'idle'
      }
    }, 3000)
  }

  function schedule() {
    clearTimer()
    timer = setTimeout(performSave, AUTOSAVE_DELAY)
  }

  // Watch updatedAt — it changes on every markDirty() call
  const stopWatch = watch(
    () => store.current?.updatedAt,
    (newVal, oldVal) => {
      if (newVal !== undefined && newVal !== oldVal && store.current?.dirty) {
        schedule()
      }
    }
  )

  // Also cancel pending timer when the map changes (new / open)
  const stopMapWatch = watch(
    () => store.current?.id,
    () => clearTimer()
  )

  onUnmounted(() => {
    clearTimer()
    stopWatch()
    stopMapWatch()
  })

  return { autosaveStatus, autosaveLastTime }
}
