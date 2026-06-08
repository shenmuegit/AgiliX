import { describe, expect, it } from 'vitest'
import { seedData } from './fixtures'

describe('seedData', () => {
  it('covers every prototype-backed product module', () => {
    expect(seedData.projects.map((project) => project.name)).toEqual(['搜索平台', '数据看板', '开放平台', '移动端 App'])
    expect(seedData.members).toHaveLength(8)
    expect(seedData.iterations.some((iteration) => iteration.code === 'S24')).toBe(true)
    expect(seedData.issues.some((issue) => issue.key === 'SRCH-198' && issue.status === 'blocked')).toBe(true)
    expect(seedData.docs.some((doc) => doc.scope === 'global')).toBe(true)
    expect(seedData.standups).toHaveLength(1)
    expect(seedData.milestones.filter((milestone) => milestone.projectId === 'search')).toHaveLength(3)
  })

  it('keeps the small-team product constraints explicit', () => {
    expect(seedData.navItems).toEqual(['团队工作台', '项目总览', 'Issues', '看板', '迭代统计', '文档', '成员负载', '每日站会', '排期甘特', '飞书'])
    expect(seedData.navItems).not.toContain('审批流')
    expect(seedData.feishu.groups).toEqual(['AgiliX 团队群'])
  })
})
