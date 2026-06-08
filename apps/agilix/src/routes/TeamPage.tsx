import type { ReactNode } from 'react'
import type { SeedData } from '../domain/types'

export function TeamPage({ data }: { data: SeedData }) {
  if (data.projects.length === 0) throw new Error('Team workbench requires at least one project')

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
          单群通知 · 研发小队
        </div>
        <button className="btn btn-ghost">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          搜索
        </button>
        <button className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建 Issue
        </button>
      </header>

      <main className="desk">
        <section className="hero">
          <div>
            <div className="kicker">Today / 06.06</div>
            <h2>今天要盯住 3 件事</h2>
            <p className="brief">
              搜索平台进入第 7 天,整体进度正常;两个阻塞都与外部确认有关,不需要重新分配人力。今天的重点是让 SRCH-198 解除资源阻塞,把 SRCH-186 与 SRCH-201 完成评审,并补齐结果卡片方案文档评论。
            </p>
          </div>
          <div className="pulse">
            <div className="p">
              <div className="stat-num done">69%</div>
              <div className="label">迭代完成</div>
            </div>
            <div className="p">
              <div className="stat-num block">2</div>
              <div className="label">阻塞</div>
            </div>
            <div className="p">
              <div className="stat-num review">3</div>
              <div className="label">待 Review</div>
            </div>
            <div className="p">
              <div className="stat-num">6</div>
              <div className="label">今日在办</div>
            </div>
          </div>
        </section>

        <div className="quick">
          <button>
            <b>更新我的状态</b>
            <span>同步今日计划</span>
          </button>
          <button>
            <b>查看阻塞</b>
            <span>2 项需要协助</span>
          </button>
          <button>
            <b>待我 Review</b>
            <span>3 个工单</span>
          </button>
          <button>
            <b>打开文档</b>
            <span>最近 4 次更新</span>
          </button>
        </div>

        <div className="grid">
          <div>
            <section className="section">
              <div className="section-h">
                <h3>团队当前在做什么</h3>
                <span className="label">来自 Issue 状态 + 今日同步</span>
              </div>
              <PersonRow avatarClass="av-gao" name="高远" role="后端 · 召回" title="SRCH-198 向量召回 beta 开关接入" badge="阻塞" badgeClass="b-block" note="GPU 资源待批" progress={55} points={8} />
              <PersonRow avatarClass="av-su" name="苏晴" role="后端 · 语义" title="SRCH-209 空格 query 修复并补单测" badge="进行中" badgeClass="b-doing" note="今天提交 PR" progress={70} points={3} />
              <PersonRow avatarClass="av-chen" name="陈牧" role="前端 · 结果页" title="SRCH-212 结果卡片摘要高亮" badge="待确认" badgeClass="b-block" note="等设计终版" progress={40} points={5} />
              <PersonRow avatarClass="av-zhou" name="周屿" role="前端 · 移动端" title="SRCH-186 搜索历史与收藏打通" badge="待 Review" badgeClass="b-review" note="高远评审" progress={90} points={5} />
            </section>

            <section className="section" aria-label="待处理 Issue">
              <div className="section-h">
                <h3>待处理 Issue</h3>
                <span className="label">优先看阻塞 / Review / 高优缺陷</span>
              </div>
              <div className="todo-list">
                <Todo issueKey="SRCH-198" title="GPU 资源未批,影响压测" meta="负责人 高远 · 协助 何川 · 今天 15:00 前确认" marker={<span className="badge b-block"><span className="dot" />阻塞</span>} />
                <Todo issueKey="SRCH-186" title="搜索历史与收藏打通待评审" meta="评审人 高远 · PR 已更新" marker={<span className="badge b-review"><span className="dot" />Review</span>} />
                <Todo issueKey="SRCH-209" title="空格 query 命中率骤降" meta="高优缺陷 · 修复后需要韩雪回归" marker={<span className="pri p1">高</span>} />
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
                  <b>搜索平台 · 今日状态</b>
                  <p>完成 47/68 pt; 阻塞 2; 待 Review 3。高远卡在 GPU 资源,陈牧等待设计终版。</p>
                  <span className="cmd">/team</span>
                  <span className="cmd">/blockers</span>
                  <span className="cmd">/docs 搜索方案</span>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="section-h">
                <h3>最近文档</h3>
                <span className="label">统一文档入口</span>
              </div>
              <DocRow mark="方" title="结果卡片重设计方案" meta="江月评论了高亮样式 · 12 分钟前" />
              <DocRow mark="接" title="搜索接口字段约定" meta="苏晴更新了空 query 规则 · 1 小时前" />
              <DocRow mark="发" title="灰度发布检查清单" meta="何川补充回滚步骤 · 昨天" />
            </section>

            <section className="section feed">
              <div className="section-h">
                <h3>代码动态</h3>
                <span className="label">Git 同步</span>
              </div>
              <FeedItem title="PR #42 · SRCH-186" body="周屿更新收藏逻辑,等待高远 Review。" />
              <FeedItem title="CI 失败 · SRCH-209" body="语义解析单测失败,苏晴正在修复。" />
              <FeedItem title="Commit · SRCH-177" body="高远合入缓存防抖配置。" />
            </section>
          </aside>
        </div>
      </main>
    </>
  )
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
