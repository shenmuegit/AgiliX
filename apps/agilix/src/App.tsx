const navItems = ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书']

export function App() {
  return (
    <div>
      <nav aria-label="主导航">
        {navItems.map((item) => (
          <a key={item} href={`#${item}`}>
            {item}
          </a>
        ))}
      </nav>
      <main>
        <h1>团队工作台</h1>
        <p>AgiliX 主工作台</p>
      </main>
    </div>
  )
}
