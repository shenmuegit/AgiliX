import { useState } from 'react'
import { Shell, type NavItem } from './components/Shell'

const pageTitles: Record<NavItem, string> = {
  团队工作台: '团队工作台',
  项目总览: '项目总览',
  Issues: 'Issues',
  看板: '看板',
  迭代统计: '迭代统计',
  文档: '文档',
  成员负载: '成员负载',
  每日站会: '每日站会',
  排期甘特: '排期甘特',
  飞书: '飞书',
}

export function App() {
  const [active, setActive] = useState<NavItem>('团队工作台')

  return (
    <Shell active={active} onNavigate={setActive}>
      <main>
        <h1>{pageTitles[active]}</h1>
        {active === '团队工作台' ? <p>AgiliX 主工作台</p> : null}
      </main>
    </Shell>
  )
}
