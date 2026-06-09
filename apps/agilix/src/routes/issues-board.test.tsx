import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { BoardPage } from './BoardPage'
import { IssuesPage } from './IssuesPage'

afterEach(() => cleanup())

describe('issues ledger and board routes', () => {
  it('shows the work item ledger with project filtering', () => {
    render(<IssuesPage data={seedData} projectId="search" onProjectChange={() => undefined} />)

    expect(screen.getByRole('heading', { name: '需求 & 缺陷' })).toBeInTheDocument()
    expect(screen.getByText('搜索体验重构 · 工作项台账')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '项目筛选 搜索平台' })).toBeInTheDocument()
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
    expect(screen.queryByText('DATA-42')).not.toBeInTheDocument()
  })

  it('filters issues by type from the segmented controls', async () => {
    render(<IssuesPage data={seedData} projectId="search" onProjectChange={() => undefined} />)

    await userEvent.click(screen.getByRole('button', { name: '缺陷' }))
    expect(screen.getByText('SRCH-209')).toBeInTheDocument()
    expect(screen.queryByText('SRCH-198')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '技术债' }))
    expect(screen.getByText('SRCH-201')).toBeInTheDocument()
    expect(screen.queryByText('SRCH-209')).not.toBeInTheDocument()
  })

  it('moves a board card through the mutation callback', async () => {
    const onMoveIssue = vi.fn()

    render(<BoardPage data={seedData} projectId="search" onMoveIssue={onMoveIssue} />)

    expect(screen.getByRole('heading', { name: '看板' })).toBeInTheDocument()
    expect(screen.queryByText('经办人')).not.toBeInTheDocument()
    expect(screen.queryByText('分组:状态')).not.toBeInTheDocument()
    expect(screen.queryByText('筛选')).not.toBeInTheDocument()
    expect(screen.getAllByText('评审').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('阻塞').length).toBeGreaterThanOrEqual(1)

    await userEvent.click(screen.getByRole('button', { name: 'SRCH-186 完成' }))
    expect(onMoveIssue).toHaveBeenCalledWith('SRCH-186', 'done')
  })

  it('filters board issues by status from real filter controls', async () => {
    render(<BoardPage data={seedData} projectId="search" onMoveIssue={vi.fn()} />)

    await userEvent.click(
      within(screen.getByRole('group', { name: '状态筛选' })).getByRole('button', {
        name: '阻塞',
      }),
    )

    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
    expect(screen.queryByText('SRCH-186')).not.toBeInTheDocument()
    expect(screen.queryByText('SRCH-209')).not.toBeInTheDocument()
    expect(screen.getByText('共 1 个工单 · 故事点 0/8')).toBeInTheDocument()
  })

  it('shows a complete board table without assignee columns', async () => {
    render(<BoardPage data={seedData} projectId="search" onMoveIssue={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '表格' }))
    expect(screen.getByRole('table', { name: '看板表格视图' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: '经办人' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '类型' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '优先级' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '项目 / 迭代' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '阻塞说明' })).toBeInTheDocument()
    expect(screen.getByText('状态 · 阻塞 · 1 项 · 8pt')).toBeInTheDocument()
    expect(screen.getByText('等待检索资源配额确认')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
  })

  it('shows a status timeline with counts, points, and blocker context', async () => {
    render(<BoardPage data={seedData} projectId="search" onMoveIssue={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '时间线' }))
    expect(screen.getByRole('list', { name: '看板状态时间线' })).toBeInTheDocument()
    expect(screen.getByText('阻塞 · 1 项 · 8pt')).toBeInTheDocument()
    expect(screen.getByText('评审 · 2 项 · 8pt')).toBeInTheDocument()
    expect(screen.getByText('已完成 · 4 项 · 47pt')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198 · 向量召回 beta 开关接入')).toBeInTheDocument()
    expect(screen.getByText('等待检索资源配额确认')).toBeInTheDocument()
    expect(screen.queryByText('高远')).not.toBeInTheDocument()
  })
})
