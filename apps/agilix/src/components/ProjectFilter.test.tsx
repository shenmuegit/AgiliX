import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { ProjectFilter } from './ProjectFilter'

describe('ProjectFilter', () => {
  it('keeps project choice inside feature pages', async () => {
    const onChange = vi.fn()

    render(<ProjectFilter projects={seedData.projects} value="all" onChange={onChange} />)

    expect(screen.getByRole('combobox', { name: '项目' })).toHaveValue('all')
    expect(screen.getByRole('option', { name: '全部' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '搜索平台' })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: '项目' }), 'search')
    expect(onChange).toHaveBeenCalledWith('search')
  })
})
