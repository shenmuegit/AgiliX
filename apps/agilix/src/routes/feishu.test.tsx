import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { FeishuPage } from './FeishuPage'

afterEach(() => cleanup())

describe('FeishuPage', () => {
  it('supports one-group notifications and query-only commands', async () => {
    const onNotify = vi.fn(async () => undefined)
    const onQuery = vi.fn(async () => ({ title: '团队状态', lines: ['Issue 7', '文档 3'] }))

    render(<FeishuPage data={seedData} onNotify={onNotify} onQuery={onQuery} />)

    expect(screen.getByRole('heading', { name: '飞书通知与查询' })).toBeInTheDocument()
    expect(screen.getAllByText('AgiliX 团队群').length).toBeGreaterThan(0)
    expect(screen.getByText('站会摘要')).toBeInTheDocument()
    expect(screen.getByText('/team')).toBeInTheDocument()
    expect(screen.getByText('/blockers')).toBeInTheDocument()
    expect(screen.getByText('/docs 结果卡片')).toBeInTheDocument()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '记录 站会摘要' }))
    expect(onNotify).toHaveBeenCalledWith('站会摘要')

    await userEvent.click(screen.getByRole('button', { name: '查询 /team' }))
    expect(onQuery).toHaveBeenCalledWith({ type: 'team' })
    expect(await screen.findByText('团队状态')).toBeInTheDocument()
  })

  it('gives explicit feedback for top-level Feishu controls', async () => {
    render(<FeishuPage data={seedData} onNotify={vi.fn(async () => undefined)} onQuery={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '同步群配置' }))
    expect(screen.getByRole('heading', { name: '群配置已同步' })).toBeInTheDocument()
    expect(screen.getAllByText('AgiliX 团队群').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: '打开机器人控制台' }))
    expect(screen.getByRole('heading', { name: '机器人控制台未配置' })).toBeInTheDocument()
  })
})
