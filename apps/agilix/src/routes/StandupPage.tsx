import type { ProjectId, SeedData, Standup, StandupItem } from '../domain/types'
import { getActiveIteration, getMember, getProject, memberInitial } from '../domain/view-models'

export function StandupPage({
  data,
  projectId,
  onSaveStandup,
}: {
  data: SeedData
  projectId: ProjectId
  onSaveStandup: (standup: Standup) => void
}) {
  const project = getProject(data, projectId)
  const iteration = getActiveIteration(data, project)
  const standup = data.standups.find((item) => item.projectId === projectId)
  if (!standup) throw new Error(`Standup not found: ${projectId}`)

  const yesterdayCount = standup.items.reduce((sum, item) => sum + item.yesterday.length, 0)
  const blockerCount = standup.items.reduce((sum, item) => sum + item.blockers.length, 0)

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>每日站会</h1>
          <div className="sub">
            <span>
              {iteration.code} · {iteration.name}
            </span>
            <span>·</span>
            <span>
              第 {iteration.day} / {iteration.totalDays} 天
            </span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M8 2v4M16 2v4M3 10h18" />
          </svg>
          关联飞书日历 · {standup.calendarLabel}
        </div>
        <button
          className="btn btn-primary"
          aria-label="保存站会"
          onClick={() => onSaveStandup(standup)}
        >
          推送纪要到群
        </button>
      </header>
      <main className="su-body">
        <div className="su-head">
          <div className="su-date">
            <div className="d">{standup.dateLabel}</div>
            <div className="w">
              {standup.weekdayLabel} · 站会 {standup.timeLabel}
            </div>
          </div>
          <div className="su-meta">
            <div className="it">
              <div className="stat-num">
                {standup.items.length}/{data.members.length}
              </div>
              <div className="label">已同步</div>
            </div>
            <div className="it">
              <div className="stat-num block">{blockerCount}</div>
              <div className="label">阻塞项</div>
            </div>
            <div className="it">
              <div className="stat-num done">{yesterdayCount}</div>
              <div className="label">昨日完成</div>
            </div>
          </div>
        </div>
        <div className="cols-h">
          <div className="label">成员</div>
          <div className="label">昨日完成</div>
          <div className="label">今日计划</div>
          <div className="label">阻塞 / 求助</div>
        </div>
        {standup.items.map((item, index) => (
          <StandupRow key={item.memberId} data={data} item={item} isSpeaking={index === 0} />
        ))}
      </main>
    </>
  )
}

function StandupRow({
  data,
  item,
  isSpeaking,
}: {
  data: SeedData
  item: StandupItem
  isSpeaking: boolean
}) {
  const member = getMember(data, item.memberId)

  return (
    <div className="su-row">
      <div className="su-cell">
        <div className="su-who">
          <div className="av lg">{memberInitial(member)}</div>
          <div>
            <div className="nm">{member.name}</div>
            <div className="rl">{member.role}</div>
          </div>
        </div>
        {isSpeaking ? <div className="speak">正在发言</div> : null}
      </div>
      <div className="su-cell">
        {item.yesterday.map((text) => (
          <div className="upd" key={text}>
            ✓ <span>{text}</span>
          </div>
        ))}
      </div>
      <div className="su-cell">
        {item.today.map((text) => (
          <div className="upd" key={text}>
            → <span>{text}</span>
          </div>
        ))}
      </div>
      <div className="su-cell">
        {item.blockers.length > 0 ? (
          <div className="blk">
            <div className="bt">阻塞</div>
            {item.blockers.join(' · ')}
          </div>
        ) : (
          <div className="no-blk">无阻塞</div>
        )}
      </div>
    </div>
  )
}
