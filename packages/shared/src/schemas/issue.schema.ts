import { z } from 'zod'

const issueTypeEnum = z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUB_TASK'])
const priorityEnum = z.enum(['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST'])

export const createIssueSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: issueTypeEnum,
  priority: priorityEnum.default('MEDIUM'),
  storyPoints: z.number().int().min(0).max(100).optional(),
  assigneeId: z.string().optional(),
  parentId: z.string().optional(),
  sprintId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
})

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  type: issueTypeEnum.optional(),
  priority: priorityEnum.optional(),
  storyPoints: z.number().int().min(0).max(100).nullable().optional(),
  statusId: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
})

export const moveIssueSchema = z.object({
  boardColumnId: z.string(),
  columnOrder: z.number().int().min(0),
})

export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
export type MoveIssueInput = z.infer<typeof moveIssueSchema>
