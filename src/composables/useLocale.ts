import { ref } from 'vue'

const locale = ref<'zh' | 'en'>(
  (localStorage.getItem('mindmap-locale') as 'zh' | 'en') ?? 'zh'
)

export function useLocale() {
  function toggle() {
    locale.value = locale.value === 'zh' ? 'en' : 'zh'
    localStorage.setItem('mindmap-locale', locale.value)
  }

  function t(zh: string, en: string): string {
    return locale.value === 'zh' ? zh : en
  }

  return { locale, toggle, t }
}
