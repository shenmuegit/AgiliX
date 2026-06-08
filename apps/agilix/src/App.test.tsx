import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { seedData } from './domain/fixtures'
import { createInMemoryClient } from './test/createInMemoryClient'

describe('AgiliX app shell', () => {
  it('starts at the team workbench and exposes every full product module', async () => {
    render(<App client={createInMemoryClient()} />)

    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '团队工作台' })).toBeInTheDocument()
    for (const label of ['团队工作台', '项目总览', '需求 & 缺陷', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '群机器人']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('飞书只做通知和查询')).toBeInTheDocument()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()
  })

  it('keeps the default API client stable after the bootstrap render', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(seedData), { status: 200, headers: { 'content-type': 'application/json' } }))

    try {
      render(<App />)

      expect(await screen.findByText('SRCH-198')).toBeInTheDocument()
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    } finally {
      fetcher.mockRestore()
    }
  })
})
