import { z } from 'zod'

export const TeacherApprovalSchema = z.object({
  status: z.enum(['active', 'inactive', 'banned']),
  banReason: z.string().optional(),
})
export type TeacherApproval = z.infer<typeof TeacherApprovalSchema>

export const TeacherPasswordResetSchema = z.object({
  newPassword: z.string().min(4).optional(),
})
export type TeacherPasswordReset = z.infer<typeof TeacherPasswordResetSchema>

export const GlobalSettingSchema = z.object({
  key: z.string().min(1),
  valueJson: z.string().min(1),
})
export type GlobalSetting = z.infer<typeof GlobalSettingSchema>
