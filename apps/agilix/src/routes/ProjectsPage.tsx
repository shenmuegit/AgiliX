import { useState } from 'react'
import type { CreateProjectInput, Issue, IterationCalendarWeek, SeedData } from '../domain/types'
import {
  blockedIssues,
  completionPercent,
  donePoints,
  getActiveIteration,
  projectMemberIds,
  reviewIssues,
  sumPoints,
} from '../domain/view-models'

type ProjectFormState = {
  projectId: string
  projectName: string
  glyph: string
  color: string
  iterationId: string
  iterationCode: string
  iterationName: string
  dateRangeLabel: string
  calendarTitle: string
  calendarWeeksJson: string
  day: string
  totalDays: string
  goal: string
  velocity: string
}

const initialProjectForm: ProjectFormState = {
  projectId: 'growth',
  projectName: '增长实验',
  glyph: 'G',
  color: '#2563eb',
  iterationId: 'growth-s01',
  iterationCode: 'S01',
  iterationName: '启动迭代',
  dateRangeLabel: '06.10 - 06.21',
  calendarTitle: '增长实验 · S01',
  calendarWeeksJson: JSON.stringify(
    [
      { label: 'W1', rangeLabel: '06.10 - 06.14', days: ['10', '11', '12', '13', '14'] },
      { label: 'W2', rangeLabel: '06.17 - 06.21', days: ['17', '18', '19', '20', '21'] },
    ],
    null,
    2,
  ),
  day: '1',
  totalDays: '10',
  goal: '验证首批增长假设',
  velocity: '0',
}

