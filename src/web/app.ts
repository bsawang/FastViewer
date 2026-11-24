import { collapseBreadcrumb, parseBreadcrumb, type CrumbSegment } from './breadcrumb'
import { ContextMenu, type ContextMenuItem } from './context-menu'
import { FullscreenLayer } from './fullscreen'
import { Grid, type GridItem } from './grid'
import { clampColumns } from './grid-math'
import { resolveKeyAction } from './keymap'
import { buildMediaSeq } from './media-seq'
import { findMediaIndex, parentOf } from './open-request'
import { ConfirmDialog, NameDialog } from './name-dialog'
import { ThumbnailService } from './thumbnails'
import { Viewer } from './viewer'
import { SPLIT_DEFAULT, clampSplitRatio, splitWidths } from '../shared/split'
import { folderTitle } from '../shared/path-title'
import { GRID_COLUMNS_MAX, GRID_COLUMNS_MIN, type SortKey, type SortOrder } from '../shared/config'
import type { DriveInfo } from '../shared/drives'
import type { PlaceInfo } from '../shared/places'
import type { ThemeName } from '../shared/theme'

const PAGE_LIMIT = 500

const appRoot = document.querySelector('.fv-app') as HTMLElement
const content = document.getElementById('content') as HTMLElement
const browser = document.getElementById('browser') as HTMLElement
const wall = document.getElementById('wall') as HTMLElement
const splitHandle = document.getElementById('split') as HTMLElement
const footer = document.getElementById('footer') as HTMLElement
const crumbBar = document.getElementById('crumbs') as HTMLElement
const crumbList = document.getElementById('crumb-list') as HTMLElement
const toolbar = document.getElementById('toolbar') as HTMLElement
const columnsSlider = document.getElementById('grid-columns') as HTMLInputElement
const columnsSmaller = document.getElementById('columns-smaller') as HTMLButtonElement
const columnsLarger = document.getElementById('columns-larger') as HTMLButtonElement
const columnsValue = document.getElementById('grid-columns-value') as HTMLElement
const backTop = document.getElementById('back-top') as HTMLButtonElement
const sortButtons: Record<SortKey, HTMLButtonElement> = {
  name: document.getElementById('sort-name') as HTMLButtonElement,
  mtime: document.getElementById('sort-mtime') as HTMLButtonElement,
  size: document.getElementById('sort-size') as HTMLButtonElement,
}
const sortOrderButton = document.getElementById('sort-order') as HTMLButtonElement

const grid = new Grid()
const thumbnails = new ThumbnailService()
const contextMenu = new ContextMenu()
const nameDialog = new NameDialog()
const confirmDialog = new ConfirmDialog()
const nameCollator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

let currentPath = ''
let parentPath: string | null = null
let items: GridItem[] = []
let realLoaded = 0
let totalReal = 0
let loadingMore = false
let refreshing = false
let generation = 0
let menu: HTMLElement | null = null
let persistTimer = 0
let lastErrorCode: string | null = null
let dragDepth = 0
let hasClipboard = false
let footerFlashTimer = 0

let splitRatio = SPLIT_DEFAULT
let detailOpen = true
let splitPersistTimer = 0
let viewerPath: string | null = null
let sort: { key: SortKey; order: SortOrder } = { key: 'name', order: 'asc' }

