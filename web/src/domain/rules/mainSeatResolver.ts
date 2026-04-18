import type { Seat, VenueTemplate } from '@/domain/models'

const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2

const byStableSeatOrder = (a: Seat, b: Seat) =>
  a.y !== b.y ? a.y - b.y : a.x !== b.x ? a.x - b.x : a.id.localeCompare(b.id)

export type MainSeatResolution = {
  mainSeatId?: string
  warnings: string[]
}

export const resolveMainSeatId = (
  template: VenueTemplate,
  userMainSeatId?: string,
): MainSeatResolution => {
  const warnings: string[] = []

  const seatById = new Map(template.seats.map((s) => [s.id, s]))

  if (userMainSeatId) {
    if (seatById.has(userMainSeatId)) {
      return { mainSeatId: userMainSeatId, warnings }
    }
    warnings.push('用户指定的主位不在当前模板座位集合中，已忽略该设置。')
  }

  const anchor = template.elements.find((e) => e.type === 'hostSeatAnchor')
  if (anchor) {
    const anchorPoint = { x: anchor.x, y: anchor.y }
    const main = [...template.seats].sort((a, b) => dist2(a, anchorPoint) - dist2(b, anchorPoint) || byStableSeatOrder(a, b))[0]
    if (main) return { mainSeatId: main.id, warnings }
  }

  const screen = template.elements.find((e) => e.type === 'screen')
  if (screen) {
    const screenCenterX = screen.x + screen.width / 2
    const main = [...template.seats].sort((a, b) => a.y - b.y || Math.abs(a.x - screenCenterX) - Math.abs(b.x - screenCenterX) || byStableSeatOrder(a, b))[0]
    if (main) return { mainSeatId: main.id, warnings }
  }

  if (template.defaultMainSeatId && seatById.has(template.defaultMainSeatId)) {
    return { mainSeatId: template.defaultMainSeatId, warnings }
  }

  if (template.seats.length === 0) {
    warnings.push('当前模板没有任何座位，无法判定主位。')
    return { mainSeatId: undefined, warnings }
  }

  warnings.push('未找到主位锚点与屏幕元素，已使用默认的“最靠前且居中”的座位作为主位。')
  const main = [...template.seats].sort(byStableSeatOrder)[0]
  return { mainSeatId: main.id, warnings }
}

