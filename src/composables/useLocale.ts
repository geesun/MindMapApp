import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const locale = ref<'zh' | 'en'>(
  (localStorage.getItem('mindmap-locale') as 'zh' | 'en') ?? 'zh'
)

export function useLocale() {
  function toggle() {
    locale.value = locale.value === 'zh' ? 'en' : 'zh'
    localStorage.setItem('mindmap-locale', locale.value)
    invoke('update_menu_labels', { locale: locale.value }).catch(() => {})
  }

  function t(zh: string, en: string): string {
    return locale.value === 'zh' ? zh : en
  }

  return { locale, toggle, t }
}