const viewer = new Viewer(
  {
    root: document.getElementById('viewer') as HTMLElement,
    empty: document.getElementById('viewer-empty') as HTMLElement,
    name: document.getElementById('viewer-name') as HTMLElement,
    stage: document.getElementById('viewer-stage') as HTMLElement,
    image: document.getElementById('viewer-image') as HTMLImageElement,
    video: document.getElementById('viewer-video') as HTMLVideoElement,
    loading: document.getElementById('viewer-loading') as HTMLElement,
    error: document.getElementById('viewer-error') as HTMLElement,
    errorName: document.getElementById('viewer-error-name') as HTMLElement,
    errorText: document.getElementById('viewer-error-text') as HTMLElement,
    retry: document.getElementById('viewer-retry') as HTMLButtonElement,
    nextError: document.getElementById('viewer-next-error') as HTMLButtonElement,
    detail: document.getElementById('viewer-detail') as HTMLElement,
    detailClose: document.getElementById('detail-close') as HTMLButtonElement,
    detailName: document.getElementById('detail-name') as HTMLElement,
    detailFormat: document.getElementById('detail-format') as HTMLElement,
    detailDim: document.getElementById('detail-dim') as HTMLElement,
    detailPixelsRow: document.getElementById('detail-pixels-row') as HTMLElement,
    detailPixels: document.getElementById('detail-pixels') as HTMLElement,
    detailDurationRow: document.getElementById('detail-duration-row') as HTMLElement,
    detailDuration: document.getElementById('detail-duration') as HTMLElement,
    detailBitrateRow: document.getElementById('detail-bitrate-row') as HTMLElement,
    detailBitrate: document.getElementById('detail-bitrate') as HTMLElement,
    detailExif: document.getElementById('detail-exif') as HTMLElement,
    detailStream: document.getElementById('detail-stream') as HTMLElement,
    mini: document.getElementById('viewer-mini') as HTMLElement,
    miniBody: document.getElementById('viewer-mini-body') as HTMLElement,
    miniClose: document.getElementById('viewer-mini-close') as HTMLButtonElement,
    detailSize: document.getElementById('detail-size') as HTMLElement,
    detailTime: document.getElementById('detail-time') as HTMLElement,
    info: document.getElementById('viewer-info') as HTMLButtonElement,
    counter: document.getElementById('viewer-counter') as HTMLElement,
    zoomBar: document.getElementById('viewer-zoom') as HTMLElement,
    zoomFitButton: document.getElementById('zoom-fit') as HTMLButtonElement,
    zoomActualButton: document.getElementById('zoom-actual') as HTMLButtonElement,
    videoControls: document.getElementById('video-controls') as HTMLElement,
    videoCenter: document.getElementById('video-center') as HTMLButtonElement,
    videoPlay: document.getElementById('video-play') as HTMLButtonElement,
    videoTime: document.getElementById('video-time') as HTMLElement,
    videoTrack: document.getElementById('video-track') as HTMLElement,
    videoPlayed: document.getElementById('video-played') as HTMLElement,
    videoBuffered: document.getElementById('video-buffered') as HTMLElement,
    videoThumb: document.getElementById('video-thumb') as HTMLElement,
    videoMute: document.getElementById('video-mute') as HTMLButtonElement,
    videoVolume: document.getElementById('video-volume') as HTMLInputElement,
    videoReplay: document.getElementById('video-replay') as HTMLElement,
    videoReplayButton: document.getElementById('video-replay-button') as HTMLButtonElement,
  },
  {
    onDetailChange: (open) => {
      detailOpen = open
      void window.fvHost?.patchConfig({ detailOpen: open })
    },
    onIndexChange: (item) => {
      viewerPath = item.path
      grid.setCurrent(gridIndexOfPath(item.path))
    },
    onImageClick: () => openFullscreen(),
  },
)

const fullscreen = new FullscreenLayer(
  {
    modal: document.getElementById('fs-modal') as HTMLElement,
    stage: document.getElementById('fs-stage') as HTMLElement,
    image: document.getElementById('fs-image') as HTMLImageElement,
    fileName: document.getElementById('fs-file-name') as HTMLElement,
    close: document.getElementById('fs-close') as HTMLButtonElement,
    prev: document.getElementById('fs-prev') as HTMLButtonElement,
    next: document.getElementById('fs-next') as HTMLButtonElement,
    zoomFit: document.getElementById('fs-zoom-fit') as HTMLButtonElement,
    zoomActual: document.getElementById('fs-zoom-actual') as HTMLButtonElement,
    detail: document.getElementById('fs-detail') as HTMLElement,
    detailClose: document.getElementById('fs-detail-close') as HTMLButtonElement,
    detailName: document.getElementById('fs-name') as HTMLElement,
    detailFormat: document.getElementById('fs-format') as HTMLElement,
    detailDim: document.getElementById('fs-dim') as HTMLElement,
    detailPixels: document.getElementById('fs-pixels') as HTMLElement,
    detailExif: document.getElementById('fs-exif') as HTMLElement,
    mini: document.getElementById('fs-mini') as HTMLElement,
    miniBody: document.getElementById('fs-mini-body') as HTMLElement,
    miniClose: document.getElementById('fs-mini-close') as HTMLButtonElement,
    detailSize: document.getElementById('fs-size') as HTMLElement,
    detailTime: document.getElementById('fs-time') as HTMLElement,
    info: document.getElementById('fs-info') as HTMLButtonElement,
    counter: document.getElementById('fs-counter') as HTMLElement,
  },
  {
    onIndexChange: (item) => {
      const at = viewer.getItems().findIndex((entry) => entry.path === item.path)
      if (at >= 0) viewer.setIndex(at)
    },
    onClose: () => {
      window.fvHost?.setImmersive(false)
      publishState()
    },
  },
)

