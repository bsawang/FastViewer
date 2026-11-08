export interface RangeSource {
  readonly size: number
  read(offset: number, length: number): Promise<Uint8Array>
}

export class HttpRangeReader implements RangeSource {
  constructor(
    private readonly path: string,
    readonly size: number,
  ) {}

  async read(offset: number, length: number): Promise<Uint8Array> {
    const start = Math.max(0, Math.min(offset, Math.max(0, this.size - 1)))
    const expected = Math.min(this.size - start, Math.max(1, length))
    if (expected <= 0) return new Uint8Array(0)
    const end = start + expected - 1
    const response = await fetch(`/api/file?path=${encodeURIComponent(this.path)}`, {
      headers: { range: `bytes=${start}-${end}` },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`读取文件失败：${response.status}`)
    const data = new Uint8Array(await response.arrayBuffer())
    if (data.length < expected) throw new Error('读取范围不完整')
    return data.subarray(0, expected)
  }
}
