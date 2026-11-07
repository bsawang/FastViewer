import {
  ASSOCIATION_GROUPS,
  type AssociationInfo,
  type AssociationTypeInfo,
} from '../shared/associations'
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
const assocGroupsEl = document.querySelector<HTMLElement>('#assoc-groups')
const assocNote = document.querySelector<HTMLElement>('#assoc-note')
const assocSummary = document.querySelector<HTMLElement>('#assoc-summary')
let toastTimer = 0
let assocInfo: AssociationInfo | null = null
let assocBusy = false

function showToast(message: string): void {
  if (!toast) return
  toast.textContent = message
  toast.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.hidden = true
  }, 2400)
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return '未知错误'
  return error.message.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '')
}

function associationTooltip(type: AssociationTypeInfo): string {
  const registered = type.registered ? '已登记' : '未登记'
  const system =
    type.defaultApp === 'self'
      ? '系统默认 FastViewer'
      : type.defaultApp === 'other'
        ? '系统默认其他程序'
        : '系统默认未设置'
  return `.${type.ext} · ${registered} · ${system}`
}

function renderAssociations(): void {
  const info = assocInfo
  if (!assocGroupsEl || !info) return
  const types = new Map(info.types.map((type) => [type.ext, type]))
  assocGroupsEl.replaceChildren(
    ...ASSOCIATION_GROUPS.map((group) => {
      const groupTypes = group.exts
        .map((ext) => types.get(ext))
        .filter((type): type is AssociationTypeInfo => Boolean(type))
      const allOn = groupTypes.length > 0 && groupTypes.every((type) => type.registered)
      const section = document.createElement('div')
      section.className = 'fv-assoc-group'
      const head = document.createElement('div')
      head.className = 'fv-assoc-group-head'
      const label = document.createElement('span')
      label.textContent = group.label
      const toggleAll = document.createElement('button')
      toggleAll.type = 'button'
      toggleAll.className = 'fv-assoc-all'
      toggleAll.textContent = allOn ? '全不选' : '全选'
      toggleAll.disabled = assocBusy || !info.editable
      toggleAll.addEventListener('click', () => {
        void applyAssociations(
          groupTypes.map((type) => type.ext),
          !allOn,
        )
      })
      head.append(label, toggleAll)
      const chips = document.createElement('div')
      chips.className = 'fv-assoc-chips'
      for (const type of groupTypes) {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = 'fv-assoc-chip'
        chip.setAttribute('role', 'checkbox')
        chip.setAttribute('aria-checked', String(type.registered))
        chip.dataset.ext = type.ext
        chip.dataset.default = type.defaultApp
        chip.title = associationTooltip(type)
        const icon = document.createElement('img')
        icon.className = 'fv-assoc-icon'
        icon.src = `assets/file-icons/${type.ext}.svg`
        icon.alt = ''
        icon.draggable = false
        chip.append(icon, document.createTextNode(`.${type.ext}`))
        chip.disabled = assocBusy || !info.editable
        chip.addEventListener('click', () => {
          void applyAssociations([type.ext], !type.registered)
        })
        chips.append(chip)
      }
      section.append(head, chips)
      return section
    }),
  )
  const registered = info.types.filter((type) => type.registered).length
  const defaults = info.types.filter((type) => type.defaultApp === 'self').length
  if (assocSummary) {
    assocSummary.textContent = `已登记 ${registered} / ${info.types.length} 个类型${
      defaults > 0 ? ` · 其中 ${defaults} 个是系统默认` : ''
    }`
  }
  if (assocNote) {
    assocNote.textContent = info.editable
      ? '勾选后该类型会出现在“打开方式”中。Windows 10 的默认程序需在系统设置中确认，本应用不会强行改写。'
      : '开发模式只读；安装版可修改文件关联。'
  }
}

async function loadAssociations(): Promise<void> {
  if (assocNote) assocNote.textContent = '正在读取文件关联…'
  try {
    assocInfo = await api.associations()
    renderAssociations()
  } catch (error) {
    if (assocNote) assocNote.textContent = '读取文件关联失败'
    if (assocSummary) assocSummary.textContent = ''
    showToast(`读取文件关联失败：${errorText(error)}`)
  }
}

async function applyAssociations(exts: string[], enabled: boolean): Promise<void> {
  if (!assocInfo?.editable || assocBusy) return
  assocBusy = true
  renderAssociations()
  try {
    assocInfo = await api.setAssociations(exts, enabled)
    showToast(enabled ? '已登记所选文件类型' : '已取消所选文件类型')
  } catch (error) {
    showToast(`修改文件关联失败：${errorText(error)}`)
  } finally {
    assocBusy = false
    renderAssociations()
  }
}

async function openSettings(): Promise<void> {
  if (!settings) return
  closeThemeMenu()
  settings.hidden = false
  if (toast) toast.hidden = true
  void loadAssociations()
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
document.querySelector('#btn-default-apps')?.addEventListener('click', () => {
  void api.openDefaultApps().catch((error) => {
    showToast(`打开系统设置失败：${errorText(error)}`)
  })
})
