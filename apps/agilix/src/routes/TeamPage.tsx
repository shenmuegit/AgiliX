import type { ReactNode } from 'react'
import type { Issue, SeedData } from '../domain/types'
import { blockedIssues, completionPercent, getActiveIteration, getMember, latestDocs, memberAvatarClass, memberInitial, priorityMeta, reviewIssues, statusMeta, sumPoints, unresolvedIssues } from '../domain/view-models'

export function TeamPage({
  data,
  onOpenIssues,
  onOpenDocs,
  onOpenStandup,
}: {
  data: SeedData
  onOpenIssues?: () => void
  onOpenDocs?: () => void
  onOpenStandup?: () => void
}) {
  if (data.projects.length === 0) throw new Error('Team workbench requires at least one project')
  const project = data.projects[0]
  const iteration = getActiveIteration(data, project)
  const issues = data.issues.filter((issue) => issue.iterationId === iteration.id)
  const blockers = blockedIssues(issues)
  const reviews = reviewIssues(issues)
  const unresolved = unresolvedIssues(issues)
  const focusIssues = [...blockers, ...reviews, ...unresolved.filter((issue) => issue.status !== 'blocked' && issue.status !== 'review')].slice(0, 4)
  const todoIssues = [...focusIssues].sort(compareAttentionIssues).slice(0, 4)
  const docs = latestDocs(data.docs, 3)
  const group = data.feishu.groups[0]
  if (!group) throw new Error('Feishu group not found')
  const docsCommand = data.feishu.queryCommands.find((command) => command.type === 'docs')
  const docsCommandLabel = docsCommand?.type === 'docs' ? `/docs ${docsCommand.query}` : null
  const done = issues.filter((issue) => issue.status === 'done')
  const totalPoints = sumPoints(issues)
  const donePointCount = sumPoints(done)

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>团队工作台</h1>
          <div className="sub">
            <span>AgiliX 主工作台</span>
            <span>·</span>
            <span>飞书只做通知和查询</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          单群通知 · {group}
        </div>
        <button className="btn btn-ghost" onClick={onOpenIssues}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          搜索
        </button>
        <button className="btn btn-primary" onClick={onOpenIssues}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建 Issue
        </button>
      </header>

      <main className="desk">
        <section className="hero">
          <div>
            <div className="kicker">Today / {iteration.code}</div>
            <h2>今天要盯住 {blockers.length + reviews.length} 件事</h2>
            <p className="brief">
              {project.name}进入第 {iteration.day} 天,当前迭代是 {iteration.name};完成 {donePointCount}/{totalPoints} pt,阻塞 {blockers.length} 个,待 Review {reviews.length} 个。今天重点是推进 {focusIssues.map((issue) => issue.key).join('、')}。
            </p>
          </div>
          <div className="pulse">
            <div className="p">
              <div className="stat-num done">{completionPercent(issues)}%</div>
              <div className="label">迭代完成</div>
            </div>
            <div className="p">
              <div className="stat-num block">{blockers.length}</div>
              <div className="label">阻塞</div>
            </div>
            <div className="p">
              <div className="stat-num review">{reviews.length}</div>
              <div className="label">待 Review</div>
            </div>
            <div className="p">
              <div className="stat-num">{unresolved.length}</div>
              <div className="label">今日在办</div>
            </div>
          </div>
        </section>

        <div className="quick">
          <button onClick={onOpenStandup}>
            <b>更新我的状态</b>
            <span>同步今日计划</span>
          </button>
          <button onClick={onOpenIssues}>
            <b>查看阻塞</b>
            <span>{blockers.length} 项需要协助</span>
          </button>
          <button onClick={onOpenIssues}>
            <b>待我 Review</b>
            <span>{reviews.length} 个工单</span>
          </button>
          <button onClick={onOpenDocs}>
            <b>打开文档</b>
            <span>最近 {docs.length} 次更新</span>
          </button>
        </div>

        <div className="grid">
          <div>
            <section className="section">
              <div className="section-h">
                <h3>团队当前在做什么</h3>
                <span className="label">来自 Issue 状态 + 今日同步</span>
              </div>
              {focusIssues.map((issue) => {
                const member = getMember(data, issue.assigneeId)
                const meta = statusMeta[issue.status]
                return (
                  <PersonRow
                    key={issue.key}
                    avatarClass={memberAvatarClass(member.id)}
                    name={member.name}
                    role={member.role}
                    title={`${issue.key} ${issue.title}`}
                    badge={meta.label}
                    badgeClass={meta.badgeClass}
                    note={issue.blockerReason ?? `${project.name} · ${iteration.name}`}
                    progress={issueProgress(issue)}
                    points={issue.storyPoints}
                  />
                )
              })}
            </section>

            <section className="section" aria-label="待处理 Issue">
              <div className="section-h">
                <h3>待处理 Issue</h3>
                <span className="label">优先看阻塞 / Review / 高优缺陷</span>
              </div>
              <div className="todo-list">
                {todoIssues.map((issue) => {
                  const member = getMember(data, issue.assigneeId)
                  return <Todo key={issue.key} issueKey={issue.key} title={issue.title} meta={`负责人 ${member.name} · ${issue.blockerReason ?? statusMeta[issue.status].label}`} marker={<IssueMarker issue={issue} />} />
                })}
              </div>
            </section>
          </div>

          <aside className="side-panel">
            <section className="section">
              <div className="section-h">
                <h3>飞书群会看到什么</h3>
                <span className="label">通知 / 查询</span>
              </div>
              <div className="feed-i">
                <div className="feishu-card">
                  <b>{project.name} · 今日状态</b>
                  <p>完成 {donePointCount}/{totalPoints} pt; 阻塞 {blockers.length}; 待 Review {reviews.length}。{blockers.map((issue) => `${getMember(data, issue.assigneeId).name}卡在${issue.blockerReason}`).join('；')}</p>
                  <span className="cmd">/team</span>
                  <span className="cmd">/blockers</span>
                  {docsCommandLabel ? <span className="cmd">{docsCommandLabel}</span> : null}
                </div>
              </div>
            </section>

            <section className="section">
              <div className="section-h">
                <h3>最近文档</h3>
                <span className="label">统一文档入口</span>
              </div>
              {docs.map((doc) => {
                const comment = doc.comments[0]
                const meta = comment ? `${getMember(data, comment.authorId).name}评论 · ${comment.createdAtLabel}` : `${doc.directory} · ${doc.updatedAtLabel}`
                return <DocRow key={doc.id} mark={doc.title.slice(0, 1)} title={doc.title} meta={meta} />
              })}
            </section>

            <section className="section feed">
              <div className="section-h">
                <h3>代码动态</h3>
                <span className="label">Git 同步</span>
              </div>
              {focusIssues.slice(0, 3).map((issue) => {
                const member = getMember(data, issue.assigneeId)
                return <FeedItem key={issue.key} title={`${statusMeta[issue.status].label} · ${issue.key}`} body={`${member.name}正在处理${issue.title}。`} />
              })}
            </section>
          </aside>
        </div>
      </main>
    </>
  )
}

