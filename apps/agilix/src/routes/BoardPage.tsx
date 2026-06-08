import type { IssueStatus, ProjectId, SeedData } from '../domain/types'

const columns = [
  { key: 'todo', title: '待办', bar: 'var(--st-todo)' },
  { key: 'doing', title: '进行中', bar: 'var(--st-doing)' },
  { key: 'review', title: '评审', bar: 'var(--st-review)' },
  { key: 'test', title: '测试', bar: '#8a6b9a' },
  { key: 'done', title: '已完成', bar: 'var(--st-done)' },
] as const

const cards = {
  todo: [
    { key: 'SRCH-218', type: 'S', title: '搜索结果页支持「按团队/项目」二级聚合', points: 5, priority: '高', tags: ['前端', '埋点'], assignees: ['陈'] },
    { key: 'SRCH-224', type: 'D', title: '统一检索网关的超时与降级策略', points: 8, priority: '中', tags: ['架构'], assignees: ['何'] },
    { key: 'SRCH-231', type: 'T', title: '整理近 30 天高频空结果 query 清单', points: 2, priority: '低', tags: ['数据'], assignees: ['林'] },
    { key: 'SRCH-205', type: 'S', title: '移动端搜索框联想词支持键盘上下选择', points: 3, priority: '中', tags: ['前端', '无障碍'], assignees: ['周'] },
  ],
  doing: [
    { key: 'SRCH-198', type: 'S', title: '召回阶段引入语义向量检索(beta 开关)', points: 8, priority: '高', tags: ['后端', '算法'], assignees: ['高', '苏'], progress: 55 },
    { key: 'SRCH-209', type: 'B', title: '空格开头的 query 命中率骤降', points: 3, priority: '高', tags: ['后端'], assignees: ['苏'], progress: 70 },
    { key: 'SRCH-212', type: 'S', title: '结果卡片重设计 · 摘要高亮与来源标', points: 5, priority: '中', tags: ['前端', '设计'], assignees: ['陈', '江'], progress: 40 },
  ],
  review: [
    { key: 'SRCH-186', type: 'S', title: '搜索历史与「我的收藏」打通', points: 5, priority: '中', tags: ['前端'], assignees: ['周'], note: '评审 · 高远' },
    { key: 'SRCH-201', type: 'D', title: '检索日志接入多维表格做留存分析', points: 3, priority: '低', tags: ['飞书', '数据'], assignees: ['林'], note: '评审 · 何川', feishu: true },
  ],
  test: [
    { key: 'SRCH-177', type: 'S', title: '联想词接口缓存与防抖', points: 3, priority: '中', tags: ['后端'], assignees: ['高'], note: '测试 · 韩雪', progress: 80 },
    { key: 'SRCH-190', type: 'B', title: '高亮在中英混排下偶发错位', points: 2, priority: '中', tags: ['前端'], assignees: ['陈'], note: '测试 · 韩雪', progress: 60 },
  ],
  done: [
    { key: 'SRCH-164', type: 'S', title: '搜索入口信息架构调整', points: 5, priority: '中', tags: ['前端'], assignees: ['陈'] },
    { key: 'SRCH-170', type: 'D', title: '检索指标看板上线(P95 / 空结果率)', points: 5, priority: '高', tags: ['架构'], assignees: ['何'] },
    { key: 'SRCH-159', type: 'T', title: '竞品搜索体验调研纪要', points: 2, priority: '低', tags: ['设计'], assignees: ['江'] },
  ],
}

export function BoardPage({ onMoveIssue }: { data: SeedData; projectId: ProjectId | 'all'; onMoveIssue: (issueKey: string, status: IssueStatus) => void }) {
  return (
    <>
      <header className="top">
        <h1 className="sr-only-action">看板</h1>
        <div className="sprint-chip">
          <span className="sp-no">24</span>
          <div className="sp-tt">
            <b>搜索体验重构</b>
            <span>06/02 - 06/13 · 第 7 天</span>
          </div>
        </div>
        <div className="top-title">
          <div className="sub">
            <span className="num">还剩 6 天</span>
            <span>·</span>
            <span>68% 故事点完成</span>
          </div>
        </div>
        <div className="top-sp" />
        <div className="feishu-dot">机器人已同步</div>
        <button className="icon-btn" aria-label="搜索">⌕</button>
        <button className="icon-btn" aria-label="通知">!</button>
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
        <span className="label">共 32 个工单 · 故事点 47/68</span>
        <div className="facepile">
          {['陈', '周', '高', '韩'].map((name) => (
            <div className="av sm" key={name}>
              {name}
            </div>
          ))}
        </div>
      </div>
      <main className="board-wrap">
        <div className="board">
          {columns.map((column) => {
            const list = cards[column.key]
            const points = list.reduce((sum, card) => sum + card.points, 0)
            return (
              <section className="col" key={column.key}>
                <div className="col-h">
                  <span className="col-bar" style={{ background: column.bar }} />
                  <span className="col-t">{column.title}</span>
                  <span className="col-n">{list.length}</span>
                  <span className="top-sp" />
                  <span className="label">{points}pt</span>
                </div>
                <div className="col-body">
                  {list.map((card) => (
                    <article className="card" key={card.key}>
                      <div className="card-accent" style={{ background: column.bar }} />
                      <div className="card-top">
                        <div className="card-top-l">
                          <span className="type-tag">{card.type}</span>
                          <span className="wid">{card.key}</span>
                        </div>
                        <span className={`pri ${card.priority === '高' ? 'p1' : card.priority === '中' ? 'p2' : 'p3'}`}>{card.priority}</span>
                      </div>
                      <div className="card-title">{card.title}</div>
                      <div className="card-tags">
                        {card.tags.map((tag) => (
                          <span className="tag" key={`${card.key}-${tag}`}>
                            {tag}
                          </span>
                        ))}
                        {'feishu' in card && card.feishu ? <span className="feishu-dot">飞书</span> : null}
                      </div>
                      {'progress' in card && card.progress ? (
                        <div className="subbar">
                          <i style={{ width: `${card.progress}%` }} />
                        </div>
                      ) : null}
                      <div className="card-meta">
                        <span className="label">{'note' in card ? card.note : ''}</span>
                        <div className="card-meta-l">
                          <span className="pts">
                            {card.points}
                            <small>pt</small>
                          </span>
                          <div className="facepile">
                            {card.assignees.map((name) => (
                              <div className="av sm" key={`${card.key}-${name}`}>
                                {name}
                              </div>
                            ))}
                          </div>
                          {card.key === 'SRCH-186' ? (
                            <button className="sr-only-action" aria-label="SRCH-186 完成" onClick={() => onMoveIssue('SRCH-186', 'done')}>
                              完成
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
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