function openFullscreen(): void {
  if (!viewer.isOpen() || viewer.isVideoActive()) return
  const sequence = viewer.getItems()
  if (sequence.length === 0) return
  fullscreen.open(sequence, viewer.getState().index, detailOpen)
  window.fvHost?.setImmersive(true)
  publishState()
}

function openFullscreenAt(index: number): void {
  const item = items[index]
  if (!item || item.kind !== 'image') return
  const sequence = buildMediaSeq(items)
  const at = sequence.findIndex((entry) => entry.path === item.path)
  if (at < 0) return
  viewer.open(sequence, at, detailOpen)
  openFullscreen()
}

function closeFullscreen(): void {
  if (!fullscreen.isOpen()) return
  fullscreen.close()
}

function toggleFullscreen(): void {
  if (fullscreen.isOpen()) closeFullscreen()
  else openFullscreen()
}

interface DirResponse {
  path: string
  parent: string | null
  total: number
  entries: GridItem[]
}

class DirFetchError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

function upEntry(): GridItem | null {
  if (parentPath === null) return null
  return { name: '返回上级', path: parentPath, kind: 'dir', size: 0, mtimeMs: 0 }
}

function displayTotal(): number {
  return totalReal + (parentPath === null ? 0 : 1)
}

function showFooter(message: string, retry?: () => void): void {
  footer.hidden = false
  footer.replaceChildren()
  const label = document.createElement('span')
  label.textContent = message
  footer.append(label)
  if (retry) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = '点击重试'
    button.addEventListener('click', retry)
    footer.append(button)
  }
}

function hideFooter(): void {
  footer.hidden = true
  footer.replaceChildren()
}

function flashFooter(message: string): void {
  showFooter(message)
  if (footerFlashTimer) window.clearTimeout(footerFlashTimer)
  footerFlashTimer = window.setTimeout(() => {
    footerFlashTimer = 0
    hideFooter()
  }, 2200)
}

function leafName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function publishState(): void {
  document.documentElement.dataset.loaded = String(realLoaded)
  document.documentElement.dataset.total = String(totalReal)
  document.documentElement.dataset.path = currentPath
  document.documentElement.dataset.viewer = viewer.isOpen() ? 'open' : 'empty'
  document.documentElement.dataset.fullscreen = fullscreen.isOpen() ? '1' : '0'
}

function layoutSplit(): void {
  const contentW = content.clientWidth
  if (contentW <= 0) return
  browser.style.width = `${splitWidths(splitRatio, contentW).wall}px`
  document.documentElement.dataset.splitRatio = splitRatio.toFixed(4)
}

function persistSplitRatio(): void {
  window.clearTimeout(splitPersistTimer)
  splitPersistTimer = window.setTimeout(() => {
    void window.fvHost?.patchConfig({ splitRatio })
  }, 250)
}

function gridIndexOfPath(path: string): number {
  return items.findIndex((entry) => entry.path === path)
}

function syncViewer(preferredPath: string | null): void {
  const seq = buildMediaSeq(items)
  if (seq.length === 0) {
    viewer.showEmpty()
    grid.setCurrent(-1)
    return
  }
  const at = preferredPath ? findMediaIndex(seq, preferredPath) : 0
  const index = at >= 0 ? at : 0
  viewer.open(seq, index, detailOpen)
  const gridIndex = gridIndexOfPath(seq[index].path)
  grid.setCurrent(gridIndex)
  if (gridIndex >= 0) requestAnimationFrame(() => grid.setCurrent(gridIndex))
  publishState()
}

function currentViewerPath(): string | null {
  return viewerPath
}

