import type { AppStateResponse } from '@agilix/contract'
import type { Doc, ProjectId, SeedData } from '@agilix/app/domain/types'

export function contractId(scope: string, value: string) {
  let hash = 1469598103934665603n
  for (const char of `${scope}:${value}`) {
    hash ^= BigInt(char.codePointAt(0) ?? 0)
    hash *= 1099511628211n
    hash &= 0xffffffffffffffffn
  }
  return hash.toString()
}

export function legacyIssueKeyFromContractId(data: SeedData, issueId: string) {
  return data.issues.find((issue) => contractId('issue', issue.key) === issueId)?.key
}

export function toAppStateResponse(data: SeedData): AppStateResponse {
  const directoryPaths = Array.from(new Set(data.docs.flatMap((doc) => directoryAncestors(doc.directory))))
  const directories = directoryPaths.map((path, index) => {
    const scope = path.startsWith('全局文档') ? ('global' as const) : ('project' as const)
    return {
      id: contractId('directory', path),
      scope,
      project_id: scope === 'project' ? projectIdFromDirectoryPath(data, path) : null,
      parent_id: parentDirectoryPath(path) ? contractId('directory', parentDirectoryPath(path) ?? '') : null,
      name: path.split('/').at(-1) ?? path,
      sort_order: index,
      created_at: '2026-06-09T00:00:00.000Z',
      updated_at: '2026-06-09T00:00:00.000Z',
    }
  })
  const weekRows = data.iterations.flatMap((iteration) =>
    iteration.calendarWeeks.map((week, index) => ({
      id: contractId('iteration-week', `${iteration.id}:${index}`),
      iteration_id: contractId('iteration', iteration.id),
      sort_order: index,
      label: week.label,
      range_label: week.rangeLabel,
    })),
  )

  return {
    projects: data.projects.map((project) => {
      const activeIteration = data.iterations.find(
        (iteration) =>
          iteration.projectId === project.id && iteration.code === project.activeIterationCode,
      )
      return {
        id: contractId('project', project.id),
        code: project.id,
        name: project.name,
        glyph: project.glyph,
        color: project.color,
        active_iteration_id: contractId('iteration', activeIteration?.id ?? project.activeIterationCode),
        cadence: '双周',
        template_key: 'scrum-board-burndown',
      }
    }),
    project_members: data.projects.flatMap((project) =>
      data.members.map((member, index) => ({
        project_id: contractId('project', project.id),
        member_id: contractId('member', member.id),
        sort_order: index,
      })),
    ),
    iterations: data.iterations.map((iteration) => ({
      id: contractId('iteration', iteration.id),
      project_id: contractId('project', iteration.projectId),
      code: iteration.code,
      name: iteration.name,
      date_range_label: iteration.dateRangeLabel,
      calendar_title: iteration.calendarTitle,
      day: iteration.day,
      total_days: iteration.totalDays,
      goal: iteration.goal,
      velocity: iteration.velocity,
    })),
    iteration_calendar_weeks: weekRows,
    iteration_calendar_days: data.iterations.flatMap((iteration) =>
      iteration.calendarWeeks.flatMap((week, weekIndex) =>
        week.days.map((day, dayIndex) => ({
          id: contractId('iteration-day', `${iteration.id}:${weekIndex}:${dayIndex}`),
          week_id: contractId('iteration-week', `${iteration.id}:${weekIndex}`),
          sort_order: dayIndex,
          label: day,
        })),
      ),
    ),
    members: data.members.map((member, index) => ({
      id: contractId('member', member.id),
      name: member.name,
      role: member.role,
      capacity: member.capacity,
      online_sort_order: index,
    })),
    issues: data.issues.map((issue) => ({
      id: contractId('issue', issue.key),
      key: issue.key,
      project_id: contractId('project', issue.projectId),
      iteration_id: contractId('iteration', issue.iterationId),
      type: issue.type,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      handler_member_id: contractId('member', issue.assigneeId),
      story_points: issue.storyPoints,
      blocker_reason: issue.blockerReason ?? null,
      description: '',
      acceptance_criteria: '',
      epic_name: issue.projectId,
      draft: false,
    })),
    issue_events: [],
    issue_labels: data.issues.flatMap((issue) =>
      issue.type === 'tech'
        ? [{ issue_id: contractId('issue', issue.key), label: 'Tech', sort_order: 0 }]
        : [],
    ),
    issue_collaborators: [],
    documents: data.docs.map((doc) => ({
      id: contractId('document', doc.id),
      scope: doc.scope,
      project_id: doc.scope === 'project' ? contractId('project', doc.projectId) : null,
      directory_id: contractId('directory', doc.directory),
      title: doc.title,
      content_type: contentTypeFromDoc(doc),
      body: doc.body,
      editor_member_id: contractId('member', doc.comments[0]?.authorId ?? data.members[0].id),
      sync_feishu_doc: false,
      created_at: doc.updatedAtLabel,
      updated_at: doc.updatedAtLabel,
    })),
    document_directories: directories,
    document_issue_links: data.docs.flatMap((doc) =>
      doc.linkedIssueKeys.map((issueKey) => ({
        doc_id: contractId('document', doc.id),
        issue_id: contractId('issue', issueKey),
      })),
    ),
    document_comments: data.docs.flatMap((doc) =>
      doc.comments.map((comment) => ({
        id: contractId('document-comment', comment.id),
        doc_id: contractId('document', doc.id),
        author_member_id: contractId('member', comment.authorId),
        body: comment.body,
        resolved: comment.resolved,
        created_at: comment.createdAtLabel,
      })),
    ),
    standups: data.standups.map((standup) => ({
      id: contractId('standup', standup.id),
      project_id: contractId('project', standup.projectId),
      date: standup.dateLabel,
      date_label: standup.dateLabel,
      weekday_label: standup.weekdayLabel,
      time_label: standup.timeLabel,
      calendar_label: standup.calendarLabel,
    })),
    standup_items: data.standups.flatMap((standup) =>
      standup.items.map((item, index) => ({
        id: contractId('standup-item', `${standup.id}:${item.memberId}:${index}`),
        standup_id: contractId('standup', standup.id),
        member_id: contractId('member', item.memberId),
        sort_order: index,
        yesterday_text: item.yesterday.join('\n'),
        today_text: item.today.join('\n'),
        blockers_text: item.blockers.join('\n'),
      })),
    ),
    milestones: data.milestones.map((milestone) => ({
      id: contractId('milestone', milestone.id),
      project_id: contractId('project', milestone.projectId),
      iteration_id: contractId('iteration', milestone.iterationId),
      title: milestone.title,
      start_day: milestone.startDay,
      end_day: milestone.endDay,
      status: milestone.status,
      participant_member_id: contractId('member', milestone.ownerId),
    })),
    feishu_member_profiles: data.members.map((member) => ({
      member_id: contractId('member', member.id),
      open_id: `open-${member.id}`,
      union_id: `union-${member.id}`,
      avatar_url: `https://avatar.local/${member.id}.png`,
      display_name: member.name,
      last_seen_at: '2026-06-09T00:00:00.000Z',
    })),
    feishu_groups: data.projects.map((project, index) => ({
      id: contractId('feishu-group', project.id),
      project_id: contractId('project', project.id),
      name: 'AgiliX 团队群',
      purpose: '通知 / 查询',
      member_count_label: `${data.members.length} 人`,
      status: '已连接',
      sort_order: index,
    })),
    feishu_bot_rules: data.projects.map((project, index) => ({
      id: contractId('feishu-rule', project.id),
      project_id: contractId('project', project.id),
      rule_type: 'risk_alert',
      title: '风险告警',
      description: '阻塞时推送',
      schedule_label: '实时',
      target_group_id: contractId('feishu-group', project.id),
      enabled: true,
      sort_order: index,
    })),
    feishu_notifications: [],
    feishu_queries: [],
  }
}

function directoryAncestors(path: string): string[] {
  return path.split('/').map((_, index, parts) => parts.slice(0, index + 1).join('/'))
}

function parentDirectoryPath(path: string) {
  const parts = path.split('/')
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null
}

function projectIdFromDirectoryPath(data: SeedData, path: string) {
  const projectName = path.split('/')[1]
  const project = data.projects.find((item) => item.name === projectName)
  return project ? contractId('project', project.id) : null
}

function contentTypeFromDoc(doc: Doc) {
  if (doc.body.includes('```mindmap')) return 'mindmap'
  if (doc.body.includes('```diagram')) return 'diagram'
  if (doc.body.includes('```mermaid')) return 'mermaid'
  return 'markdown'
}
