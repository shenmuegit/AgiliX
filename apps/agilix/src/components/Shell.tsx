import type { ReactNode } from 'react'

export const navItems = ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书'] as const

export type NavItem = (typeof navItems)[number]

const navSections: Array<{
  title: string
  items: Array<{ key: NavItem; label: string; count?: string; icon: string }>
}> = [
  {
    title: '',
    items: [
      { key: '团队工作台', label: '团队工作台', icon: '<path d="M4 17l4-4 4 3 8-9"/><path d="M4 20h16"/><circle cx="8" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/><circle cx="20" cy="7" r="1.5" fill="currentColor" stroke="none"/>' },
      { key: '项目总览', label: '项目总览', count: '4', icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' },
      { key: '文档', label: '文档', count: '28', icon: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M9 11h6M9 15h6M9 19h4"/>' },
    ],
  },
  {
    title: '搜索平台 · S24',
    items: [
      { key: '看板', label: '看板', count: '32', icon: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>' },
      { key: 'Issues', label: '需求 & 缺陷', count: '58', icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
      { key: '迭代统计', label: '迭代统计', icon: '<path d="M4 19V5M4 19h16M8 16V9M13 16V6M18 16v-4"/>' },
      { key: '每日站会', label: '每日站会', icon: '<circle cx="12" cy="8" r="3"/><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5"/>' },
    ],
  },
  {
    title: '团队',
    items: [
      { key: '成员负载', label: '成员负载', icon: '<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="7" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="14" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="10" cy="18" r="1.4" fill="currentColor" stroke="none"/>' },
      { key: '排期甘特', label: '排期甘特', icon: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>' },
    ],
  },
  {
    title: '飞书',
    items: [{ key: '飞书', label: '群机器人', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' }],
  },
]

function NavIcon({ path }: { path: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" dangerouslySetInnerHTML={{ __html: path }} />
}

export function Shell({ active, children, onNavigate }: { active: NavItem; children: ReactNode; onNavigate: (item: NavItem) => void }) {
  return (
    <div className="app">
      <aside className="side">
        <div className="side-head">
          <div className="brandmark">汇</div>
          <div className="brand-tt">
            <b>研发台账</b>
            <span>4 个项目 · 8 人</span>
          </div>
        </div>
        <div className="proj-switch" title="切换项目">
          <div className="proj-glyph">搜</div>
          <div className="proj-tt">
            <span className="label">当前项目</span>
            <b>搜索平台</b>
          </div>
          <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M8 9l4 4 4-4M8 15l4-4 4 4" opacity=".55" />
          </svg>
        </div>
        <nav className="side-scroll" aria-label="主导航">
          {navSections.map((section) => (
            <div className="side-sec" key={section.title || 'primary'}>
              {section.title ? <div className="side-sec-t">{section.title}</div> : null}
              {section.items.map((item) => (
                <a
                  key={item.key}
                  className={`nav-i ${item.key === active ? 'on' : ''}`}
                  href={`#${item.key}`}
                  aria-label={item.key}
                  aria-current={item.key === active ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault()
                    onNavigate(item.key)
                  }}
                >
                  <NavIcon path={item.icon} />
                  <span>{item.label}</span>
                  {item.count ? <span className="nav-count">{item.count}</span> : null}
                </a>
              ))}
              {section.title === '飞书' ? (
                <div className="nav-i" aria-hidden="true">
                  <NavIcon path={'<path d="M4 6h16M4 12h10M4 18h7"/><path d="M16 16l2 2 3-4"/>'} />
                  <span>查询命令</span>
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="side-team">
          <div className="side-team-h">
            <div className="side-sec-t">在线 · 6</div>
          </div>
          <div className="facepile">
            <div className="av av-lin">林</div>
            <div className="av av-chen">陈</div>
            <div className="av av-gao">高</div>
            <div className="av av-su">苏</div>
            <div className="av av-han">韩</div>
            <div className="more">+3</div>
          </div>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  )
}
