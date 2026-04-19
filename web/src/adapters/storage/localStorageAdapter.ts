import type { Assignment, Person, StrategyId } from '@/domain/models'

export type StoredProject = {
  id: string
  name: string
  templateId: string
  strategyId: StrategyId
  userMainSeatId?: string
  people: Person[]
  lockedAssignments: Assignment[]
  seatOverrides?: Record<string, { x: number; y: number }>
  elementOverrides?: Record<string, { x: number; y: number }>
  seatLabelOverrides?: Record<string, { dx: number; dy: number }>
  updatedAt: number
  createdAt: number
}

export type ProjectSummary = Pick<StoredProject, 'id' | 'name' | 'templateId' | 'strategyId' | 'updatedAt' | 'createdAt'>

const STORAGE_KEY = 'seat-arranger:projects:v1'

const loadAll = (): StoredProject[] => {
  const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as StoredProject[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveAll = (projects: StoredProject[]) => {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export const listProjects = (): ProjectSummary[] =>
  loadAll()
    .map((p) => ({
      id: p.id,
      name: p.name,
      templateId: p.templateId,
      strategyId: p.strategyId,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt || a.id.localeCompare(b.id))

export const getProject = (id: string): StoredProject | undefined => loadAll().find((p) => p.id === id)

export const upsertProject = (project: StoredProject) => {
  const projects = loadAll()
  const idx = projects.findIndex((p) => p.id === project.id)
  const next = { ...project, updatedAt: Date.now() }
  if (idx === -1) projects.push(next)
  else projects[idx] = next
  saveAll(projects)
  return next
}

export const deleteProject = (id: string) => {
  const projects = loadAll().filter((p) => p.id !== id)
  saveAll(projects)
}
