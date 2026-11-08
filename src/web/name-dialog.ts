export interface ConfirmDialogOptions {
  title: string
  message: string
  confirmText?: string
  danger?: boolean
}

export interface NameDialogOptions {
  title: string
  label: string
  initial?: string
  confirmText?: string
  selectBase?: boolean
}

export class ConfirmDialog {
  ask(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'fv-dialog'

      const panel = document.createElement('div')
      panel.className = 'fv-dialog-panel'

      const heading = document.createElement('h2')
      heading.className = 'fv-dialog-title'
      heading.textContent = options.title

      const text = document.createElement('p')
      text.className = 'fv-dialog-message'
      text.textContent = options.message

      const actions = document.createElement('div')
      actions.className = 'fv-dialog-actions'
      const cancel = document.createElement('button')
      cancel.type = 'button'
      cancel.className = 'fv-dialog-button'
      cancel.textContent = '取消'
      const confirm = document.createElement('button')
      confirm.type = 'button'
      confirm.className = options.danger
        ? 'fv-dialog-button fv-dialog-button--danger'
        : 'fv-dialog-button fv-dialog-button--primary'
      confirm.textContent = options.confirmText ?? '确定'
      actions.append(cancel, confirm)

      panel.append(heading, text, actions)
      overlay.append(panel)
      document.body.append(overlay)

      const finish = (value: boolean): void => {
        overlay.remove()
        document.removeEventListener('keydown', onKeyDown, true)
        resolve(value)
      }
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          finish(false)
        } else if (event.key === 'Enter') {
          event.preventDefault()
          finish(true)
        }
      }

      cancel.addEventListener('click', () => finish(false))
      confirm.addEventListener('click', () => finish(true))
      overlay.addEventListener('pointerdown', (event) => {
        if (event.target === overlay) finish(false)
      })
      document.addEventListener('keydown', onKeyDown, true)

      confirm.focus()
    })
  }
}

export class NameDialog {
  ask(options: NameDialogOptions): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div')
      overlay.className = 'fv-dialog'

      const form = document.createElement('form')
      form.className = 'fv-dialog-panel'

      const heading = document.createElement('h2')
      heading.className = 'fv-dialog-title'
      heading.textContent = options.title

      const field = document.createElement('label')
      field.className = 'fv-dialog-field'
      const caption = document.createElement('span')
      caption.textContent = options.label
      const input = document.createElement('input')
      input.type = 'text'
      input.className = 'fv-dialog-input'
      input.value = options.initial ?? ''
      input.autocomplete = 'off'
      input.spellcheck = false
      field.append(caption, input)

      const actions = document.createElement('div')
      actions.className = 'fv-dialog-actions'
      const cancel = document.createElement('button')
      cancel.type = 'button'
      cancel.className = 'fv-dialog-button'
      cancel.textContent = '取消'
      const confirm = document.createElement('button')
      confirm.type = 'submit'
      confirm.className = 'fv-dialog-button fv-dialog-button--primary'
      confirm.textContent = options.confirmText ?? '确定'
      confirm.disabled = input.value.trim().length === 0
      actions.append(cancel, confirm)

      form.append(heading, field, actions)
      overlay.append(form)
      document.body.append(overlay)

      const finish = (value: string | null): void => {
        overlay.remove()
        document.removeEventListener('keydown', onKeyDown, true)
        resolve(value)
      }
      const submit = (): void => {
        const value = input.value.trim()
        if (value.length === 0) return
        finish(value)
      }

      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        finish(null)
      }

      input.addEventListener('input', () => {
        confirm.disabled = input.value.trim().length === 0
      })
      form.addEventListener('submit', (event) => {
        event.preventDefault()
        submit()
      })
      cancel.addEventListener('click', () => finish(null))
      overlay.addEventListener('pointerdown', (event) => {
        if (event.target === overlay) finish(null)
      })
      document.addEventListener('keydown', onKeyDown, true)

      input.focus()
      if (options.selectBase !== false && input.value.length > 0) {
        const dot = input.value.lastIndexOf('.')
        input.setSelectionRange(0, dot > 0 ? dot : input.value.length)
      } else {
        input.select()
      }
    })
  }
}
