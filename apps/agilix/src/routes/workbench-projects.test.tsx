import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { ProjectsPage } from './ProjectsPage'
import { TeamPage } from './TeamPage'

afterEach(() => cleanup())

describe('workbench and project overview routes', () => {
  it('shows team attention, completion, pending issues, recent docs, and Feishu visibility', () => {
    render(<TeamPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '团队工作台' })).toBeInTheDocument()
    expect(screen.getByText('今天要盯住 2 件事')).toBeInTheDocument()
    expect(screen.getByText('69%')).toBeInTheDocument()
    expect(screen.getByText('迭代完成')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198 向量召回 beta 开关接入')).toBeInTheDocument()
    expect(screen.getByText('结果卡片重设计方案')).toBeInTheDocument()
    expect(screen.getByText('飞书群会看到什么')).toBeInTheDocument()
    expect(screen.getByText('单群通知 · AgiliX 团队群')).toBeInTheDocument()
  })

  it('shows projects as a portfolio view with project creation available', () => {
    render(<ProjectsPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '项目总览' })).toBeInTheDocument()
    expect(screen.getByText('搜索平台')).toBeInTheDocument()
    expect(screen.getByText('移动端 App')).toBeInTheDocument()
    expect(screen.getByText('共 8 名成员协作')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建项目' })).toBeEnabled()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()
  })

  it('matches the prototype project overview metrics', () => {
    const { container } = render(<ProjectsPage data={seedData} />)

    expect(screen.getByText('63')).toBeInTheDocument()
    expect(screen.getByText('开放平台 · 鉴权依赖')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText('/68')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('/33')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('/31')).toBeInTheDocument()
    expect(screen.getByText('27')).toBeInTheDocument()
    expect(screen.getByText('/30')).toBeInTheDocument()
    expect(screen.getByText('54')).toBeInTheDocument()
    expect(screen.queryByText('55')).not.toBeInTheDocument()

    const cards = Array.from(container.querySelectorAll('.pcard'))
    expect(cards).toHaveLength(4)
    for (const card of cards) {
      expect(card.querySelectorAll('.spark i')).toHaveLength(5)
    }
    expect(cards[0].querySelector('.av-lin')).toBeInTheDocument()
    expect(cards[0].querySelector('.av-chen')).toBeInTheDocument()
    expect(cards[0].querySelector('.av-gao')).toBeInTheDocument()
  })

  it('submits explicit project and initial iteration fields', async () => {
    const onCreateProject = vi.fn()

    render(<ProjectsPage data={seedData} onCreateProject={onCreateProject} />)

    await userEvent.click(screen.getByRole('button', { name: '新建项目' }))
    await userEvent.clear(screen.getByLabelText('项目 ID'))
    await userEvent.type(screen.getByLabelText('项目 ID'), 'growth')
    await userEvent.clear(screen.getByLabelText('项目名称'))
    await userEvent.type(screen.getByLabelText('项目名称'), '增长实验')
    await userEvent.clear(screen.getByLabelText('项目图标'))
    await userEvent.type(screen.getByLabelText('项目图标'), 'G')
    await userEvent.clear(screen.getByLabelText('项目颜色'))
    await userEvent.type(screen.getByLabelText('项目颜色'), '#2563eb')
    await userEvent.clear(screen.getByLabelText('迭代 ID'))
    await userEvent.type(screen.getByLabelText('迭代 ID'), 'growth-s01')
    await userEvent.clear(screen.getByLabelText('迭代代号'))
    await userEvent.type(screen.getByLabelText('迭代代号'), 'S01')
    await userEvent.clear(screen.getByLabelText('迭代名称'))
    await userEvent.type(screen.getByLabelText('迭代名称'), '启动迭代')
    await userEvent.clear(screen.getByLabelText('日期范围'))
    await userEvent.type(screen.getByLabelText('日期范围'), '06.10 - 06.21')
    await userEvent.clear(screen.getByLabelText('甘特标题'))
    await userEvent.type(screen.getByLabelText('甘特标题'), '增长实验 · S01')
    await userEvent.clear(screen.getByLabelText('迭代目标'))
    await userEvent.type(screen.getByLabelText('迭代目标'), '验证首批增长假设')

    await userEvent.click(screen.getByRole('button', { name: '创建项目' }))

    expect(onCreateProject).toHaveBeenCalledWith({
      project: {
        id: 'growth',
        name: '增长实验',
        glyph: 'G',
        color: '#2563eb',
        activeIterationCode: 'S01',
      },
      iteration: {
        id: 'growth-s01',
        projectId: 'growth',
        code: 'S01',
        name: '启动迭代',
        dateRangeLabel: '06.10 - 06.21',
        calendarTitle: '增长实验 · S01',
        calendarWeeks: [
          { label: 'W1', rangeLabel: '06.10 - 06.14', days: ['10', '11', '12', '13', '14'] },
          { label: 'W2', rangeLabel: '06.17 - 06.21', days: ['17', '18', '19', '20', '21'] },
        ],
        day: 1,
        totalDays: 10,
        goal: '验证首批增长假设',
        velocity: 0,
      },
    })
  }, 10000)
})
