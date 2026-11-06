import { describe, expect, it } from 'vitest'
import { resolveKeyAction, type KeyContext } from '../src/web/keymap'

const viewer: KeyContext = {
  fullscreen: false,
  editing: false,
  viewerOpen: true,
  video: false,
  shift: false,
}
const cinema: KeyContext = { ...viewer, fullscreen: true }
const video: KeyContext = { ...viewer, video: true }
const videoShift: KeyContext = { ...video, shift: true }

describe('resolveKeyAction', () => {
  it('Esc：浮层打开 → 关闭浮层；否则无动作', () => {
    expect(resolveKeyAction('Escape', cinema)).toBe('exit-fullscreen')
    expect(resolveKeyAction('Escape', viewer)).toBe('none')
  })

  it('F 切换浮层（大小写均可），视频不进入浮层', () => {
    expect(resolveKeyAction('f', viewer)).toBe('toggle-fullscreen')
    expect(resolveKeyAction('F', cinema)).toBe('toggle-fullscreen')
    expect(resolveKeyAction('f', video)).toBe('none')
    expect(resolveKeyAction('F', video)).toBe('none')
  })

  it('← / → 切换上一项/下一项', () => {
    expect(resolveKeyAction('ArrowLeft', viewer)).toBe('prev')
    expect(resolveKeyAction('ArrowRight', viewer)).toBe('next')
  })

  it('I 切换详情浮窗', () => {
    expect(resolveKeyAction('i', viewer)).toBe('toggle-detail')
    expect(resolveKeyAction('I', viewer)).toBe('toggle-detail')
  })

  it('+ / - / 0 / 1 缩放映射', () => {
    expect(resolveKeyAction('+', viewer)).toBe('zoom-in')
    expect(resolveKeyAction('=', viewer)).toBe('zoom-in')
    expect(resolveKeyAction('-', viewer)).toBe('zoom-out')
    expect(resolveKeyAction('_', viewer)).toBe('zoom-out')
    expect(resolveKeyAction('0', viewer)).toBe('zoom-fit')
    expect(resolveKeyAction('1', viewer)).toBe('zoom-actual')
  })

  it('输入框内不响应', () => {
    expect(resolveKeyAction('f', { ...viewer, editing: true })).toBe('none')
    expect(resolveKeyAction('Escape', { ...cinema, editing: true })).toBe('none')
  })

  it('查看器未打开时忽略查看器按键', () => {
    expect(resolveKeyAction('f', { ...viewer, viewerOpen: false })).toBe('none')
    expect(resolveKeyAction('I', { ...viewer, viewerOpen: false })).toBe('none')
  })

  it('未知按键返回 none', () => {
    expect(resolveKeyAction('x', viewer)).toBe('none')
  })

  it('Space 播放/暂停，仅视频生效', () => {
    expect(resolveKeyAction(' ', video)).toBe('toggle-play')
    expect(resolveKeyAction(' ', viewer)).toBe('none')
  })

  it('Shift+← / Shift+→ 后退/前进 5 秒，不按 Shift 仍切换条目', () => {
    expect(resolveKeyAction('ArrowLeft', videoShift)).toBe('seek-backward')
    expect(resolveKeyAction('ArrowRight', videoShift)).toBe('seek-forward')
    expect(resolveKeyAction('ArrowLeft', video)).toBe('prev')
    expect(resolveKeyAction('ArrowRight', video)).toBe('next')
    expect(resolveKeyAction('ArrowRight', { ...viewer, shift: true })).toBe('next')
  })

  it('↑ / ↓ 调节音量，仅视频生效', () => {
    expect(resolveKeyAction('ArrowUp', video)).toBe('volume-up')
    expect(resolveKeyAction('ArrowDown', video)).toBe('volume-down')
    expect(resolveKeyAction('ArrowUp', viewer)).toBe('none')
    expect(resolveKeyAction('ArrowDown', viewer)).toBe('none')
  })

  it('M 切换静音，仅视频生效', () => {
    expect(resolveKeyAction('m', video)).toBe('toggle-mute')
    expect(resolveKeyAction('M', video)).toBe('toggle-mute')
    expect(resolveKeyAction('m', viewer)).toBe('none')
  })
})
