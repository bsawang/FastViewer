const MAX_VALUE_LENGTH = 90

function displayValue(value: string): string {
  return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value
}

export function renderDetailRows(
  container: HTMLElement,
  rows: Array<[string, string]>,
  title?: string,
): void {
  container.replaceChildren()
  if (title && rows.length > 0) {
    const head = document.createElement('div')
    head.className = 'fv-detail-group-title'
    head.textContent = title
    container.append(head)
  }
  for (const [label, value] of rows) {
    const row = document.createElement('div')
    const term = document.createElement('dt')
    term.textContent = label
    const detail = document.createElement('dd')
    detail.textContent = displayValue(value)
    row.append(term, detail)
    container.append(row)
  }
  container.hidden = rows.length === 0
}
