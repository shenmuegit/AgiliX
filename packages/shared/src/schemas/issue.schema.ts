import { z } from 'zod'

const issueTypeEnum = z.enum(['STORY', 'TASK', 'BUG'])
const priorityEnum = z.enum(['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST'])

export const createIssueSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: issueTypeEnum,
  priority: priorityEnum.default('MEDIUM'),
  parentId: z.string().optional(),
  milestoneId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
})

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  type: issueTypeEnum.optional(),
  priority: priorityEnum.optional(),
  statusId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
})

export const moveIssueSchema = z.object({
  boardColumnId: z.string(),
  columnOrder: z.number().int().min(0),
})

export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
export type MoveIssueInput = z.infer<typeof moveIssueSchema>
