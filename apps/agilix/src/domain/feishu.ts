import { searchDocs } from './docs'
import type { DocQueryText, FeishuQueryCommand, SeedData } from './types'

function createDocQueryText(value: string): DocQueryText {
  if (value.trim().length === 0) throw new Error('Document query must not be empty')
  if (value !== value.trim()) throw new Error('Document query must not include leading or trailing whitespace')
  return value as DocQueryText
}

export function createDocQueryCommand(query: string): FeishuQueryCommand {
  return { type: 'docs', query: createDocQueryText(query) }
}

export function parseFeishuCommand(input: string): FeishuQueryCommand {
  if (input !== input.trim()) throw new Error(`Unsupported Feishu command: ${input}`)
  if (input === '/team') return { type: 'team' }
  if (input === '/blockers') return { type: 'blockers' }
  if (/^\/docs \S.*$/.test(input)) return createDocQueryCommand(input.slice('/docs '.length))
  throw new Error(`Unsupported Feishu command: ${input}`)
}

export function formatFeishuCommand(command: FeishuQueryCommand): string {
  if (command.type === 'team') return '/team'
  if (command.type === 'blockers') return '/blockers'
  return `/docs ${command.query}`
}

export function buildFeishuReply(command: FeishuQueryCommand, data: SeedData): { title: string; lines: string[] } {
  if (command.type === 'team') {
    return { title: '团队状态', lines: [`Issue ${data.issues.length}`, `文档 ${data.docs.length}`, `飞书群 ${data.feishu.groups[0]}`] }
  }

  if (command.type === 'blockers') {
    return { title: '阻塞列表', lines: data.issues.filter((issue) => issue.status === 'blocked').map((issue) => `${issue.key} ${issue.title}`) }
  }

  return { title: '文档查询', lines: searchDocs(data.docs, command.query).map((doc) => `${doc.title} · 未解决评论 ${doc.comments.filter((comment) => !comment.resolved).length}`) }
}
