export interface ContextMenuItem {
  label: string
  danger?: boolean
  disabled?: boolean
  action(): void
}

const MARGIN = 8

export class ContextMenu {
  private panel: HTMLElement | null = null

  show(x: number, y: number, items: ContextMenuItem[]): void {
    this.hide()
    const panel = document.createElement('div')
    panel.className = 'fv-ctx-menu'
    panel.setAttribute('role', 'menu')

    for (const item of items) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = item.danger ? 'fv-ctx-item fv-ctx-item--danger' : 'fv-ctx-item'
      button.textContent = item.label
      button.disabled = item.disabled === true
      button.setAttribute('role', 'menuitem')
      button.addEventListener('click', () => {
        this.hide()
        item.action()
      })
      panel.append(button)
    }

    document.body.append(panel)
    const rect = panel.getBoundingClientRect()
    const left = Math.max(MARGIN, Math.min(x, window.innerWidth - rect.width - MARGIN))
    const top = Math.max(MARGIN, Math.min(y, window.innerHeight - rect.height - MARGIN))
    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
    this.panel = panel

    document.addEventListener('pointerdown', this.onPointerDown, true)
    document.addEventListener('keydown', this.onKeyDown, true)
    document.addEventListener('scroll', this.hide, true)
  }

  hide = (): void => {
    if (!this.panel) return
    this.panel.remove()
    this.panel = null
    document.removeEventListener('pointerdown', this.onPointerDown, true)
    document.removeEventListener('keydown', this.onKeyDown, true)
    document.removeEventListener('scroll', this.hide, true)
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (this.panel && !this.panel.contains(event.target as Node)) this.hide()
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    this.hide()
  }
}
