import { useMemo, useRef, useState } from 'react'
import type { CreateDocInput } from '../api/client'
import { ProjectFilter, type ProjectFilterValue } from '../components/ProjectFilter'
import { filterDocs, searchDocs } from '../domain/docs'
import type { Doc, DocComment, FeishuQueryCommand, Issue, ProjectId, SeedData } from '../domain/types'
import {
  docProjectLabel,
  getMember,
  issueTypeLabel,
  linkedIssue,
  memberInitial,
  statusMeta,
} from '../domain/view-models'

export function DocsPage({
  data,
  projectId,
  onProjectChange,
  onAddComment,
  onCreateDoc,
}: {
  data: SeedData
  projectId: ProjectFilterValue
  onProjectChange?: (projectId: ProjectFilterValue) => void
  onAddComment: (docId: string, comment: DocComment) => void | Promise<void>
  onCreateDoc: (doc: CreateDocInput) => void | Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<DocTab>('all')
  const [isCreatingDoc, setIsCreatingDoc] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [activeDirectoryKey, setActiveDirectoryKey] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const baseDocs = filterDocs(data.docs, projectId)
  const tabDocs = filterDocsByTab(baseDocs, tab)
  const directoryDocs = activeDirectoryKey
    ? tabDocs.filter((doc) => directoryKey(doc) === activeDirectoryKey)
    : tabDocs
  const docs = query === '' ? directoryDocs : searchDocs(directoryDocs, query)
  const selected = docs.find((doc) => doc.id === selectedDocId) ?? docs[0]
  const unresolvedComments = docs.reduce(
    (sum, doc) => sum + doc.comments.filter((comment) => !comment.resolved).length,
    0,
  )
  const directoryItems = useMemo(() => buildDirectoryItems(tabDocs), [tabDocs])
  const docsQuery = data.feishu.queryCommands.find(
    (command): command is Extract<FeishuQueryCommand, { type: 'docs' }> => command.type === 'docs',
  )

  return (
    <>
      <header className="top">
        <div className="top-title">
          <h1>文档</h1>
          <div className="sub">
            <span>全局文档 + 项目文档</span>
            <span>·</span>
            <span>统一目录、评论与关联 Issue</span>
          </div>
        </div>
        <div className="top-sp" />
        <button
          className="icon-btn"
          title="搜索"
          aria-label="搜索"
          onClick={() => {
            searchInputRef.current?.focus()
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
        </button>
        {onProjectChange ? (
          <ProjectFilter projects={data.projects} value={projectId} onChange={onProjectChange} />
        ) : (
          <button className="btn btn-ghost" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {projectId === 'all'
              ? '全部项目'
              : docProjectLabel(data, projectDocForProject(data, projectId))}
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={() => {
            setIsCreatingDoc(true)
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建文档
        </button>
      </header>

      {isCreatingDoc ? (
        <CreateDocModal
          data={data}
          onClose={() => setIsCreatingDoc(false)}
          onCreateDoc={onCreateDoc}
          onCreated={(doc) => {
            setQuery('')
            setActiveDirectoryKey(null)
            setSelectedDocId(doc.id)
            setTab(doc.scope)
          }}
          projectId={projectId}
        />
      ) : null}

      <div className="toolbar">
        <div className="seg">
          {docTabs.map((item) => (
            <button
              className={tab === item.value ? 'on' : undefined}
              key={item.value}
              onClick={() => {
                setTab(item.value)
                setActiveDirectoryKey(null)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="chip-flat">
          项目:
          {projectId === 'all'
            ? '全部'
            : docProjectLabel(data, projectDocForProject(data, projectId))}
        </div>
        <div className="chip-flat">类型:方案 + 接口</div>
        <div className="chip-flat">评论:未解决 {unresolvedComments}</div>
        <div className="top-sp" />
        <span className="label">
          {docs.length} 篇 · 项目文档{' '}
          <b className="num">{docs.filter((doc) => doc.scope === 'project').length}</b> · 待评论{' '}
          <b className="num block">{unresolvedComments}</b>
        </span>
      </div>

      <div className="docs-body">
        <aside className="doc-tree">
          <div className="tree-head">
            <div className="tree-title">目录</div>
            <label className="tree-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input
                ref={searchInputRef}
                aria-label="搜索文档"
                type="search"
                placeholder="搜索标题、正文、评论"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            </label>
          </div>
          <TreeSection
            title="全局文档"
            items={directoryItems.filter((item) => item.scope === 'global')}
            activeDirectoryKey={activeDirectoryKey}
            onSelectDirectory={(key) => {
              setActiveDirectoryKey(key)
              setQuery('')
              setSelectedDocId(null)
            }}
          />
          <TreeSection
            title="项目文档"
            items={directoryItems.filter((item) => item.scope === 'project')}
            activeDirectoryKey={activeDirectoryKey}
            onSelectDirectory={(key) => {
              setActiveDirectoryKey(key)
              setQuery('')
              setSelectedDocId(null)
            }}
          />
          <TreeSection
            title="快捷筛选"
            items={[
              { key: 'quick:unresolved-comments', label: '有未解决评论', count: unresolvedComments },
              {
                key: 'quick:linked-issues',
                label: '关联 Issue',
                count: docs.filter((doc) => doc.linkedIssueKeys.length > 0).length,
              },
            ]}
          />
        </aside>

        <main className="doc-list">
          <div className="doc-summary">
            <Summary label="全部文档" value={String(docs.length)} />
            <Summary
              label="项目文档"
              value={String(docs.filter((doc) => doc.scope === 'project').length)}
            />
            <Summary
              label="全局文档"
              value={String(docs.filter((doc) => doc.scope === 'global').length)}
            />
            <Summary label="待评论" value={String(unresolvedComments)} danger />
          </div>
          <div className="list-head">
            <h2>最近更新</h2>
            <span className="label">按更新时间排序</span>
          </div>

          {docs.map((doc, index) => (
            <DocListRow
              key={doc.id}
              data={data}
              doc={doc}
              active={selected ? doc.id === selected.id : index === 0}
              onSelect={() => setSelectedDocId(doc.id)}
            />
          ))}
        </main>

        {selected ? (
          <DocDetail
            data={data}
            selected={selected}
            docsQuery={docsQuery}
            onAddComment={onAddComment}
          />
        ) : null}
      </div>
    </>
  )
}

type DocTab = 'all' | 'recent' | 'comments' | 'project' | 'global'
type DocContentType = 'markdown' | 'mindmap' | 'diagram'
type CreateDocPanel = 'editor' | 'config'
type DirectoryCreateMode = 'sibling' | 'child'

type CreateDocFormState = {
  scope: 'global' | 'project'
  projectId: ProjectId
  contentType: DocContentType
  title: string
  directory: string
  issueQuery: string
  body: string
  linkedIssueKeys: string[]
}

type TreeItem = { key: string; label: string; count: number; scope?: Doc['scope'] }
type DirectoryItem = TreeItem & { scope: Doc['scope'] }

const docTabs: Array<{ label: string; value: DocTab }> = [
  { label: '全部', value: 'all' },
  { label: '最近更新', value: 'recent' },
  { label: '待我评论', value: 'comments' },
  { label: '项目文档', value: 'project' },
  { label: '全局文档', value: 'global' },
]

const docContentTypeOptions: Array<{ label: string; value: DocContentType }> = [
  { label: 'Markdown', value: 'markdown' },
  { label: '脑图', value: 'mindmap' },
  { label: 'Diagram', value: 'diagram' },
]

function filterDocsByTab(docs: Doc[], tab: DocTab): Doc[] {
  if (tab === 'comments')
    return docs.filter((doc) => doc.comments.some((comment) => !comment.resolved))
  if (tab === 'project') return docs.filter((doc) => doc.scope === 'project')
  if (tab === 'global') return docs.filter((doc) => doc.scope === 'global')
  return docs
}

function CreateDocModal({
  data,
  projectId,
  onClose,
  onCreateDoc,
  onCreated,
}: {
  data: SeedData
  projectId: ProjectFilterValue
  onClose: () => void
  onCreateDoc: (doc: CreateDocInput) => void | Promise<void>
  onCreated: (doc: CreateDocInput) => void
}) {
  const initialProjectId = projectId === 'all' ? data.projects[0]!.id : projectId
  const [form, setForm] = useState<CreateDocFormState>(() =>
    initialCreateDocForm(data, initialProjectId),
  )
  const [createDocError, setCreateDocError] = useState('')
  const [isSavingDoc, setIsSavingDoc] = useState(false)
  const [panel, setPanel] = useState<CreateDocPanel>('editor')
  const [addingDirectory, setAddingDirectory] = useState<DirectoryCreateMode | null>(null)
  const [newDirectoryName, setNewDirectoryName] = useState('')
  const [renamingDirectory, setRenamingDirectory] = useState(false)
  const [renameDirectoryName, setRenameDirectoryName] = useState('')
  const [directoryError, setDirectoryError] = useState('')
  const [createdDirectoryPaths, setCreatedDirectoryPaths] = useState<string[]>([])
  const [hiddenDirectoryPaths, setHiddenDirectoryPaths] = useState<string[]>([])
  const directoryChoices = buildCreateDirectoryChoices(
    data,
    form.scope,
    form.projectId,
    createdDirectoryPaths,
    hiddenDirectoryPaths,
  )
  const issueChoices = filterIssuesForCreateDoc(
    issuesForCreateDoc(data.issues, form.scope, form.projectId),
    form.issueQuery,
  )

  return (
    <div className="modal-backdrop">
      <form
        aria-labelledby="create-doc-title"
        aria-modal="true"
        className="doc-modal"
        onSubmit={(event) => {
          event.preventDefault()
          void submitCreateDoc({
            form,
            onCreateDoc,
            onCreated,
            onClose,
            setCreateDocError,
            setIsSavingDoc,
          })
        }}
        role="dialog"
      >
        <div className="modal-head">
          <div>
            <div className="kicker">AgiliX Docs</div>
            <h2 id="create-doc-title">新建文档</h2>
          </div>
          <button aria-label="关闭新建文档" className="icon-btn" onClick={onClose} type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {panel === 'editor' ? (
          <div className="doc-modal-body doc-modal-body-editor">
            <section aria-label="文档内容区" className="modal-section markdown-editor-panel">
              <div className="doc-editor-top">
                <label className="form-field">
                  <span>文档标题</span>
                  <input
                    aria-label="文档标题"
                    value={form.title}
                    onChange={(event) => {
                      const value = event.currentTarget.value
                      setForm((current) => ({ ...current, title: value }))
                      setCreateDocError('')
                    }}
                  />
                </label>
                <button
                  aria-label="配置目录与关联"
                  className="btn btn-ghost doc-config-trigger"
                  onClick={() => {
                    setPanel('config')
                    setCreateDocError('')
                  }}
                  type="button"
                >
                  配置目录与关联
                  <small>{form.directory} · 已关联 {form.linkedIssueKeys.length} 个 Issue</small>
                </button>
              </div>
              <div className="editor-head">
                <div className="section-label">正文</div>
                <div className="content-type-switch" aria-label="文档类型">
                  {docContentTypeOptions.map((option) => (
                    <button
                      aria-label={`文档类型 ${option.label}`}
                      className={form.contentType === option.value ? 'on' : undefined}
                      key={option.value}
                      onClick={() => {
                        setForm((current) => ({ ...current, contentType: option.value }))
                        setCreateDocError('')
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="content-editor-grid">
                <label className="form-field">
                  <span>文档内容</span>
                  <textarea
                    aria-label="文档内容"
                    value={form.body}
                    onChange={(event) => {
                      const value = event.currentTarget.value
                      setForm((current) => ({ ...current, body: value }))
                      setCreateDocError('')
                    }}
                  />
                </label>
                <div className="markdown-preview" aria-label="文档预览">
                  <DocumentPreview body={form.body} contentType={form.contentType} />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="doc-modal-body doc-modal-body-config">
            <section aria-label="文档配置页" className="doc-config-page">
              <div className="config-page-head">
                <div>
                  <div className="section-label">配置</div>
                  <h3>目录与关联</h3>
                </div>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setPanel('editor')
                    setAddingDirectory(null)
                    setRenamingDirectory(false)
                    setDirectoryError('')
                  }}
                  type="button"
                >
                  返回正文
                </button>
              </div>

              <div className="doc-config-grid">
                <section className="modal-section">
                  <div className="section-label">文档范围</div>
                  <div className="scope-switch">
                    <button
                      aria-label="创建为全局文档"
                      className={form.scope === 'global' ? 'on' : undefined}
                      onClick={() => {
                        setCreateDocError('')
                        setDirectoryError('')
                        setAddingDirectory(null)
                        setForm((current) => ({
                          ...current,
                          scope: 'global',
                          directory: firstDirectoryPath(data, 'global', current.projectId),
                          issueQuery: '',
                          linkedIssueKeys: [],
                        }))
                      }}
                      type="button"
                    >
                      全局文档
                    </button>
                    <button
                      aria-label="创建为项目文档"
                      className={form.scope === 'project' ? 'on' : undefined}
                      onClick={() => {
                        setCreateDocError('')
                        setDirectoryError('')
                        setAddingDirectory(null)
                        setForm((current) => ({
                          ...current,
                          scope: 'project',
                          directory: firstDirectoryPath(data, 'project', current.projectId),
                          issueQuery: '',
                          linkedIssueKeys: [],
                        }))
                      }}
                      type="button"
                    >
                      项目文档
                    </button>
                  </div>

                  {form.scope === 'project' ? (
                    <>
                      <div className="section-label">所属项目</div>
                      <div className="project-card-grid">
                        {data.projects.map((project) => (
                          <button
                            aria-label={`选择项目 ${project.name}`}
                            className={`project-card-choice ${form.projectId === project.id ? 'on' : ''}`}
                            key={project.id}
                            onClick={() => {
                              setCreateDocError('')
                              setDirectoryError('')
                              setAddingDirectory(null)
                              setForm((current) => ({
                                ...current,
                                projectId: project.id,
                                directory: firstDirectoryPath(data, current.scope, project.id),
                                issueQuery: '',
                                linkedIssueKeys: [],
                              }))
                            }}
                            type="button"
                          >
                            <span style={{ background: project.color }}>{project.glyph}</span>
                            <b>{project.name}</b>
                            <small>{project.activeIterationCode}</small>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </section>

                <section className="modal-section">
                  <div className="section-row">
                    <div className="section-label">目录</div>
                    <div className="directory-actions">
                      <button
                        className="link-btn"
                        onClick={() => {
                          setAddingDirectory('sibling')
                          setRenamingDirectory(false)
                          setDirectoryError('')
                        }}
                        type="button"
                      >
                        新建同级目录
                      </button>
                      <button
                        className="link-btn"
                        onClick={() => {
                          setAddingDirectory('child')
                          setRenamingDirectory(false)
                          setDirectoryError('')
                        }}
                        type="button"
                      >
                        新建子目录
                      </button>
                    </div>
                  </div>
                  <div className="directory-choice-list directory-tree-list">
                    {directoryChoices.map((directory) => (
                      <button
                        aria-label={`选择目录 ${directory.label}`}
                        className={`directory-choice level-${directoryDepth(directory.path)} ${form.directory === directory.path ? 'on' : ''}`}
                        key={directory.path}
                        onClick={() => {
                          setForm((current) => ({ ...current, directory: directory.path }))
                          setDirectoryError('')
                          setCreateDocError('')
                        }}
                        type="button"
                      >
                        <span>{directory.label}</span>
                        <small>{directory.path}</small>
                      </button>
                    ))}
                  </div>
                  {addingDirectory ? (
                    <div className="new-directory-row">
                      <label className="form-field">
                        <span>新目录名称</span>
                        <input
                          aria-label="新目录名称"
                          value={newDirectoryName}
                          onChange={(event) => setNewDirectoryName(event.currentTarget.value)}
                        />
                      </label>
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          const name = requiredFormValue(newDirectoryName, '新目录名称')
                          const directoryPath = createNestedDirectoryPath(
                            data,
                            form.scope,
                            form.projectId,
                            form.directory,
                            name,
                            addingDirectory,
                          )
                          if (directoryChoices.some((directory) => directory.path === directoryPath)) {
                            setDirectoryError('目录已存在')
                            return
                          }
                          setCreatedDirectoryPaths((current) => [...current, directoryPath])
                          setForm((current) => ({ ...current, directory: directoryPath }))
                          setNewDirectoryName('')
                          setAddingDirectory(null)
                          setDirectoryError('')
                          setCreateDocError('')
                        }}
                        type="button"
                      >
                        保存目录
                      </button>
                    </div>
                  ) : null}
                  <div className="directory-edit-row">
                    {renamingDirectory ? (
                      <>
                        <label className="form-field">
                          <span>目录名称</span>
                          <input
                            aria-label="目录名称"
                            value={renameDirectoryName}
                            onChange={(event) => setRenameDirectoryName(event.currentTarget.value)}
                          />
                        </label>
                        <button
                          className="btn btn-ghost"
                          onClick={() => {
                            const name = requiredFormValue(renameDirectoryName, '目录名称')
                            const renamedPath = renameDirectoryPath(form.directory, name)
                            if (directoryChoices.some((directory) => directory.path === renamedPath)) {
                              setDirectoryError('目录已存在')
                              return
                            }
                            setCreatedDirectoryPaths((current) =>
                              current.includes(form.directory)
                                ? current.map((path) => renamePathPrefix(path, form.directory, renamedPath))
                                : [...current, renamedPath],
                            )
                            if (!createdDirectoryPaths.includes(form.directory)) {
                              setHiddenDirectoryPaths((current) =>
                                current.includes(form.directory) ? current : [...current, form.directory],
                              )
                            }
                            setForm((current) => ({ ...current, directory: renamedPath }))
                            setRenameDirectoryName('')
                            setRenamingDirectory(false)
                            setDirectoryError('')
                          }}
                          type="button"
                        >
                          保存目录名称
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setRenameDirectoryName(lastPathSegment(form.directory))
                          setRenamingDirectory(true)
                          setAddingDirectory(null)
                          setDirectoryError('')
                        }}
                        type="button"
                      >
                        重命名目录
                      </button>
                    )}
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        if (!directoryIsEmpty(data, createdDirectoryPaths, form.directory)) {
                          setDirectoryError('目录下仍有文档，不能删除')
                          return
                        }
                        const nextCreatedPaths = createdDirectoryPaths.filter(
                          (path) => path !== form.directory && !path.startsWith(`${form.directory}/`),
                        )
                        setCreatedDirectoryPaths(nextCreatedPaths)
                        const nextDirectory =
                          directoryChoices.find((directory) => directory.path !== form.directory)?.path ??
                          firstDirectoryPath(data, form.scope, form.projectId)
                        setForm((current) => ({ ...current, directory: nextDirectory }))
                        setDirectoryError('')
                      }}
                      type="button"
                    >
                      删除目录
                    </button>
                  </div>
                  {directoryError ? <div className="form-error">{directoryError}</div> : null}
                </section>

                <section className="modal-section">
                  <div className="section-label">关联 Issue</div>
                  <label className="form-field">
                    <span>搜索关联 Issue</span>
                    <input
                      aria-label="搜索关联 Issue"
                      placeholder="输入编号或标题"
                      value={form.issueQuery}
                      onChange={(event) => {
                        const value = event.currentTarget.value
                        setForm((current) => ({ ...current, issueQuery: value }))
                        setCreateDocError('')
                      }}
                    />
                  </label>
                  <div className="issue-choice-list">
                    {issueChoices.map((issue) => (
                      <label className="issue-choice" key={issue.key}>
                        <input
                          aria-label={`关联 Issue ${issue.key} ${issue.title}`}
                          checked={form.linkedIssueKeys.includes(issue.key)}
                          onChange={() => {
                            setForm((current) => ({
                              ...current,
                              linkedIssueKeys: toggleIssueKey(current.linkedIssueKeys, issue.key),
                            }))
                            setCreateDocError('')
                          }}
                          type="checkbox"
                        />
                        <span className="wid">{issue.key}</span>
                        <b>{issue.title}</b>
                        <small>{statusMeta[issue.status].label}</small>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            </section>
          </div>
        )}

        {createDocError ? <div className="form-error">{createDocError}</div> : null}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} type="button">
            取消
          </button>
          <button className="btn btn-primary" disabled={isSavingDoc} type="submit">
            创建文档
          </button>
        </div>
      </form>
    </div>
  )
}

async function submitCreateDoc({
  form,
  onCreateDoc,
  onCreated,
  onClose,
  setCreateDocError,
  setIsSavingDoc,
}: {
  form: CreateDocFormState
  onCreateDoc: (doc: CreateDocInput) => void | Promise<void>
  onCreated: (doc: CreateDocInput) => void
  onClose: () => void
  setCreateDocError: (error: string) => void
  setIsSavingDoc: (isSaving: boolean) => void
}) {
  setCreateDocError('')
  try {
    const doc = buildCreateDocInput(form)
    setIsSavingDoc(true)
    await onCreateDoc(doc)
    onCreated(doc)
    onClose()
  } catch (error) {
    if (!(error instanceof Error)) throw error
    setCreateDocError(error.message)
  } finally {
    setIsSavingDoc(false)
  }
}

function buildCreateDocInput(form: CreateDocFormState): CreateDocInput {
  const title = requiredFormValue(form.title, '文档标题')
  const directory = requiredFormValue(form.directory, '目录')
  const body = serializeDocBody(form.contentType, requiredFormValue(form.body, '正文'))
  const id = createDocId()

  if (form.scope === 'global') {
    return {
      id,
      scope: 'global',
      title,
      directory,
      body,
      linkedIssueKeys: form.linkedIssueKeys,
      comments: [],
      updatedAtLabel: '刚刚',
    }
  }

  return {
    id,
    scope: 'project',
    projectId: form.projectId,
    title,
    directory,
    body,
    linkedIssueKeys: form.linkedIssueKeys,
    comments: [],
    updatedAtLabel: '刚刚',
  }
}

function initialCreateDocForm(data: SeedData, projectId: ProjectId): CreateDocFormState {
  return {
    scope: 'global',
    projectId,
    contentType: 'markdown',
    title: '',
    directory: firstDirectoryPath(data, 'global', projectId),
    issueQuery: '',
    body: '',
    linkedIssueKeys: [],
  }
}

function firstDirectoryPath(
  data: SeedData,
  scope: CreateDocFormState['scope'],
  projectId: ProjectId,
): string {
  const directory = buildCreateDirectoryChoices(data, scope, projectId)[0]
  if (directory) return directory.path
  return createDirectoryPath(data, scope, projectId, '待整理')
}

function buildCreateDirectoryChoices(
  data: SeedData,
  scope: CreateDocFormState['scope'],
  projectId: ProjectId,
  extraDirectoryPaths: string[] = [],
  hiddenDirectoryPaths: string[] = [],
): Array<{ label: string; path: string }> {
  const directories = data.docs
    .filter((doc) => doc.scope === scope && (scope === 'global' || doc.projectId === projectId))
    .map((doc) => doc.directory)
  const uniqueDirectories = Array.from(
    new Set([
      ...directories,
      ...extraDirectoryPaths.filter((path) => directoryPathMatchesScope(data, scope, projectId, path)),
    ]),
  )
  return uniqueDirectories
    .filter((path) => !hiddenDirectoryPaths.includes(path))
    .map((path) => ({ label: lastPathSegment(path), path }))
}

function createNestedDirectoryPath(
  data: SeedData,
  scope: CreateDocFormState['scope'],
  projectId: ProjectId,
  selectedDirectory: string,
  name: string,
  mode: DirectoryCreateMode,
): string {
  const parent = mode === 'child' ? selectedDirectory : parentDirectoryPath(data, scope, projectId, selectedDirectory)
  return `${parent}/${name}`
}

function parentDirectoryPath(
  data: SeedData,
  scope: CreateDocFormState['scope'],
  projectId: ProjectId,
  directory: string,
): string {
  const parts = directory.split('/')
  const root = scopeRootPath(data, scope, projectId)
  if (parts.length <= root.split('/').length + 1) return root
  return parts.slice(0, -1).join('/')
}

function scopeRootPath(
  data: SeedData,
  scope: CreateDocFormState['scope'],
  projectId: ProjectId,
): string {
  if (scope === 'global') return '全局文档'
  const project = data.projects.find((item) => item.id === projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)
  return `项目文档/${project.name}`
}

function renameDirectoryPath(path: string, name: string): string {
  const parts = path.split('/')
  return [...parts.slice(0, -1), name].join('/')
}

function renamePathPrefix(path: string, from: string, to: string): string {
  if (path === from) return to
  if (path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`
  return path
}

function lastPathSegment(path: string): string {
  return path.split('/').at(-1)!
}

function directoryDepth(path: string): number {
  return Math.min(3, Math.max(0, path.split('/').length - 2))
}

function directoryIsEmpty(data: SeedData, localDirectories: string[], path: string): boolean {
  const hasDocs = data.docs.some((doc) => doc.directory === path || doc.directory.startsWith(`${path}/`))
  const hasLocalChildren = localDirectories.some((directory) => directory !== path && directory.startsWith(`${path}/`))
  return !hasDocs && !hasLocalChildren
}

function directoryPathMatchesScope(
  data: SeedData,
  scope: CreateDocFormState['scope'],
  projectId: ProjectId,
  path: string,
): boolean {
  if (scope === 'global') return path.startsWith('全局文档/')
  const project = data.projects.find((item) => item.id === projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)
  return path.startsWith(`项目文档/${project.name}/`)
}

function createDirectoryPath(
  data: SeedData,
  scope: CreateDocFormState['scope'],
  projectId: ProjectId,
  name: string,
): string {
  if (scope === 'global') return `全局文档/${name}`
  const project = data.projects.find((item) => item.id === projectId)
  if (!project) throw new Error(`Project not found: ${projectId}`)
  return `项目文档/${project.name}/${name}`
}

function issuesForCreateDoc(
  issues: Issue[],
  scope: CreateDocFormState['scope'],
  projectId: ProjectId,
): Issue[] {
  if (scope === 'global') return issues
  return issues.filter((issue) => issue.projectId === projectId)
}

function filterIssuesForCreateDoc(issues: Issue[], query: string): Issue[] {
  const keyword = query.trim().toLocaleLowerCase()
  if (keyword === '') return issues
  return issues.filter((issue) =>
    `${issue.key} ${issue.title}`.toLocaleLowerCase().includes(keyword),
  )
}

function serializeDocBody(contentType: DocContentType, body: string): string {
  if (contentType === 'mindmap') return fencedDocBody('mindmap', body)
  if (contentType === 'diagram') return fencedDocBody('diagram', body)
  return body
}

function fencedDocBody(language: string, body: string): string {
  return ['```' + language, body, '```'].join('\n')
}

function toggleIssueKey(keys: string[], key: string): string[] {
  return keys.includes(key) ? keys.filter((item) => item !== key) : [...keys, key]
}

function createDocId(): string {
  return `doc-${Date.now().toString(36)}`
}

function requiredFormValue(value: string, label: string): string {
  const trimmed = value.trim()
  if (trimmed === '') throw new Error(`${label}不能为空`)
  return trimmed
}

function TreeSection({
  title,
  items,
  activeDirectoryKey,
  onSelectDirectory,
}: {
  title: string
  items: TreeItem[]
  activeDirectoryKey?: string | null
  onSelectDirectory?: (key: string) => void
}) {
  return (
    <div className="tree-sec">
      <div className="tree-sec-t">{title}</div>
      {items.map((item, index) => (
        <button
          aria-label={`打开目录 ${item.label}`}
          className={`tree-i ${activeDirectoryKey === item.key || (!activeDirectoryKey && index === 0) ? 'on' : ''}`}
          key={item.key}
          onClick={() => onSelectDirectory?.(item.key)}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
            <path d="M8 7h6" />
          </svg>
          <span>{item.label}</span>
          <small>{item.count}</small>
        </button>
      ))}
    </div>
  )
}

function Summary({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`stat-num ${danger ? 'block' : ''}`}>{value}</div>
    </div>
  )
}

function DocListRow({
  data,
  doc,
  active,
  onSelect,
}: {
  data: SeedData
  doc: Doc
  active: boolean
  onSelect: () => void
}) {
  const owner = docOwner(data, doc)
  return (
    <button
      aria-label={`打开文档 ${doc.title}`}
      className={`doc-row-lg ${active ? 'on' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <div className="doc-mark">{doc.title.slice(0, 1)}</div>
      <div className="doc-main">
        <div className="doc-title">
          <span>{doc.title}</span>
          <span className={`scope ${doc.scope === 'global' ? 'global' : ''}`}>
            {docProjectLabel(data, doc)}
          </span>
        </div>
        <div className="doc-meta">
          {lastDirectorySegment(doc)} · 关联 {doc.linkedIssueKeys.join(' / ')} ·{' '}
          {doc.updatedAtLabel}
        </div>
      </div>
      {owner ? (
        <div className="doc-owner">
          <div className="av sm">{memberInitial(owner)}</div>
          {owner.name}
        </div>
      ) : null}
      <div className="comment-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {doc.comments.length}
      </div>
    </button>
  )
}

function DocDetail({
  data,
  selected,
  docsQuery,
  onAddComment,
}: {
  data: SeedData
  selected: Doc
  docsQuery?: Extract<FeishuQueryCommand, { type: 'docs' }>
  onAddComment: (docId: string, comment: DocComment) => void | Promise<void>
}) {
  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  return (
    <aside className="doc-detail">
      <div className="detail-top">
        <div className="kicker">Selected Document</div>
        <h2>{selected.title}</h2>
        <div className="detail-meta">
          <span className="scope">{docProjectLabel(data, selected)}</span>
          <span>{lastDirectorySegment(selected)}</span>
          <span>·</span>
          <span>{detailUpdatedLabel(data, selected)}</span>
        </div>
      </div>

      <div className="detail-section">
        <h3>目录</h3>
        <div className="outline">
          {selected.directory.split('/').map((title, index) => (
            <div key={`${title}-${index}`}>
              <span>
                {index + 1}. {title}
              </span>
              <small>{String(index + 1).padStart(2, '0')}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h3>正文</h3>
        <MarkdownDocument body={selected.body} />
      </div>

      <div className="detail-section">
        <h3>关联 Issue</h3>
        <div className="rel">
          {selected.linkedIssueKeys.map((key) => {
            const issue = linkedIssue(data, key)
            return (
              <div className="rel-i" key={key}>
                <span className="wid">{key}</span>
                <b>{issue.title}</b>
                <span className={`type-tag`}>{issueTypeLabel[issue.type]}</span>
                <span className={`badge ${statusMeta[issue.status].badgeClass}`}>
                  <span className="dot" />
                  {statusMeta[issue.status].label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="detail-section">
        <h3>评论</h3>
        {selected.comments.map((comment) => {
          const author = getMember(data, comment.authorId)
          return (
            <div className="comment" key={comment.id}>
              <div className="av sm">{memberInitial(author)}</div>
              <div>
                <b>{author.name}</b>
                <span className="time">{comment.createdAtLabel}</span>
                <p>{comment.body}</p>
              </div>
            </div>
          )
        })}
        <form
          className="comment-form"
          onSubmit={(event) => {
            event.preventDefault()
            const body = commentBody.trim()
            if (body === '') {
              setCommentError('评论不能为空')
              return
            }

            setCommentError('')
            setIsSubmittingComment(true)
            void Promise.resolve(
              onAddComment(selected.id, {
                id: `comment-${selected.id}-${Date.now()}`,
                docId: selected.id,
                authorId: 'zhou',
                body,
                resolved: false,
                createdAtLabel: '刚刚',
              }),
            )
              .then(() => setCommentBody(''))
              .catch((error) => {
                if (!(error instanceof Error)) throw error
                setCommentError(error.message)
              })
              .finally(() => setIsSubmittingComment(false))
          }}
        >
          <label className="form-field">
            <span>新增评论内容</span>
            <textarea
              aria-label="新增评论内容"
              value={commentBody}
              onChange={(event) => {
                setCommentBody(event.currentTarget.value)
                setCommentError('')
              }}
            />
          </label>
          {commentError ? <div className="form-error">{commentError}</div> : null}
          <div className="form-actions">
            <button className="btn btn-primary" disabled={isSubmittingComment} type="submit">
              提交评论
            </button>
          </div>
        </form>
      </div>

      {docsQuery ? (
        <div className="detail-section">
          <div className="feishu-doc">
            <b>飞书查询示例</b>
            群里发送 <span className="wid">/docs {docsQuery.query}</span>，返回文档摘要、关联 Issue
            和未解决评论数。
          </div>
        </div>
      ) : null}
    </aside>
  )
}

function buildDirectoryItems(
  docs: Doc[],
): DirectoryItem[] {
  const map = new Map<string, DirectoryItem>()
  for (const doc of docs) {
    const key = directoryKey(doc)
    const current = map.get(key) ?? {
      key,
      label: lastDirectorySegment(doc),
      count: 0,
      scope: doc.scope,
    }
    current.count += 1
    map.set(key, current)
  }
  return Array.from(map.values())
}

function directoryKey(doc: Doc): string {
  return `${doc.scope}:${doc.directory}`
}

function DocumentPreview({
  body,
  contentType,
}: {
  body: string
  contentType: DocContentType
}) {
  if (contentType === 'mindmap') {
    return (
      <div className="markdown-doc">
        <CodeBlock block={{ type: 'code', language: 'mindmap', content: body }} />
      </div>
    )
  }

  if (contentType === 'diagram') {
    return (
      <div className="markdown-doc">
        <CodeBlock block={{ type: 'code', language: 'diagram', content: body }} />
      </div>
    )
  }

  return <MarkdownDocument body={body} />
}

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; language: string; content: string }

function MarkdownDocument({ body }: { body: string }) {
  const blocks = parseMarkdownBlocks(body)
  return (
    <div className="markdown-doc">
      {blocks.map((block, index) => (
        <MarkdownBlockView block={block} key={`${block.type}-${index}`} />
      ))}
    </div>
  )
}

function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  if (block.type === 'heading') {
    const HeadingTag = block.level === 1 ? 'h4' : block.level === 2 ? 'h5' : 'h6'
    return <HeadingTag>{block.text}</HeadingTag>
  }

  if (block.type === 'list') {
    return (
      <ul>
        {block.items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    )
  }

  if (block.type === 'code') return <CodeBlock block={block} />

  return <p>{renderInlineMarkdown(block.text)}</p>
}

function CodeBlock({ block }: { block: Extract<MarkdownBlock, { type: 'code' }> }) {
  if (block.language === 'mermaid') {
    return (
      <section aria-label="Mermaid 图表" className="doc-visual">
        <b>Mermaid</b>
        <div className="diagram-flow">
          {mermaidFlowNodes(block.content).map((step, index) => (
            <span key={`${step}-${index}`}>{step}</span>
          ))}
        </div>
      </section>
    )
  }

  if (block.language === 'diagram') {
    return (
      <section aria-label="Diagram 图" className="doc-visual">
        <b>Diagram</b>
        <div className="diagram-flow">
          {diagramFlowNodes(block.content).map((step, index) => (
            <span key={`${step}-${index}`}>{step}</span>
          ))}
        </div>
      </section>
    )
  }

  if (block.language === 'mindmap') {
    return (
      <section aria-label="脑图" className="doc-visual">
        <b>脑图</b>
        <div className="mindmap-tree">
          {block.content
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line, index) => (
              <span className={`level-${Math.min(2, Math.floor(leadingSpaceCount(line) / 2))}`} key={`${line}-${index}`}>
                {line.trim()}
              </span>
            ))}
        </div>
      </section>
    )
  }

  return <pre className="code-block">{block.content}</pre>
}

function diagramFlowNodes(content: string): string[] {
  return content
    .split('->')
    .map((step) => step.trim())
    .filter(Boolean)
}

function mermaidFlowNodes(content: string): string[] {
  const nodes = content
    .split(/\n|-->|---|--|==>/)
    .map((step) => cleanMermaidNode(step.trim()))
    .filter((step) => step !== '' && !/^graph\s+/i.test(step))
  return nodes.length > 0 ? nodes : [content.trim()].filter(Boolean)
}

function cleanMermaidNode(node: string): string {
  return node
    .replace(/^[A-Za-z0-9_-]+(?=\[)/, '')
    .replace(/^[A-Za-z0-9_-]+(?=\()/, '')
    .replace(/^[A-Za-z0-9_-]+(?=\{)/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/^\(/, '')
    .replace(/\)$/, '')
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .trim()
}

function parseMarkdownBlocks(body: string): MarkdownBlock[] {
  const lines = body.split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]!
    const trimmed = line.trim()

    if (trimmed === '') {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim()
      const content: string[] = []
      index += 1
      while (index < lines.length && lines[index]!.trim() !== '```') {
        content.push(lines[index]!)
        index += 1
      }
      blocks.push({ type: 'code', language, content: content.join('\n') })
      if (index < lines.length) index += 1
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed)
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1]!.length as 1 | 2 | 3,
        text: heading[2]!,
      })
      index += 1
      continue
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = []
      while (index < lines.length && lines[index]!.trim().startsWith('- ')) {
        items.push(lines[index]!.trim().slice(2))
        index += 1
      }
      blocks.push({ type: 'list', items })
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length) {
      const paragraphLine = lines[index]!.trim()
      if (
        paragraphLine === '' ||
        paragraphLine.startsWith('```') ||
        paragraphLine.startsWith('- ') ||
        /^(#{1,3})\s+(.+)$/.test(paragraphLine)
      ) {
        break
      }
      paragraph.push(paragraphLine)
      index += 1
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
  }

  return blocks
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function leadingSpaceCount(text: string): number {
  const match = /^ */.exec(text)
  return match ? match[0].length : 0
}

function lastDirectorySegment(doc: Doc): string {
  return doc.directory.split('/').at(-1)!
}

function docOwner(data: SeedData, doc: Doc) {
  const comment = doc.comments[0]
  if (comment) return getMember(data, comment.authorId)
  const issueKey = doc.linkedIssueKeys[0]
  if (issueKey) return getMember(data, linkedIssue(data, issueKey).assigneeId)
  return null
}

function detailUpdatedLabel(data: SeedData, doc: Doc) {
  const owner = docOwner(data, doc)
  return owner ? `${owner.name}更新于 ${doc.updatedAtLabel}` : doc.updatedAtLabel
}

function projectDocForProject(data: SeedData, projectId: ProjectId): Doc {
  const doc = data.docs.find((item) => item.scope === 'project' && item.projectId === projectId)
  if (!doc) throw new Error(`Project doc not found: ${projectId}`)
  return doc
}
