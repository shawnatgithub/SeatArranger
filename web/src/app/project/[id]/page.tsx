'use client'

import type KonvaType from 'konva'
import { useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import styles from './project.module.css'

import type { MeetingRole, PersonSide, StrategyId, VenueTemplate } from '@/domain/models'
import { arrangeSeats, STRATEGY_NAME, TEMPLATES } from '@/domain'
import { deleteProject, getProject, importPeopleFromCsv, upsertProject } from '@/adapters'
import { exportStageToPng, getExportConfig } from '@/adapters/export/konvaExporter'
import type { StoredProject } from '@/adapters/storage/localStorageAdapter'
import { VenueCanvas } from '@/ui/components/VenueCanvas'

const getTemplate = (templateId: string): VenueTemplate =>
  TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]

const normalizeOverridesToWorld = (args: {
  template: VenueTemplate
  seatOverrides?: StoredProject['seatOverrides']
  elementOverrides?: StoredProject['elementOverrides']
  seatLabelOverrides?: StoredProject['seatLabelOverrides']
}) => {
  const { template } = args
  const cx = template.canvasWidth / 2
  const cy = template.canvasHeight / 2

  const toWorldMaybe = (p: { x: number; y: number }) => {
    const looksLikeCanvas = p.x > cx || p.y > cy
    return looksLikeCanvas ? { x: p.x - cx, y: p.y - cy } : p
  }

  const seatOverrides = args.seatOverrides
    ? Object.fromEntries(Object.entries(args.seatOverrides).map(([k, v]) => [k, toWorldMaybe(v)]))
    : undefined

  const elementOverrides = args.elementOverrides
    ? Object.fromEntries(Object.entries(args.elementOverrides).map(([k, v]) => [k, toWorldMaybe(v)]))
    : undefined

  return {
    seatOverrides,
    elementOverrides,
    seatLabelOverrides: args.seatLabelOverrides,
  }
}

