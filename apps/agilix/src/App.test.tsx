import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { seedData } from './domain/fixtures'
import { createInMemoryClient } from './test/createInMemoryClient'

afterEach(() => cleanup())

describe('AgiliX app shell', () => {
  it('starts at the team workbench and exposes every full product module', async () => {
    render(<App client={createInMemoryClient()} />)

    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '团队工作台' })).toBeInTheDocument()
    for (const label of [
      '项目总览',
      '需求 & 缺陷',
      '看板',
      '迭代统计',
      '文档',
      '成员负载',
      '每日站会',
      '排期甘特',
      '群机器人',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('飞书只做通知和查询')).toBeInTheDocument()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()
  })

  it('routes team workbench action buttons to their target modules', async () => {
    render(<App client={createInMemoryClient()} />)

    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /查看阻塞/ }))
    expect(screen.getByRole('heading', { name: '需求 & 缺陷' })).toBeInTheDocument()

    cleanup()
    render(<App client={createInMemoryClient()} />)
    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /打开文档/ }))
    expect(screen.getByRole('heading', { name: '文档' })).toBeInTheDocument()

    cleanup()
    render(<App client={createInMemoryClient()} />)
    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /更新我的状态/ }))
    expect(screen.getByRole('heading', { name: '每日站会' })).toBeInTheDocument()
  })

  it('opens documents in the all-project knowledge base by default', async () => {
    render(<App client={createInMemoryClient()} />)

    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: '文档' }))

    expect(screen.getByRole('heading', { name: '文档' })).toBeInTheDocument()
    expect(screen.getByText('项目:全部')).toBeInTheDocument()
    expect(screen.getByText('类型:方案 + 接口')).toBeInTheDocument()
  })

  it('uses prototype screen URLs as direct entry routes', async () => {
    window.history.pushState({}, '', '/screen-docs.html')

    render(<App client={createInMemoryClient()} />)

    expect(await screen.findByRole('heading', { name: '文档' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '团队工作台' })).not.toBeInTheDocument()
  })

  it('keeps the default API client stable after the bootstrap render', async () => {
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(seedData), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    try {
      render(<App />)

      expect((await screen.findAllByText('SRCH-198')).length).toBeGreaterThan(0)
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    } finally {
      fetcher.mockRestore()
    }
  })
})