export function ProjectsPage({
  data,
  onCreateProject,
}: {
  data: SeedData
  onCreateProject?: (input: CreateProjectInput) => void | Promise<void>
}) {
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProjectFormState>(initialProjectForm)
  const [error, setError] = useState<string | null>(null)
  const projectCards = data.projects.map((project) => {
    const iteration = getActiveIteration(data, project)
    const issues = data.issues.filter(
      (issue) => issue.projectId === project.id && issue.iterationId === iteration.id,
    )
    const blocked = blockedIssues(issues)
    const review = reviewIssues(issues)
    const pct = completionPercent(issues)
    const total = sumPoints(issues)
    const done = donePoints(issues)
    const members = projectMemberIds(issues).map((memberId) => {
      const member = data.members.find((item) => item.id === memberId)
      if (!member) throw new Error(`Member not found: ${memberId}`)
      return member
    })
    const health = getHealth(blocked.length, review.length, pct)

    return { project, iteration, issues, blocked, pct, total, done, members, health }
  })

  const allBlocked = projectCards.flatMap((card) => card.blocked)
  const allIssues = data.issues
  const allDone = donePoints(allIssues)

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>项目总览</h1>
          <div className="sub">
            <span>研发组合 · {data.projects.length} 个进行中项目</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          每周一推送组合周报
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建项目
        </button>
      </header>

      <main className="pv-body">
        {creating ? (
          <form
            className="project-create"
            onSubmit={(event) => {
              event.preventDefault()
              void submitProject()
            }}
          >
            <div className="section-h">
              <h3>新建项目</h3>
              <button className="btn btn-ghost" type="button" onClick={() => setCreating(false)}>
                取消
              </button>
            </div>
            <div className="project-form-grid">
              <TextField
                label="项目 ID"
                value={form.projectId}
                onChange={(value) => updateForm('projectId', value)}
              />
              <TextField
                label="项目名称"
                value={form.projectName}
                onChange={(value) => updateForm('projectName', value)}
              />
              <TextField
                label="项目图标"
                value={form.glyph}
                onChange={(value) => updateForm('glyph', value)}
              />
              <TextField
                label="项目颜色"
                value={form.color}
                onChange={(value) => updateForm('color', value)}
              />
              <TextField
                label="迭代 ID"
                value={form.iterationId}
                onChange={(value) => updateForm('iterationId', value)}
              />
              <TextField
                label="迭代代号"
                value={form.iterationCode}
                onChange={(value) => updateForm('iterationCode', value)}
              />
              <TextField
                label="迭代名称"
                value={form.iterationName}
                onChange={(value) => updateForm('iterationName', value)}
              />
              <TextField
                label="日期范围"
                value={form.dateRangeLabel}
                onChange={(value) => updateForm('dateRangeLabel', value)}
              />
              <TextField
                label="甘特标题"
                value={form.calendarTitle}
                onChange={(value) => updateForm('calendarTitle', value)}
              />
              <TextField
                label="迭代目标"
                value={form.goal}
                onChange={(value) => updateForm('goal', value)}
              />
              <TextField
                label="当前天数"
                type="number"
                value={form.day}
                onChange={(value) => updateForm('day', value)}
              />
              <TextField
                label="迭代总天数"
                type="number"
                value={form.totalDays}
                onChange={(value) => updateForm('totalDays', value)}
              />
              <TextField
                label="初始速度"
                type="number"
                value={form.velocity}
                onChange={(value) => updateForm('velocity', value)}
              />
              <label className="form-field wide">
                <span>日历周配置</span>
                <textarea
                  aria-label="日历周配置"
                  value={form.calendarWeeksJson}
                  onChange={(event) => updateForm('calendarWeeksJson', event.currentTarget.value)}
                />
              </label>
            </div>
            {error ? <div className="form-error">{error}</div> : null}
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                创建项目
              </button>
            </div>
          </form>
        ) : null}
        <div className="summary">
          <SummaryItem
            label="进行中项目"
            value={String(data.projects.length)}
            note={`共 ${data.members.length} 名成员协作`}
          />
          <SummaryItem
            label="活跃迭代"
            value={String(data.iterations.length)}
            note={`${data.iterations.filter((iteration) => iteration.day >= iteration.totalDays).length} 个待发布`}
          />
          <SummaryItem
            label="本周完成点数"
            value={String(allDone)}
            unit="pt"
            note={`计划 ${sumPoints(allIssues)} pt`}
          />
          <SummaryItem
            label="需关注"
            value={String(allBlocked.length)}
            unit="项受阻"
            note={
              allBlocked[0]
                ? `${projectName(data, allBlocked[0])} · ${allBlocked[0].title}`
                : '暂无阻塞'
            }
            danger={allBlocked.length > 0}
          />
        </div>
        <div className="pv-grid">
          {projectCards.map(
            ({ project, iteration, issues, blocked, pct, total, done, members, health }) => (
              <article className="pcard" key={project.id}>
                <div className="pc-top">
                  <div className="pc-glyph" style={{ background: project.color }}>
                    {project.glyph}
                  </div>
                  <div className="pc-name">
                    <h3>
                      {project.name}
                      <span className={`health ${health.className}`}>
                        <span className="dot" />
                        {health.label}
                      </span>
                    </h3>
                    <div className="sprint">
                      <span className="wid">
                        {iteration.code} · {iteration.name}
                      </span>
                      <span>·</span>
                      <span>
                        第 {iteration.day} / {iteration.totalDays} 天
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pc-body">
                  <div className="pc-prog-h">
                    <span className="label">迭代进度</span>
                    <span className="pct">
                      {pct}
                      <span>%</span>
                    </span>
                  </div>
                  <div className="pbar">
                    <i
                      style={{
                        width: `${pct}%`,
                        background: blocked.length > 0 ? 'var(--st-block)' : project.color,
                      }}
                    />
                  </div>
                  <div className="pc-stats">
                    <div>
                      <div className="v">
                        {done}
                        <span>/{total}</span>
                      </div>
                      <div className="l">故事点</div>
                    </div>
                    <div>
                      <div className="v">
                        {
                          issues.filter((issue) => issue.type === 'bug' && issue.status !== 'done')
                            .length
                        }
                      </div>
                      <div className="l">未解缺陷</div>
                    </div>
                    <div>
                      <div className="v">{members.length}</div>
                      <div className="l">成员</div>
                    </div>
                  </div>
                  <div className="pc-foot">
                    <div>
                      <div className="label">负责人 · 团队</div>
                      <div className="facepile">
                        {members.slice(0, 4).map((member) => (
                          <div className="av sm" key={`${project.id}-${member.id}`}>
                            {member.name.slice(0, 1)}
                          </div>
                        ))}
                        {members.length > 4 ? (
                          <div className="more">+{members.length - 4}</div>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="label">近五迭代速度</div>
                      <div className="spark">
                        {sparkValues(data, project.id).map((value, index, values) => (
                          <i
                            key={`${project.id}-${index}-${value}`}
                            className={index === values.length - 1 ? 'cur' : ''}
                            style={{
                              height: `${Math.max(4, Math.round((value / Math.max(...values, 1)) * 26))}px`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      </main>
    </>
  )

  function updateForm(key: keyof ProjectFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setError(null)
  }

  async function submitProject() {
    if (!onCreateProject) {
      setError('项目创建能力未接入')
      return
    }
    const required = [
      form.projectId,
      form.projectName,
      form.glyph,
      form.color,
      form.iterationId,
      form.iterationCode,
      form.iterationName,
      form.dateRangeLabel,
      form.calendarTitle,
      form.goal,
      form.day,
      form.totalDays,
      form.velocity,
    ]
    if (required.some((value) => value.trim() === '')) {
      setError('所有项目和初始迭代字段都必须填写')
      return
    }
    if (data.projects.some((project) => project.id === form.projectId)) {
      setError('项目 ID 已存在')
      return
    }
    const calendarWeeks = parseCalendarWeeks(form.calendarWeeksJson)
    if (!calendarWeeks) return
    const day = parseIntegerField('当前天数', form.day)
    const totalDays = parseIntegerField('迭代总天数', form.totalDays)
    const velocity = parseIntegerField('初始速度', form.velocity)
    if (day === null || totalDays === null || velocity === null) return

    setSaving(true)
    try {
      await onCreateProject({
        project: {
          id: form.projectId,
          name: form.projectName,
          glyph: form.glyph,
          color: form.color,
          activeIterationCode: form.iterationCode,
        },
        iteration: {
          id: form.iterationId,
          projectId: form.projectId,
          code: form.iterationCode,
          name: form.iterationName,
          dateRangeLabel: form.dateRangeLabel,
          calendarTitle: form.calendarTitle,
          calendarWeeks,
          day,
          totalDays,
          goal: form.goal,
          velocity,
        },
      })
      setCreating(false)
      setForm(initialProjectForm)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '创建项目失败')
    } finally {
      setSaving(false)
    }
  }

  function parseIntegerField(label: string, value: string): number | null {
    const parsed = Number(value)
    if (!Number.isInteger(parsed)) {
      setError(`${label}必须是整数`)
      return null
    }
    return parsed
  }

  function parseCalendarWeeks(value: string): IterationCalendarWeek[] | null {
    try {
      const parsed: unknown = JSON.parse(value)
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('日历周配置必须是非空数组')
      return parsed.map((week) => {
        if (typeof week !== 'object' || week === null) throw new Error('日历周配置必须使用对象')
        const candidate = week as { label?: unknown; rangeLabel?: unknown; days?: unknown }
        if (typeof candidate.label !== 'string' || candidate.label.length === 0)
          throw new Error('日历周 label 必填')
        if (typeof candidate.rangeLabel !== 'string' || candidate.rangeLabel.length === 0)
          throw new Error('日历周 rangeLabel 必填')
        if (
          !Array.isArray(candidate.days) ||
          candidate.days.length === 0 ||
          candidate.days.some((day) => typeof day !== 'string' || day.length === 0)
        )
          throw new Error('日历周 days 必须是非空字符串数组')
        return { label: candidate.label, rangeLabel: candidate.rangeLabel, days: candidate.days }
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '日历周配置不是合法 JSON')
      return null
    }
  }
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number'
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type={type}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  )
}

function getHealth(
  blockedCount: number,
  reviewCount: number,
  pct: number,
): { label: string; className: string } {
  if (blockedCount > 0) return { label: '受阻', className: 'h-block' }
  if (reviewCount > 0 || pct < 50) return { label: '偏紧', className: 'h-risk' }
  return { label: '正常', className: 'h-ok' }
}

function projectName(data: SeedData, issue: Issue): string {
  const project = data.projects.find((item) => item.id === issue.projectId)
  if (!project) throw new Error(`Project not found: ${issue.projectId}`)
  return project.name
}

function sparkValues(data: SeedData, projectId: string): number[] {
  const values = data.iterations
    .filter((iteration) => iteration.projectId === projectId)
    .map((iteration) => iteration.velocity)
  return values.length > 0 ? values : [0]
}

function SummaryItem({
  label,
  value,
  unit,
  note,
  danger,
}: {
  label: string
  value: string
  unit?: string
  note: string
  danger?: boolean
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`stat-num ${danger ? 'block' : ''}`}>
        {value}
        {unit ? <span>{unit}</span> : null}
      </div>
      <div className="muted">{note}</div>
    </div>
  )
}
