import { ProjectFilter, type ProjectFilterValue } from '../components/ProjectFilter'
import type { SeedData } from '../domain/types'

const ledgerRows = [
  { group: '史诗 · 召回与语义' },
  { key: 'SRCH-198', type: 'S', title: '召回阶段引入语义向量检索', priority: '高', status: '进行中', badge: 'b-doing', assignee: '高远', avatar: '高', points: 8, updated: '2 小时前' },
  { key: 'SRCH-209', type: 'B', title: '空格开头的 query 命中率骤降', priority: '高', status: '进行中', badge: 'b-doing', assignee: '苏晴', avatar: '苏', points: 3, updated: '40 分钟前' },
  { key: 'SRCH-224', type: 'D', title: '统一检索网关的超时与降级策略', priority: '中', status: '待办', badge: 'b-todo', assignee: '何川', avatar: '何', points: 8, updated: '昨天' },
  { key: 'SRCH-177', type: 'S', title: '联想词接口缓存与防抖', priority: '中', status: '测试', badge: 'b-block', assignee: '高远', avatar: '高', points: 3, updated: '今天 09:20' },
  { group: '史诗 · 结果页体验' },
  { key: 'SRCH-212', type: 'S', title: '结果卡片重设计 · 摘要高亮与来源标', priority: '中', status: '进行中', badge: 'b-doing', assignee: '陈牧', avatar: '陈', points: 5, updated: '1 小时前', extra: '审批 · 设计评审' },
  { key: 'SRCH-218', type: 'S', title: '结果页支持「按团队/项目」二级聚合', priority: '高', status: '待办', badge: 'b-todo', assignee: '陈牧', avatar: '陈', points: 5, updated: '昨天' },
  { key: 'SRCH-190', type: 'B', title: '高亮在中英混排下偶发错位', priority: '中', status: '测试', badge: 'b-block', assignee: '陈牧', avatar: '陈', points: 2, updated: '今天 11:05' },
  { key: 'SRCH-205', type: 'S', title: '移动端搜索框联想词键盘上下选择', priority: '中', status: '待办', badge: 'b-todo', assignee: '周屿', avatar: '周', points: 3, updated: '2 天前' },
  { key: 'SRCH-186', type: 'S', title: '搜索历史与「我的收藏」打通', priority: '中', status: '评审', badge: 'b-review', assignee: '周屿', avatar: '周', points: 5, updated: '3 小时前' },
  { group: '史诗 · 检索基建' },
  { key: 'SRCH-201', type: 'D', title: '检索日志接入多维表格做留存分析', priority: '低', status: '评审', badge: 'b-review', assignee: '林夏', avatar: '林', points: 3, updated: '今天 10:40', feishu: true },
  { key: 'SRCH-170', type: 'D', title: '检索指标看板上线(P95 / 空结果率)', priority: '高', status: '已完成', badge: 'b-done', assignee: '何川', avatar: '何', points: 5, updated: '2 天前' },
  { key: 'SRCH-231', type: 'T', title: '整理近 30 天高频空结果 query 清单', priority: '低', status: '待办', badge: 'b-todo', assignee: '林夏', avatar: '林', points: 2, updated: '昨天' },
]

export function IssuesPage({ data, projectId, onProjectChange }: { data: SeedData; projectId: ProjectFilterValue; onProjectChange: (projectId: ProjectFilterValue) => void }) {
  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>需求 & 缺陷</h1>
          <div className="sub">
            <span>搜索体验重构 · 工作项台账</span>
          </div>
        </div>
        <div className="top-sp" />
        <button className="icon-btn" title="搜索" aria-label="搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
        </button>
        <button className="btn btn-ghost">导出</button>
        <button className="btn btn-primary">新建工单</button>
      </header>
      <div className="toolbar">
        <div className="seg">
          <button className="on">全部</button>
          <button>需求</button>
          <button>缺陷</button>
          <button>技术债</button>
        </div>
        <div className="chip-flat">状态:进行中 +2</div>
        <div className="chip-flat">迭代:S24</div>
        <div className="chip-flat">经办:全部</div>
        <ProjectFilter projects={data.projects} value={projectId} onChange={onProjectChange} />
        <div className="top-sp" />
        <span className="label">58 项 · 故事点 182 · 缺陷 9</span>
      </div>
      <main className="lg-body">
        <table className="lg-table">
          <thead>
            <tr>
              <th>工单号</th>
              <th>标题</th>
              <th>优先级</th>
              <th>状态</th>
              <th>经办人</th>
              <th className="r">点数</th>
              <th className="r">更新</th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.map((row) =>
              'group' in row ? (
                <tr className="grp-row" key={row.group}>
                  <td colSpan={7}>
                    <span className="label">{row.group}</span>
                  </td>
                </tr>
              ) : (
                <tr key={row.key}>
                  <td>
                    <span className="wid">{row.key}</span>
                  </td>
                  <td>
                    <div className="lg-title">
                      <span className="type-tag">{row.type}</span>
                      <span>{row.title}</span>
                      {row.feishu ? <span className="feishu-dot">飞书</span> : null}
                      {row.extra ? <span className="badge b-review">{row.extra}</span> : null}
                    </div>
                  </td>
                  <td>
                    <span className={`pri ${row.priority === '高' ? 'p1' : row.priority === '中' ? 'p2' : 'p3'}`}>{row.priority}</span>
                  </td>
                  <td>
                    <span className={`badge ${row.badge}`}>
                      <span className="dot" />
                      {row.status}
                    </span>
                  </td>
                  <td>
                    <div className="assignee">
                      <div className="av sm">{row.avatar}</div>
                      {row.assignee}
                    </div>
                  </td>
                  <td className="r">
                    <span className="num">{row.points}</span>
                  </td>
                  <td className="r muted">{row.updated}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </main>
    </>
  )
}
