import { seedData } from '@agilix/app/domain/fixtures'
import { describe, expect, it } from 'vitest'
import type { AgiliXRepository } from '../repository'

export function describeRepositoryConformance(
  name: string,
  createRepository: () => AgiliXRepository,
) {
  describe(name, () => {
    it('persists issue moves and document comments', async () => {
      const repository = createRepository()

      await repository.seed(seedData)
      expect(await repository.moveIssue('SRCH-186', 'done')).toBe(true)
      expect(
        await repository.addDocComment('doc-result-card', {
          id: 'comment-conformance',
          docId: 'doc-result-card',
          authorId: 'zhou',
          body: 'Repository conformance comment',
          resolved: false,
          createdAtLabel: '刚刚',
        }),
      ).toBe('created')
      expect(
        await repository.createDoc({
          id: 'doc-conformance-created',
          scope: 'global',
          title: 'Repository 创建文档',
          directory: '全局文档/待整理',
          body: 'Repository conformance created doc',
          linkedIssueKeys: [],
          comments: [],
          updatedAtLabel: '刚刚',
        }),
      ).toBe('created')
      expect(
        await repository.createProject({
          project: {
            id: 'growth',
            name: '增长实验',
            glyph: 'G',
            color: '#2563eb',
            activeIterationCode: 'S01',
          },
          iteration: {
            id: 'growth-s01',
            projectId: 'growth',
            code: 'S01',
            name: '启动迭代',
            dateRangeLabel: '06.10 - 06.21',
            calendarTitle: '增长实验 · S01',
            calendarWeeks: [
              { label: 'W1', rangeLabel: '06.10 - 06.14', days: ['10', '11', '12', '13', '14'] },
              { label: 'W2', rangeLabel: '06.17 - 06.21', days: ['17', '18', '19', '20', '21'] },
            ],
            day: 1,
            totalDays: 10,
            goal: '验证首批增长假设',
            velocity: 0,
          },
        }),
      ).toBe('created')
      expect(
        await repository.saveStandup({
          ...seedData.standups[0],
          items: seedData.standups[0].items.map((item) =>
            item.memberId === 'gao'
              ? { ...item, today: ['Repository updated standup item'], blockers: [] }
              : item,
          ),
        }),
      ).toBe(true)
      expect(await repository.saveMilestone({ ...seedData.milestones[1], status: 'doing' })).toBe(
        'saved',
      )
      expect(
        await repository.saveFeishuNotification({
          id: 'notification-conformance',
          trigger: '站会摘要',
          targetGroup: 'AgiliX 团队群',
          payload: { standupId: 'standup-search-today' },
          status: 'queued',
          createdAt: '2026-06-06T10:00:00.000Z',
        }),
      ).toBe('saved')
      await repository.saveFeishuQuery({
        id: 'query-conformance',
        command: { type: 'team' },
        reply: { title: '团队状态', lines: ['Issue 7'] },
        createdAt: '2026-06-06T10:01:00.000Z',
      })

      expect(
        (
          await repository.listIssues({
            projectId: 'search',
            status: 'all',
            assigneeId: 'all',
            keyword: '',
          })
        ).find((issue) => issue.key === 'SRCH-186')?.status,
      ).toBe('done')
      expect(
        (await repository.listProjects()).find((project) => project.id === 'growth')?.name,
      ).toBe('增长实验')
      expect(
        (await repository.loadData()).iterations.find((iteration) => iteration.id === 'growth-s01')
          ?.goal,
      ).toBe('验证首批增长假设')
      expect(
        (await repository.getDoc('doc-result-card'))?.comments.map((comment) => comment.body),
      ).toContain('Repository conformance comment')
      expect((await repository.getDoc('doc-conformance-created'))?.title).toBe(
        'Repository 创建文档',
      )
      expect(
        (await repository.listStandups({ projectId: 'search' }))[0].items.find(
          (item) => item.memberId === 'gao',
        )?.today,
      ).toEqual(['Repository updated standup item'])
      expect(
        (await repository.listMilestones({ projectId: 'search' })).find(
          (milestone) => milestone.id === 'ms-beta',
        )?.status,
      ).toBe('doing')
      expect(
        (await repository.listFeishuNotifications()).map((notification) => notification.trigger),
      ).toEqual(['站会摘要'])
      expect((await repository.listFeishuQueries()).map((query) => query.command)).toEqual([
        { type: 'team' },
      ])
    })

    it('rejects duplicate seed calls instead of skipping conflicts', async () => {
      const repository = createRepository()

      await repository.seed(seedData)

      await expect(repository.seed(seedData)).rejects.toThrow('Repository already seeded')
    })

    it('rejects duplicate seed identifiers before writing data', async () => {
      const repository = createRepository()

      await expect(
        repository.seed({
          ...seedData,
          projects: [seedData.projects[0], seedData.projects[0]],
        }),
      ).rejects.toThrow('Duplicate seed project id')

      expect(await repository.listProjects()).toEqual([])
    })

    it('rejects duplicate seed natural keys before writing data', async () => {
      const repository = createRepository()

      await expect(
        repository.seed({
          ...seedData,
          iterations: [
            ...seedData.iterations,
            { ...seedData.iterations[0], id: 'it-duplicate-code' },
          ],
        }),
      ).rejects.toThrow('Duplicate seed iteration project code')

      expect(await repository.listProjects()).toEqual([])
    })

    it('rejects invalid seed references before writing data', async () => {
      const repository = createRepository()

      await expect(
        repository.seed({
          ...seedData,
          docs: [
            ...seedData.docs,
            {
              ...seedData.docs[0],
              id: 'doc-invalid-seed-link',
              linkedIssueKeys: ['MISSING-1'],
              comments: [],
            },
          ],
        }),
      ).rejects.toThrow('Seed linked issue not found: MISSING-1')

      expect(await repository.listProjects()).toEqual([])
      expect(await repository.listDocs({ projectId: 'all', query: '' })).toEqual([])
    })

    it('rejects invalid mutation targets and document references without creating replacement records', async () => {
      const repository = createRepository()

      await repository.seed(seedData)

      expect(await repository.moveIssue('MISSING-1', 'done')).toBe(false)
      expect(
        await repository.addDocComment('missing-doc', {
          id: 'comment-missing-conformance',
          docId: 'missing-doc',
          authorId: 'zhou',
          body: 'Missing doc comment',
          resolved: false,
          createdAtLabel: '刚刚',
        }),
      ).toBe('document-not-found')
      expect(
        await repository.addDocComment('doc-result-card', {
          id: 'comment-mismatch-conformance',
          docId: 'other-doc',
          authorId: 'zhou',
          body: 'Mismatched doc id comment',
          resolved: false,
          createdAtLabel: '刚刚',
        }),
      ).toBe('comment-doc-id-mismatch')
      expect(
        await repository.createDoc({
          ...seedData.docs[0],
          comments: [],
        }),
      ).toBe('duplicate-document')
      expect(
        await repository.createDoc({
          id: 'doc-invalid-linked-issue',
          scope: 'project',
          projectId: 'search',
          title: 'Invalid linked issue doc',
          directory: '项目文档/搜索平台/结果页',
          body: 'Linked issue must exist.',
          linkedIssueKeys: ['MISSING-1'],
          comments: [],
          updatedAtLabel: '刚刚',
        }),
      ).toBe('linked-issue-not-found')
      expect(
        await repository.createDoc({
          id: 'doc-duplicate-linked-issue',
          scope: 'project',
          projectId: 'search',
          title: 'Duplicate linked issue doc',
          directory: '项目文档/搜索平台/结果页',
          body: 'Linked issue keys must be unique.',
          linkedIssueKeys: ['SRCH-186', 'SRCH-186'],
          comments: [],
          updatedAtLabel: '刚刚',
        }),
      ).toBe('duplicate-linked-issue')
      expect(
        await repository.createDoc({
          id: 'doc-create-with-comment',
          scope: 'project',
          projectId: 'search',
          title: 'Create doc with comment',
          directory: '项目文档/搜索平台/结果页',
          body: 'Comments must use addDocComment.',
          linkedIssueKeys: [],
          comments: [
            // @ts-expect-error createDoc only accepts an empty comments array
            {
              id: 'comment-create-doc',
              docId: 'doc-create-with-comment',
              authorId: 'zhou',
              body: 'Comment must use the comment endpoint.',
              resolved: false,
              createdAtLabel: '刚刚',
            },
          ],
          updatedAtLabel: '刚刚',
        }),
      ).toBe('document-comments-not-empty')
      expect(await repository.saveStandup({ ...seedData.standups[0], id: 'missing-standup' })).toBe(
        false,
      )
      expect(
        await repository.saveMilestone({ ...seedData.milestones[1], id: 'missing-milestone' }),
      ).toBe('milestone-not-found')
      expect(
        await repository.saveMilestone({
          ...seedData.milestones[1],
          iterationId: 'missing-iteration',
        }),
      ).toBe('iteration-not-found')
      expect(
        await repository.saveMilestone({
          ...seedData.milestones[1],
          // @ts-expect-error invalid owner validates explicit repository result
          ownerId: 'missing-owner',
        }),
      ).toBe('owner-not-found')
      expect(
        await repository.saveFeishuNotification({
          id: 'notification-missing-standup',
          trigger: '站会摘要',
          targetGroup: 'AgiliX 团队群',
          payload: { standupId: 'missing-standup' },
          status: 'queued',
          createdAt: '2026-06-06T10:00:00.000Z',
        }),
      ).toBe('standup-not-found')
      expect(
        await repository.saveFeishuNotification({
          id: 'notification-missing-issue',
          trigger: '阻塞提醒',
          targetGroup: 'AgiliX 团队群',
          payload: { issueKeys: ['MISSING-1'] },
          status: 'queued',
          createdAt: '2026-06-06T10:00:00.000Z',
        }),
      ).toBe('issue-not-found')
      expect(
        await repository.saveFeishuNotification({
          id: 'notification-missing-comment',
          trigger: '文档评论',
          targetGroup: 'AgiliX 团队群',
          payload: { docId: 'doc-result-card', commentId: 'missing-comment' },
          status: 'queued',
          createdAt: '2026-06-06T10:00:00.000Z',
        }),
      ).toBe('comment-not-found')

      expect(
        await repository.listIssues({
          projectId: 'all',
          status: 'all',
          assigneeId: 'all',
          keyword: 'MISSING-1',
        }),
      ).toEqual([])
      expect(await repository.getDoc('missing-doc')).toBeUndefined()
      expect(await repository.getDoc('doc-invalid-linked-issue')).toBeUndefined()
      expect(await repository.getDoc('doc-duplicate-linked-issue')).toBeUndefined()
      expect(await repository.getDoc('doc-create-with-comment')).toBeUndefined()
      expect(
        (await repository.listDocs({ projectId: 'all', query: '' })).filter(
          (doc) => doc.id === seedData.docs[0].id,
        ),
      ).toHaveLength(1)
      expect(
        (await repository.listStandups({ projectId: 'all' })).map((standup) => standup.id),
      ).not.toContain('missing-standup')
      expect(
        (await repository.listMilestones({ projectId: 'all' })).map((milestone) => milestone.id),
      ).not.toContain('missing-milestone')
      expect(await repository.listFeishuNotifications()).toEqual([])
    })

    it('keeps existing standup items when a standup save fails', async () => {
      const repository = createRepository()

      await repository.seed(seedData)
      const original = (await repository.listStandups({ projectId: 'search' })).find(
        (standup) => standup.id === 'standup-search-today',
      )

      await expect(
        repository.saveStandup({
          ...seedData.standups[0],
          items: [
            {
              ...seedData.standups[0].items[0],
              // @ts-expect-error invalid member id validates repository atomicity
              memberId: 'missing-member',
            },
          ],
        }),
      ).rejects.toThrow('Standup member not found: missing-member')

      expect(
        (await repository.listStandups({ projectId: 'search' })).find(
          (standup) => standup.id === 'standup-search-today',
        )?.items,
      ).toEqual(original?.items)
    })
  })
}
