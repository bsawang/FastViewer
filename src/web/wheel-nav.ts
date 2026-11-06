export const WHEEL_THRESHOLD = 50
export const WHEEL_COOLDOWN_MS = 200

export class WheelNavigator {
  private accum = 0
  private lockedUntil = 0

  feed(deltaY: number, now: number): -1 | 0 | 1 {
    if (now < this.lockedUntil) return 0
    this.accum += deltaY
    if (Math.abs(this.accum) < WHEEL_THRESHOLD) return 0
    const step = this.accum > 0 ? 1 : -1
    this.accum = 0
    this.lockedUntil = now + WHEEL_COOLDOWN_MS
    return step
  }

  reset(): void {
    this.accum = 0
    this.lockedUntil = 0
  }
}
