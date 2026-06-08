import type { ProjectId, SeedData, Standup } from '../domain/types'

const standupRows = [
  ['高远', '后端 · 召回', ['SRCH-177 联想词缓存联调通过'], ['SRCH-198 向量召回 beta 开关接入'], '语义服务的 GPU 资源还没批,影响 198 压测。需何川协助走审批。', '正在发言'],
  ['苏晴', '后端 · 语义', ['SRCH-209 定位空格 query 解析 bug'], ['SRCH-209 提修复 PR 并补单测', 'SRCH-198 协同高远联调'], '', ''],
  ['陈牧', '前端 · 结果页', ['SRCH-164 搜索入口 IA 调整上线', 'SRCH-190 高亮错位定位中'], ['SRCH-212 结果卡片摘要高亮'], '结果卡片视觉稿等江月今天给到终版。', ''],
  ['周屿', '前端 · 移动端', ['SRCH-186 历史/收藏打通自测完成'], ['SRCH-186 跟进高远评审意见', 'SRCH-205 移动端联想词键盘交互'], '', ''],
  ['韩雪', '测试 · QA', ['SRCH-177 缓存用例回归通过'], ['SRCH-190 中英混排高亮专项测试'], '', ''],
  ['何川', '架构 · 网关', ['SRCH-170 指标看板上线观察'], ['SRCH-224 网关降级策略设计评审'], '', ''],
  ['林夏', '负责人 · PM', ['整理空结果 query,同步产品'], ['SRCH-201 日志接入多维表格(待审批)'], '', ''],
  ['江月', '设计 · 体验', ['结果卡片视觉细化'], ['SRCH-212 交付终版标注'], '', '待同步'],
] as const

export function StandupPage({ data, projectId, onSaveStandup }: { data: SeedData; projectId: ProjectId; onSaveStandup: (standup: Standup) => void }) {
  const standup = data.standups.find((item) => item.projectId === projectId)
  if (!standup) throw new Error(`Standup not found: ${projectId}`)

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>每日站会</h1>
          <div className="sub">
            <span>Sprint 24 · 搜索体验重构</span>
            <span>·</span>
            <span>第 7 / 10 天</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">关联飞书日历 · 每日 10:00</div>
        <button className="btn btn-primary" aria-label="保存站会" onClick={() => onSaveStandup(standup)}>
          推送纪要到群
        </button>
      </header>
      <main className="su-body">
        <div className="su-head">
          <div className="su-date">
            <div className="d">06 / 06</div>
            <div className="w">星期五 · 站会 10:00-10:15</div>
          </div>
          <div className="su-meta">
            <div className="it"><div className="stat-num">7/8</div><div className="label">已同步</div></div>
            <div className="it"><div className="stat-num block">2</div><div className="label">阻塞项</div></div>
            <div className="it"><div className="stat-num done">9</div><div className="label">昨日完成</div></div>
          </div>
        </div>
        <div className="cols-h">
          <div className="label">成员</div>
          <div className="label">昨日完成</div>
          <div className="label">今日计划</div>
          <div className="label">阻塞 / 求助</div>
        </div>
        {standupRows.map(([name, role, yesterday, today, blocker, flag]) => (
          <div className="su-row" key={name}>
            <div className="su-cell">
              <div className="su-who">
                <div className="av lg">{name[0]}</div>
                <div><div className="nm">{name}</div><div className="rl">{role}</div></div>
              </div>
              {flag ? <div className="speak">{flag}</div> : null}
            </div>
            <div className="su-cell">{yesterday.map((item) => <div className="upd" key={item}>✓ <span>{item}</span></div>)}</div>
            <div className="su-cell">{today.map((item) => <div className="upd" key={item}>→ <span>{item}</span></div>)}</div>
            <div className="su-cell">{blocker ? <div className="blk"><div className="bt">阻塞</div>{blocker}</div> : <div className="no-blk">— 无阻塞</div>}</div>
          </div>
        ))}
      </main>
    </>
  )
}
