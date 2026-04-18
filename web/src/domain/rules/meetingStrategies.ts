import type { MeetingRole, Person, StrategyId } from '@/domain/models'

export const STRATEGY_NAME: Record<StrategyId, string> = {
  leader_visit: '上级视察',
  customer_visit: '客户到访',
  government_reception: '政府接待',
}

export const isVipRole = (role: MeetingRole) => role === 'vip' || role === 'leader'

export const findVipPeople = (people: Person[]): Person[] =>
  people.filter((p) => p.roles.some(isVipRole))

export const findHostLeader = (people: Person[]): Person | undefined => {
  const hostPeople = people.filter((p) => p.side === 'host')
  return hostPeople
    .map((p, index) => ({ p, index }))
    .sort((a, b) => b.p.rank - a.p.rank || a.index - b.index || a.p.id.localeCompare(b.p.id))[0]?.p
}

export const findPeopleByRole = (people: Person[], role: MeetingRole): Person[] =>
  people.filter((p) => p.roles.includes(role))

