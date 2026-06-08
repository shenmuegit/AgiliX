import { cleanup, render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('combobox', { name: '项目' })).toHaveValue('search')
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
    expect(screen.queryByText('DATA-42')).not.toBeInTheDocument()
  })

  it('moves a board card through the mutation callback', async () => {
    const onMoveIssue = vi.fn()

    render(<BoardPage data={seedData} projectId="search" onMoveIssue={onMoveIssue} />)

    expect(screen.getByRole('heading', { name: '看板' })).toBeInTheDocument()
    expect(screen.getAllByText('评审').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('测试')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'SRCH-186 完成' }))
    expect(onMoveIssue).toHaveBeenCalledWith('SRCH-186', 'done')
  })
})
