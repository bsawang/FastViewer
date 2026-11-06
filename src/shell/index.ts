import { DEFAULT_THEME, THEME_LABELS, isThemeName, type ThemeName } from '../shared/theme'

const api = window.fvShell

async function mountGuest(): Promise<void> {
  const stage = document.querySelector('#stage')
  if (!stage) return
  try {
    const info = await api.bootInfo()
    const view = document.createElementNS('http://www.w3.org/1999/xhtml', 'webview')
    view.setAttribute('src', info.appUrl)
    view.setAttribute('preload', info.guestPreloadUrl)
    stage.replaceChildren(view)
  } catch {
    stage.textContent = '内容页加载失败'
  }
}

void mountGuest()

document.querySelector('#btn-min')?.addEventListener('click', () => api.window('minimize'))
document.querySelector('#btn-max')?.addEventListener('click', () => api.window('toggle-maximize'))
document.querySelector('#btn-close')?.addEventListener('click', () => api.window('close'))

api.onWindowState(({ maximized, fullscreen }) => {
  document.body.classList.toggle('maximized', maximized)
  document.body.classList.toggle('fullscreen', fullscreen)
  const max = document.querySelector('#btn-max')
  max?.setAttribute('title', maximized ? '还原' : '最大化')
  max?.setAttribute('aria-label', maximized ? '还原' : '最大化')
})

api.onImmersive((on) => {
  document.body.classList.toggle('is-immersive', on)
})

const themePicker = document.querySelector<HTMLElement>('#theme-picker')
const themeTrigger = document.querySelector<HTMLButtonElement>('#theme-trigger')
const themeMenu = document.querySelector<HTMLElement>('#theme-menu')
const themeLabel = document.querySelector<HTMLElement>('#theme-label')
let activeTheme: ThemeName = DEFAULT_THEME
let activeOption: HTMLElement | null = null

function themeOptions(): HTMLElement[] {
  return Array.from(themeMenu?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
}

function applyTheme(theme: ThemeName): void {
  activeTheme = theme
  document.documentElement.dataset.theme = theme
  if (themeLabel) themeLabel.textContent = THEME_LABELS[theme]
  for (const option of themeOptions()) {
    option.setAttribute('aria-selected', String(option.dataset.theme === theme))
  }
}

function setActiveOption(option: HTMLElement): void {
  activeOption?.classList.remove('is-active')
  activeOption = option
  option.classList.add('is-active')
  themeMenu?.setAttribute('aria-activedescendant', option.id)
  option.scrollIntoView({ block: 'nearest' })
}

function closeThemeMenu(): void {
  if (!themeMenu || !themeTrigger || themeMenu.hidden) return
  themeMenu.hidden = true
  themeTrigger.setAttribute('aria-expanded', 'false')
  themeMenu.removeAttribute('aria-activedescendant')
  activeOption?.classList.remove('is-active')
  activeOption = null
}

function openThemeMenu(): void {
  if (!themeMenu || !themeTrigger) return
  themeMenu.hidden = false
  themeTrigger.setAttribute('aria-expanded', 'true')
  const options = themeOptions()
  const selected = options.find((option) => option.dataset.theme === activeTheme) ?? options[0]
  if (selected) setActiveOption(selected)
}

function chooseTheme(option: HTMLElement): void {
  const theme = option.dataset.theme
  closeThemeMenu()
  if (!isThemeName(theme)) return
  applyTheme(theme)
  void api.setTheme(theme)
}

themeTrigger?.addEventListener('click', () => {
  if (themeMenu?.hidden) openThemeMenu()
  else closeThemeMenu()
})

themeTrigger?.addEventListener('keydown', (event) => {
  const options = themeOptions()
  if (options.length === 0) return
  if (!themeMenu || themeMenu.hidden) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openThemeMenu()
    }
    return
  }
  const current = activeOption ? options.indexOf(activeOption) : -1
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      setActiveOption(options[Math.min(options.length - 1, current + 1)])
      break
    case 'ArrowUp':
      event.preventDefault()
      setActiveOption(options[Math.max(0, current - 1)])
      break
    case 'Home':
      event.preventDefault()
      setActiveOption(options[0])
      break
    case 'End':
      event.preventDefault()
      setActiveOption(options[options.length - 1])
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (activeOption) chooseTheme(activeOption)
      break
    case 'Escape':
      event.preventDefault()
      closeThemeMenu()
      break
    case 'Tab':
      closeThemeMenu()
      break
  }
})

for (const option of themeOptions()) {
  option.addEventListener('click', () => chooseTheme(option))
}

document.addEventListener('pointerdown', (event) => {
  if (!themeMenu || themeMenu.hidden) return
  const target = event.target
  if (target instanceof Node && !themePicker?.contains(target)) closeThemeMenu()
})

void api
  .getTheme()
  .then(applyTheme)
  .catch(() => {})
api.onTheme(applyTheme)

const settings = document.querySelector<HTMLElement>('#settings')
const toast = document.querySelector<HTMLElement>('#settings-toast')
const aboutApp = document.querySelector<HTMLElement>('#about-app')
const aboutElectron = document.querySelector<HTMLElement>('#about-electron')
const aboutChromium = document.querySelector<HTMLElement>('#about-chromium')
const aboutConfig = document.querySelector<HTMLElement>('#about-config')
let toastTimer = 0

function showToast(message: string): void {
  if (!toast) return
  toast.textContent = message
  toast.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.hidden = true
  }, 2400)
}

async function openSettings(): Promise<void> {
  if (!settings) return
  closeThemeMenu()
  settings.hidden = false
  if (toast) toast.hidden = true
  try {
    const info = await api.about()
    if (aboutApp) aboutApp.textContent = info.app
    if (aboutElectron) aboutElectron.textContent = info.electron
    if (aboutChromium) aboutChromium.textContent = info.chromium
    if (aboutConfig) {
      aboutConfig.textContent = info.configPath
      aboutConfig.title = info.configPath
    }
  } catch {
    showToast('读取版本信息失败')
  }
}

function closeSettings(): void {
  if (settings) settings.hidden = true
}

document.querySelector('#btn-settings')?.addEventListener('click', () => void openSettings())
document.querySelector('#settings-close')?.addEventListener('click', closeSettings)
settings?.addEventListener('click', (event) => {
  if (event.target === settings) closeSettings()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !settings?.hidden) closeSettings()
})

document.querySelector('#btn-reveal-config')?.addEventListener('click', () => {
  void api.revealConfig().then((error) => {
    if (error) showToast(`打开失败：${error}`)
  })
})
document.querySelector('#btn-reset-layout')?.addEventListener('click', () => {
  void api.resetLayout().then(() => showToast('已恢复默认布局'))
})
document.querySelector('#btn-reset-prefs')?.addEventListener('click', () => {
  void api.resetPrefs().then(() => showToast('已清理全部偏好'))
})
