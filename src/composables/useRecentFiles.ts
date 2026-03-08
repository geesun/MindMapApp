import { ref } from 'vue'

const STORAGE_KEY = 'mindmap-recent-files'
const MAX_RECENT  = 10

export interface RecentFile {
  path:      string
  title:     string
  updatedAt: number
}

// Module-level reactive state so all instances share the same list
const recentFiles = ref<RecentFile[]>(loadFromStorage())

function loadFromStorage(): RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentFiles.value))
  } catch {
    // ignore quota / private-browsing errors
  }
}

export function useRecentFiles() {
  function addRecentFile(path: string, title: string) {
    const entry: RecentFile = { path, title, updatedAt: Date.now() }
    // Remove any existing entry for the same path, then prepend
    recentFiles.value = [
      entry,
      ...recentFiles.value.filter(f => f.path !== path),
    ].slice(0, MAX_RECENT)
    saveToStorage()
  }

  function removeRecentFile(path: string) {
    recentFiles.value = recentFiles.value.filter(f => f.path !== path)
    saveToStorage()
  }

  return { recentFiles, addRecentFile, removeRecentFile }
}
