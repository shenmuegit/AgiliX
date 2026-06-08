import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { DocsPage } from './DocsPage'

describe('DocsPage', () => {
  it('shows global docs, project docs, directory, search, comments, linked issues, and document actions', async () => {
    const onAddComment = vi.fn()
    const onCreateDoc = vi.fn()

    render(<DocsPage data={seedData} projectId="all" onAddComment={onAddComment} onCreateDoc={onCreateDoc} />)

    expect(screen.getByRole('heading', { name: '文档' })).toBeInTheDocument()
    expect(screen.getAllByText('全局文档').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('项目文档').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('统一目录、评论与关联 Issue')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('搜索标题、正文、评论')).toBeInTheDocument()
    expect(screen.getAllByText('结果卡片重设计方案').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('灰度发布检查清单')).toBeInTheDocument()
    expect(screen.getByText('SRCH-186')).toBeInTheDocument()
    expect(screen.getByText('Selected Document')).toBeInTheDocument()
    expect(screen.getByText('飞书查询示例')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: '搜索文档' }), '结果卡片')
    expect(screen.getAllByText('结果卡片重设计方案').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('灰度发布检查清单')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '新增评论' }))
    expect(onAddComment).toHaveBeenCalledWith('doc-result-card', expect.objectContaining({ body: '从 AgiliX 文档页补充的评论' }))

    await userEvent.click(screen.getByRole('button', { name: '新建文档' }))
    expect(onCreateDoc).toHaveBeenCalledWith(expect.objectContaining({ scope: 'global', title: '新建全局文档' }))
  })
})
