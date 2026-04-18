'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import styles from './page.module.css'

import type { StrategyId } from '@/domain/models'
import { STRATEGY_NAME, TEMPLATES } from '@/domain'
import type { ProjectSummary, StoredProject } from '@/adapters'
import { listProjects, upsertProject } from '@/adapters'
import { HomeVenueSimulator } from '@/ui/components/HomeVenueSimulator'

const uuid = () => {
  const v = globalThis.crypto?.randomUUID?.()
  if (v) return v
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

export default function Home() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectSummary[]>(() => listProjects())
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState(TEMPLATES[0]?.id ?? '')
  const [strategyId, setStrategyId] = useState<StrategyId>('leader_visit')
  const [generatedTemplateId, setGeneratedTemplateId] = useState<string | undefined>(undefined)
  const [generateSeed, setGenerateSeed] = useState<number | undefined>(undefined)

  const templates = useMemo(() => TEMPLATES, [])

  const refresh = () => setProjects(listProjects())

  const createProject = () => {
    const projectName = name.trim() || `未命名项目 ${new Date().toLocaleString()}`
    const now = Date.now()
    const project: StoredProject = {
      id: uuid(),
      name: projectName,
      templateId,
      strategyId,
      people: [],
      lockedAssignments: [],
      createdAt: now,
      updatedAt: now,
    }
    upsertProject(project)
    refresh()
    router.push(`/project/${project.id}`)
  }

  const generateVenue = () => {
    if (!templateId) return
    setGeneratedTemplateId(templateId)
    setGenerateSeed(Date.now())
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>快速排座（MVP）</h1>
        <div className={styles.subtitle}>本地存储 · 无登录 · 导出 PNG（排队+水印）</div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <h2>新建项目</h2>
          <div className={styles.formRow}>
            <label className={styles.label}>
              项目名
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：客户到访汇报会" />
            </label>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.label}>
              模板
              <select className={styles.select} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              场景策略
              <select className={styles.select} value={strategyId} onChange={(e) => setStrategyId(e.target.value as StrategyId)}>
                {Object.entries(STRATEGY_NAME).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.actionRow}>
            <button className={styles.primaryBtn} onClick={createProject} disabled={!templateId}>
              进入编辑
            </button>
            <button className={styles.secondaryBtn} onClick={generateVenue} disabled={!templateId}>
              生成场地
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <h2>项目列表</h2>
          {projects.length === 0 ? (
            <div className={styles.muted}>暂无项目（数据仅保存在当前浏览器）。</div>
          ) : (
            <ul className={styles.list}>
              {projects.map((p) => (
                <li key={p.id} className={styles.listItem}>
                  <div className={styles.listMain}>
                    <div className={styles.listTitle}>{p.name}</div>
                    <div className={styles.listMeta}>
                      {p.templateId} · {STRATEGY_NAME[p.strategyId] ?? p.strategyId}
                    </div>
                  </div>
                  <button className={styles.secondaryBtn} onClick={() => router.push(`/project/${p.id}`)}>
                    打开
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${styles.card} ${styles.fullWidth}`}>
          <HomeVenueSimulator generatedTemplateId={generatedTemplateId} seed={generateSeed} />
        </section>
      </main>
    </div>
  )
}
