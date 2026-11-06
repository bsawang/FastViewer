const MESSAGES: Record<number, string> = {
  1: '视频加载已取消',
  2: '视频加载失败，请重试',
  3: '视频解码失败',
  4: '该视频格式无法播放',
}

export function mapMediaError(code: number): string {
  return MESSAGES[code] ?? '视频无法播放'
}
