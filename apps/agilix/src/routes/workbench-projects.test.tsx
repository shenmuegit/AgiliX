import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedData } from '../domain/fixtures'
import { ProjectsPage } from './ProjectsPage'
import { TeamPage } from './TeamPage'

describe('workbench and project overview routes', () => {
  it('shows team attention, completion, pending issues, recent docs, and Feishu visibility', () => {
    render(<TeamPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '团队工作台' })).toBeInTheDocument()
    expect(screen.getByText('今天要盯住 3 件事')).toBeInTheDocument()
    expect(screen.getByText('迭代完成 21%')).toBeInTheDocument()
    expect(screen.getByText('SRCH-198')).toBeInTheDocument()
    expect(screen.getByText('结果卡片重设计方案')).toBeInTheDocument()
    expect(screen.getByText('飞书只做通知和查询')).toBeInTheDocument()
  })

  it('shows projects as a portfolio view without creating project workspaces', () => {
    render(<ProjectsPage data={seedData} />)

    expect(screen.getByRole('heading', { name: '项目总览' })).toBeInTheDocument()
    expect(screen.getByText('搜索平台')).toBeInTheDocument()
    expect(screen.getByText('移动端 App')).toBeInTheDocument()
    expect(screen.getByText('共 8 名成员协作')).toBeInTheDocument()
    expect(screen.queryByText('审批流')).not.toBeInTheDocument()
  })
})
