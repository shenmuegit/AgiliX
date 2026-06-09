import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { GanttPage } from './GanttPage'
import { StandupPage } from './StandupPage'
import { StatsPage } from './StatsPage'
import { WorkloadPage } from './WorkloadPage'

afterEach(() => cleanup())

describe('planning statistics and workload routes', () => {
  it('renders iteration statistics from shared data', () => {
    const { container } = render(<StatsPage data={seedData} projectId="search" iterationCode="S24" />)

    expect(screen.getByRole('heading', { name: '迭代统计' })).toBeInTheDocument()
    expect(screen.getByText(/搜索体验重构/)).toBeInTheDocument()
    expect(screen.getByText('已完成 / 计划')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '故事点燃尽' })).toBeInTheDocument()
    expect(screen.getByText('近五迭代速度')).toBeInTheDocument()
    expect(
      Array.from(container.querySelectorAll('.burn-svg path')).map((path) => path.getAttribute('fill')),
    ).toEqual(['none', 'var(--accent)'])
    expect(container.querySelectorAll('.burn-svg line')).toHaveLength(5)
    expect(container.querySelectorAll('.burn-svg polyline')).toHaveLength(2)
    expect(container.querySelectorAll('.burn-svg circle')).toHaveLength(6)
  })

  it('matches the prototype statistics side charts', () => {
    const { container } = render(<StatsPage data={seedData} projectId="search" iterationCode="S24" />)

    expect(Array.from(container.querySelectorAll('.vbar .v')).map((item) => item.textContent)).toEqual(['42', '51', '38', '49', '47'])
    expect(Array.from(container.querySelectorAll('.vlbl')).map((item) => item.textContent)).toEqual(['S20', 'S21', 'S22', 'S23', 'S24'])
    expect(screen.getByText(/平均速度/).textContent).toContain('45.4')
    expect(screen.getByText(/平均速度/).textContent).toContain('68')
    expect(Array.from(container.querySelectorAll('.dist-row .badge')).map((item) => item.textContent)).toEqual(['已完成', '进行中', '评审/测试', '待办'])
    expect(Array.from(container.querySelectorAll('.dist-row .num')).map((item) => item.textContent)).toEqual(['14', '8', '6', '4'])
  })

  it('renders member workload and current assignments', () => {
    render(<WorkloadPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '成员负载' })).toBeInTheDocument()
    expect(screen.getByText('Sprint 24 · 搜索体验重构')).toBeInTheDocument()
    expect(screen.getByText('高远')).toBeInTheDocument()
    expect(screen.getByText('后端 · 检索召回')).toBeInTheDocument()
  })

  it('renders daily standup content and exposes a save callback', async () => {
    const onSaveStandup = vi.fn()
    render(<StandupPage data={seedData} projectId="search" onSaveStandup={onSaveStandup} />)

    expect(screen.getByRole('heading', { name: '每日站会' })).toBeInTheDocument()
    expect(screen.getByText('关联飞书日历 · 每日 10:00')).toBeInTheDocument()
    expect(screen.getByText('星期五 · 站会 10:00-10:15')).toBeInTheDocument()
    expect(screen.getAllByText('昨日完成').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('今日计划')).toBeInTheDocument()
    expect(screen.getByText('阻塞 / 求助')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '保存站会' }))
    expect(onSaveStandup).toHaveBeenCalledWith(seedData.standups[0])
  })

  it('renders schedule gantt milestones and exposes a save callback', async () => {
    const onSaveMilestone = vi.fn()
    render(<GanttPage data={seedData} projectId="search" onSaveMilestone={onSaveMilestone} />)

    expect(screen.getByRole('heading', { name: '排期甘特' })).toBeInTheDocument()
    expect(screen.getByText('里程碑')).toBeInTheDocument()
    expect(screen.getByText('Beta 开关接入')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '保存 Beta 开关接入' }))
    expect(onSaveMilestone).toHaveBeenCalledWith(seedData.milestones[1])
  })
})
