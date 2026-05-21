import { z } from 'zod'

export const createMilestoneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  gitRef: z.string().max(200).optional(),
})

export const updateMilestoneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED']).optional(),
  gitRef: z.string().max(200).nullable().optional(),
})

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>
