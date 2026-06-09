import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Shell } from '../components/Shell'
import { seedData } from '../domain/fixtures'
import { BoardPage } from './BoardPage'
import { DocsPage } from './DocsPage'
import { FeishuPage } from './FeishuPage'
import { GanttPage } from './GanttPage'
import { IssuesPage } from './IssuesPage'
import { ProjectsPage } from './ProjectsPage'
import { StandupPage } from './StandupPage'
import { StatsPage } from './StatsPage'
import { TeamPage } from './TeamPage'
import { WorkloadPage } from './WorkloadPage'

afterEach(() => cleanup())

describe('prototype parity for core screens', () => {
  it('renders the editorial ledger shell around the team workbench', () => {
    const { container } = render(
      <Shell active="团队工作台" onNavigate={vi.fn()} data={seedData} projectId="search">
        <TeamPage data={seedData} />
      </Shell>,
    )

    expect(container.querySelector('.app')).toBeInTheDocument()
    expect(container.querySelector('.side')).toBeInTheDocument()
    expect(container.querySelector('.top')).toBeInTheDocument()
    expect(screen.getByText('研发台账')).toBeInTheDocument()
    expect(screen.getByText('4 个项目 · 8 人')).toBeInTheDocument()
    expect(screen.getByText('当前项目')).toBeInTheDocument()
    expect(screen.getAllByText('搜索平台').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('link', { name: /团队工作台/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /项目总览/ })).toBeInTheDocument()
    expect(screen.getByText('AgiliX 主工作台')).toBeInTheDocument()
    expect(screen.getByText('单群通知 · AgiliX 团队群')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /新建 Issue/ })).toBeInTheDocument()
  })

  it('matches the team workbench prototype sections and density', () => {
    const { container } = render(<TeamPage data={seedData} />)

    expect(container.querySelector('.desk')).toBeInTheDocument()
    expect(container.querySelector('.hero')).toBeInTheDocument()
    expect(container.querySelector('.pulse')).toBeInTheDocument()
    expect(container.querySelectorAll('.quick button')).toHaveLength(4)
    expect(screen.getByRole('heading', { name: '今天要盯住 2 件事' })).toBeInTheDocument()
    expect(screen.getByText(/搜索平台进入第 7 天/)).toBeInTheDocument()
    expect(screen.getByText('迭代完成')).toBeInTheDocument()
    expect(screen.getByText('团队当前在做什么')).toBeInTheDocument()
    expect(screen.getAllByText('待处理 Issue')[0]).toBeInTheDocument()
    expect(screen.getByText('飞书群会看到什么')).toBeInTheDocument()
    expect(screen.getByText('代码动态')).toBeInTheDocument()
    expect(container.querySelectorAll('.person-row')).toHaveLength(4)
    expect(container.querySelectorAll('.todo')).toHaveLength(4)
    expect(screen.getByText('SRCH-198 向量召回 beta 开关接入')).toBeInTheDocument()
    expect(screen.getByText('/docs 结果卡片')).toBeInTheDocument()
  })

  it('matches the document management prototype layout', () => {
    const { container } = render(
      <Shell active="文档" onNavigate={vi.fn()}>
        <DocsPage data={seedData} projectId="all" onAddComment={vi.fn()} onCreateDoc={vi.fn()} />
      </Shell>,
    )

    expect(container.querySelector('.toolbar')).toBeInTheDocument()
    expect(container.querySelector('.docs-body')).toBeInTheDocument()
    expect(container.querySelector('.doc-tree')).toBeInTheDocument()
    expect(container.querySelector('.doc-list')).toBeInTheDocument()
    expect(container.querySelector('.doc-detail')).toBeInTheDocument()
    expect(screen.getByText('统一目录、评论与关联 Issue')).toBeInTheDocument()
    for (const label of ['全部', '最近更新', '待我评论', '项目文档', '全局文档']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('项目:全部')).toBeInTheDocument()
    expect(screen.getByText('类型:方案 + 接口')).toBeInTheDocument()
    expect(screen.getByText('评论:未解决 2')).toBeInTheDocument()
    expect(screen.getAllByText('目录').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByPlaceholderText('搜索标题、正文、评论')).toBeInTheDocument()
    expect(screen.getByText('全部文档')).toBeInTheDocument()
    expect(screen.getAllByText('最近更新').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelectorAll('.doc-row-lg')).toHaveLength(3)
    expect(screen.getByText('Selected Document')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '结果卡片重设计方案' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: '详情 · 结果卡片重设计方案' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('飞书查询示例')).toBeInTheDocument()
  })

  it('matches the project overview prototype layout', () => {
    const { container } = render(<ProjectsPage data={seedData} />)

    expect(container.querySelector('.pv-body')).toBeInTheDocument()
    expect(container.querySelector('.summary')).toBeInTheDocument()
    expect(container.querySelectorAll('.pcard')).toHaveLength(4)
    expect(screen.getByText('研发组合 · 4 个进行中项目')).toBeInTheDocument()
    expect(screen.getByText('每周一推送组合周报')).toBeInTheDocument()
    expect(screen.getByText('本周完成点数')).toBeInTheDocument()
    expect(screen.getByText(/鉴权重构/)).toBeInTheDocument()
    expect(screen.getByText(/搜索体验重构/)).toBeInTheDocument()
    expect(screen.getAllByText('近五迭代速度')).toHaveLength(4)
  })

  it('matches the issue ledger prototype layout', () => {
    const { container } = render(
      <IssuesPage data={seedData} projectId="search" onProjectChange={vi.fn()} />,
    )

    expect(container.querySelector('.lg-body')).toBeInTheDocument()
    expect(container.querySelector('.lg-table')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '需求 & 缺陷' })).toBeInTheDocument()
    expect(screen.getByText('搜索体验重构 · 工作项台账')).toBeInTheDocument()
    expect(screen.getByText(/16 项/)).toBeInTheDocument()
    expect(screen.getByText('搜索平台 · 搜索体验重构')).toBeInTheDocument()
    expect(screen.getByText('检索日志接入留存分析')).toBeInTheDocument()
    expect(screen.getByText('新建工单')).toBeInTheDocument()
  })

  it('matches the kanban board prototype layout', () => {
    const { container } = render(
      <BoardPage data={seedData} projectId="search" onMoveIssue={vi.fn()} />,
    )

    expect(container.querySelector('.sprint-chip')).toBeInTheDocument()
    expect(container.querySelector('.toolbar')).toBeInTheDocument()
    expect(container.querySelector('.board')).toBeInTheDocument()
    expect(container.querySelectorAll('.col')).toHaveLength(5)
    expect(container.querySelectorAll('.card')).toHaveLength(16)
    expect(screen.getByText('搜索体验重构')).toBeInTheDocument()
    expect(screen.getByText('06/02-06/13 · 第 7 天')).toBeInTheDocument()
    expect(screen.getByText('机器人已同步')).toBeInTheDocument()
    expect(screen.getByText('表格')).toBeInTheDocument()
    expect(screen.getByText('时间线')).toBeInTheDocument()
    expect(screen.getByText('向量召回 beta 开关接入')).toBeInTheDocument()
    expect(screen.getByText('检索日志接入留存分析')).toBeInTheDocument()
  })

  it('matches the iteration statistics prototype layout', () => {
    const { container } = render(
      <StatsPage data={seedData} projectId="search" iterationCode="S24" />,
    )

    expect(container.querySelector('.st-body')).toBeInTheDocument()
    expect(container.querySelector('.metric-strip')).toBeInTheDocument()
    expect(container.querySelector('.grid2')).toBeInTheDocument()
    expect(screen.getByText('每日 18:00 推送至群')).toBeInTheDocument()
    expect(screen.getAllByText('故事点燃尽').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('已完成 / 计划')).toBeInTheDocument()
    expect(screen.getByText('工作项分布')).toBeInTheDocument()
    expect(screen.getByText('准时')).toBeInTheDocument()
  })

  it('matches the workload prototype layout', () => {
    const { container } = render(<WorkloadPage data={seedData} />)

    expect(container.querySelector('.wl-body')).toBeInTheDocument()
    expect(container.querySelector('.summary')).toBeInTheDocument()
    expect(container.querySelector('.wl-table')).toBeInTheDocument()
    expect(screen.getByText('Sprint 24 · 搜索体验重构')).toBeInTheDocument()
    expect(screen.getByText('团队总容量')).toBeInTheDocument()
    expect(screen.getByText('后端 · 检索召回')).toBeInTheDocument()
    expect(container.querySelectorAll('.who-cell')).toHaveLength(8)
  })

  it('matches the daily standup prototype layout', () => {
    const { container } = render(
      <StandupPage data={seedData} projectId="search" onSaveStandup={vi.fn()} />,
    )

    expect(container.querySelector('.su-body')).toBeInTheDocument()
    expect(container.querySelector('.su-head')).toBeInTheDocument()
    expect(container.querySelectorAll('.su-row')).toHaveLength(3)
    expect(screen.getByText('06 / 06')).toBeInTheDocument()
    expect(screen.getByText('星期五 · 站会 10:00-10:15')).toBeInTheDocument()
    expect(screen.getByText('关联飞书日历 · 每日 10:00')).toBeInTheDocument()
    expect(screen.getByText('推送纪要到群')).toBeInTheDocument()
    expect(screen.getAllByText('昨日完成').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('今日计划')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
  })

  it('matches the gantt prototype layout', () => {
    const { container } = render(
      <GanttPage data={seedData} projectId="search" onSaveMilestone={vi.fn()} />,
    )

    expect(container.querySelector('.gt-body')).toBeInTheDocument()
    expect(container.querySelector('.gt')).toBeInTheDocument()
    expect(container.querySelector('.gt-head')).toBeInTheDocument()
    expect(container.querySelectorAll('.gt-row').length).toBeGreaterThanOrEqual(7)
    expect(screen.getByText('6 月 · Sprint 24 → 25')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '周' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '双周' })).toHaveClass('on')
    expect(screen.getByRole('button', { name: '月' })).toBeInTheDocument()
    expect(screen.getByText('W23')).toBeInTheDocument()
    expect(screen.getByText('06/02-06/06 · S24')).toBeInTheDocument()
    expect(screen.getByText('W24')).toBeInTheDocument()
    expect(screen.getByText('06/09-06/13 · S24')).toBeInTheDocument()
    expect(screen.getByText('W25')).toBeInTheDocument()
    expect(screen.getByText('06/16-06/20 · S25')).toBeInTheDocument()
    expect(screen.getByText('同步飞书日历')).toBeInTheDocument()
    expect(screen.getByText('工作项 / 里程碑')).toBeInTheDocument()
    expect(screen.getByText('迭代 · 搜索体验重构')).toBeInTheDocument()
    expect(screen.getByText('Beta 开关接入')).toBeInTheDocument()
  })

  it('matches the Feishu single-group notification and query surface', () => {
    const { container } = render(
      <FeishuPage data={seedData} onNotify={vi.fn()} onQuery={vi.fn()} />,
    )

    expect(container.querySelector('.fs-body')).toBeInTheDocument()
    expect(container.querySelector('.fs-command-grid')).toBeInTheDocument()
    expect(screen.getByText('单群通知 · AgiliX 团队群')).toBeInTheDocument()
    expect(screen.getByText('群里只做通知和查询')).toBeInTheDocument()
    expect(screen.getByText('通知记录')).toBeInTheDocument()
    expect(screen.getAllByText('查询命令').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('/team')).toBeInTheDocument()
    expect(screen.getByText('/blockers')).toBeInTheDocument()
    expect(screen.getByText('/docs 结果卡片')).toBeInTheDocument()
  })
})
