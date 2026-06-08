import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { createInMemoryClient } from './test/createInMemoryClient'

describe('AgiliX app shell', () => {
  it('starts at the team workbench and exposes every full product module', async () => {
    render(<App client={createInMemoryClient()} />)

    expect(await screen.findByText('SRCH-198')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '团队工作台' })).toBeInTheDocument()
    for (const label of ['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('飞书只做通知和查询')).toBeInTheDocument()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()
  })
})
