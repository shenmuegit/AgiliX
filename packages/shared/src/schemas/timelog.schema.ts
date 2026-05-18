import { z } from 'zod'

export const createTimeLogSchema = z.object({
  minutes: z.number().int().min(1).max(1440),
  description: z.string().max(500).optional(),
  logDate: z.string(),
})

export const updateTimeLogSchema = z.object({
  minutes: z.number().int().min(1).max(1440).optional(),
  description: z.string().max(500).nullable().optional(),
  logDate: z.string().optional(),
})

export type CreateTimeLogInput = z.infer<typeof createTimeLogSchema>
export type UpdateTimeLogInput = z.infer<typeof updateTimeLogSchema>
