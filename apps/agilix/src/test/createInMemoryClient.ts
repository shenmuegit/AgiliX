import type { AgiliXClient, CreateDocInput, FeishuNotificationInput, FeishuReply } from '../api/client'
import { buildFeishuReply, formatFeishuCommand } from '../domain/feishu'
import { seedData } from '../domain/fixtures'
import { moveIssue } from '../domain/issues'
import type { DocComment, FeishuQueryCommand, IssueStatus, Milestone, SeedData, Standup } from '../domain/types'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createInMemoryClient() {
  let data: SeedData = clone(seedData)
  let loadDataCalls = 0
  const standupSaves: string[] = []
  const milestoneSaves: string[] = []
  const feishuNotifications: FeishuNotificationInput[] = []
  const feishuQueries: string[] = []

  function validateFeishuNotification(input: FeishuNotificationInput) {
    switch (input.trigger) {
      case '站会摘要':
        if (!data.standups.some((standup) => standup.id === input.payload.standupId)) throw new Error(`Standup not found: ${input.payload.standupId}`)
        return
      case '阻塞提醒': {
        if (input.payload.issueKeys.length === 0) throw new Error('Blocker notification must include issue keys')
        const missingIssueKey = input.payload.issueKeys.find((issueKey) => !data.issues.some((issue) => issue.key === issueKey))
        if (missingIssueKey) throw new Error(`Issue not found: ${missingIssueKey}`)
        return
      }
      case '文档评论': {
        const doc = data.docs.find((item) => item.id === input.payload.docId)
        if (!doc) throw new Error(`Document not found: ${input.payload.docId}`)
        if (!doc.comments.some((comment) => comment.id === input.payload.commentId)) throw new Error(`Comment not found: ${input.payload.commentId}`)
      }
    }
  }

  const client: AgiliXClient & {
    loadCount(): number
    recordedStandupSaves(): string[]
    recordedMilestoneSaves(): string[]
    recordedFeishuNotifications(): string[]
    recordedFeishuQueries(): string[]
  } = {
    async loadData() {
      loadDataCalls += 1
      return clone(data)
    },
    async moveIssue(issueKey: string, status: IssueStatus) {
      if (!data.issues.some((issue) => issue.key === issueKey)) throw new Error(`Issue not found: ${issueKey}`)
      data = { ...data, issues: moveIssue(data.issues, issueKey, status) }
    },
    async addDocComment(docId: string, comment: DocComment) {
      if (comment.docId !== docId) throw new Error(`Comment docId must match document id: ${docId}`)
      if (!data.docs.some((doc) => doc.id === docId)) throw new Error(`Document not found: ${docId}`)
      data = {
        ...data,
        docs: data.docs.map((doc) => (doc.id === docId ? { ...doc, comments: [...doc.comments, comment] } : doc)),
      }
    },
    async createDoc(doc: CreateDocInput) {
      if (data.docs.some((item) => item.id === doc.id)) throw new Error(`Document already exists: ${doc.id}`)
      if (doc.comments.length > 0) throw new Error('Document comments must be empty on create')
      if (new Set(doc.linkedIssueKeys).size !== doc.linkedIssueKeys.length) throw new Error('Duplicate linked issue')
      const missingIssueKey = doc.linkedIssueKeys.find((issueKey) => !data.issues.some((issue) => issue.key === issueKey))
      if (missingIssueKey) throw new Error(`Linked issue not found: ${missingIssueKey}`)
      data = { ...data, docs: [...data.docs, clone(doc)] }
    },
    async saveStandup(standup: Standup) {
      if (!data.standups.some((item) => item.id === standup.id)) throw new Error(`Standup not found: ${standup.id}`)
      standupSaves.push(standup.id)
      data = { ...data, standups: [...data.standups.filter((item) => item.id !== standup.id), standup] }
    },
    async saveMilestone(milestone: Milestone) {
      if (!data.milestones.some((item) => item.id === milestone.id)) throw new Error(`Milestone not found: ${milestone.id}`)
      milestoneSaves.push(milestone.id)
      data = { ...data, milestones: [...data.milestones.filter((item) => item.id !== milestone.id), milestone] }
    },
    async recordFeishuNotification(input: FeishuNotificationInput) {
      validateFeishuNotification(input)
      feishuNotifications.push(clone(input))
    },
    async queryFeishu(command: FeishuQueryCommand): Promise<FeishuReply> {
      feishuQueries.push(formatFeishuCommand(command))
      return buildFeishuReply(command, data)
    },
    loadCount() {
      return loadDataCalls
    },
    recordedFeishuNotifications() {
      return feishuNotifications.map((notification) => notification.trigger)
    },
    recordedStandupSaves() {
      return [...standupSaves]
    },
    recordedMilestoneSaves() {
      return [...milestoneSaves]
    },
    recordedFeishuQueries() {
      return [...feishuQueries]
    },
  }

  return client
}
