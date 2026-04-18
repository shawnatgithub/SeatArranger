export type Id = string

export type PersonSide = 'guest' | 'host'

export type MeetingRole = 'vip' | 'leader' | 'hoster' | 'presenter' | 'assistant'

export type StrategyId = 'leader_visit' | 'customer_visit' | 'government_reception'

export type SeatZone = 'guest' | 'host' | 'neutral'

export type VenueElementType = 'table' | 'entrance' | 'screen' | 'hostSeatAnchor'

export type VenueElement = {
  id: Id
  type: VenueElementType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  directionDeg?: number
}

export type Seat = {
  id: Id
  x: number
  y: number
  rotation?: number
  zone?: SeatZone
}

export type VenueTemplate = {
  id: Id
  name: string
  canvasWidth: number
  canvasHeight: number
  elements: VenueElement[]
  seats: Seat[]
  defaultMainSeatId?: Id
}

export type Person = {
  id: Id
  name: string
  side: PersonSide
  rank: number
  roles: MeetingRole[]
  note?: string
}

export type Assignment = {
  seatId: Id
  personId: Id
  locked?: boolean
}

export type ArrangeInput = {
  template: VenueTemplate
  people: Person[]
  strategyId: StrategyId
  lockedAssignments: Assignment[]
  userMainSeatId?: Id
}

export type ExplainItem = {
  personId: Id
  reasons: string[]
}

export type ArrangeOutput = {
  assignments: Assignment[]
  explain: ExplainItem[]
  warnings: string[]
  errors: string[]
  mainSeatId?: Id
}

