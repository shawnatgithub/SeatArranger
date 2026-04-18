import { describe, expect, it } from 'vitest'

import type { ArrangeInput, VenueTemplate } from '@/domain/models'
import { arrangeSeats } from '@/domain/services/placementService'

const baseTemplate: VenueTemplate = {
  id: 't',
  name: 't',
  canvasWidth: 300,
  canvasHeight: 200,
  elements: [{ id: 'a', type: 'hostSeatAnchor', x: 150, y: 50, width: 1, height: 1 }],
  seats: [
    { id: 'm', x: 150, y: 60, zone: 'neutral' },
    { id: 'h', x: 100, y: 80, zone: 'host' },
    { id: 'g', x: 200, y: 80, zone: 'guest' },
  ],
  defaultMainSeatId: 'm',
}

describe('arrangeSeats', () => {
  it('requires vip/leader', () => {
    const input: ArrangeInput = {
      template: baseTemplate,
      strategyId: 'leader_visit',
      lockedAssignments: [],
      people: [{ id: 'p1', name: 'A', side: 'guest', rank: 10, roles: [] }],
    }

    const out = arrangeSeats(input)
    expect(out.errors.length).toBeGreaterThan(0)
  })

  it('places vip to main seat by default', () => {
    const input: ArrangeInput = {
      template: baseTemplate,
      strategyId: 'customer_visit',
      lockedAssignments: [],
      people: [
        { id: 'vip', name: 'VIP', side: 'guest', rank: 10, roles: ['vip'] },
        { id: 'host', name: 'Host', side: 'host', rank: 9, roles: ['leader'] },
      ],
    }

    const out = arrangeSeats(input)
    expect(out.errors).toHaveLength(0)
    expect(out.assignments.find((a) => a.personId === 'vip')?.seatId).toBe('m')
  })

  it('treats locked vip seat as main seat', () => {
    const input: ArrangeInput = {
      template: baseTemplate,
      strategyId: 'government_reception',
      lockedAssignments: [{ seatId: 'g', personId: 'vip' }],
      people: [
        { id: 'vip', name: 'VIP', side: 'guest', rank: 10, roles: ['vip'] },
        { id: 'host', name: 'Host', side: 'host', rank: 9, roles: [] },
      ],
    }

    const out = arrangeSeats(input)
    expect(out.mainSeatId).toBe('g')
  })
})

