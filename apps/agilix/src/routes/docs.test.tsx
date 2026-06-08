import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedData } from '../domain/fixtures'
import { DocsPage } from './DocsPage'

afterEach(() => cleanup())

describe('DocsPage', () => {
  it('shows global docs, project docs, directory, search, comments, linked issues, and comment actions', async () => {
    const onAddComment = vi.fn()
    const onCreateDoc = vi.fn()

    render(
      <DocsPage
        data={seedData}
        projectId="all"
        onAddComment={onAddComment}
        onCreateDoc={onCreateDoc}
      />,
    )

    expect(screen.getByRole('heading', { name: '文档' })).toBeInTheDocument()
    expect(screen.getAllByText('全局文档').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('项目文档').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('统一目录、评论与关联 Issue')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('搜索标题、正文、评论')).toBeInTheDocument()
    expect(screen.getAllByText('结果卡片重设计方案').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('灰度发布检查清单').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('SRCH-186')).toBeInTheDocument()
    expect(screen.getByText('Selected Document')).toBeInTheDocument()
    expect(screen.getByText('飞书查询示例')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: '搜索文档' }), '结果卡片')
    expect(screen.getAllByText('结果卡片重设计方案').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('灰度发布检查清单')).not.toBeInTheDocument()
  })

  it('selects documents from the list and directory tree', async () => {
    render(
      <DocsPage data={seedData} projectId="all" onAddComment={vi.fn()} onCreateDoc={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '打开文档 灰度发布检查清单' }))
    expect(screen.getByRole('heading', { name: '灰度发布检查清单' })).toBeInTheDocument()
    expect(screen.getByText('发布前检查、回滚步骤、通知模板。')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '打开目录 规范' }))
    expect(screen.getByRole('heading', { name: 'Issue 标题与验收标准规范' })).toBeInTheDocument()
  })

  it('renders markdown, mermaid, diagrams, and mindmaps from document body', () => {
    render(
      <DocsPage
        data={{
          ...seedData,
          docs: [
            {
              ...seedData.docs[0],
              id: 'doc-rich-content',
              title: '富文档能力验证',
              body: [
                '# 一级标题',
                '',
                '正文段落支持 **重点** 和 `inline code`。',
                '',
                '- 第一条',
                '- 第二条',
                '',
                '```mermaid',
                'graph TD',
                'A[开始] --> B[完成]',
                '```',
                '',
                '```diagram',
                '入口 -> 服务 -> 数据库',
                '```',
                '',
                '```mindmap',
                'AgiliX',
                '  文档',
                '  看板',
                '```',
              ].join('\n'),
            },
          ],
        }}
        projectId="all"
        onAddComment={vi.fn()}
        onCreateDoc={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '一级标题' })).toBeInTheDocument()
    expect(screen.getByText('第一条')).toBeInTheDocument()
    expect(screen.getByLabelText('Mermaid 图表')).toHaveTextContent('开始')
    expect(screen.getByLabelText('Mermaid 图表')).toHaveTextContent('完成')
    expect(screen.getByLabelText('Diagram 图')).toHaveTextContent('入口')
    expect(screen.getByLabelText('Diagram 图')).toHaveTextContent('数据库')
    expect(screen.getByLabelText('脑图')).toHaveTextContent('AgiliX')
    expect(screen.getByLabelText('脑图')).toHaveTextContent('文档')
  })

  it('submits user-written comments for the selected document', async () => {
    const onAddComment = vi.fn()

    render(
      <DocsPage
        data={seedData}
        projectId="all"
        onAddComment={onAddComment}
        onCreateDoc={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByLabelText('新增评论内容'), '这里需要补充发布验收标准')
    await userEvent.click(screen.getByRole('button', { name: '提交评论' }))

    expect(onAddComment).toHaveBeenCalledWith(
      'doc-result-card',
      expect.objectContaining({
        docId: 'doc-result-card',
        body: '这里需要补充发布验收标准',
      }),
    )
  })

  it('creates a project document from a modal without asking for document id', async () => {
    const onCreateDoc = vi.fn()

    render(
      <DocsPage
        data={seedData}
        projectId="all"
        onAddComment={vi.fn()}
        onCreateDoc={onCreateDoc}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '新建文档' }))
    const dialog = screen.getByRole('dialog', { name: '新建文档' })
    expect(within(dialog).queryByLabelText('文档 ID')).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: '关联 Issue SRCH-186 搜索历史与收藏打通' })).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: '选择目录 方案' })).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: '配置目录与关联' }))
    await userEvent.click(within(dialog).getByRole('button', { name: '创建为项目文档' }))
    await userEvent.click(within(dialog).getByRole('button', { name: '选择项目 搜索平台' }))
    expect(within(dialog).getByRole('checkbox', { name: '关联 Issue SRCH-186 搜索历史与收藏打通' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: '关联 Issue DATA-42 指标卡片字段配置' })).not.toBeInTheDocument()

    await userEvent.type(within(dialog).getByLabelText('搜索关联 Issue'), '收藏')
    expect(within(dialog).getByRole('checkbox', { name: '关联 Issue SRCH-186 搜索历史与收藏打通' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox', { name: '关联 Issue SRCH-198 结果页空状态优化' })).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: '选择目录 方案' }))
    await userEvent.click(within(dialog).getByRole('checkbox', { name: '关联 Issue SRCH-186 搜索历史与收藏打通' }))
    await userEvent.click(within(dialog).getByRole('button', { name: '返回正文' }))
    await userEvent.type(within(dialog).getByLabelText('文档标题'), '搜索发布说明')
    await userEvent.click(within(dialog).getByRole('button', { name: '文档类型 Markdown' }))
    await userEvent.type(
      within(dialog).getByLabelText('文档内容'),
      [
        '# 发布说明',
        '',
        '- 验收标准',
        '',
        '```mermaid',
        'graph TD',
        'A-start --> B-done',
        '```',
      ].join('\n'),
    )

    expect(within(dialog).getByRole('heading', { name: '发布说明' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Mermaid 图表')).toHaveTextContent('A-start')
    expect(within(dialog).getByLabelText('Mermaid 图表')).toHaveTextContent('B-done')

    await userEvent.click(within(dialog).getByRole('button', { name: '创建文档' }))

    expect(onCreateDoc).toHaveBeenCalledWith({
      id: expect.stringMatching(/^doc-[a-z0-9]+$/),
      scope: 'project',
      projectId: 'search',
      title: '搜索发布说明',
      directory: '项目文档/搜索平台/方案',
      body: [
        '# 发布说明',
        '',
        '- 验收标准',
        '',
        '```mermaid',
        'graph TD',
        'A-start --> B-done',
        '```',
      ].join('\n'),
      linkedIssueKeys: ['SRCH-186'],
      comments: [],
      updatedAtLabel: '刚刚',
    })
  })

  it('creates a document in a newly created directory from the modal', async () => {
    const onCreateDoc = vi.fn()

    render(
      <DocsPage
        data={seedData}
        projectId="all"
        onAddComment={vi.fn()}
        onCreateDoc={onCreateDoc}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '新建文档' }))
    const dialog = screen.getByRole('dialog', { name: '新建文档' })

    await userEvent.click(within(dialog).getByRole('button', { name: '配置目录与关联' }))
    await userEvent.click(within(dialog).getByRole('button', { name: '新建同级目录' }))
    await userEvent.type(within(dialog).getByLabelText('新目录名称'), '增长实验')
    await userEvent.click(within(dialog).getByRole('button', { name: '保存目录' }))
    expect(within(dialog).getByRole('button', { name: '选择目录 增长实验' })).toHaveClass('on')
    await userEvent.click(within(dialog).getByRole('button', { name: '返回正文' }))
    await userEvent.type(within(dialog).getByLabelText('文档标题'), '增长实验说明')
    await userEvent.type(within(dialog).getByLabelText('文档内容'), '从表单创建的文档')
    await userEvent.click(within(dialog).getByRole('button', { name: '创建文档' }))

    expect(onCreateDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'global',
        title: '增长实验说明',
        directory: '全局文档/增长实验',
      }),
    )
  })

  it('manages multi-level directories on the secondary configuration page', async () => {
    render(
      <DocsPage
        data={seedData}
        projectId="all"
        onAddComment={vi.fn()}
        onCreateDoc={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '新建文档' }))
    const dialog = screen.getByRole('dialog', { name: '新建文档' })
    await userEvent.click(within(dialog).getByRole('button', { name: '配置目录与关联' }))
    expect(within(dialog).getByLabelText('文档配置页')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: '创建为项目文档' }))
    await userEvent.click(within(dialog).getByRole('button', { name: '选择项目 搜索平台' }))
    await userEvent.click(within(dialog).getByRole('button', { name: '选择目录 方案' }))
    await userEvent.click(within(dialog).getByRole('button', { name: '删除目录' }))
    expect(within(dialog).getByText('目录下仍有文档，不能删除')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: '新建子目录' }))
    await userEvent.type(within(dialog).getByLabelText('新目录名称'), '发布')
    await userEvent.click(within(dialog).getByRole('button', { name: '保存目录' }))
    expect(within(dialog).getByRole('button', { name: '选择目录 发布' })).toHaveClass('on')
    expect(within(dialog).getByText('项目文档/搜索平台/方案/发布')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: '重命名目录' }))
    await userEvent.clear(within(dialog).getByLabelText('目录名称'))
    await userEvent.type(within(dialog).getByLabelText('目录名称'), '发布资料')
    await userEvent.click(within(dialog).getByRole('button', { name: '保存目录名称' }))
    expect(within(dialog).getByRole('button', { name: '选择目录 发布资料' })).toHaveClass('on')
    expect(within(dialog).getByText('项目文档/搜索平台/方案/发布资料')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: '删除目录' }))
    expect(within(dialog).queryByRole('button', { name: '选择目录 发布资料' })).not.toBeInTheDocument()
  })

  it('previews selected document types with a larger writing surface', async () => {
    render(
      <DocsPage
        data={seedData}
        projectId="all"
        onAddComment={vi.fn()}
        onCreateDoc={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '新建文档' }))
    const dialog = screen.getByRole('dialog', { name: '新建文档' })
    expect(within(dialog).getByLabelText('文档内容区')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: '文档类型 脑图' }))
    await userEvent.type(within(dialog).getByLabelText('文档内容'), 'AgiliX\n  文档\n  看板')
    expect(within(dialog).getByLabelText('脑图')).toHaveTextContent('AgiliX')
    expect(within(dialog).getByLabelText('脑图')).toHaveTextContent('看板')

    await userEvent.clear(within(dialog).getByLabelText('文档内容'))
    await userEvent.click(within(dialog).getByRole('button', { name: '文档类型 Diagram' }))
    await userEvent.type(within(dialog).getByLabelText('文档内容'), '入口 -> 服务 -> 数据库')
    expect(within(dialog).getByLabelText('Diagram 图')).toHaveTextContent('入口')
    expect(within(dialog).getByLabelText('Diagram 图')).toHaveTextContent('数据库')
  })

  it('shows create document errors instead of silently ignoring failures', async () => {
    const onCreateDoc = vi.fn(async () => {
      throw new Error('Document already exists: doc-growth-plan')
    })

    render(
      <DocsPage
        data={seedData}
        projectId="all"
        onAddComment={vi.fn()}
        onCreateDoc={onCreateDoc}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: '新建文档' }))
    const dialog = screen.getByRole('dialog', { name: '新建文档' })
    await userEvent.type(within(dialog).getByLabelText('文档标题'), '增长实验说明')
    await userEvent.type(within(dialog).getByLabelText('文档内容'), '从表单创建的文档')
    await userEvent.click(within(dialog).getByRole('button', { name: '创建文档' }))

    expect(await screen.findByText('Document already exists: doc-growth-plan')).toBeInTheDocument()
  })

  it('filters documents from the top segmented controls', async () => {
    render(
      <DocsPage data={seedData} projectId="all" onAddComment={vi.fn()} onCreateDoc={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '全局文档' }))
    expect(screen.getAllByText('灰度发布检查清单').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('结果卡片重设计方案')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '待我评论' }))
    expect(screen.getAllByText('结果卡片重设计方案').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('接口字段说明')).not.toBeInTheDocument()
  })
})
