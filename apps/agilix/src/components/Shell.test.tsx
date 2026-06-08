import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Shell } from './Shell'

describe('Shell', () => {
  it('renders flat navigation and sends navigation changes upward', async () => {
    const onNavigate = vi.fn()

    render(
      <Shell active="文档" onNavigate={onNavigate}>
        <h1>文档</h1>
      </Shell>,
    )

    expect(screen.getByRole('link', { name: '文档' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('研发台账')).toBeInTheDocument()
    expect(screen.getByText('搜索平台 · S24')).toBeInTheDocument()
    expect(screen.getByText('需求 & 缺陷')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: '看板' }))
    expect(onNavigate).toHaveBeenCalledWith('看板')
  })
})