function issueProgress(issue: Issue): number {
  if (issue.status === 'done') return 100
  if (issue.status === 'review') return 85
  if (issue.status === 'doing') return 60
  if (issue.status === 'blocked') return 45
  return 10
}

function compareAttentionIssues(a: Issue, b: Issue): number {
  const statusRank = { blocked: 0, review: 1, doing: 2, todo: 3, done: 4 }
  const priorityRank = { high: 0, medium: 1, low: 2 }
  return statusRank[a.status] - statusRank[b.status] || priorityRank[a.priority] - priorityRank[b.priority] || b.storyPoints - a.storyPoints
}

function PersonRow({ avatarClass, name, role, title, badge, badgeClass, note, progress, points }: { avatarClass: string; name: string; role: string; title: string; badge: string; badgeClass: string; note: string; progress: number; points: number }) {
  return (
    <div className="person-row">
      <div className="who">
        <div className={`av lg ${avatarClass}`}>{name.slice(0, 1)}</div>
        <div>
          <b>{name}</b>
          <span>{role}</span>
        </div>
      </div>
      <div>
        <div className="work-title">{title}</div>
        <div className="work-sub">
          <span className={`badge ${badgeClass}`}>
            <span className="dot" />
            {badge}
          </span>
          <span>{note}</span>
        </div>
      </div>
      <div className="mini">
        <span>进度 {progress}%</span>
        <div className="subbar">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className="pts">
        {points}
        <small>pt</small>
      </span>
    </div>
  )
}

function Todo({ issueKey, title, meta, marker }: { issueKey: string; title: string; meta: string; marker: ReactNode }) {
  return (
    <div className="todo">
      <span className="wid">{issueKey}</span>
      <div>
        <div className="title">{title}</div>
        <div className="meta">{meta}</div>
      </div>
      {marker}
    </div>
  )
}

function IssueMarker({ issue }: { issue: Issue }) {
  if (issue.status === 'blocked' || issue.status === 'review') {
    const meta = statusMeta[issue.status]
    return (
      <span className={`badge ${meta.badgeClass}`}>
        <span className="dot" />
        {meta.label}
      </span>
    )
  }
  const priority = priorityMeta[issue.priority]
  return <span className={`pri ${priority.className}`}>{priority.label}</span>
}

function DocRow({ mark, title, meta }: { mark: string; title: string; meta: string }) {
  return (
    <div className="doc-row">
      <div className="doc-ico">{mark}</div>
      <div>
        <b>{title}</b>
        <p>{meta}</p>
      </div>
    </div>
  )
}

function FeedItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="feed-i">
      <b>{title}</b>
      <p>{body}</p>
    </div>
  )
}
