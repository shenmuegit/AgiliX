import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { GanttPage } from './GanttPage'
import { StandupPage } from './StandupPage'
import { StatsPage } from './StatsPage'
import { WorkloadPage } from './WorkloadPage'

describe('planning statistics and workload routes', () => {
  it('renders iteration statistics from shared data', () => {
    render(<StatsPage data={seedData} projectId="search" iterationCode="S24" />)

    expect(screen.getByRole('heading', { name: '迭代统计' })).toBeInTheDocument()
    expect(screen.getByText('搜索体验重构')).toBeInTheDocument()
    expect(screen.getByText('完成 21%')).toBeInTheDocument()
    expect(screen.getByText('近五迭代速度')).toBeInTheDocument()
  })

  it('renders member workload and current assignments', () => {
    render(<WorkloadPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '成员负载' })).toBeInTheDocument()
    expect(screen.getByText('整体负载')).toBeInTheDocument()
    expect(screen.getByText('高远')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
  })

  it('renders daily standup content and exposes a save callback', async () => {
    const onSaveStandup = vi.fn()
    render(<StandupPage data={seedData} projectId="search" onSaveStandup={onSaveStandup} />)

    expect(screen.getByRole('heading', { name: '每日站会' })).toBeInTheDocument()
    expect(screen.getByText('关联飞书日历 · 每日 10:00')).toBeInTheDocument()
    expect(screen.getByText('昨日')).toBeInTheDocument()
    expect(screen.getByText('今日')).toBeInTheDocument()
    expect(screen.getByText('阻塞')).toBeInTheDocument()

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