export default function ProjectPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = params.id

  const [project, setProject] = useState<StoredProject | undefined>(() => {
    const p = getProject(projectId)
    return p
  })
  const [editSeats, setEditSeats] = useState(false)
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)
  const [arranged, setArranged] = useState<ReturnType<typeof arrangeSeats> | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const stageRef = useRef<KonvaType.Stage | null>(null)

  const template = useMemo(() => {
    if (!project) return undefined
    return getTemplate(project.templateId)
  }, [project])

  const normalized = useMemo(() => {
    if (!project || !template) return undefined
    return normalizeOverridesToWorld({
      template,
      seatOverrides: project.seatOverrides,
      elementOverrides: project.elementOverrides,
      seatLabelOverrides: project.seatLabelOverrides,
    })
  }, [project, template])

  const assignmentView = useMemo(() => {
    if (!project || !template) return undefined
    const lockedMap = new Map(project.lockedAssignments.map((a) => [a.seatId, a.personId]))
    const out: Record<string, { name: string; locked?: boolean }> = {}
    const latest = arranged?.assignments ?? []
    for (const a of latest) {
      const person = project.people.find((p) => p.id === a.personId)
      if (!person) continue
      out[a.seatId] = { name: person.name, locked: Boolean(lockedMap.get(a.seatId)) }
    }
    return out
  }, [arranged?.assignments, project, template])

  const persist = (next: StoredProject) => {
    const saved = upsertProject(next)
    setProject(saved)
  }

  if (!project || !template) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.title}>项目不存在或已被删除</div>
          <button className={styles.secondaryBtn} onClick={() => router.push('/')}>
            返回项目列表
          </button>
        </div>
      </div>
    )
  }

  const runArrange = () => {
    const out = arrangeSeats({
      template,
      people: project.people,
      strategyId: project.strategyId,
      lockedAssignments: project.lockedAssignments,
      userMainSeatId: project.userMainSeatId,
    })
    setArranged(out)
  }

  const toggleSeatLock = (seatId: string) => {
    if (!arranged) return
    const a = arranged.assignments.find((x) => x.seatId === seatId)
    if (!a) return
    const lockedIdx = project.lockedAssignments.findIndex((x) => x.seatId === seatId)
    const lockedAssignments =
      lockedIdx >= 0
        ? project.lockedAssignments.filter((_, i) => i !== lockedIdx)
        : [...project.lockedAssignments, { seatId, personId: a.personId, locked: true }]
    persist({ ...project, lockedAssignments })
  }

  const setMainSeat = (seatId: string) => {
    persist({ ...project, userMainSeatId: seatId })
  }

  const onSeatDragEnd = (seatId: string, pos: { x: number; y: number }) => {
    const seatOverrides = { ...(project.seatOverrides ?? {}) }
    seatOverrides[seatId] = { x: pos.x, y: pos.y }
    persist({ ...project, seatOverrides })
  }

  const onElementDragEnd = (elementId: string, pos: { x: number; y: number }) => {
    const elementOverrides = { ...(project.elementOverrides ?? {}) }
    elementOverrides[elementId] = { x: pos.x, y: pos.y }
    persist({ ...project, elementOverrides })
  }

  const onSeatLabelDragEnd = (seatId: string, offset: { dx: number; dy: number }) => {
    const seatLabelOverrides = { ...(project.seatLabelOverrides ?? {}) }
    seatLabelOverrides[seatId] = { dx: offset.dx, dy: offset.dy }
    persist({ ...project, seatLabelOverrides })
  }

  const addPerson = (p: Omit<StoredProject['people'][number], 'id'>) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
    persist({ ...project, people: [...project.people, { ...p, id }] })
  }

  const removePerson = (id: string) => {
    persist({
      ...project,
      people: project.people.filter((p) => p.id !== id),
      lockedAssignments: project.lockedAssignments.filter((a) => a.personId !== id),
    })
  }

  const importCsv = async (file: File) => {
    const text = await file.text()
    const res = importPeopleFromCsv(text)
    const people = [...project.people, ...res.people]
    persist({ ...project, people })
    return res.errors
  }

  const doExport = async () => {
    setExportError(null)
    const stage = stageRef.current
    if (!stage) {
      setExportError('画布未就绪')
      return
    }
    setExporting(true)
    try {
      const cfg = getExportConfig()
      const blob = await exportStageToPng(stage, {
        addWatermark: true,
        queueMs: cfg.freeQueueMs,
        watermarkText: cfg.watermarkText,
        pixelRatio: cfg.pixelRatio,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.name}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.secondaryBtn} onClick={() => router.push('/')}>
          返回
        </button>
        <div className={styles.headerMain}>
          <div className={styles.title}>{project.name}</div>
          <div className={styles.meta}>
            {getTemplate(project.templateId).name} · {STRATEGY_NAME[project.strategyId]}
          </div>
        </div>
        <button
          className={styles.dangerBtn}
          onClick={() => {
            deleteProject(project.id)
            router.push('/')
          }}
        >
          删除
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.left}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>画布</div>
            <div className={styles.toolbar}>
              <button className={styles.primaryBtn} onClick={runArrange}>
                快速排座
              </button>
              <button className={styles.secondaryBtn} onClick={doExport} disabled={exporting}>
                {exporting ? '导出中…' : '导出 PNG（免费）'}
              </button>
              <label className={styles.checkbox}>
                <input type="checkbox" checked={editSeats} onChange={(e) => setEditSeats(e.target.checked)} />
                编辑座位位置
              </label>
            </div>
            {exportError ? <div className={styles.error}>{exportError}</div> : null}
            {arranged?.errors?.length ? (
              <div className={styles.error}>{arranged.errors.join('；')}</div>
            ) : null}
            {arranged?.warnings?.length ? (
              <div className={styles.warning}>{arranged.warnings.join('；')}</div>
            ) : null}
            <div className={styles.canvasWrap}>
              <VenueCanvas
                template={template}
                seatOverrides={normalized?.seatOverrides}
                elementOverrides={normalized?.elementOverrides}
                seatLabelOverrides={normalized?.seatLabelOverrides}
                assignments={assignmentView}
                mainSeatId={arranged?.mainSeatId ?? project.userMainSeatId}
                editable={editSeats}
                stageRef={stageRef}
                onSeatClick={(id) => {
                  setSelectedSeatId(id)
                  if (!editSeats) toggleSeatLock(id)
                }}
                onSeatDragEnd={onSeatDragEnd}
                onElementDragEnd={onElementDragEnd}
                onSeatLabelDragEnd={onSeatLabelDragEnd}
              />
            </div>
            <div className={styles.hint}>
              {editSeats
                ? '拖拽桌椅/座位/姓名标签以调整位置（自动保存且网格对齐）'
                : '点击座位：若该座位已有排座结果，则切换锁定/解锁'}
            </div>

            <div className={styles.actions}>
              <button className={styles.secondaryBtn} onClick={() => selectedSeatId && setMainSeat(selectedSeatId)} disabled={!selectedSeatId}>
                将选中座位设为主位
              </button>
              <button className={styles.secondaryBtn} onClick={() => persist({ ...project, lockedAssignments: [] })} disabled={project.lockedAssignments.length === 0}>
                清空锁定
              </button>
            </div>
          </div>

          {arranged?.explain?.length ? (
            <div className={styles.card}>
              <div className={styles.cardTitle}>解释</div>
              <ul className={styles.explainList}>
                {arranged.explain.map((e) => {
                  const person = project.people.find((p) => p.id === e.personId)
                  return (
                    <li key={e.personId} className={styles.explainItem}>
                      <div className={styles.explainName}>{person?.name ?? e.personId}</div>
                      <div className={styles.explainReasons}>{e.reasons.join('；')}</div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </section>

        <section className={styles.right}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>项目设置</div>
            <div className={styles.formGrid}>
              <label className={styles.label}>
                模板
                <select
                  className={styles.select}
                  value={project.templateId}
                  onChange={(e) => {
                    const templateId = e.target.value
                    persist({
                      ...project,
                      templateId,
                      seatOverrides: undefined,
                      elementOverrides: undefined,
                      seatLabelOverrides: undefined,
                      lockedAssignments: [],
                      userMainSeatId: undefined,
                    })
                    setArranged(null)
                  }}
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                场景策略
                <select
                  className={styles.select}
                  value={project.strategyId}
                  onChange={(e) => {
                    persist({ ...project, strategyId: e.target.value as StrategyId })
                    setArranged(null)
                  }}
                >
                  {Object.entries(STRATEGY_NAME).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <PeopleEditor project={project} addPerson={addPerson} removePerson={removePerson} importCsv={importCsv} />
        </section>
      </main>
    </div>
  )
}

const PeopleEditor = (props: {
  project: StoredProject
  addPerson: (p: { name: string; side: PersonSide; rank: number; roles: MeetingRole[]; note?: string }) => void
  removePerson: (id: string) => void
  importCsv: (file: File) => Promise<{ row: number; message: string }[]>
}) => {
  const { project, addPerson, removePerson, importCsv } = props
  const [name, setName] = useState('')
  const [side, setSide] = useState<PersonSide>('guest')
  const [rank, setRank] = useState(10)
  const [roles, setRoles] = useState<Record<MeetingRole, boolean>>({
    vip: false,
    leader: false,
    hoster: false,
    presenter: false,
    assistant: false,
  })
  const [note, setNote] = useState('')
  const [importErr, setImportErr] = useState<string | null>(null)

  const submit = () => {
    const nextRoles = (Object.entries(roles) as [MeetingRole, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k)
    addPerson({ name: name.trim(), side, rank, roles: nextRoles, note: note.trim() || undefined })
    setName('')
    setNote('')
    setRoles({
      vip: false,
      leader: false,
      hoster: false,
      presenter: false,
      assistant: false,
    })
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>人员（{project.people.length}）</div>

      <div className={styles.formStack}>
        <div className={styles.formGrid}>
          <label className={styles.label}>
            姓名
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className={styles.label}>
            阵营
            <select className={styles.select} value={side} onChange={(e) => setSide(e.target.value as PersonSide)}>
              <option value="guest">主宾方</option>
              <option value="host">主人方</option>
            </select>
          </label>
          <label className={styles.label}>
            职级(rank)
            <input className={styles.input} type="number" value={rank} onChange={(e) => setRank(Number(e.target.value))} />
          </label>
        </div>

        <div className={styles.roles}>
          {(['vip', 'leader', 'hoster', 'presenter', 'assistant'] as MeetingRole[]).map((r) => (
            <label key={r} className={styles.checkbox}>
              <input type="checkbox" checked={Boolean(roles[r])} onChange={(e) => setRoles({ ...roles, [r]: e.target.checked })} />
              {r}
            </label>
          ))}
        </div>

        <label className={styles.label}>
          备注
          <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className={styles.toolbar}>
          <button className={styles.primaryBtn} onClick={submit} disabled={!name.trim()}>
            添加
          </button>
          <label className={styles.fileBtn}>
            CSV 导入
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.currentTarget.value = ''
                if (!f) return
                const errs = await importCsv(f)
                setImportErr(errs.length ? `导入失败行数：${errs.length}（示例：第${errs[0]?.row}行：${errs[0]?.message}）` : null)
              }}
            />
          </label>
        </div>

        {importErr ? <div className={styles.warning}>{importErr}</div> : null}
      </div>

      <div className={styles.peopleList}>
        {project.people.map((p) => (
          <div key={p.id} className={styles.personRow}>
            <div className={styles.personMain}>
              <div className={styles.personName}>{p.name}</div>
              <div className={styles.personMeta}>
                {p.side} · rank {p.rank} · roles {(p.roles ?? []).join(',') || '-'}
              </div>
            </div>
            <button className={styles.secondaryBtn} onClick={() => removePerson(p.id)}>
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