function bindSplit(): void {
  let dragging = false

  splitHandle.addEventListener('pointerdown', (event) => {
    dragging = true
    splitHandle.setPointerCapture(event.pointerId)
    appRoot.classList.add('fv-app--resizing')
    event.preventDefault()
  })

  splitHandle.addEventListener('pointermove', (event) => {
    if (!dragging) return
    const rect = content.getBoundingClientRect()
    if (rect.width <= 0) return
    splitRatio = clampSplitRatio((event.clientX - rect.left) / rect.width, rect.width)
    layoutSplit()
  })

  const endDrag = (event: PointerEvent): void => {
    if (!dragging) return
    dragging = false
    appRoot.classList.remove('fv-app--resizing')
    if (splitHandle.hasPointerCapture(event.pointerId)) {
      splitHandle.releasePointerCapture(event.pointerId)
    }
    persistSplitRatio()
  }
  splitHandle.addEventListener('pointerup', endDrag)
  splitHandle.addEventListener('pointercancel', endDrag)

  splitHandle.addEventListener('dblclick', () => {
    splitRatio = SPLIT_DEFAULT
    layoutSplit()
    persistSplitRatio()
  })

  window.addEventListener('resize', () => layoutSplit())

  document.addEventListener('keydown', (event) => {
    const target = event.target
    if (event.key === ' ' && target instanceof HTMLButtonElement) return
    if (event.key === 'F5') {
      event.preventDefault()
      void refreshDir()
      return
    }
    const editing =
      target instanceof HTMLElement &&
      (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    const action = resolveKeyAction(event.key, {
      fullscreen: fullscreen.isOpen(),
      editing,
      viewerOpen: viewer.isOpen(),
      video: viewer.isVideoActive(),
      shift: event.shiftKey,
    })
    if (action === 'none') return
    event.preventDefault()
    const modalOpen = fullscreen.isOpen()
    if (action === 'exit-fullscreen') closeFullscreen()
    else if (action === 'toggle-fullscreen') toggleFullscreen()
    else if (action === 'toggle-detail') {
      if (modalOpen) fullscreen.toggleDetail()
      else viewer.toggleDetail()
    } else if (action === 'prev') {
      if (modalOpen) fullscreen.prev()
      else viewer.prev()
    } else if (action === 'next') {
      if (modalOpen) fullscreen.next()
      else viewer.next()
    } else if (action === 'zoom-in') {
      if (modalOpen) fullscreen.zoomIn()
      else viewer.zoomIn()
    } else if (action === 'zoom-out') {
      if (modalOpen) fullscreen.zoomOut()
      else viewer.zoomOut()
    } else if (action === 'zoom-fit') {
      if (modalOpen) fullscreen.zoomFitNow()
      else viewer.zoomFit()
    } else if (action === 'zoom-actual') {
      if (modalOpen) fullscreen.zoomActualNow()
      else viewer.zoomActual()
    } else if (action === 'toggle-play') viewer.togglePlay()
    else if (action === 'seek-backward') viewer.seekBy(-5)
    else if (action === 'seek-forward') viewer.seekBy(5)
    else if (action === 'volume-up') viewer.volumeBy(0.05)
    else if (action === 'volume-down') viewer.volumeBy(-0.05)
    else if (action === 'toggle-mute') viewer.toggleMute()
  })
}

function updateToolbar(columns: number): void {
  columnsSlider.value = String(columns)
  columnsValue.textContent = String(columns)
  columnsSmaller.disabled = columns <= GRID_COLUMNS_MIN
  columnsLarger.disabled = columns >= GRID_COLUMNS_MAX
}

function persistColumns(columns: number): void {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    void window.fvHost?.patchConfig({ gridColumns: columns })
  }, 150)
}

function applyColumns(value: number, persist = true): void {
  const next = clampColumns(value)
  if (next !== grid.getColumns()) grid.setColumns(next)
  updateToolbar(next)
  if (persist) persistColumns(next)
}

function updateSortUi(): void {
  for (const key of ['name', 'mtime', 'size'] as SortKey[]) {
    sortButtons[key].classList.toggle('is-active', sort.key === key)
  }
  sortOrderButton.textContent = sort.order === 'asc' ? '↑' : '↓'
  sortOrderButton.title = sort.order === 'asc' ? '当前正序，点击切换倒序' : '当前倒序，点击切换正序'
}

function applySort(next: { key?: SortKey; order?: SortOrder }): void {
  const key = next.key ?? sort.key
  const order = next.order ?? sort.order
  if (key === sort.key && order === sort.order) return
  sort = { key, order }
  updateSortUi()
  void window.fvHost?.patchConfig({ sort })
  void openDir(currentPath, true)
}

