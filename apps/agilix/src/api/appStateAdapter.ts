import type { AppStateResponse } from '@agilix/contract'
import { parseFeishuCommand } from '../domain/feishu'
import type { Doc, MemberId, MilestoneStatus, SeedData } from '../domain/types'

const navItems = [
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
]

const memberIdByName: Record<string, MemberId> = {
  林舟: 'lin',
  陈牧: 'chen',
  高远: 'gao',
  苏晴: 'su',
  韩序: 'han',
  何川: 'he',
  江月: 'jiang',
  周然: 'zhou',
}

export function toDisplaySeedData(state: AppStateResponse): SeedData {
  const projectCodeById = new Map(state.projects.map((project) => [project.id, project.code]))
  const iterationById = new Map(state.iterations.map((iteration) => [iteration.id, iteration]))
  const memberById = new Map(state.members.map((member) => [member.id, member]))
  const issueById = new Map(state.issues.map((issue) => [issue.id, issue]))
  const docById = new Map(state.documents.map((doc) => [doc.id, doc]))

  return {
    navItems,
    projects: state.projects.map((project) => ({
      id: project.code,
      name: project.name,
      glyph: project.glyph,
      color: project.color,
      activeIterationCode: requireValue(
        iterationById.get(project.active_iteration_id)?.code,
        `Active iteration not found: ${project.active_iteration_id}`,
      ),
    })),
    members: [...state.members]
      .sort((a, b) => a.online_sort_order - b.online_sort_order)
      .map((member) => ({
        id: memberIdFromRow(member.id, member.name),
        name: member.name,
        role: member.role,
        capacity: member.capacity,
      })),
    iterations: state.iterations.map((iteration) => ({
      id: iteration.id,
      projectId: requireProjectCode(projectCodeById, iteration.project_id),
      code: iteration.code,
      name: iteration.name,
      dateRangeLabel: iteration.date_range_label,
      calendarTitle: iteration.calendar_title,
      calendarWeeks: state.iteration_calendar_weeks
        .filter((week) => week.iteration_id === iteration.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((week) => ({
          label: week.label,
          rangeLabel: week.range_label,
          days: state.iteration_calendar_days
            .filter((day) => day.week_id === week.id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((day) => day.label),
        })),
      day: iteration.day,
      totalDays: iteration.total_days,
      goal: iteration.goal,
      velocity: iteration.velocity,
    })),
    issues: state.issues.map((issue) => ({
      id: issue.id,
      key: issue.key,
      projectId: requireProjectCode(projectCodeById, issue.project_id),
      iterationId: issue.iteration_id,
      type: issue.type,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      assigneeId: memberIdFromRow(
        issue.handler_member_id,
        requireValue(
          memberById.get(issue.handler_member_id)?.name,
          `Issue handler not found: ${issue.handler_member_id}`,
        ),
      ),
      storyPoints: issue.story_points,
      blockerReason: issue.blocker_reason ?? undefined,
      linkedDocIds: state.document_issue_links
        .filter((link) => link.issue_id === issue.id)
        .map((link) => requireValue(docById.get(link.doc_id)?.id, `Linked document not found: ${link.doc_id}`)),
    })),
    docs: state.documents.map((doc): Doc => {
      const base = {
        id: doc.id,
        title: doc.title,
        directory: directoryPath(state, doc.directory_id),
        body: doc.body,
        linkedIssueKeys: state.document_issue_links
          .filter((link) => link.doc_id === doc.id)
          .map((link) =>
            requireValue(issueById.get(link.issue_id)?.key, `Linked issue not found: ${link.issue_id}`),
          ),
        comments: state.document_comments
          .filter((comment) => comment.doc_id === doc.id)
          .map((comment) => ({
            id: comment.id,
            docId: doc.id,
            authorId: memberIdFromRow(
              comment.author_member_id,
              requireValue(
                memberById.get(comment.author_member_id)?.name,
                `Comment author not found: ${comment.author_member_id}`,
              ),
            ),
            body: comment.body,
            resolved: comment.resolved,
            createdAtLabel: comment.created_at,
          })),
        updatedAtLabel: doc.updated_at,
      }
      if (doc.scope === 'global') return { ...base, scope: 'global' }
      return {
        ...base,
        scope: 'project',
        projectId: requireProjectCode(projectCodeById, requireValue(doc.project_id, `Document project missing: ${doc.id}`)),
      }
    }),
    standups: state.standups.map((standup) => ({
      id: standup.id,
      projectId: requireProjectCode(projectCodeById, standup.project_id),
      dateLabel: standup.date_label,
      weekdayLabel: standup.weekday_label,
      timeLabel: standup.time_label,
      calendarLabel: standup.calendar_label,
      items: state.standup_items
        .filter((item) => item.standup_id === standup.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          memberId: memberIdFromRow(
            item.member_id,
            requireValue(memberById.get(item.member_id)?.name, `Standup member not found: ${item.member_id}`),
          ),
          yesterday: splitLines(item.yesterday_text),
          today: splitLines(item.today_text),
          blockers: splitLines(item.blockers_text),
        })),
    })),
    milestones: state.milestones.map((milestone) => ({
      id: milestone.id,
      projectId: requireProjectCode(projectCodeById, milestone.project_id),
      iterationId: milestone.iteration_id,
      title: milestone.title,
      startDay: milestone.start_day,
      endDay: milestone.end_day,
      status: milestone.status as MilestoneStatus,
      ownerId: memberIdFromRow(
        milestone.participant_member_id,
        requireValue(
          memberById.get(milestone.participant_member_id)?.name,
          `Milestone participant not found: ${milestone.participant_member_id}`,
        ),
      ),
    })),
    feishu: {
      groups: uniqueOrderedValues(state.feishu_groups.map((group) => group.name)),
      queryCommands: state.feishu_queries.map((query) => parseFeishuCommand(query.command)),
      notificationTriggers: ['站会摘要', '阻塞提醒', '文档评论'],
    },
  }
}

function requireProjectCode(projectCodeById: Map<string, string>, projectId: string) {
  return requireValue(projectCodeById.get(projectId), `Project not found: ${projectId}`)
}

function memberIdFromRow(memberId: string, name: string): MemberId {
  const displayId = memberId.startsWith('member:') ? memberId.slice('member:'.length) : memberId
  if (isMemberId(displayId)) return displayId
  const mapped = memberIdByName[name]
  if (!mapped) throw new Error(`Member display id not defined: ${memberId}/${name}`)
  return mapped
}

function isMemberId(value: string): value is MemberId {
  return ['lin', 'chen', 'gao', 'su', 'han', 'he', 'jiang', 'zhou'].includes(value)
}

function directoryPath(state: AppStateResponse, directoryId: string): string {
  const directory = state.document_directories.find((item) => item.id === directoryId)
  if (!directory) throw new Error(`Document directory not found: ${directoryId}`)
  if (directory.parent_id === null) return directory.name
  return `${directoryPath(state, directory.parent_id)}/${directory.name}`
}

function splitLines(value: string) {
  return value === '' ? [] : value.split('\n')
}

function uniqueOrderedValues(values: string[]) {
  return [...new Set(values)]
}

function requireValue<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) throw new Error(message)
  return value
}
