import { describe, expect, it } from 'vitest'
import { seedData } from './fixtures'
import { buildDocDirectoryTree, searchDocs } from './docs'
import { buildFeishuReply, createDocQueryCommand, parseFeishuCommand } from './feishu'
import { buildGanttRows } from './gantt'
import { buildIterationStats } from './iterations'
import { filterIssues, groupIssuesByStatus, moveIssue } from './issues'
import { buildStandupSummary } from './standup'
import { buildWorkbenchSnapshot } from './workbench'
import { buildWorkloadRows } from './workload'

describe('full AgiliX domain behavior', () => {
  it('builds every product view from shared prototype data', () => {
    expect(filterIssues(seedData.issues, { projectId: 'search', status: 'all', assigneeId: 'all', keyword: '' }).every((issue) => issue.projectId === 'search')).toBe(true)
    expect(filterIssues(seedData.issues, { projectId: 'all', status: 'all', assigneeId: 'all', keyword: 'SRCH-198' }).map((issue) => issue.key)).toEqual(['SRCH-198'])
    expect(groupIssuesByStatus(seedData.issues).blocked.map((issue) => issue.key)).toEqual(['API-17'])
    expect(moveIssue(seedData.issues, 'SRCH-186', 'done').find((issue) => issue.key === 'SRCH-186')?.status).toBe('done')
    expect(buildDocDirectoryTree(seedData.docs).map((node) => node.name)).toEqual(['全局文档', '项目文档'])
    expect(searchDocs(seedData.docs, '结果卡片').map((doc) => doc.id)).toEqual(['doc-result-card'])
    expect(searchDocs(seedData.docs, ' 结果卡片')).toEqual([])
    expect(buildWorkbenchSnapshot(seedData).attentionIssueKeys).toEqual(['SRCH-186', 'SRCH-201', 'API-17'])
    expect(buildIterationStats(seedData, 'search', 'S24').completionPercent).toBe(69)
    expect(buildWorkloadRows(seedData).find((row) => row.memberId === 'gao')?.loadPercent).toBe(160)
    expect(buildStandupSummary(seedData, 'search').blockers).toEqual(['SRCH-198'])
    expect(buildGanttRows(seedData, 'search').map((row) => row.title)).toEqual(['方案冻结', 'Beta 开关接入', '灰度发布'])
    expect(buildFeishuReply(createDocQueryCommand('结果卡片'), seedData).title).toBe('文档查询')
    expect(() => createDocQueryCommand('   ')).toThrow('Document query must not be empty')
    expect(() => createDocQueryCommand(' 结果卡片')).toThrow('Document query must not include leading or trailing whitespace')
    expect(() => parseFeishuCommand(' /team')).toThrow('Unsupported Feishu command')
    expect(() => parseFeishuCommand('/unknown')).toThrow('Unsupported Feishu command')
  })
})