function bindToolbar(): void {
  updateToolbar(grid.getColumns())
  updateSortUi()
  for (const key of ['name', 'mtime', 'size'] as SortKey[]) {
    sortButtons[key].addEventListener('click', () => applySort({ key }))
  }
  sortOrderButton.addEventListener('click', () => {
    applySort({ order: sort.order === 'asc' ? 'desc' : 'asc' })
  })
  columnsSmaller.addEventListener('click', () => {
    applyColumns(grid.getColumns() - 1)
  })
  columnsLarger.addEventListener('click', () => {
    applyColumns(grid.getColumns() + 1)
  })
  columnsSlider.addEventListener('input', () => {
    applyColumns(Number(columnsSlider.value))
  })
  wall.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      applyColumns(grid.getColumns() + (event.deltaY < 0 ? -1 : 1))
    },
    { passive: false },
  )
}

function bindBackTop(): void {
  const sync = (): void => {
    backTop.hidden = wall.scrollTop < 480
  }
  wall.addEventListener('scroll', sync, { passive: true })
  backTop.addEventListener('click', () => {
    wall.scrollTo({ top: 0, behavior: 'smooth' })
  })
  sync()
}

async function fetchPage(
  path: string,
  offset: number,
  limit = PAGE_LIMIT,
  fresh = false,
): Promise<DirResponse> {
  const params = new URLSearchParams({
    path,
    sort: sort.key,
    order: sort.order,
    offset: String(offset),
    limit: String(limit),
  })
  if (fresh) params.set('fresh', '1')
  const response = await fetch(`/api/dir?${params.toString()}`)
  const body = (await response.json().catch(() => null)) as
    | (DirResponse & { error?: { code?: string; message?: string } })
    | null
  if (!response.ok) {
    throw new DirFetchError(body?.error?.message ?? '加载失败', body?.error?.code ?? 'IO_ERROR')
  }
  if (!body) throw new Error('加载失败')
  return body
}

async function fetchDrives(): Promise<{ drives: DriveInfo[]; places: PlaceInfo[] }> {
  const response = await fetch('/api/drives?refresh=1')
  const body = (await response.json().catch(() => null)) as
    | { drives?: DriveInfo[]; places?: PlaceInfo[]; error?: { code?: string; message?: string } }
    | null
  if (!response.ok) {
    throw new DirFetchError(
      body?.error?.message ?? '读取磁盘列表失败',
      body?.error?.code ?? 'IO_ERROR',
    )
  }
  return { drives: body?.drives ?? [], places: body?.places ?? [] }
}

function placeEntries(places: PlaceInfo[]): GridItem[] {
  return places.map((place) => ({
    name: place.label,
    path: place.path,
    kind: 'dir',
    size: 0,
    mtimeMs: 0,
  }))
}

function driveEntries(drives: DriveInfo[]): GridItem[] {
  return drives.map((drive) => ({
    name: drive.label,
    path: drive.path,
    kind: 'dir',
    size: 0,
    mtimeMs: 0,
  }))
}

function sortDrives(entries: GridItem[]): GridItem[] {
  if (sort.key !== 'name') return entries
  const direction = sort.order === 'asc' ? 1 : -1
  return [...entries].sort((a, b) => direction * nameCollator.compare(a.name, b.name))
}

async function openDir(target: string, keepViewer = false): Promise<boolean> {
  closeFullscreen()
  const preferred = keepViewer ? currentViewerPath() : null
  const requestId = ++generation
  showFooter(target === '' ? '正在读取磁盘…' : '正在读取文件夹…')
  try {
    if (target === '') {
      const { drives, places } = await fetchDrives()
      if (requestId !== generation) return false
      currentPath = ''
      parentPath = null
      items = [...placeEntries(places), ...sortDrives(driveEntries(drives))]
      totalReal = items.length
      realLoaded = items.length
      lastErrorCode = null
      hideFooter()
      hideMenu()
      toolbar.hidden = false
      wall.hidden = false
      grid.setEntries(items, displayTotal(), true)
      renderCrumbs('')
      syncViewer(preferred)
      publishState()
      window.fvHost?.setFolderTitle('此电脑')
      void window.fvHost?.watchDir('')
      return true
    }

    const page = await fetchPage(target, 0)
    if (requestId !== generation) return false
    lastErrorCode = null

    currentPath = page.path
    parentPath = page.parent
    totalReal = page.total
    realLoaded = page.entries.length
    const up = upEntry()
    items = up ? [up, ...page.entries] : page.entries

    hideFooter()
    hideMenu()
    toolbar.hidden = false
    wall.hidden = false
    grid.setEntries(items, displayTotal(), true)
    renderCrumbs(page.path)
    syncViewer(preferred)
    publishState()
    window.fvHost?.setFolderTitle(folderTitle(page.path))
    void window.fvHost?.watchDir(page.path)
    void window.fvHost?.patchConfig({ lastFolder: page.path })
    return true
  } catch (error) {
    if (requestId !== generation) return false
    const message = error instanceof Error ? error.message : '目录不存在'
    lastErrorCode = error instanceof DirFetchError ? error.code : null
    showFooter(message)
    return false
  }
}

