import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedData } from '../domain/fixtures'
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
})
