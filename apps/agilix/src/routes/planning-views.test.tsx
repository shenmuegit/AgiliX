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
    render(<StatsPage data={seedData} projectId="search" iterationCode="S24" />)

    expect(screen.getByRole('heading', { name: '迭代统计' })).toBeInTheDocument()
    expect(screen.getByText(/搜索体验重构/)).toBeInTheDocument()
    expect(screen.getByText('已完成 / 计划')).toBeInTheDocument()
    expect(screen.getByText('故事点燃尽')).toBeInTheDocument()
    expect(screen.getByText('近五迭代速度')).toBeInTheDocument()
  })

  it('renders member workload and current assignments', () => {
    render(<WorkloadPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '成员负载' })).toBeInTheDocument()
    expect(screen.getByText('全部项目 · 当前迭代')).toBeInTheDocument()
    expect(screen.getByText('高远')).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
  })

  it('renders daily standup content and exposes a save callback', async () => {
    const onSaveStandup = vi.fn()
    render(<StandupPage data={seedData} projectId="search" onSaveStandup={onSaveStandup} />)

    expect(screen.getByRole('heading', { name: '每日站会' })).toBeInTheDocument()
    expect(screen.getByText('AgiliX 团队群 · 10:00-10:15')).toBeInTheDocument()
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