/**
 * 目录监听事件触发的静默刷新：重新拉取列表并原地更新图墙与查看器，
 * 保留滚动位置、当前项和多选；失败时保留现有内容，不打扰用户。
 */
async function refreshDir(): Promise<void> {
  if (!currentPath || refreshing) return
  refreshing = true
  const requestId = generation
  try {
    const page = await fetchPage(currentPath, 0, Math.max(PAGE_LIMIT, realLoaded), true)
    if (requestId !== generation) return
    lastErrorCode = null
    parentPath = page.parent
    totalReal = page.total
    realLoaded = page.entries.length
    const up = upEntry()
    items = up ? [up, ...page.entries] : page.entries
    grid.refreshEntries(items, displayTotal())
    viewer.syncItems(buildMediaSeq(items))
    publishState()
  } catch {
    // 目录可能正被移动或暂时不可读，保留当前列表，等下一次事件或 F5。
  } finally {
    refreshing = false
  }
}

async function loadMore(): Promise<void> {
  if (loadingMore || !currentPath || realLoaded >= totalReal) return
  const requestId = generation
  loadingMore = true
  showFooter('正在加载更多…')
  try {
    const page = await fetchPage(currentPath, realLoaded)
    if (requestId !== generation) return
    realLoaded += page.entries.length
    totalReal = page.total
    items = items.concat(page.entries)
    grid.setEntries(page.entries, displayTotal(), false)
    hideFooter()
    publishState()
  } catch (error) {
    if (requestId !== generation) return
    showFooter(error instanceof Error ? error.message : '加载失败', () => {
      void loadMore()
    })
  } finally {
    loadingMore = false
  }
}

function crumbButton(segment: CrumbSegment, current: boolean): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = current ? 'fv-crumb fv-crumb--current' : 'fv-crumb'
  button.textContent = segment.label
  button.title = segment.path
  button.addEventListener('click', () => {
    hideMenu()
    void openDir(segment.path)
  })
  return button
}

function separator(): HTMLElement {
  const element = document.createElement('span')
  element.className = 'fv-crumb-sep'
  element.textContent = '›'
  return element
}

function hideMenu(): void {
  menu?.remove()
  menu = null
}

function showMenu(anchor: HTMLElement, hidden: CrumbSegment[]): void {
  hideMenu()
  const panel = document.createElement('div')
  panel.className = 'fv-crumb-menu'
  for (const segment of hidden) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = segment.label
    button.title = segment.path
    button.addEventListener('click', () => {
      hideMenu()
      void openDir(segment.path)
    })
    panel.append(button)
  }
  crumbBar.append(panel)
  menu = panel
  const anchorRect = anchor.getBoundingClientRect()
  const barRect = crumbBar.getBoundingClientRect()
  panel.style.left = `${anchorRect.left - barRect.left}px`
}

function renderCrumbs(path: string): void {
  const segments = parseBreadcrumb(path)
  crumbBar.hidden = segments.length === 0
  crumbList.replaceChildren()
  if (segments.length === 0) return

  const { visible, hidden } = collapseBreadcrumb(segments)
  visible.forEach((segment, index) => {
    if (index > 0) crumbList.append(separator())
    if (index === 1 && hidden.length > 0) {
      const more = document.createElement('button')
      more.type = 'button'
      more.className = 'fv-crumb fv-crumb-more'
      more.textContent = '…'
      more.title = '显示隐藏的路径'
      more.addEventListener('click', (event) => {
        event.stopPropagation()
        showMenu(more, hidden)
      })
      crumbList.append(more, separator())
    }
    const isLast = index === visible.length - 1
    crumbList.append(crumbButton(segment, isLast))
  })
}

