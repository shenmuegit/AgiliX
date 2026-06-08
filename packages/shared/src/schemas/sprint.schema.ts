import { z } from 'zod'

export const createSprintSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const updateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).nullable().optional(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
})

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

export type CreateSprintInput = z.infer<typeof createSprintSchema>
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>
