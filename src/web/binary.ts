function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

export function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let out = ''
  for (let index = offset; index < offset + length && index < bytes.length; index += 1) {
    out += String.fromCharCode(bytes[index] as number)
  }
  return out
}

export function readU16BE(bytes: Uint8Array, offset: number): number {
  return view(bytes).getUint16(offset, false)
}

export function readU16LE(bytes: Uint8Array, offset: number): number {
  return view(bytes).getUint16(offset, true)
}

export function readU32BE(bytes: Uint8Array, offset: number): number {
  return view(bytes).getUint32(offset, false)
}

export function readU32LE(bytes: Uint8Array, offset: number): number {
  return view(bytes).getUint32(offset, true)
}

export function readI32BE(bytes: Uint8Array, offset: number): number {
  return view(bytes).getInt32(offset, false)
}

export function readU64BE(bytes: Uint8Array, offset: number): number {
  const data = view(bytes)
  const high = data.getUint32(offset, false)
  const low = data.getUint32(offset + 4, false)
  return high * 2 ** 32 + low
}

export function readFloatBE(bytes: Uint8Array, offset: number, length: number): number {
  const data = view(bytes)
  return length === 8 ? data.getFloat64(offset, false) : data.getFloat32(offset, false)
}
