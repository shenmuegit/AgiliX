import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import type { AgiliXClient } from '../api/client'
import type { DocQueryText, FeishuQueryCommand, SeedData } from '../domain/types'
import { BoardPage } from './BoardPage'
import { DocsPage } from './DocsPage'
import { FeishuPage } from './FeishuPage'
import { GanttPage } from './GanttPage'
import { IssuesPage } from './IssuesPage'
import { ProjectsPage } from './ProjectsPage'
import { StandupPage } from './StandupPage'
import { StatsPage } from './StatsPage'
import { TeamPage } from './TeamPage'
import { WorkloadPage } from './WorkloadPage'

afterEach(() => cleanup())

const marsDocQuery = '火星方案' as DocQueryText
const marsCalendarWeeks = [
  { label: 'M1', rangeLabel: '07/01-07/05 · R42', days: ['1', '2', '3', '4', '5'] },
  { label: 'M2', rangeLabel: '07/08-07/12 · R43', days: ['8', '9', '10', '11', '12'] },
]
const compactCalendarWeeks = [
  { label: 'W1', rangeLabel: '当前周', days: ['1', '2', '3', '4', '5'] },
]

const dataDrivenSeed: SeedData = {
  navItems: [
    '团队工作台',
    '项目总览',
    'Issues',
    '看板',
    '迭代统计',
    '文档',
    '成员负载',
    '每日站会',
    '排期甘特',
    '飞书',
  ],
  projects: [
    { id: 'search', name: '星舰平台', glyph: '星', color: '#476b7c', activeIterationCode: 'R42' },
    { id: 'data', name: '补给看板', glyph: '补', color: '#7c5f47', activeIterationCode: 'S02' },
    { id: 'api', name: '轨道开放平台', glyph: '轨', color: '#6d5d8a', activeIterationCode: 'O11' },
    { id: 'mobile', name: '舱外移动端', glyph: '舱', color: '#5d734f', activeIterationCode: 'M08' },
  ],
  members: [
    { id: 'lin', name: '黎明', role: '任务负责人', capacity: 6 },
    { id: 'chen', name: '陈序', role: '前端工程', capacity: 5 },
    { id: 'gao', name: '高岚', role: '后端工程', capacity: 5 },
    { id: 'su', name: '苏遥', role: '质量工程', capacity: 4 },
    { id: 'han', name: '韩北', role: '产品', capacity: 4 },
    { id: 'he', name: '何川', role: '数据工程', capacity: 5 },
    { id: 'jiang', name: '江临', role: '设计', capacity: 3 },
    { id: 'zhou', name: '周远', role: '前端工程', capacity: 5 },
  ],
  iterations: [
    {
      id: 'search-r42',
      projectId: 'search',
      code: 'R42',
      name: '火星救援迭代',
      dateRangeLabel: '07/01-07/05',
      calendarTitle: '7 月 · Rescue 42 → 43',
      calendarWeeks: marsCalendarWeeks,
      day: 2,
      totalDays: 5,
      goal: '打通火星救援主路径',
      velocity: 13,
    },
    {
      id: 'data-s02',
      projectId: 'data',
      code: 'S02',
      name: '补给指标迭代',
      dateRangeLabel: '07/02-07/06',
      calendarTitle: '7 月 · Supply 02',
      calendarWeeks: compactCalendarWeeks,
      day: 1,
      totalDays: 5,
      goal: '补给状态透明化',
      velocity: 8,
    },
    {
      id: 'api-o11',
      projectId: 'api',
      code: 'O11',
      name: '轨道权限迭代',
      dateRangeLabel: '07/03-07/10',
      calendarTitle: '7 月 · Orbit 11',
      calendarWeeks: compactCalendarWeeks,
      day: 4,
      totalDays: 8,
      goal: '轨道 API 权限清晰',
      velocity: 10,
    },
    {
      id: 'mobile-m08',
      projectId: 'mobile',
      code: 'M08',
      name: '舱外弱网迭代',
      dateRangeLabel: '07/04-07/10',
      calendarTitle: '7 月 · EVA 08',
      calendarWeeks: compactCalendarWeeks,
      day: 3,
      totalDays: 7,
      goal: '弱网状态可恢复',
      velocity: 7,
    },
  ],
  issues: [
    {
      key: 'MARS-1',
      projectId: 'search',
      iterationId: 'search-r42',
      type: 'story',
      title: '火星土壤采样流程',
      status: 'todo',
      priority: 'high',
      assigneeId: 'lin',
      storyPoints: 5,
      linkedDocIds: ['doc-mars-plan'],
    },
    {
      key: 'MARS-2',
      projectId: 'search',
      iterationId: 'search-r42',
      type: 'bug',
      title: '氧气读数刷新延迟',
      status: 'doing',
      priority: 'medium',
      assigneeId: 'gao',
      storyPoints: 3,
      linkedDocIds: [],
    },
    {
      key: 'MARS-3',
      projectId: 'search',
      iterationId: 'search-r42',
      type: 'tech',
      title: '轨道通信重试策略',
      status: 'review',
      priority: 'medium',
      assigneeId: 'zhou',
      storyPoints: 2,
      linkedDocIds: ['doc-mars-plan'],
    },
    {
      key: 'MARS-4',
      projectId: 'search',
      iterationId: 'search-r42',
      type: 'story',
      title: '太阳能板展开确认',
      status: 'blocked',
      priority: 'high',
      assigneeId: 'su',
      storyPoints: 8,
      blockerReason: '等待地面站确认',
      linkedDocIds: [],
    },
    {
      key: 'MARS-5',
      projectId: 'search',
      iterationId: 'search-r42',
      type: 'task',
      title: '着陆日志归档',
      status: 'done',
      priority: 'low',
      assigneeId: 'he',
      storyPoints: 1,
      linkedDocIds: ['doc-global-runbook'],
    },
    {
      key: 'SUP-1',
      projectId: 'data',
      iterationId: 'data-s02',
      type: 'story',
      title: '补给库存字段配置',
      status: 'doing',
      priority: 'medium',
      assigneeId: 'chen',
      storyPoints: 4,
      linkedDocIds: [],
    },
  ],
  docs: [
    {
      id: 'doc-mars-plan',
      scope: 'project',
      projectId: 'search',
      title: '火星采样方案',
      directory: '项目文档/星舰平台/方案',
      body: '火星任务采样、回传与风险控制。',
      linkedIssueKeys: ['MARS-1', 'MARS-3'],
      comments: [
        {
          id: 'comment-mars-a',
          docId: 'doc-mars-plan',
          authorId: 'jiang',
          body: '采样路径图需要更新。',
          resolved: false,
          createdAtLabel: '3 分钟前',
        },
      ],
      updatedAtLabel: '3 分钟前',
    },
    {
      id: 'doc-global-runbook',
      scope: 'global',
      title: '深空任务运行手册',
      directory: '全局文档/运行手册',
      body: '深空任务通用发布、回滚与联络步骤。',
      linkedIssueKeys: ['MARS-5'],
      comments: [],
      updatedAtLabel: '今天',
    },
  ],
  standups: [
    {
      id: 'standup-mars-today',
      projectId: 'search',
      dateLabel: '07 / 02',
      weekdayLabel: '星期一',
      timeLabel: '09:30-09:45',
      calendarLabel: '每日 09:30',
      items: [
        {
          memberId: 'lin',
          yesterday: ['确认 MARS-1 采样流程'],
          today: ['推进 MARS-4 地面站确认'],
          blockers: ['MARS-4'],
        },
        {
          memberId: 'gao',
          yesterday: ['定位氧气读数刷新延迟'],
          today: ['修复 MARS-2 并补回归'],
          blockers: [],
        },
      ],
    },
  ],
  milestones: [
    {
      id: 'ms-mars-design',
      projectId: 'search',
      iterationId: 'search-r42',
      title: '采样方案冻结',
      startDay: 1,
      endDay: 2,
      status: 'done',
      ownerId: 'jiang',
    },
    {
      id: 'ms-mars-release',
      projectId: 'search',
      iterationId: 'search-r42',
      title: '地面站联调',
      startDay: 3,
      endDay: 5,
      status: 'risk',
      ownerId: 'lin',
    },
  ],
  feishu: {
    groups: ['星舰任务群'],
    queryCommands: [{ type: 'team' }, { type: 'blockers' }, { type: 'docs', query: marsDocQuery }],
    notificationTriggers: ['站会摘要', '阻塞提醒', '文档评论'],
  },
}

