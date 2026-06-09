import type { z } from 'zod'
import type {
  appStateResponseSchema,
  botConfigResponseSchema,
  createDocumentCommentRequestSchema,
  createDocumentDirectoryRequestSchema,
  createDocumentRequestSchema,
  createIssueRequestSchema,
  createProjectRequestSchema,
  feishuQueryRequestSchema,
  feishuQueryResponseSchema,
  feishuTestMessageResponseSchema,
  issueStatusValues,
  recordFeishuNotificationRequestSchema,
  saveAssignmentRequestSchema,
  saveBotConfigRequestSchema,
  saveMilestoneRequestSchema,
  saveStandupRequestSchema,
  sendFeishuTestMessageRequestSchema,
  updateDocumentDirectoryRequestSchema,
} from './schemas'

export type AppStateResponse = z.infer<typeof appStateResponseSchema>
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>
export type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>
export type CreateDocumentRequest = z.infer<typeof createDocumentRequestSchema>
export type CreateDocumentCommentRequest = z.infer<typeof createDocumentCommentRequestSchema>
export type CreateDocumentDirectoryRequest = z.infer<typeof createDocumentDirectoryRequestSchema>
export type UpdateDocumentDirectoryRequest = z.infer<typeof updateDocumentDirectoryRequestSchema>
export type SaveAssignmentRequest = z.infer<typeof saveAssignmentRequestSchema>
export type SaveStandupRequest = z.infer<typeof saveStandupRequestSchema>
export type SaveMilestoneRequest = z.infer<typeof saveMilestoneRequestSchema>
export type BotConfigResponse = z.infer<typeof botConfigResponseSchema>
export type SaveBotConfigRequest = z.infer<typeof saveBotConfigRequestSchema>
export type SendFeishuTestMessageRequest = z.infer<typeof sendFeishuTestMessageRequestSchema>
export type FeishuTestMessageResponse = z.infer<typeof feishuTestMessageResponseSchema>
export type FeishuQueryRequest = z.infer<typeof feishuQueryRequestSchema>
export type FeishuQueryResponse = z.infer<typeof feishuQueryResponseSchema>
export type RecordFeishuNotificationRequest = z.infer<typeof recordFeishuNotificationRequestSchema>
export type IssueStatus = (typeof issueStatusValues)[number]
