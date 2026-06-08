import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { ProjectFilter } from './ProjectFilter'

describe('ProjectFilter', () => {
  it('keeps project choice inside feature pages without using a native select', async () => {
    const onChange = vi.fn()

    render(<ProjectFilter projects={seedData.projects} value="all" onChange={onChange} />)

    expect(screen.queryByRole('combobox', { name: '项目' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '项目筛选 全部项目' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '项目筛选 全部项目' }))
    await userEvent.click(screen.getByRole('button', { name: '选择项目 搜索平台' }))
    expect(onChange).toHaveBeenCalledWith('search')
  })
})