function createClient(data: SeedData): AgiliXClient {
  return {
    loadAppState: vi.fn(async () => {
      throw new Error('Contract app-state client is not used in this route test')
    }),
    loadData: vi.fn(async () => data),
    createContractProject: vi.fn(async () => {
      throw new Error('Contract project creation is not used in this route test')
    }),
    createProject: vi.fn(async () => undefined),
    moveIssueById: vi.fn(async () => {
      throw new Error('Contract issue status updates are not used in this route test')
    }),
    moveIssue: vi.fn(async () => undefined),
    addDocComment: vi.fn(async () => undefined),
    createDoc: vi.fn(async () => undefined),
    saveStandup: vi.fn(async () => undefined),
    saveMilestone: vi.fn(async () => undefined),
    recordFeishuNotification: vi.fn(async () => undefined),
    queryFeishu: vi.fn(async (command: FeishuQueryCommand) => ({
      title: `查询 ${command.type}`,
      lines: ['星舰任务群'],
    })),
  }
}

describe('data-driven route rendering', () => {
  it('renders all business content from the supplied SeedData', () => {
    render(<ProjectsPage data={dataDrivenSeed} />)
    expect(screen.getByText('星舰平台')).toBeInTheDocument()
    expect(screen.getByText(/火星救援迭代/)).toBeInTheDocument()
    cleanup()

    render(<IssuesPage data={dataDrivenSeed} projectId="search" onProjectChange={vi.fn()} />)
    expect(screen.getByText('MARS-1')).toBeInTheDocument()
    expect(screen.getByText('火星土壤采样流程')).toBeInTheDocument()
    expect(screen.queryByText('SRCH-198')).not.toBeInTheDocument()
    cleanup()

    render(<BoardPage data={dataDrivenSeed} projectId="search" onMoveIssue={vi.fn()} />)
    expect(screen.getByText('氧气读数刷新延迟')).toBeInTheDocument()
    expect(screen.getByText('太阳能板展开确认')).toBeInTheDocument()
    expect(screen.queryByText('召回阶段引入语义向量检索(beta 开关)')).not.toBeInTheDocument()
    cleanup()

    render(<StatsPage data={dataDrivenSeed} projectId="search" iterationCode="R42" />)
    expect(screen.getByText(/火星救援迭代/)).toBeInTheDocument()
    expect(screen.getByText('19')).toBeInTheDocument()
    cleanup()

    render(<WorkloadPage data={dataDrivenSeed} />)
    expect(screen.getByText('黎明')).toBeInTheDocument()
    expect(screen.getByText('任务负责人')).toBeInTheDocument()
    expect(screen.getByText('火星土壤采样流程')).toBeInTheDocument()
    cleanup()

    render(<StandupPage data={dataDrivenSeed} projectId="search" onSaveStandup={vi.fn()} />)
    expect(screen.getByText('星期一 · 站会 09:30-09:45')).toBeInTheDocument()
    expect(screen.getByText('确认 MARS-1 采样流程')).toBeInTheDocument()
    cleanup()

    render(<GanttPage data={dataDrivenSeed} projectId="search" onSaveMilestone={vi.fn()} />)
    expect(screen.getByText('采样方案冻结')).toBeInTheDocument()
    expect(screen.getByText('地面站联调')).toBeInTheDocument()
    cleanup()

    render(
      <DocsPage
        data={dataDrivenSeed}
        projectId="all"
        onAddComment={vi.fn()}
        onCreateDoc={vi.fn()}
      />,
    )
    expect(screen.getAllByText('火星采样方案').length).toBeGreaterThan(0)
    expect(screen.getByText('深空任务运行手册')).toBeInTheDocument()
    expect(screen.queryByText('结果卡片重设计方案')).not.toBeInTheDocument()
    cleanup()

    render(<TeamPage data={dataDrivenSeed} />)
    expect(screen.getByText(/星舰平台进入第 2 天/)).toBeInTheDocument()
    expect(screen.getByText('MARS-4 太阳能板展开确认')).toBeInTheDocument()
    cleanup()

    render(<FeishuPage data={dataDrivenSeed} onNotify={vi.fn()} onQuery={vi.fn()} />)
    expect(screen.getAllByText('星舰任务群').length).toBeGreaterThan(0)
    expect(screen.getByText('单群通知 · 星舰任务群')).toBeInTheDocument()
    expect(screen.queryByText('单群通知 · 研发小队')).not.toBeInTheDocument()
    expect(screen.getByText('/docs 火星方案')).toBeInTheDocument()
  })

  it('loads API data into the shell and routes without using route-local fixture rows', async () => {
    render(<App client={createClient(dataDrivenSeed)} />)

    await waitFor(() => expect(screen.getByText(/星舰平台进入第 2 天/)).toBeInTheDocument())

    await userEvent.click(screen.getByLabelText('项目总览'))
    expect(screen.getAllByText('星舰平台').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByLabelText('需求 & 缺陷'))
    expect(screen.getByText('火星土壤采样流程')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('看板'))
    expect(screen.getByText('太阳能板展开确认')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('文档'))
    expect(screen.getAllByText('火星采样方案').length).toBeGreaterThan(0)

    await userEvent.click(screen.getByLabelText('群机器人'))
    expect(screen.getAllByText('星舰任务群').length).toBeGreaterThan(0)
  })
})