async function openRequest(path: string): Promise<boolean> {
  if (await openDir(path)) return true
  if (lastErrorCode !== 'BAD_PATH') return false
  const parent = parentOf(path)
  if (!parent) return false
  if (!(await openDir(parent))) return false
  syncViewer(path)
  return true
}

async function copyTargets(targets: GridItem[], mode: 'copy' | 'cut'): Promise<void> {
  const result = await window.fvHost?.copyEntries(
    targets.map((item) => item.path),
    mode,
  )
  if (!result) return
  if (!result.ok) {
    flashFooter(result.message)
    return
  }
  hasClipboard = true
  const verb = mode === 'cut' ? '剪切' : '复制'
  if (targets.length > 1) {
    flashFooter(`已${verb} ${targets.length} 项`)
    return
  }
  flashFooter(`已${verb}「${targets[0]?.name ?? ''}」`)
}

async function renameItem(item: GridItem): Promise<void> {
  const name = await nameDialog.ask({
    title: '重命名',
    label: '新名称',
    initial: item.name,
    selectBase: item.ext !== undefined,
  })
  if (!name || name === item.name) return
  const result = await window.fvHost?.renameEntry(item.path, name)
  if (!result) return
  if (!result.ok) {
    flashFooter(result.message)
    return
  }
  await openDir(currentPath, true)
  flashFooter('已重命名')
}

async function revealItem(item: GridItem): Promise<void> {
  const result = await window.fvHost?.revealEntry(item.path)
  if (!result) return
  if (!result.ok) flashFooter(result.message)
}

async function deleteItems(targets: GridItem[]): Promise<void> {
  if (targets.length === 0) return
  const confirmed = await confirmDialog.ask({
    title: '删除',
    message:
      targets.length > 1
        ? `确定将选中的 ${targets.length} 项移到回收站？`
        : `确定将「${targets[0]?.name ?? ''}」移到回收站？`,
    confirmText: '删除',
    danger: true,
  })
  if (!confirmed) return
  let failed = 0
  let failure = ''
  for (const target of targets) {
    const result = await window.fvHost?.trashEntry(target.path)
    if (!result) return
    if (!result.ok) {
      failed += 1
      failure = result.message
    }
  }
  await openDir(currentPath, true)
  if (failed === 0) {
    flashFooter(targets.length > 1 ? `已删除 ${targets.length} 项` : '已删除')
    return
  }
  flashFooter(
    failed === targets.length ? failure : `${failed} 项删除失败：${failure}`,
  )
}

async function createNewFolder(): Promise<void> {
  if (!currentPath) return
  const name = await nameDialog.ask({
    title: '新建文件夹',
    label: '文件夹名称',
    confirmText: '创建',
  })
  if (!name) return
  const result = await window.fvHost?.createFolder(currentPath, name)
  if (!result) return
  if (!result.ok) {
    flashFooter(result.message)
    return
  }
  await openDir(currentPath, true)
  flashFooter(`已新建文件夹「${leafName(result.path ?? name)}」`)
}

async function pasteEntry(): Promise<void> {
  if (!currentPath) return
  const result = await window.fvHost?.pasteEntry(currentPath)
  if (!result) return
  if (!result.ok) {
    flashFooter(result.message)
    return
  }
  await openDir(currentPath, true)
  if ((result.count ?? 1) > 1) {
    flashFooter(`已粘贴 ${result.count} 项`)
    return
  }
  flashFooter(`已粘贴「${leafName(result.path ?? '')}」`)
}

function showItemMenu(index: number, x: number, y: number): void {
  const item = items[index]
  if (!item) return
  if (currentPath === '' || item.name === '返回上级') return
  if (!grid.getSelectedIndices().includes(index)) grid.selectOnly(index)
  const targets = grid
    .getSelectedIndices()
    .map((selected) => items[selected])
    .filter((entry): entry is GridItem => entry !== undefined && entry.name !== '返回上级')
  if (targets.length === 0) return
  const multiple = targets.length > 1
  const allMedia = targets.every((entry) => entry.kind === 'image' || entry.kind === 'video')
  const entries: ContextMenuItem[] = []
  if (allMedia) {
    entries.push({
      label: multiple ? `复制 ${targets.length} 项` : '复制',
      action: () => void copyTargets(targets, 'copy'),
    })
    entries.push({
      label: multiple ? `剪切 ${targets.length} 项` : '剪切',
      action: () => void copyTargets(targets, 'cut'),
    })
  }
  if (!multiple) {
    entries.push({ label: '在文件浏览器中打开', action: () => void revealItem(item) })
    entries.push({ label: '重命名', action: () => void renameItem(item) })
  }
  entries.push({
    label: multiple ? `删除 ${targets.length} 项` : '删除',
    danger: true,
    action: () => void deleteItems(targets),
  })
  contextMenu.show(x, y, entries)
}

