import type { Issue, IssueStatus, ProjectId, SeedData } from '../domain/types'
import { completionPercent, donePoints, getActiveIteration, getMember, getProject, issueTypeLabel, issuesForProjectFilter, memberInitial, priorityMeta, statusMeta, statusOrder, sumPoints } from '../domain/view-models'

export function BoardPage({ data, projectId, onMoveIssue }: { data: SeedData; projectId: ProjectId | 'all'; onMoveIssue: (issueKey: string, status: IssueStatus) => void }) {
  const issues = issuesForProjectFilter(data, projectId)
  const selectedProject = projectId === 'all' ? null : getProject(data, projectId)
  const selectedIteration = selectedProject ? getActiveIteration(data, selectedProject) : null
  const totalPoints = sumPoints(issues)
  const members = Array.from(new Set(issues.map((issue) => issue.assigneeId))).map((memberId) => getMember(data, memberId))

  return (
    <>
      <header className="top">
        <h1 className="sr-only-action">看板</h1>
        <div className="sprint-chip">
          <span className="sp-no">{selectedProject ? selectedProject.activeIterationCode.replace(/\D/g, '') : data.projects.length}</span>
          <div className="sp-tt">
            <b>{selectedIteration ? selectedIteration.name : '全部项目'}</b>
            <span>{selectedIteration ? `第 ${selectedIteration.day}/${selectedIteration.totalDays} 天` : `${data.projects.length} 个项目`}</span>
          </div>
        </div>
        <div className="top-title">
          <div className="sub">
            <span className="num">{selectedIteration ? `还剩 ${selectedIteration.totalDays - selectedIteration.day + 1} 天` : `${issues.length} 个工单`}</span>
            <span>·</span>
            <span>{completionPercent(issues)}% 故事点完成</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">{data.feishu.groups[0]}</div>
        <button className="icon-btn" aria-label="搜索">
          ⌕
        </button>
        <button className="icon-btn" aria-label="通知">
          !
        </button>
        <button className="btn btn-primary">新建</button>
      </header>
      <div className="toolbar">
        <div className="seg">
          <button className="on">看板</button>
          <button>表格</button>
          <button>时间线</button>
        </div>
        <div className="chip-flat">筛选</div>
        <div className="chip-flat">经办人</div>
        <div className="chip-flat">分组:状态</div>
        <div className="top-sp" />
        <span className="label">
          共 {issues.length} 个工单 · 故事点 {donePoints(issues)}/{totalPoints}
        </span>
        <div className="facepile">
          {members.map((member) => (
            <div className="av sm" key={member.id}>
              {memberInitial(member)}
            </div>
          ))}
        </div>
      </div>
      <main className="board-wrap">
        <div className="board">
          {statusOrder.map((status) => {
            const list = issues.filter((issue) => issue.status === status)
            const points = sumPoints(list)
            return (
              <section className="col" key={status}>
                <div className="col-h">
                  <span className="col-bar" style={{ background: statusMeta[status].color }} />
                  <span className="col-t">{statusMeta[status].boardLabel}</span>
                  <span className="col-n">{list.length}</span>
                  <span className="top-sp" />
                  <span className="label">{points}pt</span>
                </div>
                <div className="col-body">
                  {list.map((issue) => (
                    <IssueCard key={issue.key} data={data} issue={issue} onMoveIssue={onMoveIssue} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </>
  )
}

function IssueCard({ data, issue, onMoveIssue }: { data: SeedData; issue: Issue; onMoveIssue: (issueKey: string, status: IssueStatus) => void }) {
  const member = getMember(data, issue.assigneeId)
  const project = getProject(data, issue.projectId)
  const progress = issue.status === 'todo' ? 0 : issue.status === 'doing' ? 55 : issue.status === 'blocked' ? 45 : issue.status === 'review' ? 85 : 100

  return (
    <article className="card">
      <div className="card-accent" style={{ background: statusMeta[issue.status].color }} />
      <div className="card-top">
        <div className="card-top-l">
          <span className="type-tag">{issueTypeLabel[issue.type]}</span>
          <span className="wid">{issue.key}</span>
        </div>
        <span className={`pri ${priorityMeta[issue.priority].className}`}>{priorityMeta[issue.priority].label}</span>
      </div>
      <div className="card-title">{issue.title}</div>
      <div className="card-tags">
        <span className="tag">{project.name}</span>
        <span className="tag">{statusMeta[issue.status].label}</span>
        {issue.linkedDocIds.length > 0 ? <span className="feishu-dot">文档</span> : null}
      </div>
      {issue.status !== 'done' ? (
        <div className="subbar">
          <i style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="card-meta">
        <span className="label">{issue.blockerReason ?? ''}</span>
        <div className="card-meta-l">
          <span className="pts">
            {issue.storyPoints}
            <small>pt</small>
          </span>
          <div className="facepile">
            <div className="av sm">{memberInitial(member)}</div>
          </div>
          {issue.status !== 'done' ? (
            <button className="sr-only-action" aria-label={`${issue.key} 完成`} onClick={() => onMoveIssue(issue.key, 'done')}>
              完成
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
