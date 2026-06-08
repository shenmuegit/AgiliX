import type { ReactNode } from 'react'

export const navItems = ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书'] as const

export type NavItem = (typeof navItems)[number]

export function Shell({ active, children, onNavigate }: { active: NavItem; children: ReactNode; onNavigate: (item: NavItem) => void }) {
  return (
    <div className="agilix-shell">
      <aside>
        <strong>AgiliX</strong>
        <nav aria-label="主导航">
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item}`}
              aria-current={item === active ? 'page' : undefined}
              onClick={(event) => {
                event.preventDefault()
                onNavigate(item)
              }}
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>
      <section>{children}</section>
    </div>
  )
}