function showBlankMenu(x: number, y: number): void {
  if (currentPath === '') return
  contextMenu.show(x, y, [
    { label: '新建文件夹', action: () => void createNewFolder() },
    { label: '粘贴', disabled: !hasClipboard, action: () => void pasteEntry() },
  ])
}

function bindDrop(): void {
  window.addEventListener('dragenter', (event) => {
    event.preventDefault()
    dragDepth += 1
    document.body.classList.add('fv-dragging')
  })
  window.addEventListener('dragover', (event) => {
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  })
  window.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0) document.body.classList.remove('fv-dragging')
  })
  window.addEventListener('drop', (event) => {
    event.preventDefault()
    dragDepth = 0
    document.body.classList.remove('fv-dragging')
    const file = event.dataTransfer?.files?.[0]
    if (!file) return
    const path = window.fvHost?.getPathForFile(file)
    if (path) void openRequest(path)
  })
}

function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme
}

async function applyReset(kind: 'layout' | 'prefs'): Promise<void> {
  const next = await window.fvHost?.getConfig().catch(() => null)
  if (next) {
    applyTheme(next.theme)
    applyColumns(next.gridColumns, false)
    splitRatio = next.splitRatio
    detailOpen = next.detailOpen
    if (viewer.isOpen()) viewer.setDetailOpen(next.detailOpen, false)
    layoutSplit()
    sort = { ...next.sort }
    updateSortUi()
  }
  if (kind === 'prefs') await openDir('')
}

async function boot(): Promise<void> {
  grid.mount(wall, {
    onOpen: (index) => {
      const item = items[index]
      if (!item) return
      if (item.kind === 'dir') {
        void openDir(item.path)
        return
      }
      const seq = buildMediaSeq(items)
      const at = seq.findIndex((entry) => entry.path === item.path)
      if (at >= 0) {
        viewer.open(seq, at, detailOpen)
        publishState()
      }
    },
    onDoubleClick: (index) => openFullscreenAt(index),
    onContextMenu: (index, x, y) => showItemMenu(index, x, y),
    onBlankContextMenu: (x, y) => showBlankMenu(x, y),
    onLoadMore: () => {
      void loadMore()
    },
    getThumbnail: (item, signal) => thumbnails.get(item, signal),
  })
  layoutSplit()

  document.addEventListener('click', () => hideMenu())
  bindToolbar()
  bindBackTop()
  bindSplit()
  bindDrop()
  window.fvHost?.onOpenPath((path) => {
    void openRequest(path)
  })
  window.fvHost?.onDirChanged((dir) => {
    if (dir === currentPath) void refreshDir()
  })
  window.fvHost?.onConfigReset((kind) => {
    void applyReset(kind)
  })
  window.fvHost?.onTheme(applyTheme)

  const config = await window.fvHost?.getConfig().catch(() => null)
  if (config) {
    applyTheme(config.theme)
    applyColumns(config.gridColumns, false)
    splitRatio = config.splitRatio
    detailOpen = config.detailOpen
    sort = { ...config.sort }
    updateSortUi()
  }

  const initial = new URLSearchParams(location.search).get('dir')
  const startup = await window.fvHost?.getStartupPath().catch(() => null)
  const lastFolder = config?.lastFolder ?? null
  const preferred = initial ?? startup ?? lastFolder

  if (preferred) {
    const ok = await openRequest(preferred)
    if (!ok) {
      await openDir('')
      showFooter(
        preferred === lastFolder
          ? '上次打开的文件夹已不可用，已进入此电脑'
          : '无法打开该文件夹，已进入此电脑',
      )
    }
  } else {
    await openDir('')
  }
  layoutSplit()
  document.documentElement.dataset.ready = 'true'
}

void boot()
